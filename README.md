# BalmSharedMCP

Model Context Protocol (MCP) server for intelligent interaction with the shared-project frontend resource library.

## 🚀 架构升级声明 (Agentic Workflow)

BalmSharedMCP 已全面升级为 **Agentic (智能体化)** 架构。我们不再推荐将 MCP 作为传统的、沉重的代码生成器使用。相反，我们鼓励 AI Agent（如 Claude、Cursor、Gemini CLI）结合 **Agent Skills** 配合细粒度的 MCP 工具来完成任务。

**工作流模式：**
1. **Agent 获取上下文**：使用 MCP 工具扫描目标项目的环境配置、路由规范以及已有的本地范例代码。
2. **Agent 规划与生成**：LLM 强大的模型能力作为“大脑”，负责拼装逻辑和编写组件代码文本。
3. **Agent 写入与注册**：使用 MCP 原子化的安全写入工具（AST Injection）将代码精准注入到项目中。

这种模式极大地降低了模板维护成本，并让生成的代码能够 100% 契合你项目的历史风格（Few-shot prompting）。

---

## 安装 (Installation)

```bash
# Install dependencies
npm install

# Set up Git hooks
npm run prepare
```

## 使用 (Usage)

你可以将此 MCP 挂载到任何兼容的客户端中（例如 Cursor 或 Claude Desktop）。
**为了获得最佳体验，请务必向你的 AI 助手加载 `skills/balm-developer-skill.md` 中的内容作为 System Prompt 或是 Rule。**

```bash
# Start the server
npm start
```

## MCP 工具列表 (Available Tools)

### 📖 上下文获取工具 (Context Gathering - 核心)
这类工具用于向 AI 提供充分的项目“前置知识”：
*   `analyze_project_context`: 智能分析当前项目的元数据 (如源码目录、路由规范等)
*   `extract_local_pattern`: 提取项目中已有的代码范例 (Few-shot)
*   `query_component`: 查询 balm-shared 组件信息与用法
*   `get_best_practices`: 获取官方组件规范与最佳实践

### 🛠️ 安全执行工具 (Action Execution - 核心)
这类工具将 AI 生成的代码安全地落盘：
*   `scaffold_module_structure`: 创建模块的基础空目录结构 (如 apis/, pages/)
*   `write_component`: 写入组件代码文本并进行基础语法格式化
*   `ast_insert_import`: 安全地向 JS/SCSS 索引文件中插入 import 语句或扩展数组（避免正则误伤）

### ⚠️ 传统生成工具 (Legacy Generators - 不推荐)
这些工具虽然仍然可用并被维护，但包含复杂的黑盒逻辑，不符合智能体化发展趋势，未来会被逐步淘汰：
*   `create_project`: 创建新项目
*   `generate_crud_module`: 传统的一键生成 CRUD 模块
*   `generate_page_component`: 传统的一键生成页面组件
*   `generate_model_config`: 生成表单配置文件

---

## 环境变量 (Environment Variables)

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `WORKSPACE_ROOT` | ✅ | Root directory of your workspace | `./` |
| `SHARED_LIBRARY_NAME` | ❌ | Name of the shared library | `my-shared` |
| `SHARED_LIBRARY_PATH` | ❌ | Override full path (takes priority) | - |
| `LOG_LEVEL` | ❌ | Logging level | `info` |

## 内部架构 (Architecture)

```text
src/
├── core/           # MCP server 核心注册表
├── handlers/       # AST 语法树操作与文件读写层
├── analyzers/      # 资源检索与本地代码模式提取
├── generators/     # [Legacy] 遗留的模板生成器
├── managers/       # [Legacy] 遗留的业务编排器
└── utils/          # 日志与错误规范
```

## 测试 (Testing)

本项目拥有 630+ 个单元测试，并且支持黑盒 E2E 测试。

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📚 更多文档 (Documentation)

- [全生命周期实战指南 (必读)](./docs/COMPLETE_WORKFLOW_GUIDE.md)
- [工具使用详情与 AI 示例](./docs/USAGE.md)
- [Agentic 架构重构分析报告](./docs/STRATEGIC_ANALYSIS.md)

## License

MIT License - see LICENSE file for details.
