# AI Agent 智能体使用示例 (Agentic Workflow)

本文档展示 AI 助手（如 Claude、Cursor、Gemini CLI）在加载了 `balm-developer-skill.md` (Agent Skill) 后，如何以智能体（Agentic）的方式配合 BalmSharedMCP 完成复杂的业务开发任务。

## 核心理念：从“工具调用”到“工作流编排”

在传统的代码生成器模式下，用户需要手动调用一个“大而全”的生成工具。而在 Agentic 架构下，用户只需发出自然语言指令，AI 会作为“大脑”，通过组合调用多个原子化的 MCP 工具（作为“手眼”）来完成任务。

---

## 典型开发工作流示例

### 场景 1：按照团队规范生成商品列表页

**用户请求 (User Prompt)：**
> "我需要在 my-shop 项目中开发一个商品（Product）列表页面。请参考当前的团队规范和已有的订单列表页写法帮我生成。"

**AI 智能体的思考与操作过程 (Agent Trajectory)：**

1.  **阶段一：侦测环境与规范 (Context Gathering)**
    *   **AI 思考**："首先，我需要知道这个项目的根目录在哪里，以及它的标准代码规范是什么。"
    *   *AI 调用工具：* `analyze_project_context(path: "/Users/dev/company/my-shop")`
    *   *AI 调用工具：* `get_best_practices(topic: "component-usage")`
    *   **AI 思考**："用户让我参考订单列表页，我需要去拉取那个页面的代码切片学习它的 Action 配置。"
    *   *AI 调用工具：* `extract_local_pattern(path: "/Users/dev/company/my-shop/app/scripts/pages/order/order-list.vue")`

2.  **阶段二：规划与生成代码 (LLM Generation)**
    *   **AI 思考**："我已经获取了 BalmUI Pro 的最新组件用法，也看到了本地项目的 `topActionConfig` 喜欢使用特定的图标，且没有使用 `style scoped`。现在我在大脑中生成完整的 Vue 代码文本。"

3.  **阶段三：安全写入 (Safe Execution)**
    *   **AI 思考**："代码生成完毕，现在我要将代码写入文件，并更新路由索引。"
    *   *AI 调用工具：* `write_component(path: ".../pages/product/product-list.vue", content: "<template>...")`
    *   *AI 调用工具：* `ast_insert_import(path: ".../routes/config.js", importStatement: "import { productRoutes } from './product';")`

**最终对用户的回复：**
> "我已经分析了您的项目结构，并参考了 `order-list.vue` 中的按钮图标风格。商品列表页面已经为您生成并写入到了 `app/scripts/pages/product/product-list.vue`，同时帮您在 `routes/config.js` 中注册了对应的路由。您可以直接运行预览了。"

---

### 场景 2：基于数据结构创建完整的 CRUD 模块

**用户请求 (User Prompt)：**
> "新增一个用户管理模块（User），包含 name (字符串), email (字符串), role (下拉单选)。请完整搭建相关的 API、Mock、页面和路由。"

**AI 智能体的思考与操作过程 (Agent Trajectory)：**

1.  **阶段一：读取项目约定**
    *   *AI 调用工具：* `analyze_project_context(path: "当前项目")`
    *   **AI 思考**："确认当前项目的源码根目录是 `src` 还是 `app`，确认接口的基础前缀是 `/api` 还是 `/v1`。"

2.  **阶段二：搭建骨架与生成代码**
    *   *AI 调用工具：* `scaffold_module_structure(moduleName: "user")`
    *   **AI 思考**："根据用户提供的 name, email, role，我将逐一生成 ModelConfig、List 页面、Detail 页面、Mock API 文件的代码文本。"

3.  **阶段三：多文件并发写入与 AST 注册**
    *   *AI 调用并发写入工具：* 分别调用 `write_component` 写入 `model-config/user.js`, `user-list.vue`, `user-detail.vue` 等 4 个文件。
    *   *AI 调用安全注册工具：*
        *   `ast_insert_import(path: ".../apis/index.js", ...)`
        *   `ast_insert_import(path: ".../mock-server/apis/index.js", ...)`
        *   `ast_insert_import(path: ".../styles/pages/_index.scss", ...)`

**最终对用户的回复：**
> "用户管理模块的 CRUD 脚手架已搭建完毕。包含列表、详情页面，以及对应的 API 声明和 Mock 数据。代码严格遵循了 BalmUI Pro 的 `model-config` 和 `get-model-data-fn` 最佳实践，相关的依赖也已经通过 AST 安全地注册到了各类 `index.js` 中。"

---

## 为何使用 Agentic 工作流？

1.  **高度容错**：AI 在执行每一步前都会通过读取真实代码来“验证”自己的理解，而不是依赖可能会过期或冲突的硬编码模板。
2.  **精准模仿**：通过 Few-shot 技术（提取本地模式），AI 生成的代码不仅语法正确，而且“代码品味”完全契合你的团队历史遗留习惯。
3.  **安全可靠**：彻底摒弃了用正则表达式强行修改（如 `import` 追加）可能带来的语法树破坏问题。

*最后更新：2026-05*
