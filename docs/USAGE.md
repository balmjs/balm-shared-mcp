# BalmSharedMCP 快速使用指南

## 🚀 什么是 MCP？

MCP (Model Context Protocol) 是一种协议，让 AI 助手能够调用本地工具。**balm-shared-mcp 是一个本地运行的 MCP 服务器**，无需云端部署。

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

## ⚙️ MCP 配置说明

### ⚠️ 重要：CLI vs IDE 配置差异

| 项目 | CLI 工具 | IDE/插件 |
|------|----------|----------|
| **配置位置** | 全局配置文件 | 项目级或用户级配置 |
| **路径解析** | 相对于 HOME 目录 | 相对于工作区或配置文件 |
| **进程管理** | CLI 直接管理 | IDE 管理（可能有超时） |
| **常见问题** | 较少 | 路径、权限、启动超时 |

### 关键配置要点

1. **使用绝对路径**：在 IDE 中配置时，全部使用绝对路径
2. **node 优于 npx**：npx 启动慢，IDE 可能超时，建议用 node 直接运行
3. **环境变量要完整**：确保 `PATH` 等环境变量正确传递
4. **日志排查**：设置 `LOG_LEVEL=debug` 排查问题

---

## 🖥️ CLI 工具配置

### Gemini CLI

配置文件位置：`~/.gemini/settings.json`

```json
{
  "mcpServers": {
    "balm-shared-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/balm-shared-mcp/src/index.js"],
      "env": {
        "WORKSPACE_ROOT": "/Users/yourname/workspace",
        "SHARED_LIBRARY_NAME": "my-shared",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

**或使用全局安装版本：**

```json
{
  "mcpServers": {
    "balm-shared-mcp": {
      "command": "balm-shared-mcp",
      "env": {
        "WORKSPACE_ROOT": "/Users/yourname/workspace",
        "SHARED_LIBRARY_NAME": "my-shared"
      }
    }
  }
}
```

### Claude CLI (Anthropic)

配置文件位置：`~/.claude/config.json`

```json
{
  "mcpServers": {
    "balm-shared-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/balm-shared-mcp/src/index.js"],
      "env": {
        "WORKSPACE_ROOT": "/Users/yourname/workspace",
        "SHARED_LIBRARY_NAME": "my-shared"
      }
    }
  }
}
```

### Codex CLI (OpenAI)

Codex CLI 目前使用 `agents.json` 配置：

```json
{
  "mcpServers": {
    "balm-shared-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/balm-shared-mcp/src/index.js"],
      "env": {
        "WORKSPACE_ROOT": "/Users/yourname/workspace",
        "SHARED_LIBRARY_NAME": "my-shared"
      }
    }
  }
}
```

---

## 🖥️ 桌面应用配置

### Claude Desktop

配置文件位置：
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "balm-shared-mcp": {
      "command": "node",
      "args": ["/Users/yourname/path/to/balm-shared-mcp/src/index.js"],
      "env": {
        "WORKSPACE_ROOT": "/Users/yourname/workspace",
        "SHARED_LIBRARY_NAME": "my-shared",
        "PATH": "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
      }
    }
  }
}
```

> ⚠️ **注意**：Claude Desktop 需要显式设置 `PATH` 环境变量，否则可能找不到 node。

**使用 npx 的备选配置：**

```json
{
  "mcpServers": {
    "balm-shared-mcp": {
      "command": "/usr/local/bin/npx",
      "args": ["-y", "balm-shared-mcp"],
      "env": {
        "WORKSPACE_ROOT": "/Users/yourname/workspace",
        "SHARED_LIBRARY_NAME": "my-shared",
        "PATH": "/usr/local/bin:/usr/bin:/bin"
      }
    }
  }
}
```

---

## 💻 IDE 配置

### Cursor

Cursor 支持 MCP，配置入口：

1. 打开 Cursor 设置
2. 搜索 "MCP" 或进入 Features → MCP
3. 添加服务器配置

**配置文件位置**：`~/.cursor/mcp.json` 或 项目级 `.cursor/mcp.json`

```json
{
  "mcpServers": {
    "balm-shared-mcp": {
      "command": "node",
      "args": ["/Users/yourname/path/to/balm-shared-mcp/src/index.js"],
      "env": {
        "WORKSPACE_ROOT": "/Users/yourname/workspace",
        "SHARED_LIBRARY_NAME": "my-shared"
      }
    }
  }
}
```

> ⚠️ **Cursor 常见问题**：
> - 如果工具列表为空，检查 MCP 服务器是否成功启动
> - 尝试重启 Cursor
> - 使用 `node` 而非 `npx`（避免启动超时）

### VS Code

VS Code 本身不原生支持 MCP，需通过插件实现。见下方插件配置。

### JetBrains IDEs (IntelliJ, WebStorm 等)

JetBrains 系列目前需要通过第三方插件支持 MCP。

---

## 🔌 IDE 插件配置

### Continue (VS Code / JetBrains)

**配置文件位置**：`~/.continue/config.json`

```json
{
  "models": [...],
  "mcpServers": [
    {
      "name": "balm-shared-mcp",
      "command": "node",
      "args": ["/Users/yourname/path/to/balm-shared-mcp/src/index.js"],
      "env": {
        "WORKSPACE_ROOT": "/Users/yourname/workspace",
        "SHARED_LIBRARY_NAME": "my-shared"
      }
    }
  ]
}
```

> ⚠️ **Continue 注意事项**：
> - `mcpServers` 是**数组**格式（不是对象）
> - 使用 `name` 字段指定服务器名称
> - Continue 版本需 >= 0.9.0 才支持 MCP

### Cline (VS Code)

