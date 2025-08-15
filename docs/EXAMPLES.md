# BalmSharedMCP 使用示例

## 目录

- [快速开始](#快速开始)
- [典型使用场景](#典型使用场景)
- [完整工作流程示例](#完整工作流程示例)
- [最佳实践](#最佳实践)
- [高级用法](#高级用法)
- [示例项目](#示例项目)

## 快速开始

### 1. 基础配置

首先创建配置文件 `config.json`：

```json
{
  "sharedProjectPath": "./shared-project",
  "templatesPath": "./templates",
  "defaultProjectConfig": {
    "apiEndpoint": "/api",
    "mockEnabled": true,
    "authEnabled": true
  },
  "logging": {
    "level": "info"
  }
}
```

### 2. 启动服务器

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

### 3. 第一个工具调用

使用 MCP 客户端调用 `query_component` 工具：

```javascript
// 查询组件信息
const result = await callTool('query_component', {
  name: 'ui-textfield',
  category: 'form'
});

console.log(result.content[0].text);
```

## 典型使用场景

### 场景 1：创建新项目

**需求**：为新的管理系统创建前端项目

**步骤**：

1. **创建项目结构**
```javascript
const projectResult = await callTool('create_project', {
  name: 'admin-system',
  type: 'frontend',
  path: './projects/admin-system'
});
```

2. **分析项目配置**
```javascript
const analysisResult = await callTool('analyze_project', {
  path: './projects/admin-system'
});
```

**预期结果**：
- 创建完整的 BalmJS 项目结构
- 配置 shared-project 集成
- 设置 API 代理和 Mock 服务

### 场景 2：生成用户管理模块

**需求**：快速生成用户管理的 CRUD 功能

**步骤**：

1. **生成完整 CRUD 模块**
```javascript
const crudResult = await callTool('generate_crud_module', {
  module: 'user',
  model: 'User',
  fields: [
    {
      name: 'username',
      type: 'string',
      component: 'ui-textfield'
    },
    {
      name: 'email',
      type: 'email',
      component: 'ui-textfield'
    },
    {
      name: 'role',
      type: 'string',
      component: 'ui-select'
    },
    {
      name: 'status',
      type: 'boolean',
      component: 'ui-switch'
    }
  ],
  projectPath: './projects/admin-system'
});
```

**生成的文件**：
- `src/views/user/user-list.vue` - 用户列表页面
- `src/views/user/user-detail.vue` - 用户详情页面
- `src/api/user.js` - 用户 API 配置
- `src/config/model-config/user.js` - 用户表单配置
- `src/mock/user.js` - Mock 数据

### 场景 3：查询组件使用方法

**需求**：了解如何使用特定的 UI 组件

**步骤**：

1. **查询组件信息**
```javascript
const componentInfo = await callTool('query_component', {
  name: 'ui-list-view',
  category: 'pro-views'
});
```

2. **获取最佳实践**
```javascript
const bestPractices = await callTool('get_best_practices', {
  topic: 'component-usage'
});
```