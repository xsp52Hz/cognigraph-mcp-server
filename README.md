# Mindmap MCP Server (mindmap-mcp-server)

This is a Model Context Protocol (MCP) server designed to generate mind maps and relationship graphs using external CLI tools (`markmap-cli` and `@mermaid-js/mermaid-cli`) and AI analysis via OpenAI-compatible APIs.

## Features

Provides several tools accessible via the MCP `use_mcp_tool` command:

1.  **`generate_mindmap`**:
    *   Generates a mind map from Markdown text.
    *   Returns the resulting HTML or SVG content directly.
    *   Input: `markdown` (string, required), `outputFormat` (enum: "html" | "svg", optional, default: "html").

2.  **`generate_and_save_mindmap`**:
    *   Generates a mind map from Markdown text.
    *   Saves the result (HTML or SVG) to a file.
    *   Input: `markdown` (string, required), `outputFormat` (enum: "html" | "svg", optional, default: "html"), `outputDir` (string, optional), `outputFilename` (string, optional).
    *   Default save location is determined by `MINDMAP_DEFAULT_SAVE_DIR` environment variable, falling back to the user's home directory.

3.  **`generate_relationship_graph`**:
    *   Generates a relationship graph from Mermaid syntax text.
    *   Saves the result (SVG or PNG) to a file.
    *   Input: `mermaid_text` (string, required), `outputFormat` (enum: "svg" | "png", optional, default: "svg"), `outputDir` (string, optional), `outputFilename` (string, optional).
    *   Default save location is determined by `MINDMAP_DEFAULT_SAVE_DIR` environment variable, falling back to the user's home directory.

4.  **`generate_knowledge_graph`**:
    *   Analyzes Markdown text using an AI model (via OpenAI-compatible API).
    *   Generates Mermaid code representing the knowledge graph.
    *   Renders the Mermaid code to an image (SVG or PNG) and saves it to a file.
    *   Input: `markdown` (string, required), `outputFormat` (enum: "svg" | "png", optional, default: "svg"), `outputDir` (string, optional), `outputFilename` (string, optional), `prompt` (string, optional), `model` (string, optional), `apiKey` (string, optional), `baseURL` (string, optional).
    *   Requires API access configuration (see below). Default save location follows the same logic as other save tools.

## Configuration (via MCP Settings `env`)

The server can be configured using environment variables within the MCP client's settings file (e.g., `mcp_settings.json`):

*   `MINDMAP_DEFAULT_SAVE_DIR`: (Optional) Sets the default directory where tools saving files will place their output if `outputDir` is not specified in the tool arguments. Defaults to the user's home directory if not set.
*   `OPENAI_API_KEY`: (Required for `generate_knowledge_graph`) Your API key for the OpenAI or compatible service. Can be overridden by the `apiKey` argument in the tool call.
*   `OPENAI_BASE_URL`: (Optional) The base URL for the OpenAI-compatible API endpoint. Defaults to the official OpenAI API if not set. Can be overridden by the `baseURL` argument in the tool call.
*   `OPENAI_DEFAULT_MODEL`: (Optional) The default AI model name to use for `generate_knowledge_graph` if not specified in the tool arguments. Defaults to `gpt-3.5-turbo`.

Example `mcp_settings.json` entry:

```json
{
  "mcpServers": {
    "mindmap-server": {
      "command": "node",
      "args": [
        "/path/to/mindmap-server/build/index.js" // Adjust path accordingly
      ],
      "env": {
        "MINDMAP_DEFAULT_SAVE_DIR": "C:\\Users\\YourUser\\Desktop",
        "OPENAI_API_KEY": "sk-...",
        "OPENAI_BASE_URL": "http://localhost:11434/v1", // Example for local Ollama
        "OPENAI_DEFAULT_MODEL": "llama3"
      },
      "disabled": false,
      "alwaysAllow": []
    }
    // ... other servers
  }
}
```

## Setup

1.  Clone this repository (or ensure you have the project files).
2.  Navigate to the `mindmap-server` directory.
3.  Install dependencies: `npm install`
4.  Compile the TypeScript code: `npm run build`
5.  Configure the server in your MCP client's settings file as shown above, making sure to set the correct path to `build/index.js` and provide necessary environment variables (especially `OPENAI_API_KEY` if using the knowledge graph tool).
6.  Restart your MCP client to load the server.

## Usage

Use the tools via your MCP client's `use_mcp_tool` functionality. Refer to the tool descriptions above for arguments.