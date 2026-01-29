# BalmSharedMCP 快速使用指南

## 🚀 什么是 MCP？

MCP (Model Context Protocol) 是一种协议，让 AI 助手（如 Claude、Cursor 等）能够调用本地工具。**balm-shared-mcp 是一个本地运行的 MCP 服务器**，无需云端部署。

---

## 📦 安装方式

### 方式一：从 npm 安装（推荐）

```bash
# 全局安装
npm install -g balm-shared-mcp

# 或使用 npx 直接运行（无需安装）
npx balm-shared-mcp
```

### 方式二：从源码安装

```bash
git clone <repository-url>
cd balm-shared-mcp
npm install
```

---

## ⚙️ 配置 AI 客户端

### Claude Desktop 配置

编辑 Claude Desktop 配置文件：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "balm-shared-mcp": {
      "command": "npx",
      "args": ["-y", "balm-shared-mcp"],
      "env": {
        "SHARED_LIBRARY_PATH": "/path/to/my-shared",
        "SHARED_LIBRARY_NAME": "my-shared"
      }
    }
  }
}
```

> 如果是源码安装：

```json
{
  "mcpServers": {
    "balm-shared-mcp": {
      "command": "node",
      "args": ["/path/to/balm-shared-mcp/src/index.js"],
      "env": {
        "SHARED_LIBRARY_PATH": "/path/to/my-shared"
      }
    }
  }
}
```

### Cursor 配置

在 Cursor 的 MCP 设置中添加：

```json
{
  "balm-shared-mcp": {
    "command": "npx",
    "args": ["-y", "balm-shared-mcp"],
    "env": {
      "SHARED_LIBRARY_PATH": "/path/to/my-shared"
    }
  }
}
```

### VS Code + Continue 配置

在 `~/.continue/config.json` 中：

```json
{
  "mcpServers": [
    {
      "name": "balm-shared-mcp",
      "command": "npx",
      "args": ["-y", "balm-shared-mcp"],
      "env": {
        "SHARED_LIBRARY_PATH": "/path/to/my-shared"
      }
    }
  ]
}
```

---

## 🔧 环境变量配置

| 变量 | 必需 | 说明 | 默认值 |
|------|------|------|--------|
| `SHARED_LIBRARY_PATH` | ✅ | 共享库的本地路径 | - |
| `SHARED_LIBRARY_NAME` | ❌ | 共享库名称（不同公司可自定义） | `my-shared` |
| `LOG_LEVEL` | ❌ | 日志级别 | `info` |

### 公司自定义示例

不同公司可以有不同的共享库名称：

```bash
# A 公司
SHARED_LIBRARY_NAME=a-shared
SHARED_LIBRARY_PATH=/path/to/a-shared

# B 公司
SHARED_LIBRARY_NAME=test-shared-pro
SHARED_LIBRARY_PATH=/path/to/test-shared-pro

# 默认
SHARED_LIBRARY_NAME=my-shared
SHARED_LIBRARY_PATH=/path/to/my-shared
```

---

## ✅ 验证安装

重启 AI 客户端后，测试 MCP 是否正常工作：

```
请使用 query_component 工具查询 ui-list-view 组件信息
```

如果配置正确，AI 将返回组件的 props、events 等信息。

---

## 📝 可用工具列表

| 工具 | 功能 |
|------|------|
| `create_project` | 创建 frontend/backend 项目 |
| `analyze_project` | 分析项目结构 |
| `generate_crud_module` | 生成完整 CRUD 模块 |
| `generate_page_component` | 生成页面组件 |
| `generate_model_config` | 生成表单配置 |
| `query_component` | 查询共享库组件 |
| `get_best_practices` | 获取最佳实践 |

---

## 💡 使用示例

### 生成 CRUD 模块

对 AI 说：

```
使用 generate_crud_module 工具，在 /path/to/my-project 项目中生成用户管理模块：
- 模块名：user
- 模型名：User
- 字段：
  - name (string, ui-textfield)
  - email (string, ui-textfield)
  - status (number, ui-select)
```

AI 将生成：
- `pages/user/user-list.vue`
- `pages/user/user-detail.vue`
- `routes/user.js`
- `apis/user.js` 或 `config/api/user.js`
- `mock-server/apis/user.js`
- `config/model-config/user.js`

---

## ❓ 常见问题

### Q: 发布到 npm 后需要部署云端服务器吗？

**A: 不需要！** MCP 服务器是**本地运行**的：

1. 用户安装 npm 包（`npm install -g balm-shared-mcp`）
2. AI 客户端（Claude Desktop/Cursor）启动时自动运行 MCP 服务器
3. MCP 通过 **stdio**（标准输入输出）与 AI 通信
4. 所有代码生成都在**用户本地**执行

```
┌─────────────────┐     stdio      ┌──────────────────┐
│  Claude Desktop │ ◄────────────► │  balm-shared-mcp │
│  (AI 客户端)     │                │  (本地进程)       │
└─────────────────┘                └──────────────────┘
                                           │
                                           ▼
                                   ┌──────────────────┐
                                   │  用户本地文件系统  │
                                   │  (生成代码到项目)  │
                                   └──────────────────┘
```

### Q: 我需要做什么才能让团队使用？

1. 发布 npm 包：`npm publish`
2. 团队成员配置 AI 客户端（见上方配置示例）
3. 确保每个成员本地有对应的共享库项目（名称通过 `SHARED_LIBRARY_NAME` 配置）
4. 设置 `SHARED_LIBRARY_NAME` 为公司自定义的名称（如 `a-shared`）

### Q: 没有网络能用吗？

可以！MCP 完全本地运行。但首次使用需要：
- 安装 npm 包（需要网络）
- 之后可离线使用

---

## 📚 更多文档

- [API 文档](./docs/API.md)
- [安装配置详解](./docs/INSTALLATION.md)
- [最佳实践](./docs/BEST_PRACTICES.md)
- [故障排除](./docs/TROUBLESHOOTING.md)

---

*最后更新：2026-01-29*
