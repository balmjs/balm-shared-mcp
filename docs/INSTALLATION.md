# BalmSharedMCP 安装和配置指南

## 目录

- [系统要求](#系统要求)
- [安装步骤](#安装步骤)
- [配置说明](#配置说明)
- [启动和验证](#启动和验证)
- [常见问题](#常见问题)

## 系统要求

### 基础环境

- **Node.js**: 18.0.0 或更高版本
- **npm**: 8.0.0 或更高版本
- **操作系统**: macOS, Linux, Windows
- **内存**: 至少 512MB 可用内存
- **磁盘空间**: 至少 100MB 可用空间

### 依赖项目

- **shared-project**: 自定义前端资源共享库
- **BalmJS**: 前端构建工具链

### 权限要求

- 对 shared-project 项目目录的读取权限
- 对目标项目目录的读写权限
- 对日志目录的写入权限

## 安装步骤

### 1. 获取源码

```bash
# 方式一：从 Git 仓库克隆
git clone <repository-url>
cd balm-shared-mcp

# 方式二：下载压缩包并解压
wget <download-url>
unzip balm-shared-mcp.zip
cd balm-shared-mcp
```

### 2. 安装依赖

```bash
# 安装 Node.js 依赖
npm install

# 如果使用 yarn
yarn install

# 如果使用 pnpm
pnpm install
```

### 3. 设置开发环境

```bash
# 安装 Git hooks（用于代码质量检查）
npm run prepare

# 验证安装
npm run test
```

### 4. 验证安装

```bash
# 检查版本信息
node src/index.js --version

# 运行健康检查
npm run test:run
```

## 配置说明

### 1. 基础配置文件

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
    "file": "./logs/balm-shared-mcp.log",
    "maxSize": "10MB",
    "maxFiles": 5
  },
  "server": {
    "timeout": 30000,
    "maxConcurrentRequests": 10
  }
}
```

### 2. 配置项详解

#### sharedProjectPath
- **类型**: string
- **必需**: 是
- **描述**: shared-project 库的本地路径
- **示例**: `"./shared-project"` 或 `"/path/to/shared-project"`

#### templatesPath
- **类型**: string
- **必需**: 否
- **默认值**: `"./templates"`
- **描述**: 代码模板文件的存储路径

#### defaultProjectConfig
- **类型**: object
- **必需**: 否
- **描述**: 新项目的默认配置

```json
{
  "apiEndpoint": "/api",        // API 端点前缀
  "mockEnabled": true,          // 是否启用 Mock 服务
  "authEnabled": true,          // 是否启用认证功能
  "proxyTarget": "http://localhost:3000", // 代理目标地址
  "publicPath": "/",            // 公共路径
  "outputPath": "./dist"        // 构建输出路径
}
```

#### logging
- **类型**: object
- **必需**: 否
- **描述**: 日志配置

```json
{
  "level": "info",              // 日志级别: debug, info, warn, error
  "file": "./logs/app.log",     // 日志文件路径
  "maxSize": "10MB",            // 单个日志文件最大大小
  "maxFiles": 5,                // 保留的日志文件数量
  "datePattern": "YYYY-MM-DD",  // 日志文件日期格式
  "console": true               // 是否输出到控制台
}
```

#### server
- **类型**: object
- **必需**: 否
- **描述**: 服务器配置

```json
{
  "timeout": 30000,             // 请求超时时间（毫秒）
  "maxConcurrentRequests": 10,  // 最大并发请求数
  "enableMetrics": true,        // 是否启用性能指标
  "healthCheck": {              // 健康检查配置
    "enabled": true,
    "interval": 60000
  }
}
```

### 3. 环境变量配置

创建 `.env` 文件（可选）：

```bash
# 公司项目工作区根目录（必需）
WORKSPACE_ROOT=/path/to/company-workspace

# 共享库名称（可选，默认 my-shared）
SHARED_LIBRARY_NAME=my-shared

# 共享库完整路径（可选，覆盖计算路径）
# 如果设置，会覆盖 WORKSPACE_ROOT + SHARED_LIBRARY_NAME 的计算结果
# SHARED_LIBRARY_PATH=/opt/company/shared-libs/my-shared-v2

# 日志级别
LOG_LEVEL=info

# 配置文件路径
CONFIG_PATH=./config.json

# 服务器端口（如果需要）
PORT=3000

# 环境类型
NODE_ENV=production
```

路径计算规则：`最终共享库路径 = SHARED_LIBRARY_PATH || (WORKSPACE_ROOT + SHARED_LIBRARY_NAME)`

### 4. 高级配置

#### 自定义模板配置

```json
{
  "templates": {
    "componentTemplate": "./custom-templates/component.hbs",
    "pageTemplate": "./custom-templates/page.hbs",
    "apiTemplate": "./custom-templates/api.hbs",
    "mockTemplate": "./custom-templates/mock.hbs"
  }
}
```

#### 代码生成配置

```json
{
  "codeGeneration": {
    "indentSize": 2,
    "indentType": "spaces",
    "lineEnding": "lf",
    "insertFinalNewline": true,
    "trimTrailingWhitespace": true,
    "fileNaming": {
      "components": "kebab-case",
      "pages": "kebab-case",
      "apis": "camelCase"
    }
  }
}
```

#### 项目模板配置

```json
{
  "projectTemplates": {
    "frontend": {
      "source": "./templates/frontend-project",
      "excludePatterns": ["node_modules", ".git", "dist"],
      "replacePatterns": {
        "{{PROJECT_NAME}}": "name",
        "{{PROJECT_DESCRIPTION}}": "description"
      }
    },
    "backend": {
      "source": "./templates/backend-project",
      "excludePatterns": ["node_modules", ".git", "dist"],
      "replacePatterns": {
        "{{PROJECT_NAME}}": "name",
        "{{PROJECT_DESCRIPTION}}": "description"
      }
    }
  }
}
```

## 启动和验证

### 1. 启动服务器

```bash
# 开发模式（带文件监听和详细日志）
npm run dev

# 生产模式
npm start

# 后台运行
nohup npm start > server.log 2>&1 &

# 使用 PM2 管理进程
pm2 start src/index.js --name balm-shared-mcp
```

### 2. 验证服务器状态

```bash
# 检查进程是否运行
ps aux | grep balm-shared-mcp

# 检查日志输出
tail -f logs/balm-shared-mcp.log

# 运行健康检查
npm run test:health
```

### 3. 测试工具功能

```bash
# 运行完整测试套件
npm test

# 运行集成测试
npm run test:integration

# 运行性能测试
npm run test:performance
```

### 4. MCP 客户端连接测试

如果您使用支持 MCP 的 AI 客户端，可以通过以下方式测试连接：

```json
{
  "mcpServers": {
    "balm-shared-mcp": {
      "command": "node",
      "args": ["./src/index.js"],
      "cwd": "/path/to/balm-shared-mcp",
      "env": {
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

## 常见问题

### 1. 安装问题

**Q: npm install 失败，提示权限错误**

A: 尝试以下解决方案：
```bash
# 使用 sudo（不推荐）
sudo npm install

# 配置 npm 全局目录
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH

# 使用 nvm 管理 Node.js 版本
nvm install 18
nvm use 18
```

**Q: 依赖包版本冲突**

A: 清理缓存并重新安装：
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 2. 配置问题

**Q: shared-project 路径配置错误**

A: 检查路径配置：
```bash
# 检查路径是否存在
ls -la /path/to/shared-project

# 检查权限
ls -la /path/to/shared-project/src

# 使用绝对路径
{
  "sharedProjectPath": "/path/to/shared-project"
}
```

**Q: 日志文件无法创建**

A: 检查目录权限：
```bash
# 创建日志目录
mkdir -p logs

# 设置权限
chmod 755 logs

# 检查磁盘空间
df -h
```

### 3. 运行时问题

**Q: 服务器启动失败**

A: 检查以下项目：
```bash
# 检查端口占用
lsof -i :3000

# 检查配置文件格式
node -e "console.log(JSON.parse(require('fs').readFileSync('config.json', 'utf8')))"

# 查看详细错误信息
DEBUG=* npm start
```

**Q: 工具调用超时**

A: 调整超时配置：
```json
{
  "server": {
    "timeout": 60000,
    "maxConcurrentRequests": 5
  }
}
```

**Q: 内存使用过高**

A: 优化配置：
```json
{
  "logging": {
    "level": "warn",
    "maxSize": "5MB",
    "maxFiles": 3
  },
  "server": {
    "maxConcurrentRequests": 5
  }
}
```

### 4. 性能优化

**Q: 如何提高代码生成速度？**

A: 优化建议：
- 使用 SSD 存储
- 增加内存分配：`node --max-old-space-size=4096 src/index.js`
- 减少并发请求数
- 启用文件系统缓存

**Q: 如何减少日志文件大小？**

A: 配置日志轮转：
```json
{
  "logging": {
    "level": "warn",
    "maxSize": "5MB",
    "maxFiles": 3,
    "compress": true
  }
}
```

### 5. 故障排除

**启用调试模式：**
```bash
export LOG_LEVEL=debug
export DEBUG=balm-shared-mcp:*
npm start
```

**收集诊断信息：**
```bash
# 系统信息
node --version
npm --version
uname -a

# 项目信息
npm list --depth=0
ls -la config.json

# 运行时信息
ps aux | grep node
netstat -tlnp | grep node
```

**联系支持：**
如果问题仍然存在，请提供以下信息：
- 操作系统和版本
- Node.js 和 npm 版本
- 完整的错误日志
- 配置文件内容
- 重现步骤

---

*本指南最后更新时间：2025年1月*