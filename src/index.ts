#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	ErrorCode,
	ListToolsRequestSchema,
	McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { execa } from 'execa';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import OpenAI from 'openai'; // Import OpenAI library

// --- Type definitions for arguments ---
interface GenerateMindmapArgs {
  markdown: string;
  outputFormat?: 'html' | 'svg';
}

interface GenerateAndSaveMindmapArgs extends GenerateMindmapArgs {
  outputDir?: string;
  outputFilename?: string;
}

interface RelationshipGraphArgs {
  mermaid_text: string;
  outputFormat?: 'svg' | 'png';
  outputDir?: string;
  outputFilename?: string;
}

interface KnowledgeGraphArgs {
  markdown: string;
  outputFormat?: 'svg' | 'png';
  outputDir?: string;
  outputFilename?: string;
  prompt?: string;
  model?: string;
  apiKey?: string;
  baseURL?: string;
}

// --- Type guards ---
const isValidGenerateArgs = (args: any): args is GenerateMindmapArgs =>
	typeof args === 'object' && args !== null && typeof args.markdown === 'string' &&
	(args.outputFormat === undefined || ['html', 'svg'].includes(args.outputFormat));

const isValidGenerateAndSaveArgs = (args: any): args is GenerateAndSaveMindmapArgs =>
  typeof args === 'object' && args !== null && typeof args.markdown === 'string' &&
	(args.outputFormat === undefined || ['html', 'svg'].includes(args.outputFormat)) &&
	(args.outputDir === undefined || typeof args.outputDir === 'string') &&
	(args.outputFilename === undefined || typeof args.outputFilename === 'string');

const isValidGraphArgs = (args: any): args is RelationshipGraphArgs =>
  typeof args === 'object' && args !== null && typeof args.mermaid_text === 'string' &&
  (args.outputFormat === undefined || ['svg', 'png'].includes(args.outputFormat)) &&
  (args.outputDir === undefined || typeof args.outputDir === 'string') &&
	(args.outputFilename === undefined || typeof args.outputFilename === 'string');

const isValidKnowledgeGraphArgs = (args: any): args is KnowledgeGraphArgs =>
  typeof args === 'object' && args !== null && typeof args.markdown === 'string' &&
  (args.outputFormat === undefined || ['svg', 'png'].includes(args.outputFormat)) &&
  (args.outputDir === undefined || typeof args.outputDir === 'string') &&
  (args.outputFilename === undefined || typeof args.outputFilename === 'string') &&
  (args.prompt === undefined || typeof args.prompt === 'string') &&
  (args.model === undefined || typeof args.model === 'string') &&
  (args.apiKey === undefined || typeof args.apiKey === 'string') &&
  (args.baseURL === undefined || typeof args.baseURL === 'string');


class MindmapServer {
	private server: Server;
  // OpenAI client is now created dynamically per request

	constructor() {
		this.server = new Server( { name: 'mindmap-server', version: '0.1.0' }, { capabilities: { resources: {}, tools: {} } } );
		this.setupToolHandlers();
		this.setupErrorHandling();
	}

	private setupErrorHandling() {
		this.server.onerror = (error) => console.error('[MCP Error]', error);
		process.on('SIGINT', async () => {
			await this.server.close();
			process.exit(0);
		});
	}