**配置文件位置**：VS Code 设置 → Cline → MCP Servers

也可以直接编辑 `~/.cline/mcp_settings.json`：

```json
{
  "mcpServers": {
    "balm-shared-mcp": {
      "command": "node",
      "args": ["/Users/yourname/path/to/balm-shared-mcp/src/index.js"],
      "env": {
        "WORKSPACE_ROOT": "/Users/yourname/workspace",
        "SHARED_LIBRARY_NAME": "my-shared"
      },
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

> ⚠️ **Cline 注意事项**：
> - 需要 Cline 版本 >= 2.2.0
> - 可通过 `alwaysAllow` 数组预授权工具

### Roo Code (VS Code)

**配置文件位置**：项目根目录 `.roo/mcp.json` 或全局 `~/.roo/mcp.json`

```json
{
  "mcpServers": {
    "balm-shared-mcp": {
      "command": "node",
      "args": ["/Users/yourname/path/to/balm-shared-mcp/src/index.js"],
      "env": {
        "WORKSPACE_ROOT": "/Users/yourname/workspace",
        "SHARED_LIBRARY_NAME": "my-shared"
      }
    }
  }
}
```

### GitHub Copilot

截至目前，**GitHub Copilot 不支持 MCP 协议**。Copilot 有自己的扩展机制（Copilot Extensions），与 MCP 不兼容。

如需在 Copilot 中使用类似功能，需要开发 Copilot Extension。

### Windsurf (Codeium)

**配置文件位置**：`~/.codeium/windsurf/mcp_config.json`

```json
{
  "mcpServers": {
    "balm-shared-mcp": {
      "command": "node",
      "args": ["/Users/yourname/path/to/balm-shared-mcp/src/index.js"],
      "env": {
        "WORKSPACE_ROOT": "/Users/yourname/workspace",
        "SHARED_LIBRARY_NAME": "my-shared"
      }
    }
  }
}
```

---

## 🔧 环境变量配置

| 变量 | 必需 | 说明 | 默认值 |
|------|------|------|--------|
| `WORKSPACE_ROOT` | ✅ | 公司项目工作区根目录 | `./` |
| `SHARED_LIBRARY_NAME` | ❌ | 共享库名称 | `my-shared` |
| `SHARED_LIBRARY_PATH` | ❌ | 共享库完整路径（覆盖计算路径） | - |
| `LOG_LEVEL` | ❌ | 日志级别：debug/info/warn/error | `info` |

### 路径计算规则

```
最终共享库路径 = SHARED_LIBRARY_PATH || (WORKSPACE_ROOT + SHARED_LIBRARY_NAME)
```

---

## 🔍 故障排查

### 常见问题 1：MCP 服务器启动失败

**症状**：IDE 显示 MCP 服务器无法连接或超时

**排查步骤**：

1. **手动测试 MCP 服务器**：
   ```bash
   node /path/to/balm-shared-mcp/src/index.js
   ```
   如果报错，先解决启动问题。

2. **检查 Node.js 路径**：
   ```bash
   which node
   # 使用输出的绝对路径配置
   ```

3. **添加调试日志**：
   ```json
   {
     "env": {
       "LOG_LEVEL": "debug"
     }
   }
   ```

### 常见问题 2：工具列表为空

**症状**：MCP 服务器连接成功，但没有可用工具

**排查步骤**：

1. 检查 MCP 服务器日志输出
2. 确认 `WORKSPACE_ROOT` 路径存在
3. 确认共享库路径存在（`WORKSPACE_ROOT + SHARED_LIBRARY_NAME`）

### 常见问题 3：IDE 中无法使用但 CLI 正常

**可能原因**：

| 原因 | 解决方案 |
|------|----------|
| 路径问题 | 全部改为绝对路径 |
| 环境变量缺失 | 显式设置 `PATH` |
| 启动超时 | 使用 `node` 替代 `npx` |
| 权限问题 | 检查文件执行权限 |
| 配置格式错误 | 验证 JSON 格式 |

### 常见问题 4：macOS 特殊问题

**PATH 环境变量问题**：

macOS 上 GUI 应用（如 IDE）可能无法继承终端的 PATH。解决方案：

1. 在配置中显式设置 PATH：
   ```json
   {
     "env": {
       "PATH": "/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin"
     }
   }
   ```

2. 使用绝对路径调用 node：
   ```json
   {
     "command": "/usr/local/bin/node"
   }
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

详细使用示例请参阅 [AI-EXAMPLES.md](./AI-EXAMPLES.md)

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
2. AI 客户端启动时自动运行 MCP 服务器
3. MCP 通过 **stdio**（标准输入输出）与 AI 通信
4. 所有代码生成都在**用户本地**执行

```
┌─────────────────┐     stdio      ┌──────────────────┐
│  AI 客户端       │ ◄────────────► │  balm-shared-mcp │
│  (CLI/IDE)      │                │  (本地进程)       │
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
3. 每个成员设置自己的 `WORKSPACE_ROOT`（工作区根目录）
4. 确保每个成员本地有对应的共享库项目
5. 如果共享库不在工作区内，使用 `SHARED_LIBRARY_PATH` 覆盖路径

### Q: 没有网络能用吗？

可以！MCP 完全本地运行。但首次使用需要：
- 安装 npm 包（需要网络）
- 之后可离线使用

---

## 📚 更多文档

- [AI 使用示例](./AI-EXAMPLES.md)
- [API 文档](./API.md)
- [安装配置详解](./INSTALLATION.md)
- [最佳实践](./BEST_PRACTICES.md)
- [故障排除](./TROUBLESHOOTING.md)

---

*最后更新：2026-01-30*
