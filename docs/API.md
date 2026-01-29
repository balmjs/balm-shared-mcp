# BalmSharedMCP API 文档

## 概述

BalmSharedMCP 是一个 Model Context Protocol (MCP) 服务器，为 AI 助手提供与自定义前端资源共享库(shared-project)的智能交互能力。本文档详细介绍了所有可用的 MCP 工具接口。

## 目录

- [安装和配置](#安装和配置)
- [MCP 工具接口](#mcp-工具接口)
  - [项目管理工具](#项目管理工具)
  - [代码生成工具](#代码生成工具)
  - [资源查询工具](#资源查询工具)
- [错误处理](#错误处理)
- [最佳实践](#最佳实践)

## 安装和配置

### 系统要求

- Node.js 18.0.0 或更高版本
- 访问 shared-project 项目目录的权限
- 目标项目目录的读写权限

### 安装步骤

```bash
# 克隆项目
git clone <repository-url>
cd balm-shared-mcp

# 安装依赖
npm install

# 设置 Git hooks
npm run prepare
```

### 配置文件

在项目根目录创建 `config.json` 文件：

```json
{
  "sharedProjectPath": "./path/to/shared-project",
  "templatesPath": "./templates",
  "defaultProjectConfig": {
    "apiEndpoint": "/api",
    "mockEnabled": true,
    "authEnabled": true
  },
  "logging": {
    "level": "info",
    "file": "./logs/balm-shared-mcp.log"
  }
}
```

### 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `SHARED_LIBRARY_PATH` | 共享库路径 | `./my-shared` |
| `TEMPLATES_PATH` | 代码模板路径 | `./templates` |
| `LOG_LEVEL` | 日志级别 (debug, info, warn, error) | `info` |
| `CONFIG_PATH` | 配置文件路径 | `./config.json` |

### 启动服务器

```bash
# 开发模式（带文件监听）
npm run dev

# 生产模式
npm start
```

## MCP 工具接口

### 项目管理工具

#### create_project

创建基于 shared-project 的新项目。

**参数：**

```json
{
  "name": "string",        // 项目名称（必需）
  "type": "frontend|backend", // 项目类型（必需）
  "path": "string"         // 项目路径（必需）
}
```

**示例：**

```json
{
  "name": "my-frontend-app",
  "type": "frontend",
  "path": "./projects/my-frontend-app"
}
```

**返回值：**

```json
{
  "content": [
    {
      "type": "text",
      "text": "项目创建成功信息，包含创建的文件列表和配置详情"
    }
  ]
}
```

**功能说明：**
- 基于 `frontend-project` 或 `backend-project` 模板创建项目结构
- 自动配置 shared-project 的别名引用和 includeJsResource 配置
- 更新 package.json 中的项目信息
- 配置 API 端点、代理设置和 Mock 服务器

#### analyze_project

分析现有项目结构和配置。

**参数：**

```json
{
  "path": "string"  // 项目路径（必需）
}
```

**示例：**

```json
{
  "path": "./my-project"
}
```

**返回值：**

```json
{
  "content": [
    {
      "type": "text",
      "text": "项目分析报告，包含结构检查、配置验证和优化建议"
    }
  ]
}
```

**功能说明：**
- 检查项目结构是否符合 BalmJS 标准
- 验证 shared-project 集成配置
- 分析组件使用情况
- 提供优化建议和修复方案

### 代码生成工具

#### generate_crud_module

生成完整的 CRUD 业务模块。

**参数：**

```json
{
  "module": "string",      // 模块名称（必需）
  "model": "string",       // 数据模型名称（必需）
  "fields": [              // 字段定义数组（必需）
    {
      "name": "string",    // 字段名称（必需）
      "type": "string",    // 字段类型（必需）
      "component": "string" // UI组件类型（必需）
    }
  ],
  "projectPath": "string"  // 项目路径（必需）
}
```

**示例：**

```json
{
  "module": "user",
  "model": "User",
  "fields": [
    {
      "name": "name",
      "type": "string",
      "component": "ui-textfield"
    },
    {
      "name": "email",
      "type": "string",
      "component": "ui-textfield"
    },
    {
      "name": "role",
      "type": "string",
      "component": "ui-select"
    }
  ],
  "projectPath": "./my-project"
}
```

**返回值：**

```json
{
  "content": [
    {
      "type": "text",
      "text": "CRUD模块生成成功信息，包含生成的文件列表和功能说明"
    }
  ]
}
```

**功能说明：**
- 生成列表页面组件（使用 ui-list-view）
- 生成详情页面组件（使用 ui-detail-view）
- 创建 API 配置文件
- 生成 model-config 表单配置
- 创建路由配置
- 生成 Mock 数据和接口

#### generate_page_component

生成单个页面组件。

**参数：**

```json
{
  "name": "string",        // 组件名称（必需）
  "type": "list|detail",   // 组件类型（必需）
  "model": "string",       // 关联的数据模型（必需）
  "projectPath": "string"  // 项目路径（必需）
}
```

**示例：**

```json
{
  "name": "user-list",
  "type": "list",
  "model": "User",
  "projectPath": "./my-project"
}
```

**返回值：**

```json
{
  "content": [
    {
      "type": "text",
      "text": "页面组件生成成功信息，包含组件文件路径和配置详情"
    }
  ]
}
```

**功能说明：**
- 生成基于 BalmUI Pro 的标准页面组件
- 自动配置组件的 props 和 methods
- 创建对应的路由配置
- 支持权限控制配置

#### generate_model_config

生成表单配置文件。

**参数：**

```json
{
  "name": "string",           // 模型名称（必需）
  "fields": [                 // 字段定义数组（必需）
    {
      "name": "string",       // 字段名称（必需）
      "label": "string",      // 字段标签（必需）
      "type": "string",       // 字段类型（必需）
      "required": "boolean",  // 是否必填（可选）
      "defaultValue": "any",  // 默认值（可选）
      "options": "object",    // 字段选项（可选）
      "validation": "object"  // 验证规则（可选）
    }
  ],
  "projectPath": "string",    // 项目路径（必需）
  "outputPath": "string",     // 输出路径（可选）
  "formLayout": "vertical|horizontal", // 表单布局（可选）
  "submitText": "string",     // 提交按钮文本（可选）
  "cancelText": "string"      // 取消按钮文本（可选）
}
```

**示例：**

```json
{
  "name": "User",
  "fields": [
    {
      "name": "name",
      "label": "用户名",
      "type": "string",
      "required": true,
      "validation": {
        "minLength": 2,
        "maxLength": 50
      }
    },
    {
      "name": "email",
      "label": "邮箱",
      "type": "email",
      "required": true,
      "validation": {
        "pattern": "email"
      }
    }
  ],
  "projectPath": "./my-project",
  "formLayout": "vertical",
  "submitText": "保存",
  "cancelText": "取消"
}
```

**返回值：**

```json
{
  "content": [
    {
      "type": "text",
      "text": "表单配置生成成功信息，包含配置文件路径和字段映射详情"
    }
  ]
}
```

**功能说明：**
- 根据字段定义生成 model-config 配置
- 自动映射字段类型到 UI 组件
- 生成表单验证规则
- 支持自定义表单布局和按钮文本

### 资源查询工具

#### query_component

查询 shared-project 组件信息。

**参数：**

```json
{
  "name": "string",                    // 组件名称（必需）
  "category": "common|form|chart|pro-views" // 组件分类（可选）
}
```

**示例：**

```json
{
  "name": "ui-textfield",
  "category": "form"
}
```

**返回值：**

```json
{
  "content": [
    {
      "type": "text",
      "text": "组件详细信息，包含Props、Events、使用示例和相关文档"
    }
  ]
}
```

**功能说明：**
- 返回组件的 Props 定义和说明
- 提供组件的 Events 列表
- 包含完整的使用示例代码
- 提供相关文档链接和最佳实践

#### get_best_practices

获取最佳实践和代码示例。

**参数：**

```json
{
  "topic": "project-structure|api-config|component-usage|routing" // 主题（必需）
}
```

**示例：**

```json
{
  "topic": "component-usage"
}
```

**返回值：**

```json
{
  "content": [
    {
      "type": "text",
      "text": "最佳实践指南，包含代码示例、配置建议和常见问题解决方案"
    }
  ]
}
```

**功能说明：**
- 提供基于 examples 项目的最佳实践
- 包含标准的代码模式和配置建议
- 提供常见问题的解决方案
- 展示推荐的项目结构和组织方式

## 错误处理

### 错误类型

所有工具调用可能返回以下类型的错误：

| 错误代码 | 描述 | 解决方案 |
|----------|------|----------|
| `PROJECT_NOT_FOUND` | 项目路径不存在 | 检查项目路径是否正确 |
| `INVALID_PROJECT_STRUCTURE` | 项目结构不符合规范 | 使用 analyze_project 工具检查项目结构 |
| `TEMPLATE_NOT_FOUND` | 模板文件不存在 | 检查模板路径配置 |
| `FILE_OPERATION_FAILED` | 文件操作失败 | 检查文件权限和磁盘空间 |
| `COMPONENT_NOT_FOUND` | 组件不存在 | 检查组件名称是否正确 |
| `INVALID_CONFIGURATION` | 配置无效 | 检查配置文件格式和必需字段 |
| `TOOL_EXECUTION_FAILED` | 工具执行失败 | 查看详细错误信息和日志 |

### 错误响应格式

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {
      "additionalInfo": "额外的错误信息"
    }
  }
}
```

### 调试和日志

启用调试模式：

```bash
# 设置日志级别为 debug
export LOG_LEVEL=debug
npm start
```

查看日志文件：

```bash
# 查看实时日志
tail -f logs/balm-shared-mcp.log

# 查看错误日志
tail -f logs/errors/error.log
```

## 最佳实践

### 1. 项目创建

```javascript
// 推荐的项目创建流程
const createProjectResult = await callTool('create_project', {
  name: 'my-app',
  type: 'frontend',
  path: './projects/my-app'
});

// 创建后分析项目结构
const analysisResult = await callTool('analyze_project', {
  path: './projects/my-app'
});
```

### 2. CRUD 模块生成

```javascript
// 完整的 CRUD 模块生成
const crudResult = await callTool('generate_crud_module', {
  module: 'user',
  model: 'User',
  fields: [
    { name: 'name', type: 'string', component: 'ui-textfield' },
    { name: 'email', type: 'email', component: 'ui-textfield' },
    { name: 'role', type: 'string', component: 'ui-select' }
  ],
  projectPath: './my-project'
});
```

### 3. 组件查询

```javascript
// 查询组件信息
const componentInfo = await callTool('query_component', {
  name: 'ui-list-view',
  category: 'pro-views'
});

// 获取最佳实践
const bestPractices = await callTool('get_best_practices', {
  topic: 'component-usage'
});
```

### 4. 错误处理

```javascript
try {
  const result = await callTool('create_project', params);
  // 处理成功结果
} catch (error) {
  if (error.code === 'PROJECT_NOT_FOUND') {
    // 处理项目不存在错误
  } else if (error.code === 'INVALID_CONFIGURATION') {
    // 处理配置错误
  } else {
    // 处理其他错误
  }
}
```

### 5. 性能优化

- 使用 `analyze_project` 在生成代码前检查项目结构
- 批量生成多个组件时，复用项目分析结果
- 定期清理生成的临时文件
- 监控日志文件大小，定期轮转

### 6. 安全考虑

- 确保项目路径在允许的目录范围内
- 验证用户输入的文件名和路径
- 定期更新依赖包以修复安全漏洞
- 使用最小权限原则运行服务器

## 版本兼容性

| 版本 | Node.js | BalmJS |
|------|---------|--------|
| 1.0.x | >=18.0.0 | >=4.0.0 |

## 更新日志

### v1.0.0
- 初始版本发布
- 支持项目创建和分析
- 支持 CRUD 模块生成
- 支持组件查询和最佳实践获取

## 支持和反馈

如果您在使用过程中遇到问题或有改进建议，请：

1. 查看本文档的故障排除部分
2. 检查 GitHub Issues 中的已知问题
3. 提交新的 Issue 或 Pull Request
4. 联系开发团队获取技术支持

---

*本文档最后更新时间：2025年1月*