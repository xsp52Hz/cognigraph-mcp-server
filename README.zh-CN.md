# 思维导图 MCP 服务器

这是一个模型上下文协议 (MCP) 服务器，旨在使用外部命令行工具 (`markmap-cli` 和 `@mermaid-js/mermaid-cli`) 以及通过兼容 OpenAI 的 API 进行 AI 分析来生成思维导图和关系图谱。

## 功能

提供可通过 MCP `use_mcp_tool` 命令访问的多个工具：

1.  **`generate_mindmap`**:
    *   从 Markdown 文本生成思维导图。
    *   直接返回生成的 HTML 或 SVG 内容。
    *   输入: `markdown` (字符串, 必需), `outputFormat` (枚举: "html" | "svg", 可选, 默认: "html")。

2.  **`generate_and_save_mindmap`**:
    *   从 Markdown 文本生成思维导图。
    *   将结果 (HTML 或 SVG) 保存到文件。
    *   输入: `markdown` (字符串, 必需), `outputFormat` (枚举: "html" | "svg", 可选, 默认: "html"), `outputDir` (字符串, 可选), `outputFilename` (字符串, 可选)。
    *   默认保存位置由 `MINDMAP_DEFAULT_SAVE_DIR` 环境变量确定，如果未设置则回退到用户的主目录。

3.  **`generate_relationship_graph`**:
    *   从 Mermaid 语法的文本生成关系图谱。
    *   将结果 (SVG 或 PNG) 保存到文件。
    *   输入: `mermaid_text` (字符串, 必需), `outputFormat` (枚举: "svg" | "png", 可选, 默认: "svg"), `outputDir` (字符串, 可选), `outputFilename` (字符串, 可选)。
    *   默认保存位置由 `MINDMAP_DEFAULT_SAVE_DIR` 环境变量确定，如果未设置则回退到用户的主目录。

4.  **`generate_knowledge_graph`**:
    *   使用 AI 模型（通过兼容 OpenAI 的 API）分析 Markdown 文本。
    *   生成表示知识图谱的 Mermaid 代码。
    *   将 Mermaid 代码渲染成图像 (SVG 或 PNG) 并保存到文件。
    *   输入: `markdown` (字符串, 必需), `outputFormat` (枚举: "svg" | "png", 可选, 默认: "svg"), `outputDir` (字符串, 可选), `outputFilename` (字符串, 可选), `prompt` (字符串, 可选), `model` (字符串, 可选), `apiKey` (字符串, 可选), `baseURL` (字符串, 可选)。
    *   需要配置 API 访问权限（见下文）。默认保存位置遵循与其他保存工具相同的逻辑。

## 配置 (通过 MCP 设置 `env`)

服务器可以通过 MCP 客户端的设置文件（例如 `mcp_settings.json`）中的环境变量进行配置：

*   `MINDMAP_DEFAULT_SAVE_DIR`: (可选) 设置保存文件的工具在未于工具参数中指定 `outputDir` 时的默认输出目录。如果未设置，则默认为用户的主目录。
*   `OPENAI_API_KEY`: (运行 `generate_knowledge_graph` 时必需) 用于 OpenAI 或兼容服务的 API 密钥。可以在工具调用时通过 `apiKey` 参数覆盖。
*   `OPENAI_BASE_URL`: (可选) 兼容 OpenAI 的 API 端点的基础 URL。如果未设置，则默认为 OpenAI 官方 API。可以在工具调用时通过 `baseURL` 参数覆盖。
*   `OPENAI_DEFAULT_MODEL`: (可选) 如果未在工具参数中指定，则为 `generate_knowledge_graph` 使用的默认 AI 模型名称。默认为 `gpt-3.5-turbo`。

`mcp_settings.json` 配置示例：

```json
{
  "mcpServers": {
    "mindmap-server": {
      "command": "node",
      "args": [
        "/path/to/mindmap-server/build/index.js" // 根据实际情况调整路径
      ],
      "env": {
        "MINDMAP_DEFAULT_SAVE_DIR": "C:\\Users\\YourUser\\Desktop",
        "OPENAI_API_KEY": "sk-...",
        "OPENAI_BASE_URL": "http://localhost:11434/v1", // 本地 Ollama 示例
        "OPENAI_DEFAULT_MODEL": "llama3"
      },
      "disabled": false,
      "alwaysAllow": []
    }
    // ... 其他服务器
  }
}
```

## 安装设置

1.  克隆此仓库（或确保你拥有项目文件）。
2.  进入 `mindmap-server` 目录。
3.  安装依赖：`npm install`
4.  编译 TypeScript 代码：`npm run build`
5.  如上所示，在你的 MCP 客户端设置文件中配置服务器，确保设置正确的 `build/index.js` 路径并提供必要的环境变量（特别是如果使用知识图谱工具，需要 `OPENAI_API_KEY`）。
6.  重启你的 MCP 客户端以加载服务器。

## 使用方法

通过你的 MCP 客户端的 `use_mcp_tool` 功能来使用这些工具。有关参数，请参阅上面的工具描述。