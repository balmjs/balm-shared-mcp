# BalmSharedMCP 最佳实践指南

## 目录

- [开发流程最佳实践](#开发流程最佳实践)
- [项目结构规范](#项目结构规范)
- [代码生成策略](#代码生成策略)
- [组件使用指南](#组件使用指南)
- [API 配置规范](#api-配置规范)
- [性能优化建议](#性能优化建议)
- [错误处理策略](#错误处理策略)
- [团队协作规范](#团队协作规范)

## 开发流程最佳实践

### 1. 标准开发流程

推荐的项目开发流程：

```
1. 项目初始化
   ├── 创建项目结构 (create_project)
   ├── 分析项目配置 (analyze_project)
   └── 获取项目结构最佳实践 (get_best_practices)

2. 需求分析
   ├── 确定业务模块
   ├── 设计数据模型
   └── 规划组件结构

3. 模块开发
   ├── 生成 CRUD 模块 (generate_crud_module)
   ├── 创建表单配置 (generate_model_config)
   └── 生成页面组件 (generate_page_component)

4. 组件集成
   ├── 查询组件信息 (query_component)
   ├── 获取使用最佳实践 (get_best_practices)
   └── 自定义组件开发

5. 测试和优化
   ├── 功能测试
   ├── 性能优化
   └── 代码重构
```

### 2. 渐进式开发策略

```javascript
// 推荐：渐进式模块开发
async function developModuleProgressively(moduleName, projectPath) {
  // 第一步：生成基础结构
  const basicModule = await callTool('generate_crud_module', {
    module: moduleName,
    model: capitalize(moduleName),
    fields: getBasicFields(moduleName),
    projectPath: projectPath
  });
  
  // 第二步：完善表单配置
  const formConfig = await callTool('generate_model_config', {
    name: capitalize(moduleName),
    fields: getDetailedFields(moduleName),
    projectPath: projectPath,
    formLayout: 'vertical'
  });
  
  // 第三步：生成专门的页面组件
  const listPage = await callTool('generate_page_component', {
    name: `${moduleName}-list`,
    type: 'list',
    model: capitalize(moduleName),
    projectPath: projectPath
  });
  
  return { basicModule, formConfig, listPage };
}
```

## 项目结构规范

### 1. 推荐的目录结构

```
src/
├── api/                    # API 配置文件
│   ├── user.js
│   ├── product.js
│   └── index.js
├── components/             # 公共组件
│   ├── common/
│   └── business/
├── config/                 # 配置文件
│   ├── model-config/       # 表单配置
│   │   ├── user.js
│   │   └── product.js
│   ├── api.js             # API 基础配置
│   └── constants.js       # 常量定义
├── mock/                  # Mock 数据
│   ├── user.js
│   └── product.js
├── router/                # 路由配置
│   ├── modules/
│   └── index.js
├── store/                 # 状态管理
│   ├── modules/
│   └── index.js
├── utils/                 # 工具函数
├── views/                 # 页面组件
│   ├── user/
│   │   ├── user-list.vue
│   │   └── user-detail.vue
│   └── product/
└── App.vue
```

### 2. 文件命名规范

```javascript
// 推荐的命名规范
const namingConventions = {
  // 组件文件：kebab-case
  components: 'user-list.vue',
  
  // API 文件：camelCase
  api: 'userApi.js',
  
  // 配置文件：kebab-case
  config: 'model-config/user-form.js',
  
  // Mock 文件：camelCase
  mock: 'userMock.js',
  
  // 工具文件：camelCase
  utils: 'dateUtils.js'
};
```

## 代码生成策略

### 1. 字段类型映射

```javascript
// 标准字段类型到组件的映射
const fieldTypeMapping = {
  // 基础类型
  'string': 'ui-textfield',
  'text': 'ui-textarea',
  'number': 'ui-textfield',
  'integer': 'ui-textfield',
  'float': 'ui-textfield',
  'decimal': 'ui-textfield',
  
  // 特殊类型
  'email': 'ui-textfield',
  'password': 'ui-textfield',
  'url': 'ui-textfield',
  'phone': 'ui-textfield',
  
  // 日期时间
  'date': 'ui-datepicker',
  'datetime': 'ui-datetime-picker',
  'time': 'ui-time-picker',
  
  // 选择类型
  'select': 'ui-select',
  'multiselect': 'ui-select',
  'radio': 'ui-radio',
  'checkbox': 'ui-checkbox',
  
  // 布尔类型
  'boolean': 'ui-switch',
  'switch': 'ui-switch',
  
  // 文件类型
  'file': 'ui-file-input',
  'image': 'ui-image-upload',
  'avatar': 'ui-avatar-upload'
};

// 根据字段名称推断组件类型
const fieldNameMapping = {
  'status': 'ui-select',
  'category': 'ui-select',
  'role': 'ui-select',
  'priority': 'ui-select',
  'level': 'ui-select',
  'type': 'ui-select',
  'gender': 'ui-radio',
  'enabled': 'ui-switch',
  'active': 'ui-switch',
  'published': 'ui-switch'
};
```

### 2. 验证规则配置

```javascript
// 标准验证规则配置
const validationRules = {
  required: {
    required: true,
    message: '此字段为必填项'
  },
  
  email: {
    type: 'email',
    message: '请输入有效的邮箱地址'
  },
  
  phone: {
    pattern: /^1[3-9]\d{9}$/,
    message: '请输入有效的手机号码'
  },
  
  url: {
    type: 'url',
    message: '请输入有效的URL地址'
  },
  
  minLength: (min) => ({
    min: min,
    message: `最少输入${min}个字符`
  }),
  
  maxLength: (max) => ({
    max: max,
    message: `最多输入${max}个字符`
  }),
  
  range: (min, max) => ({
    min: min,
    max: max,
    message: `请输入${min}-${max}之间的数值`
  })
};
```

## 组件使用指南

### 1. 表单组件最佳实践

```javascript
// 推荐的表单字段配置
const formFieldBestPractices = {
  // 文本输入
  textField: {
    name: 'username',
    label: '用户名',
    type: 'string',
    component: 'ui-textfield',
    required: true,
    validation: {
      minLength: 3,
      maxLength: 20,
      pattern: /^[a-zA-Z0-9_]+$/
    },
    placeholder: '请输入用户名',
    helperText: '用户名只能包含字母、数字和下划线'
  },
  
  // 选择框
  selectField: {
    name: 'role',
    label: '角色',
    type: 'string',
    component: 'ui-select',
    required: true,
    options: {
      items: [
        { value: 'admin', text: '管理员' },
        { value: 'user', text: '普通用户' },
        { value: 'guest', text: '访客' }
      ]
    },
    defaultValue: 'user'
  },
  
  // 开关
  switchField: {
    name: 'enabled',
    label: '启用状态',
    type: 'boolean',
    component: 'ui-switch',
    defaultValue: true,
    helperText: '控制用户账户的启用状态'
  }
};
```

### 2. 列表组件配置

```javascript
// ui-list-view 最佳配置
const listViewConfig = {
  // 基础配置
  data: [],
  loading: false,
  pagination: {
    page: 1,
    size: 20,
    total: 0
  },
  
  // 列配置
  columns: [
    {
      field: 'id',
      title: 'ID',
      width: 80,
      sortable: true
    },
    {
      field: 'name',
      title: '名称',
      minWidth: 120,
      sortable: true
    },
    {
      field: 'status',
      title: '状态',
      width: 100,
      formatter: (value) => {
        return value ? '启用' : '禁用';
      }
    },
    {
      field: 'actions',
      title: '操作',
      width: 150,
      type: 'action',
      actions: [
        { text: '编辑', action: 'edit' },
        { text: '删除', action: 'delete', confirm: true }
      ]
    }
  ],
  
  // 搜索配置
  searchConfig: {
    fields: [
      { field: 'name', label: '名称', type: 'text' },
      { field: 'status', label: '状态', type: 'select', options: [...] }
    ]
  }
};
```

## API 配置规范

### 1. RESTful API 规范

```javascript
// 标准的 API 配置结构
const apiConfig = {
  // 基础配置
  baseURL: '/api',
  timeout: 10000,
  
  // 用户相关 API
  user: {
    // 列表查询
    list: {
      url: '/users',
      method: 'GET',
      params: ['page', 'size', 'search', 'status']
    },
    
    // 详情查询
    detail: {
      url: '/users/:id',
      method: 'GET'
    },
    
    // 创建
    create: {
      url: '/users',
      method: 'POST',
      data: ['name', 'email', 'role', 'status']
    },
    
    // 更新
    update: {
      url: '/users/:id',
      method: 'PUT',
      data: ['name', 'email', 'role', 'status']
    },
    
    // 删除
    delete: {
      url: '/users/:id',
      method: 'DELETE'
    },
    
    // 批量删除
    batchDelete: {
      url: '/users/batch',
      method: 'DELETE',
      data: ['ids']
    }
  }
};
```

### 2. Mock 数据规范

```javascript
// 标准的 Mock 数据结构
const mockData = {
  // 列表数据
  list: {
    code: 200,
    message: 'success',
    data: {
      items: [
        {
          id: 1,
          name: '张三',
          email: 'zhangsan@example.com',
          role: 'admin',
          status: true,
          createdAt: '2025-01-01 10:00:00',
          updatedAt: '2025-01-01 10:00:00'
        }
      ],
      pagination: {
        page: 1,
        size: 20,
        total: 100,
        pages: 5
      }
    }
  },
  
  // 详情数据
  detail: {
    code: 200,
    message: 'success',
    data: {
      id: 1,
      name: '张三',
      email: 'zhangsan@example.com',
      role: 'admin',
      status: true,
      profile: {
        avatar: '/images/avatar.jpg',
        phone: '13800138000',
        department: '技术部'
      },
      createdAt: '2025-01-01 10:00:00',
      updatedAt: '2025-01-01 10:00:00'
    }
  }
};
```

## 性能优化建议

### 1. 代码生成优化

```javascript
// 批量生成时的性能优化
async function optimizedBatchGeneration(modules, projectPath) {
  const concurrencyLimit = 3; // 限制并发数
  const delay = 1000; // 请求间隔
  
  const results = [];
  
  for (let i = 0; i < modules.length; i += concurrencyLimit) {
    const batch = modules.slice(i, i + concurrencyLimit);
    
    const batchPromises = batch.map(async (module) => {
      try {
        const result = await callTool('generate_crud_module', {
          module: module.name,
          model: module.model,
          fields: module.fields,
          projectPath: projectPath
        });
        
        return { success: true, module: module.name, result };
      } catch (error) {
        return { success: false, module: module.name, error: error.message };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // 添加延迟避免过载
    if (i + concurrencyLimit < modules.length) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return results;
}
```

### 2. 缓存策略

```javascript
// 组件信息缓存
class ComponentCache {
  constructor() {
    this.cache = new Map();
    this.ttl = 5 * 60 * 1000; // 5分钟过期
  }
  
  async getComponent(name, category) {
    const key = `${name}-${category}`;
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }
    
    const result = await callTool('query_component', { name, category });
    
    this.cache.set(key, {
      data: result,
      timestamp: Date.now()
    });
    
    return result;
  }
  
  clear() {
    this.cache.clear();
  }
}
```

## 错误处理策略

### 1. 统一错误处理

```javascript
// 统一的错误处理函数
async function safeToolCall(toolName, params, options = {}) {
  const { retries = 3, delay = 1000 } = options;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await callTool(toolName, params);
      return {
        success: true,
        data: result,
        attempt
      };
    } catch (error) {
      console.error(`Tool ${toolName} failed (attempt ${attempt}):`, error);
      
      // 最后一次尝试失败
      if (attempt === retries) {
        return {
          success: false,
          error: error.message,
          code: error.code,
          suggestion: getErrorSuggestion(error.code),
          attempts: attempt
        };
      }
      
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
}

function getErrorSuggestion(errorCode) {
  const suggestions = {
    'PROJECT_NOT_FOUND': '请检查项目路径是否正确',
    'TEMPLATE_NOT_FOUND': '请检查模板配置和路径',
    'COMPONENT_NOT_FOUND': '请检查组件名称是否正确',
    'INVALID_CONFIGURATION': '请检查配置文件格式',
    'FILE_OPERATION_FAILED': '请检查文件权限和磁盘空间',
    'TOOL_EXECUTION_FAILED': '请查看详细错误信息和日志'
  };
  
  return suggestions[errorCode] || '请联系技术支持';
}
```

### 2. 错误恢复策略

```javascript
// 错误恢复和回滚机制
class OperationManager {
  constructor() {
    this.operations = [];
  }
  
  async executeWithRollback(operations) {
    const completed = [];
    
    try {
      for (const operation of operations) {
        const result = await this.executeOperation(operation);
        completed.push({ operation, result });
      }
      
      return { success: true, results: completed };
    } catch (error) {
      // 回滚已完成的操作
      await this.rollback(completed);
      
      return {
        success: false,
        error: error.message,
        completed: completed.length,
        total: operations.length
      };
    }
  }
  
  async rollback(completed) {
    for (const { operation, result } of completed.reverse()) {
      try {
        await this.rollbackOperation(operation, result);
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
    }
  }
}
```

## 团队协作规范

### 1. 配置文件管理

```javascript
// 团队共享配置
const teamConfig = {
  // 基础配置（团队共享）
  shared: {
    sharedProjectPath: './shared-project',
    templatesPath: './templates',
    defaultProjectConfig: {
      apiEndpoint: '/api',
      mockEnabled: true
    }
  },
  
  // 个人配置（本地覆盖）
  personal: {
    logging: {
      level: process.env.LOG_LEVEL || 'info'
    },
    server: {
      timeout: parseInt(process.env.TIMEOUT) || 30000
    }
  }
};

// 配置合并函数
function mergeConfig(shared, personal) {
  return {
    ...shared,
    ...personal,
    defaultProjectConfig: {
      ...shared.defaultProjectConfig,
      ...personal.defaultProjectConfig
    }
  };
}
```

### 2. 代码规范

```javascript
// 团队代码生成规范
const codeStandards = {
  // 命名规范
  naming: {
    components: 'kebab-case',
    variables: 'camelCase',
    constants: 'UPPER_SNAKE_CASE',
    files: 'kebab-case'
  },
  
  // 代码格式
  formatting: {
    indentSize: 2,
    indentType: 'spaces',
    lineEnding: 'lf',
    insertFinalNewline: true,
    trimTrailingWhitespace: true
  },
  
  // 注释规范
  comments: {
    fileHeader: true,
    functionDocs: true,
    complexLogic: true
  }
};
```

### 3. 版本控制

```bash
# 推荐的 Git 工作流程

# 1. 创建功能分支
git checkout -b feature/user-management

# 2. 使用 MCP 工具生成代码
# ... 代码生成操作 ...

# 3. 提交生成的代码
git add .
git commit -m "feat: generate user management CRUD module

- Add user list and detail pages
- Add user API configuration
- Add user form configuration
- Add user mock data"

# 4. 推送并创建 PR
git push origin feature/user-management
```

### 4. 文档维护

```markdown
# 项目文档结构

docs/
├── api/                    # API 文档
│   ├── user.md
│   └── product.md
├── components/             # 组件文档
│   ├── ui-list-view.md
│   └── ui-form.md
├── development/            # 开发文档
│   ├── setup.md
│   ├── workflow.md
│   └── standards.md
└── deployment/             # 部署文档
    ├── staging.md
    └── production.md
```

## 总结

遵循这些最佳实践可以帮助团队：

1. **提高开发效率**：标准化的流程和工具使用
2. **保证代码质量**：统一的规范和错误处理
3. **便于维护**：清晰的项目结构和文档
4. **团队协作**：共享的配置和工作流程
5. **性能优化**：合理的缓存和并发控制

记住，最佳实践需要根据项目实际情况进行调整，关键是保持一致性和可维护性。

---

*本文档最后更新时间：2025年1月*