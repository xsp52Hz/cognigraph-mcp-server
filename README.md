# CogniGraph MCP Server

This is a Model Context Protocol (MCP) server designed to generate mind maps, relationship graphs, and knowledge graphs using external CLI tools (`markmap-cli` and `@mermaid-js/mermaid-cli`) and AI analysis via OpenAI-compatible APIs.

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

The server relies on environment variables set within the MCP client's settings file (e.g., `mcp_settings.json`) for certain functionalities:

*   **`MINDMAP_DEFAULT_SAVE_DIR`**: (Optional) Sets the default directory for tools that save files (`generate_and_save_mindmap`, `generate_relationship_graph`, `generate_knowledge_graph`) if `outputDir` is not provided in the arguments.
    *   **If this variable is NOT set:** These tools will default to saving files in the user's home directory. The `generate_mindmap` tool (which returns content directly) remains unaffected.
*   **`OPENAI_API_KEY`**: (Required for `generate_knowledge_graph`) Your API key for the OpenAI or compatible service.
    *   **If this variable is NOT set (and not provided via `apiKey` argument):** The `generate_knowledge_graph` tool will fail. Other tools are unaffected.
*   **`OPENAI_BASE_URL`**: (Optional) The base URL for the OpenAI-compatible API endpoint. Defaults to the official OpenAI API if not set. Only relevant for `generate_knowledge_graph`.
*   **`OPENAI_DEFAULT_MODEL`**: (Optional) The default AI model name for `generate_knowledge_graph`. Defaults to `gpt-3.5-turbo` if not set. Only relevant for `generate_knowledge_graph`.

**Important Notes on Configuration:**
*   The `generate_mindmap` tool (Tool 1) does not depend on any of these environment variables.
*   Tools 2 and 3 (`generate_and_save_mindmap`, `generate_relationship_graph`) depend only on `MINDMAP_DEFAULT_SAVE_DIR` for their *default* save location. They still function (saving to the home directory) if it's not set.
*   Tool 4 (`generate_knowledge_graph`) **requires** `OPENAI_API_KEY` (either via env var or argument) to function at all. It also uses the other `OPENAI_*` variables and `MINDMAP_DEFAULT_SAVE_DIR`.

Example `mcp_settings.json` entry:

```json
{
  "mcpServers": {
    "cognigraph-mcp-server": { // Ensure server name matches
      "command": "node",
      "args": [
        "/path/to/cognigraph-mcp-server/build/index.js" // Adjust path accordingly
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

1.  Clone this repository.
2.  **(Manual Step)** Rename the cloned directory from `mindmap-server` to `cognigraph-mcp-server`.
3.  Navigate into the `cognigraph-mcp-server` directory.
4.  Install dependencies: `npm install`
5.  Compile the TypeScript code: `npm run build`
6.  Configure the server in your MCP client's settings file as shown above, ensuring the server name (`cognigraph-mcp-server`) and path in `args` are correct. Provide necessary environment variables.
7.  Restart your MCP client to load the server.

## Usage

Use the tools via your MCP client's `use_mcp_tool` functionality. Refer to the tool descriptions above for arguments.