# AI 使用示例

本文档展示 AI 助手（如 Claude、Cursor）如何使用 BalmSharedMCP 提供的工具来完成各种开发任务。

## 目录

- [项目管理工具](#项目管理工具)
  - [create_project](#create_project---创建项目)
  - [analyze_project](#analyze_project---分析项目)
- [代码生成工具](#代码生成工具)
  - [generate_crud_module](#generate_crud_module---生成-crud-模块)
  - [generate_page_component](#generate_page_component---生成页面组件)
  - [generate_model_config](#generate_model_config---生成表单配置)
- [资源查询工具](#资源查询工具)
  - [query_component](#query_component---查询组件)
  - [get_best_practices](#get_best_practices---获取最佳实践)

---

## 项目管理工具

### create_project - 创建项目

创建基于 shared-project 的新项目。

#### 参数说明

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 项目名称 |
| `type` | string | ✅ | 项目类型：`frontend` 或 `backend` |
| `path` | string | ✅ | 项目创建路径 |
| `referenceProject` | string | ❌ | 参考项目路径（相对于 WORKSPACE_ROOT 或绝对路径） |

#### 示例 1：创建前端项目（使用内置脚手架）

**用户请求：** "调用 create_project 工具，帮我创建一个名为 my-webapp 的前端项目"

**AI 调用：**
```json
{
  "name": "create_project",
  "arguments": {
    "name": "my-webapp",
    "type": "frontend",
    "path": "/Users/dev/company/my-webapp"
  }
}
```

**返回结果：**
```json
{
  "success": true,
  "message": "Project my-webapp created successfully",
  "projectPath": "/Users/dev/company/my-webapp",
  "type": "frontend",
  "template": "vue-ui-front",
  "mode": "balm-init",
  "referenceProject": null,
  "features": [
    "Vue.js 2.7",
    "Vue Router",
    "BalmUI components",
    "BalmUI Pro",
    "shared-project integration",
    "ESLint configuration",
    "Jest testing setup",
    "Mock server with MirageJS",
    "Basic routing structure",
    "Component examples"
  ],
  "nextSteps": [
    "cd /Users/dev/company/my-webapp",
    "npm install",
    "npm run dev",
    "Open http://localhost:3000 in your browser"
  ]
}
```

#### 示例 2：创建后台项目（参考现有项目）

**用户请求：** "调用 create_project 工具，参考 company-admin 项目创建一个新的后台管理系统"

**AI 调用：**
```json
{
  "name": "create_project",
  "arguments": {
    "name": "new-admin",
    "type": "backend",
    "path": "/Users/dev/company/new-admin",
    "referenceProject": "company-admin"
  }
}
```

---

### analyze_project - 分析项目

分析现有项目的结构和配置，提供优化建议。

#### 参数说明

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `path` | string | ✅ | 项目路径 |

#### 示例：分析项目结构

**用户请求：** "调用 analyze_project 工具，帮我分析一下 my-app 项目的结构"

**AI 调用：**
```json
{
  "name": "analyze_project",
  "arguments": {
    "path": "/Users/dev/company/my-app"
  }
}
```

**返回结果：**
```json
{
  "projectPath": "/Users/dev/company/my-app",
  "isValid": true,
  "projectType": "backend",
  "hasSharedProject": true,
  "structure": {
    "hasPackageJson": true,
    "hasSrc": true,
    "hasConfig": true,
    "hasEslintConfig": true
  },
  "configuration": {
    "sharedProjectIntegration": {
      "hasDependency": true,
      "hasAlias": true,
      "hasImports": true
    }
  },
  "recommendations": [
    {
      "type": "suggestion",
      "message": "Set up testing framework",
      "action": "Configure Jest and create test directory"
    }
  ]
}
```

---

## 代码生成工具

### generate_crud_module - 生成 CRUD 模块

生成完整的增删改查业务模块，包括列表页、详情页、API 配置、Mock 数据等。

#### 参数说明

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `module` | string | ✅ | 模块名称（如 `user`、`product`） |
| `model` | string | ✅ | 数据模型名称（如 `User`、`Product`） |
| `fields` | array | ✅ | 字段定义数组 |
| `projectPath` | string | ✅ | 目标项目路径 |

#### 字段定义格式

```json
{
  "name": "fieldName",
  "type": "string|number|boolean|date",
  "component": "ui-textfield|ui-select|ui-datepicker|..."
}
```

#### 示例：生成用户管理模块

**用户请求：** "调用 generate_crud_module 工具，帮我生成一个用户管理模块，包含姓名、邮箱、角色字段"

**AI 调用：**
```json
{
  "name": "generate_crud_module",
  "arguments": {
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
      },
      {
        "name": "createdAt",
        "type": "date",
        "component": "ui-datepicker"
      }
    ],
    "projectPath": "/Users/dev/company/my-admin"
  }
}
```

**返回结果：**
```json
{
  "success": true,
  "generatedFiles": [
    "src/views/user/list.vue",
    "src/views/user/detail.vue",
    "src/api/user.js",
    "src/model-config/user.js",
    "src/router/modules/user.js",
    "mock/user.js"
  ],
  "summary": {
    "module": "user",
    "model": "User",
    "fieldsGenerated": 4,
    "filesCreated": 6,
    "timestamp": "2026-01-30T07:50:00.000Z"
  }
}
```

---

### generate_page_component - 生成页面组件

生成单个页面组件（列表或详情）。

#### 参数说明

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 组件名称 |
| `type` | string | ✅ | 组件类型：`list` 或 `detail` |
| `model` | string | ✅ | 关联的数据模型 |
| `projectPath` | string | ✅ | 目标项目路径 |

#### 示例：生成产品列表页

**用户请求：** "调用 generate_page_component 工具，帮我生成一个产品列表页面"

**AI 调用：**
```json
{
  "name": "generate_page_component",
  "arguments": {
    "name": "product-list",
    "type": "list",
    "model": "Product",
    "projectPath": "/Users/dev/company/my-shop"
  }
}
```

---

### generate_model_config - 生成表单配置

生成表单的 model-config 配置文件。

#### 参数说明

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 模型名称 |
| `fields` | array | ✅ | 字段定义数组 |
| `projectPath` | string | ✅ | 目标项目路径 |
| `formLayout` | string | ❌ | 表单布局：`vertical` 或 `horizontal` |
| `submitText` | string | ❌ | 提交按钮文本 |
| `cancelText` | string | ❌ | 取消按钮文本 |

#### 字段定义格式（完整）

```json
{
  "name": "fieldName",
  "label": "字段标签",
  "type": "string|number|email|date",
  "required": true,
  "defaultValue": "",
  "validation": {
    "minLength": 2,
    "maxLength": 50,
    "pattern": "email"
  }
}
```

#### 示例：生成订单表单配置

**用户请求：** "调用 generate_model_config 工具，帮我生成一个订单表单配置"

**AI 调用：**
```json
{
  "name": "generate_model_config",
  "arguments": {
    "name": "Order",
    "fields": [
      {
        "name": "orderNo",
        "label": "订单号",
        "type": "string",
        "required": true
      },
      {
        "name": "customerName",
        "label": "客户姓名",
        "type": "string",
        "required": true,
        "validation": {
          "minLength": 2,
          "maxLength": 50
        }
      },
      {
        "name": "amount",
        "label": "订单金额",
        "type": "number",
        "required": true
      },
      {
        "name": "orderDate",
        "label": "下单日期",
        "type": "date",
        "required": true
      }
    ],
    "projectPath": "/Users/dev/company/my-shop",
    "formLayout": "vertical",
    "submitText": "提交订单",
    "cancelText": "取消"
  }
}
```

---

## 资源查询工具

### query_component - 查询组件

查询 shared-project 中的组件信息，包括 Props、Events、使用示例。

#### 参数说明

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 组件名称 |
| `category` | string | ❌ | 组件分类：`common`、`form`、`chart`、`pro-views` |

#### 示例：查询列表视图组件

**用户请求：** "调用 query_component 工具，查询 ui-list-view 组件怎么用？有什么参数？"

**AI 调用：**
```json
{
  "name": "query_component",
  "arguments": {
    "name": "ui-list-view",
    "category": "pro-views"
  }
}
```

**返回结果：**
```json
{
  "found": true,
  "name": "ui-list-view",
  "category": "pro-views",
  "description": "列表视图组件，用于展示数据列表",
  "props": [
    {
      "name": "data",
      "type": "Array",
      "required": true,
      "description": "列表数据"
    },
    {
      "name": "columns",
      "type": "Array",
      "required": true,
      "description": "列定义"
    },
    {
      "name": "pagination",
      "type": "Object",
      "required": false,
      "description": "分页配置"
    }
  ],
  "events": [
    {
      "name": "row-click",
      "description": "行点击事件"
    }
  ],
  "example": "<ui-list-view :data=\"listData\" :columns=\"columns\" @row-click=\"handleRowClick\" />"
}
```

---

### get_best_practices - 获取最佳实践

获取特定主题的最佳实践指南和代码示例。

#### 参数说明

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `topic` | string | ✅ | 主题：`project-structure`、`api-config`、`component-usage`、`routing` |

#### 可用主题

| 主题 | 说明 |
|------|------|
| `project-structure` | 项目目录结构最佳实践 |
| `api-config` | API 接口配置最佳实践 |
| `component-usage` | 组件使用最佳实践 |
| `routing` | 路由配置最佳实践 |

#### 示例：获取 API 配置最佳实践

**用户请求：** "调用 get_best_practices 工具，告诉我 API 接口应该怎么配置"

**AI 调用：**
```json
{
  "name": "get_best_practices",
  "arguments": {
    "topic": "api-config"
  }
}
```

**返回结果：**
```json
{
  "topic": "api-config",
  "practices": [
    {
      "title": "统一 API 目录结构",
      "description": "所有 API 请求放在 src/api 目录下，按模块分文件",
      "example": "src/api/user.js, src/api/product.js"
    },
    {
      "title": "使用 interceptor 统一处理",
      "description": "在 request interceptor 中添加 token，在 response interceptor 中处理错误"
    }
  ],
  "examples": [
    {
      "title": "API 文件示例",
      "code": "import { request } from '@/utils/request';\n\nexport const getUsers = (params) => request.get('/api/users', { params });\nexport const createUser = (data) => request.post('/api/users', data);"
    }
  ]
}
```

---

## 常见使用场景

### 场景 1：从零开始创建后台管理系统

1. **创建项目**
   ```json
   { "name": "create_project", "arguments": { "name": "admin-system", "type": "backend", "path": "/path/to/admin-system" }}
   ```

2. **查询组件用法**
   ```json
   { "name": "query_component", "arguments": { "name": "ui-table", "category": "common" }}
   ```

3. **生成 CRUD 模块**
   ```json
   { "name": "generate_crud_module", "arguments": { "module": "user", "model": "User", "fields": [...], "projectPath": "/path/to/admin-system" }}
   ```

### 场景 2：为现有项目添加新模块

1. **分析项目结构**
   ```json
   { "name": "analyze_project", "arguments": { "path": "/path/to/existing-project" }}
   ```

2. **查看最佳实践**
   ```json
   { "name": "get_best_practices", "arguments": { "topic": "project-structure" }}
   ```

3. **生成新模块**
   ```json
   { "name": "generate_crud_module", "arguments": { "module": "order", "model": "Order", "fields": [...], "projectPath": "/path/to/existing-project" }}
   ```

---

*最后更新：2026-01-30*
