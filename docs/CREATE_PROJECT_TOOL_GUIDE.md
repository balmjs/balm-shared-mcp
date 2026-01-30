# create_project 工具使用指南

## 概述

`create_project` 是一个 MCP 工具，用于快速创建基于 BalmJS 的 Vue.js 项目。它支持两种项目类型：
- **frontend**: 前端项目（使用 `vue-ui-front` 模板）
- **backend**: 后端项目（使用 `vue-ui-back` 模板）

## 前置要求

### 1. 安装 balm-cli

```bash
npm install -g balm-cli
```

验证安装：
```bash
balm --version
```

### 2. 网络连接

确保能够访问 npm registry 下载模板。如果网络较慢，建议配置国内镜像：

```bash
# 使用淘宝镜像
npm config set registry https://registry.npmmirror.com

# 验证配置
npm config get registry
```

## 工具参数

### 必需参数

| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `name` | string | 项目名称（只能包含小写字母、数字、连字符和下划线） | `my-webapp` |
| `type` | string | 项目类型：`frontend` 或 `backend` | `frontend` |
| `path` | string | 项目完整路径（包含项目名称） | `/Users/username/projects/my-webapp` |

### 可选参数

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `referenceProject` | string | 参考项目路径（使用复制模式而非 balm init） | `null` |
| `description` | string | 项目描述 | `A Vue.js {type} project` |
| `author` | string | 项目作者 | `Developer` |
| `apiEndpoint` | string | API 端点 | `/api` |
| `sharedProjectPath` | string | shared-project 路径 | `../yiban-shared` |

## 使用示例

### 1. 在 MCP 客户端中使用

#### 创建前端项目

```json
{
  "name": "create_project",
  "args": {
    "name": "my-frontend-app",
    "path": "/Users/elf-mouse/www/yiban/test/my-frontend-app",
    "type": "frontend"
  }
}
```

#### 创建后端项目

```json
{
  "name": "create_project",
  "args": {
    "name": "my-backend-app",
    "path": "/Users/elf-mouse/www/yiban/test/my-backend-app",
    "type": "backend"
  }
}
```

#### 使用参考项目（复制模式）

```json
{
  "name": "create_project",
  "args": {
    "name": "new-admin-project",
    "path": "/Users/elf-mouse/www/yiban/test/new-admin-project",
    "type": "backend",
    "referenceProject": "../company-admin"
  }
}
```

### 2. 使用测试脚本

```bash
# 创建前端项目
node scripts/test-create-project.js my-frontend-app frontend

# 创建后端项目到指定目录
node scripts/test-create-project.js my-backend-app backend /tmp/test-projects
```

## 项目名称规则

### ✅ 有效的项目名称

- `my-project` - 使用连字符
- `my_project` - 使用下划线
- `myproject123` - 包含数字
- `project-v2` - 混合使用

### ❌ 无效的项目名称

- `MyProject` - 包含大写字母
- `my project` - 包含空格
- `my@project` - 包含特殊字符
- `123project` - 以数字开头（虽然语法上允许，但不推荐）

## 成功响应示例

```json
{
  "success": true,
  "message": "Project my-webapp created successfully",
  "projectPath": "/Users/elf-mouse/www/yiban/test/my-webapp",
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
    "cd /Users/elf-mouse/www/yiban/test/my-webapp",
    "npm install",
    "npm run dev",
    "Open http://localhost:3000 in your browser"
  ]
}
```

## 错误处理

### 常见错误及解决方案

#### 1. balm-cli 未安装

**错误信息**:
```
balm-cli is not installed. Please install it globally using: npm install -g balm-cli
```

**解决方案**:
```bash
npm install -g balm-cli
```

#### 2. 项目名称格式错误

**错误信息**:
```
Project name must contain only lowercase letters, numbers, hyphens, and underscores
```

**解决方案**:
- 将项目名称改为小写
- 移除特殊字符和空格
- 使用连字符或下划线分隔单词

#### 3. 目标目录已存在

**错误信息**:
```
Target directory already exists: /path/to/project. Please choose a different name or remove the existing directory.
```

**解决方案**:
```bash
# 选项 1: 删除现有目录
rm -rf /path/to/project

# 选项 2: 使用不同的项目名称
```

