# BalmSharedMCP 项目全方位战略分析与发展建议

## 核心问题快速解答

**1. 采用 MCP 的方式提供服务，这个方向正确吗？**
**完全正确，但定位需要调整。**
MCP (Model Context Protocol) 是一种“能力接口”标准。它的最大优势是**生态通用性**——只要你的工具遵循 MCP 协议，无论是 Cursor、Claude Desktop 还是 Gemini CLI，都可以无缝接入。这为你的脚手架和代码库提供了一个标准的、平台无关的 API 接口。

**2. 是否需要改用或同时支持 Skills 对于 AI Agent 效果更好？**
**强烈建议同时支持（Hybrid 模式）。**
*   **MCP 是 Agent 的“手和眼”**：提供读写文件、查询配置、分析目录等确定性的原子能力。
*   **Skills (如 Gemini CLI Skills 或 Cursor Rules) 是 Agent 的“大脑和SOP(标准作业程序)”**：提供意图理解、工作流编排和特定的 Prompt 约束。

单纯依靠 MCP，AI 往往不知道*何时*以及*如何组合*这些工具。通过编写对应的 Skill Markdown 文件，你可以指导 AI：“当用户要求创建列表页时，请先调用 `query_component` 了解当前项目结构，然后调用 `get_best_practices` 获取代码规范，最后利用基础的写入工具生成代码”。

**3. 为什么当前开发调试过程漫长，维护成本高？**
核心原因是**过度工程化了代码生成逻辑（The Template Trap）**。
在最近的调试中，我们花了大量时间处理正则表达式（如匹配 `{{#if}}` 嵌套、提取 `handleAction`、处理末尾的分号 `};`、以及精准插入 `index.js`）。
当前的架构是**传统脚手架思维**：在 Node.js 中维护庞大的字符串模板和复杂的正则替换逻辑。这种方式在面临业务场景的多样性时极其脆弱，稍微的格式变化就会导致正则失效，从而带来巨大的测试和维护成本（例如你需要维护 600+ 个单元测试来保证字符串拼接的正确性）。

---

## 深度发展建议：向“Agentic（智能体化）”架构演进

为了大幅降低维护成本并提升工具的上限，建议将项目从**“代码生成器（Code Generator）”**转型为**“上下文提供者与行动执行者（Context Provider & Action Executor）”**。

### 1. 架构范式转换 (Paradigm Shift)

*   **当前模式 (Rigid)**：`User Prompt -> MCP Tool (包含巨大的 Handlebars 模板 + 复杂的正则注入) -> 生成文件`
*   **推荐模式 (Agentic)**：`User Prompt -> Agent 规划 -> MCP Tools (获取项目规范、现有代码模式) -> Agent 生成代码文本 -> MCP Tool (简单安全地将文本写入文件)`

**为什么这样更好？**
LLM (如 Claude 3.5 Sonnet / Gemini 1.5 Pro) 本身就是世界上最强大的“模板引擎”和“代码生成器”。将写 Vue 代码的逻辑硬编码在 Node.js 字符串里，是在**用短处去替代 LLM 的长处**。你应该让 MCP 负责提供极其准确的上下文，让 LLM 负责写代码。

### 2. 重构 MCP 工具箱 (Tools Redesign)

建议精简庞大的 `generate_page_component` 和 `generate_crud_module`，将其拆解为更小、更原子的工具。

**A. 强化“读”的能力 (Context Tools)**
*   `analyze_project_context(path)`: 智能返回项目的别名配置、当前 `roots.source`、路由规范等。
*   `get_framework_rules(topic)`: 返回 BalmUI Pro 的 Markdown 格式说明（现在的 `get_best_practices` 方向很对，继续强化，直接给 LLM 看 Markdown 远比在 JS 里拼接对象有用）。
*   `extract_local_pattern(file_type)`: 提供项目中已有的同类文件的代码切片，供 LLM 模仿（Few-shot prompting）。

**B. 简化“写”的能力 (Action Tools)**
放弃在 MCP 中做复杂的正则内容合并，改为提供结构化的修改工具：
*   `scaffold_module_structure(moduleName)`: 只负责创建目录结构（apis, pages, routes 等），不写业务代码。
*   `ast_insert_import(filePath, importStatement)`: 如果必须在 MCP 中修改现有文件（如 `index.js`），放弃正则表达式，改用 AST（抽象语法树，如 Babel parser 或 jscodeshift）来安全地注入依赖。
*   `write_component(filePath, content)`: 接收 LLM 生成的完整字符串并写入，附带基础的 ESLint/Prettier 格式化检查。

### 3. 构建强大的 Skills 系统

开发一系列配套的 Skills 文档（如 `balm-developer-skill.md`），这是降低用户使用门槛的关键。

在 Skill 规范中明确定义工作流：
```markdown
# BalmUI Pro 业务模块开发指南 (Agent Skill)

## 工作流 (Workflow)
当用户要求新建模块时，你必须严格遵循以下步骤：
1. **环境侦测**：调用 `analyze_project_context` 获取当前项目的 `app` 路径和 `balmrc` 设定。
2. **规范获取**：调用 `get_framework_rules` 获取 `ui-list-view` 和 `ui-detail-view` 的最新要求。
3. **代码生成**：基于规范，结合用户提供的模型字段，**由你(Agent)**生成 Vue 组件代码。必须注意 `model-config` 和 `model-path` 互斥。
4. **安全写入**：调用 `write_component` 将你生成的代码写入目标路径。
5. **路由/API注册**：调用 `ast_insert_import` 更新对应的 `index.js`。
```
通过这种方式，你把业务逻辑的复杂性交给了自然语言和 LLM 强大的理解力，而不是 Node.js 中脆弱的代码逻辑。

### 4. 短期降本增效建议 (Quick Wins)

如果你希望在当前架构下继续迭代，以下措施可以立即降低维护成本：
1. **全面替换正则注入**：对于 `updateRoutesIndex`、`updateApiIndex` 等操作，当前的字符串 `split` 和正则匹配极易崩溃。引入简单的 AST 操作库（如 `magicast`），或者提供一套明确的注入锚点（如在模板中预留 `// --- INJECT_ROUTES_HERE ---`），让正则匹配变得确定且唯一。
2. **剥离模板代码**：将 JS 文件中的超长字符串模板抽离为单独的 `.hbs` 或 `.ejs` 文件，这会让你的 Node.js 代码可读性大幅提升，且不易在转义字符上出错。
3. **引入 E2E 测试而非纯 Mock 测试**：你现在有 600+ 个单元测试，很多是在测 Mock 对象的调用逻辑。建立一个真实的空 BalmJS 临时项目，运行一遍 MCP 生成指令，然后用 `tsc` 或 `eslint` 跑一遍生成出来的文件，这种黑盒 E2E 测试更能反映工具的真实质量，且维护成本比维护一堆 mock 状态低得多。

### 总结

你的初衷非常有价值，结合 AI Agent 快速搭建和维护 Balm 体系项目是提升团队效能的利器。
*   **坚持 MCP 作为底层基建。**
*   **引入 Skills 作为业务大脑。**
*   **核心战略转变：少写“模板生成器”，多写“上下文提供器”。让 LLM 去写代码，让 MCP 去搭台子。**

这不仅能让你摆脱陷入正则表达式和分号调试的泥潭，还能让你的工具能够利用未来越来越强大的基础大模型能力。