	private setupToolHandlers() {
		// List available tools
		this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
			tools: [
				{ name: 'generate_mindmap', description: 'Generate a mind map from Markdown text using markmap-cli and return the content.', inputSchema: { type: 'object', properties: { markdown: { type: 'string', description: 'The Markdown content for the mind map.' }, outputFormat: { type: 'string', enum: ['html', 'svg'], description: 'The desired output format (html or svg). Defaults to html.', default: 'html' } }, required: ['markdown'] } },
        { name: 'generate_and_save_mindmap', description: 'Generate a mind map from Markdown and save it to a specified directory.', inputSchema: { type: 'object', properties: { markdown: { type: 'string', description: 'The Markdown content for the mind map.' }, outputFormat: { type: 'string', enum: ['html', 'svg'], description: 'The desired output format (html or svg). Defaults to html.', default: 'html' }, outputDir: { type: 'string', description: 'Optional directory to save the output file. Defaults based on env var or home dir.' }, outputFilename: { type: 'string', description: 'Optional name for the output file. Defaults to markmap-<timestamp>.<format>.' } }, required: ['markdown'] } },
        { name: 'generate_relationship_graph', description: 'Generate a relationship graph from Mermaid syntax text and save it.', inputSchema: { type: 'object', properties: { mermaid_text: { type: 'string', description: 'The Mermaid syntax text defining the graph.' }, outputFormat: { type: 'string', enum: ['svg', 'png'], description: 'The desired output format (svg or png). Defaults to svg.', default: 'svg' }, outputDir: { type: 'string', description: 'Optional directory to save the output file. Defaults based on env var or home dir.' }, outputFilename: { type: 'string', description: 'Optional name for the output file. Defaults to mermaid-<timestamp>.<format>.' } }, required: ['mermaid_text'] } },
        { name: 'generate_knowledge_graph', description: 'Analyzes Markdown text using an AI model to generate and save a knowledge graph (Mermaid format). Supports OpenAI-compatible APIs.', inputSchema: { type: 'object', properties: { markdown: { type: 'string', description: 'The Markdown text to analyze.' }, outputFormat: { type: 'string', enum: ['svg', 'png'], description: 'Output format (svg/png). Defaults to svg.', default: 'svg' }, outputDir: { type: 'string', description: 'Optional directory to save the output file. Defaults based on env var or home dir.' }, outputFilename: { type: 'string', description: 'Optional name for the output file. Defaults to knowledge-graph-<timestamp>.<format>.' }, prompt: { type: 'string', description: 'Optional custom prompt for the AI model.' }, model: { type: 'string', description: 'Optional AI model name. Defaults to gpt-3.5-turbo.', default: 'gpt-3.5-turbo' }, apiKey: { type: 'string', description: 'Optional API key. Overrides OPENAI_API_KEY env var.' }, baseURL: { type: 'string', description: 'Optional API base URL. Overrides OPENAI_BASE_URL env var.' } }, required: ['markdown'] } }
			],
		}));

		// Handle tool calls
		this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
			const toolName = request.params.name;
			const args = request.params.arguments;

      // --- Resolve common paths ---
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      // --- Helper function to determine save path ---
      const determineSavePath = (dirArg: string | undefined, defaultFilenamePrefix: string, format: string, filenameArg?: string): string => {
        let targetDir: string;
        if (dirArg) {
          targetDir = path.resolve(dirArg);
        } else if (process.env.MINDMAP_DEFAULT_SAVE_DIR) {
          targetDir = path.resolve(process.env.MINDMAP_DEFAULT_SAVE_DIR);
        } else {
          targetDir = os.homedir();
        }
        const targetFilename = filenameArg || `${defaultFilenamePrefix}-${Date.now()}.${format}`;
        return path.join(targetDir, targetFilename);
      };

      // --- Tool Logic ---
			if (toolName === 'generate_mindmap') {
				if (!isValidGenerateArgs(args)) throw new McpError(ErrorCode.InvalidParams, 'Invalid args for generate_mindmap.');
				const { markdown, outputFormat = 'html' } = args;
				const tempDir = os.tmpdir();
				const uniqueId = crypto.randomUUID();
				const tempMdFile = path.join(tempDir, `markmap-${uniqueId}.md`);
				const tempOutputFile = path.join(tempDir, `markmap-${uniqueId}.${outputFormat}`);
				try {
					await writeFile(tempMdFile, markdown, 'utf8');
					await execa('markmap', [tempMdFile, `--output`, tempOutputFile], { preferLocal: true });
					const outputContent = await readFile(tempOutputFile, 'utf8');
					return { content: [{ type: 'text', text: outputContent }] };
				} catch (error: any) {
					let msg = 'Error generating mind map'; error.stderr && (msg += `: ${error.stderr}`); error.message && (msg += `: ${error.message}`); console.error(msg, error);
					return { content: [{ type: 'text', text: msg }], isError: true };
				} finally {
					try { await unlink(tempMdFile); } catch {} try { await unlink(tempOutputFile); } catch {}
				}

			} else if (toolName === 'generate_and_save_mindmap') {
        if (!isValidGenerateAndSaveArgs(args)) throw new McpError(ErrorCode.InvalidParams, 'Invalid args for generate_and_save_mindmap.');
        const { markdown, outputFormat = 'html', outputDir, outputFilename } = args;
        const finalOutputPath = determineSavePath(outputDir, 'markmap', outputFormat, outputFilename);
        const tempDir = os.tmpdir();
				const uniqueId = crypto.randomUUID();
				const tempMdFile = path.join(tempDir, `markmap-save-${uniqueId}.md`);
        try {
          await mkdir(path.dirname(finalOutputPath), { recursive: true });
          await writeFile(tempMdFile, markdown, 'utf8');
          await execa('markmap', [tempMdFile, `--output`, finalOutputPath], { preferLocal: true });
          return { content: [{ type: 'text', text: `Mind map successfully saved to: ${finalOutputPath}` }] };
        } catch (error: any) {
          let msg = `Error saving mind map to ${finalOutputPath}`; error.stderr && (msg += `: ${error.stderr}`); error.message && (msg += `: ${error.message}`); console.error(msg, error);
          return { content: [{ type: 'text', text: msg }], isError: true };
        } finally {
          try { await unlink(tempMdFile); } catch {}
        }

      } else if (toolName === 'generate_relationship_graph') {
        if (!isValidGraphArgs(args)) throw new McpError(ErrorCode.InvalidParams, 'Invalid args for generate_relationship_graph.');
        const { mermaid_text, outputFormat = 'svg', outputDir, outputFilename } = args;
        const finalOutputPath = determineSavePath(outputDir, 'mermaid', outputFormat, outputFilename);
        const tempDir = os.tmpdir();
				const uniqueId = crypto.randomUUID();
				const tempMmdFile = path.join(tempDir, `mermaid-save-${uniqueId}.mmd`);
        try {
          await mkdir(path.dirname(finalOutputPath), { recursive: true });
          await writeFile(tempMmdFile, mermaid_text, 'utf8');
          await execa('mmdc', ['-i', tempMmdFile, '-o', finalOutputPath], { preferLocal: true });
          return { content: [{ type: 'text', text: `Relationship graph successfully saved to: ${finalOutputPath}` }] };
        } catch (error: any) {
          // 改进错误处理
          let detailedError = error instanceof Error ? error.stack : JSON.stringify(error); // 获取更详细的错误信息
          let msg = `Error saving relationship graph to ${finalOutputPath}. Details: ${detailedError}`;
          console.error(msg, error); // 仍然在控制台打印原始错误
          return { content: [{ type: 'text', text: msg }], isError: true };
        } finally {
          try { await unlink(tempMmdFile); } catch {}
        }

      } else if (toolName === 'generate_knowledge_graph') {
        if (!isValidKnowledgeGraphArgs(args)) throw new McpError(ErrorCode.InvalidParams, 'Invalid args for generate_knowledge_graph.');

        // Determine API Key and Base URL: Prioritize args > env vars
        const apiKey = args.apiKey || process.env.OPENAI_API_KEY;
        const baseURL = args.baseURL || process.env.OPENAI_BASE_URL || undefined;

        if (!apiKey) {
          throw new McpError(ErrorCode.InternalError, 'API key is required but not found. Provide it via arguments or set OPENAI_API_KEY env var in MCP settings.');
        }

        // Initialize OpenAI client dynamically
        const openai = new OpenAI({ apiKey, baseURL });

        // Determine model: args > env > default
        const model = args.model || process.env.OPENAI_DEFAULT_MODEL || 'gpt-3.5-turbo';

        const { markdown, outputFormat = 'svg', outputDir, outputFilename, prompt: customPrompt } = args;
        const finalOutputPath = determineSavePath(outputDir, 'knowledge-graph', outputFormat, outputFilename);

        // Updated prompt with specific Mermaid syntax guidance
        const systemPrompt = customPrompt || `Analyze the following Markdown text. Identify the key entities (people, software, concepts) and their relationships. Generate Mermaid code (using 'graph LR' or 'graph TD') to represent this as a knowledge graph.
Key requirements for the Mermaid code:
1.  Represent entities as nodes. Use appropriate node shapes (e.g., ((circle)) for people/concepts, [rectangle] for software/servers). Define node IDs clearly (e.g., Roo, mindmap_server).
2.  Represent relationships using arrows. **Crucially, relationship labels MUST be placed on the arrow using the format: -->|Relationship Label| -->**. Do NOT use --> "Relationship Label" -->.
3.  Ensure the output contains ONLY the Mermaid code block (starting with \`\`\`mermaid and ending with \`\`\`) and absolutely nothing else before or after it.`;

        try {
          // 1. Call OpenAI API (use dynamically created client)
          console.log(`Calling AI API (model: ${model}, baseURL: ${baseURL || 'default'}) to generate Mermaid code...`);
          const completion = await openai.chat.completions.create({
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: markdown }],
            model: model, // Use the determined model
            temperature: 0.3,
          });
          const aiResponse = completion.choices[0]?.message?.content;
          if (!aiResponse) throw new Error('AI model did not return a valid response.');
          console.log("AI Response received.");

          // 2. Extract Mermaid code
          const mermaidMatch = aiResponse.match(/```mermaid\s*([\s\S]*?)\s*```/);
          if (!mermaidMatch || !mermaidMatch[1]) {
            console.error("Could not extract Mermaid code from AI response:", aiResponse);
            throw new Error('Could not extract Mermaid code from AI response. Response was:\n' + aiResponse);
          }
          const mermaidText = mermaidMatch[1].trim();
          console.log("Extracted Mermaid Code:\n", mermaidText);

          // 3. Render and Save using mmdc
          const tempDir = os.tmpdir();
          const uniqueId = crypto.randomUUID();
          const tempMmdFile = path.join(tempDir, `kg-mermaid-${uniqueId}.mmd`);
          try {
            await mkdir(path.dirname(finalOutputPath), { recursive: true });
            await writeFile(tempMmdFile, mermaidText, 'utf8');
            await execa('mmdc', ['-i', tempMmdFile, '-o', finalOutputPath], { preferLocal: true });
            return { content: [{ type: 'text', text: `Knowledge graph successfully generated and saved to: ${finalOutputPath}` }] };
          } catch (renderError: any) {
            let msg = `Error rendering/saving generated knowledge graph to ${finalOutputPath}`; renderError.stderr && (msg += `: ${renderError.stderr}`); renderError.message && (msg += `: ${renderError.message}`); console.error(msg, renderError);
            msg += `\n\nGenerated Mermaid Code:\n${mermaidText}`; // Include mermaid code in error
            return { content: [{ type: 'text', text: msg }], isError: true };
          } finally {
            try { await unlink(tempMmdFile); } catch {}
          }
        } catch (error: any) {
          let msg = `Error generating knowledge graph using AI model ${model}`; error.response && (msg += `: ${JSON.stringify(error.response.data)}`); error.message && (msg += `: ${error.message}`); console.error(msg, error);
          return { content: [{ type: 'text', text: msg }], isError: true };
        }

      } else {
				throw new McpError( ErrorCode.MethodNotFound, `Unknown tool: ${toolName}` );
			}
		});
	}

	async run() {
		const transport = new StdioServerTransport();
		await this.server.connect(transport);
		console.error('Mindmap MCP server running on stdio');
	}
}

// Create and run the server
const server = new MindmapServer();
server.run().catch(console.error);