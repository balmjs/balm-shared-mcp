# BalmSharedMCP 全生命周期实战指南 (End-to-End Workflow)

本文档提供了一个从零开始、贯穿项目全生命周期的完整实战案例。通过本指南，开发者可以快速掌握如何利用 AI Agent 结合 BalmSharedMCP 的 12 个工具，实现极其高效的“智能体化”开发。

---

## 🌟 准备工作：为 AI 装备“大脑”

在开始任何操作之前，最关键的一步是给你的 AI Agent（如 Cursor, Claude, 或 Gemini CLI）加载专用的 **Agent Skills**。这些 Skills 会告诉 AI 应该如何思考、以及按什么顺序调用工具。

**操作方法：**
将 `skills/` 目录下的三个 Markdown 文件内容提供给 AI 作为 System Prompt 或 Rules：
*   `balm-context-tools.md` (必选：赋予 AI 读代码和检索规范的能力)
*   `balm-action-tools.md` (必选：赋予 AI 安全修改代码库的能力)
*   `balm-legacy-generators.md` (可选：赋予 AI 使用旧版一键生成黑盒的能力)

---

## 阶段一：从零起步 —— 创建全新项目

> 💡 **场景**：公司新立项了一个后台管理系统，你需要快速搭建一个集成了 `balm-shared` 库的 Vue 前端项目。

### 你的 Prompt 指令：
> "我需要创建一个名为 `merchant-admin` 的全新前端项目，位置在 `/Users/dev/projects/merchant-admin`。请基于公司现有的成熟项目 `/Users/dev/projects/old-admin` 作为参考模版进行创建。"

### AI Agent 的执行轨迹 (Trajectory)：
1.  **AI 分析**：识别到这是一个完整的项目级脚手架需求，决定调用 Legacy 工具集中的 `create_project`。
2.  **MCP 调用**：
    ```json
    {
      "name": "create_project",
      "arguments": {
        "name": "merchant-admin",
        "type": "frontend",
        "path": "/Users/dev/projects/merchant-admin",
        "referenceProject": "/Users/dev/projects/old-admin"
      }
    }
    ```
3.  **结果**：MCP 服务器使用复制模式（得益于传入了 `referenceProject` 参数），将成熟项目的结构、依赖配置、`config/balm.alias.js` 完美复刻，并在后台自动执行 `npm install`。

---

## 阶段二：业务爆发 —— 根据需求生成完整 CRUD 模块

> 💡 **场景**：项目初始化完毕。现在产品经理要求新增一个“商品管理 (Product)”模块，包含：商品名称 (名称)、价格 (数字)、上架状态 (开关)。

这是体验 **Agentic Workflow (智能体化工作流)** 强大之处的最佳场景。

### 你的 Prompt 指令：
> "根据产品需求，为我生成一个完整的商品(Product) CRUD 模块，字段包括：名称(name, 字符串)、价格(price, 数字)、状态(status, 布尔值)。
> 请使用智能体模式生成：先分析当前项目结构，然后提取 `user` 模块作为参考范例，最后生成相关的 List 页、Detail 页、API 和路由配置，并安全写入项目。"

### AI Agent 的执行轨迹 (Trajectory)：

**1. Context Gathering (环境侦测)**
*   **MCP 调用** `analyze_project_context({ path: "..." })` -> 获知项目的实际脚本路径是 `app/scripts`，路由配置在 `routes/config.js`。
*   **MCP 调用** `extract_local_pattern({ path: ".../pages/user/user-list.vue" })` -> 获取到了你团队喜欢在 `topActionConfig` 加上特定 class 的写法，以及 `rowActionConfig` 的图标偏好。

**2. Planning & LLM Generation (大脑思考与生成)**
*   AI 会在后台利用其强大的大模型能力，综合项目上下文和 BalmUI Pro 文档，生成 `product-list.vue`、`product-detail.vue`、`model-config/product.js` 等内容的纯文本。

**3. Action Execution (安全落地)**
*   **MCP 调用** `scaffold_module_structure({ moduleName: "product" })` -> 预建空文件夹。
*   **MCP 调用并发写入** `write_component(...)` -> 将生成的 Vue 和 SCSS 文件逐一格式化并写入硬盘。
*   **MCP 调用注入** `ast_insert_import({ filePath: ".../routes/config.js", importStatement: "import { productRoutes } from './product';", arrayName: "routes", arrayElement: "...productRoutes" })` -> 极其安全地将新路由挂载到入口文件中。

---

## 阶段三：精细化维护 —— 页面组件的更新与抽离

> 💡 **场景**：商品列表页已经跑起来了，但你现在想要把商品列表的“搜索表单”中复杂的级联选择器抽离成一个独立的共享业务组件（Plugin），并且你想确认 BalmUI Pro 的最新规范。

### 你的 Prompt 指令：
> "我想在商品列表页抽离一个独立的 `ProductCategorySelector` 业务组件。
> 1. 请先查询 Balm 体系下通用的下拉组件 `ui-select` 的 API。
> 2. 获取组件库推荐的最佳实践。
> 3. 帮我在 `app/scripts/components` 下创建该组件，并修改 `product-list.vue` 引入它。"

### AI Agent 的执行轨迹 (Trajectory)：

**1. Context Gathering (查阅文档)**
*   **MCP 调用** `query_component({ name: "ui-select", category: "form" })` -> AI 获得了详细的 Markdown 格式的 Props、Events 表格。
*   **MCP 调用** `get_best_practices({ topic: "component-usage" })` -> AI 学习到了如何优雅地封装受控组件（v-model 代理）。

**2. Action Execution (精准修改)**
*   **MCP 调用** `write_component({ filePath: ".../components/ProductCategorySelector.vue", content: "..." })` -> 写入封装好的高优 Vue 代码。
*   **MCP 调用** (可能会用到普通的 `read_file` 配合大模型的全量重写，或者如果后续支持局部修改的 `replace` 工具) -> 将 `product-list.vue` 中的老代码替换为新组件引入。

---

## 总结：掌控 AI 开发的节奏

通过上述生命周期，你可以发现：
*   **粗放型需求**（建项目）：适合一条指令搞定。
*   **复杂业务需求**（CRUD）：借助 MCP 的“上下文感知”和“安全 AST 注入”，AI 生成的代码不再是生搬硬套的模板，而是“长得就像老员工写出来的”企业级代码。
*   **精细化维护**（改组件）：AI 可以当做实时查阅文档的专家，保证每一行代码都符合框架的最佳实践。

**核心建议：**
永远记得让 AI **先看（Context Tools）再写（Action Tools）**。这就是 BalmSharedMCP 能够颠覆传统脚手架的核心秘密。