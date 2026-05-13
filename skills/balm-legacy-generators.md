# BalmSharedMCP Legacy Generators Skill (传统生成工具)

## ⚠️ 架构声明 (Deprecation Notice)
你是熟悉旧版脚手架规范的维护专家。当前说明中列出的 `generate_*` 系列工具属于 **Legacy (遗留) 架构**。
虽然它们仍然可以正常工作并被维护，但它们的内部逻辑是一个封闭的黑盒（包含了大量的 Handlebars 模板拼接和复杂的正则更新）。

在**可能的情况下，优先使用 Agentic Workflow**（结合 Context Tools 和 Action Tools）让 LLM 自行生成代码。仅在用户明确要求“一键生成某模块”，且不需要高度定制化代码风格时，才使用本工具集。

## 🛠️ 工具箱说明 (Tools Reference)

### 1. `create_project(name, type, path, referenceProject)`
*   **用途**：创建一个全新的前端 (frontend) 或后端 (backend) 项目骨架。
*   **特性**：可以基于官方模板 (`balm init`)，也可以通过 `referenceProject` 复制一个现有的成熟项目结构。

### 2. `analyze_project(path)`
*   **用途**：对一个已经存在的遗留项目进行深度体检。
*   **预期输出**：项目结构健康度、缺失的核心配置文件警告，以及是否成功集成了 `balm-shared` 的诊断报告。

### 3. `generate_crud_module(module, model, fields, projectPath)`
*   **用途**：一键生成一个完整的标准 CRUD 业务线。
*   **执行行为**：它在后台黑盒中会自动生成列表页、详情页、路由配置、API 定义、ModelConfig 以及 Mock 数据，并尝试使用内置的正则和基础 AST 更新所有相关的 `index.js`。
*   **风险提示**：如果目标项目的 `index.js` 结构非常非标，可能会导致注入失败。

### 4. `generate_page_component(name, type, model, projectPath)`
*   **用途**：一键生成单一的列表页 (list) 或详情页 (detail) 组件。
*   **特性**：内置了与 BalmUI Pro Legacy 严格对齐的基础模板逻辑，包括 `getModelData` 和统一的 `handleAction`。生成 `.vue` 文件的同时，会自动在正确的目录提取并生成 `.scss` 样式文件。

### 5. `generate_model_config(name, fields, projectPath, formLayout, submitText, cancelText)`
*   **用途**：专门用于生成给详情页或表单页使用的 `model-config` 配置文件。

## 📋 遗留模式工作流 (Legacy Workflow Guide)

如果用户明确要求使用旧有工具链：
1. 直接调用对应的 `generate_*` 工具，传入所需的所有结构化参数（如字段数组 `fields: [{name: 'id', type: 'number', component: 'ui-textfield'}]`）。
2. 工具会返回一个执行摘要。如果发生由于路径不规范或正则匹配失败导致的警告，请立即向用户报告，并提出改用“读取文件 -> 手动生成 -> 覆写文件”的 Agentic 修复方案。