#### 4. 网络问题导致模板下载失败

**错误信息**:
```
Failed to run balm init: ... downloading template
```

**解决方案**:
1. 检查网络连接
2. 配置 npm 镜像：
   ```bash
   npm config set registry https://registry.npmmirror.com
   ```
3. 如果使用代理，确保代理配置正确：
   ```bash
   npm config set proxy http://proxy.company.com:8080
   npm config set https-proxy http://proxy.company.com:8080
   ```

#### 5. 权限问题

**错误信息**:
```
EACCES: permission denied
```

**解决方案**:
```bash
# 确保目标目录有写权限
chmod 755 /path/to/parent/directory

# 或者选择有权限的目录
```

#### 6. 磁盘空间不足

**错误信息**:
```
ENOSPC: no space left on device
```

**解决方案**:
- 清理磁盘空间
- 选择其他有足够空间的目录

## 项目结构

### Frontend 项目结构

```
my-frontend-app/
├── config/              # 构建配置
│   ├── balmrc.js       # BalmJS 配置
│   ├── balm.alias.js   # 路径别名
│   └── env.js          # 环境配置
├── src/                # 源代码
│   ├── scripts/        # JavaScript 文件
│   ├── styles/         # 样式文件
│   ├── views/          # 页面组件
│   └── index.html      # HTML 模板
├── mock/               # Mock 数据
├── public/             # 静态资源
├── package.json        # 项目配置
└── README.md          # 项目说明
```

### Backend 项目结构

```
my-backend-app/
├── config/              # 构建配置
├── src/
│   ├── scripts/
│   │   ├── components/ # 业务组件
│   │   ├── views/      # 页面视图
│   │   ├── router/     # 路由配置
│   │   ├── store/      # 状态管理
│   │   └── utils/      # 工具函数
│   ├── styles/
│   └── index.html
├── mock/               # Mock 服务器
├── public/
├── package.json
└── README.md
```

## 后续步骤

### 1. 安装依赖

```bash
cd /path/to/your-project
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

项目将在 `http://localhost:3000` 启动。

### 3. 构建生产版本

```bash
npm run prod
```

构建产物将输出到 `dist/` 目录。

### 4. 运行测试

```bash
npm test
```

### 5. 代码检查

```bash
npm run lint
```

## 最佳实践

### 1. 项目命名

- 使用描述性的名称，如 `user-management-frontend`
- 使用连字符分隔单词
- 避免使用缩写，除非是广为人知的缩写

### 2. 目录组织

- 将相关项目放在同一父目录下
- 使用清晰的目录结构，如：
  ```
  projects/
  ├── frontend/
  │   ├── user-management/
  │   └── product-catalog/
  └── backend/
      ├── admin-panel/
      └── api-gateway/
  ```

### 3. 版本控制

创建项目后立即初始化 Git：

```bash
cd your-project
git init
git add .
git commit -m "Initial commit"
```

### 4. 配置 shared-project

确保 `sharedProjectPath` 参数指向正确的 shared-project 位置：

```json
{
  "name": "create_project",
  "args": {
    "name": "my-project",
    "path": "/path/to/my-project",
    "type": "frontend",
    "sharedProjectPath": "../../yiban-shared"
  }
}
```

## 故障排查

### 查看详细日志

如果遇到问题，检查日志文件：

```bash
# 查看应用日志
cat logs/app.log

# 查看错误日志
cat logs/errors/error.log
```

### 调试模式

设置环境变量启用调试模式：

```bash
export DEBUG=balm-shared-mcp:*
node your-mcp-server.js
```

### 验证 balm-cli 安装

```bash
# 检查版本
balm --version

# 查看可用模板
balm init --help
```

### 手动测试 balm init

```bash
# 在临时目录测试
cd /tmp
balm init vue-ui-front test-project

# 检查是否成功
ls -la test-project
```

## 技术支持

如果遇到问题：

1. 查看 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) 获取更多故障排查信息
2. 检查项目的 GitHub Issues
3. 联系技术支持团队

## 相关文档

- [API 文档](./API.md)
- [最佳实践](./BEST_PRACTICES.md)
- [故障排查](./TROUBLESHOOTING.md)
- [示例代码](./EXAMPLES.md)
