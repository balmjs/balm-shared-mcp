# BalmSharedMCP 故障排除和常见问题

## 目录

- [快速诊断](#快速诊断)
- [安装和配置问题](#安装和配置问题)
- [运行时错误](#运行时错误)
- [工具调用问题](#工具调用问题)
- [性能问题](#性能问题)
- [常见问题 FAQ](#常见问题-faq)
- [日志分析](#日志分析)
- [获取帮助](#获取帮助)

## 快速诊断

### 健康检查清单

在报告问题之前，请先运行以下检查：

```bash
# 1. 检查 Node.js 版本
node --version  # 应该 >= 18.0.0

# 2. 检查项目依赖
npm list --depth=0

# 3. 运行测试套件
npm test

# 4. 检查配置文件
node -e "console.log(JSON.parse(require('fs').readFileSync('config.json', 'utf8')))"

# 5. 检查 shared-project 路径
ls -la $(node -e "console.log(require('./config.json').sharedProjectPath)")

# 6. 检查日志文件
tail -n 50 logs/balm-shared-mcp.log
```

### 常用调试命令

```bash
# 启用详细日志
export LOG_LEVEL=debug
export DEBUG=balm-shared-mcp:*

# 检查进程状态
ps aux | grep balm-shared-mcp

# 检查端口占用
lsof -i :3000

# 监控资源使用
top -p $(pgrep -f balm-shared-mcp)
```

## 安装和配置问题

### 问题：npm install 失败

**症状：**
```
npm ERR! code EACCES
npm ERR! syscall access
npm ERR! path /usr/local/lib/node_modules
```

**解决方案：**

1. **使用 nvm 管理 Node.js（推荐）：**
```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 重启终端或执行
source ~/.bashrc

# 安装和使用 Node.js 18
nvm install 18
nvm use 18
nvm alias default 18
```

2. **配置 npm 全局目录：**
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

3. **清理缓存重试：**
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 问题：配置文件格式错误

**症状：**
```
SyntaxError: Unexpected token } in JSON at position 123
```

**解决方案：**

1. **验证 JSON 格式：**
```bash
# 使用 jq 验证（如果已安装）
jq . config.json

# 使用 Node.js 验证
node -e "JSON.parse(require('fs').readFileSync('config.json', 'utf8'))"
```

2. **常见格式错误：**
```json
// ❌ 错误：有注释
{
  "sharedProjectPath": "./shared-project", // 这是注释
  "templatesPath": "./templates"
}

// ❌ 错误：末尾有逗号
{
  "sharedProjectPath": "./shared-project",
  "templatesPath": "./templates",
}

// ✅ 正确格式
{
  "sharedProjectPath": "./shared-project",
  "templatesPath": "./templates"
}
```

### 问题：shared-project 路径配置错误

**症状：**
```
Error: ENOENT: no such file or directory, scandir '/path/to/shared-project'
```

**解决方案：**

1. **检查路径是否存在：**
```bash
ls -la /path/to/shared-project
```

2. **使用绝对路径：**
```json
{
  "sharedProjectPath": "/path/to/shared-project"
}
```

3. **检查权限：**
```bash
# 检查目录权限
ls -la /path/to/shared-project

# 如果权限不足，修改权限
chmod -R 755 /path/to/shared-project
```

## 运行时错误

### 问题：服务器启动失败

**症状：**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**解决方案：**

1. **查找占用端口的进程：**
```bash
lsof -i :3000
netstat -tlnp | grep :3000
```

2. **终止占用进程：**
```bash
# 根据 PID 终止进程
kill -9 <PID>

# 或者终止所有 node 进程
pkill -f node
```

3. **使用不同端口：**
```bash
PORT=3001 npm start
```

### 问题：内存不足错误

**症状：**
```
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
```

**解决方案：**

1. **增加内存限制：**
```bash
node --max-old-space-size=4096 src/index.js
```

2. **优化配置：**
```json
{
  "server": {
    "maxConcurrentRequests": 5
  },
  "logging": {
    "level": "warn",
    "maxSize": "5MB",
    "maxFiles": 3
  }
}
```

### 问题：文件权限错误

**症状：**
```
Error: EACCES: permission denied, open '/path/to/project/file.js'
```

**解决方案：**

1. **检查文件权限：**
```bash
ls -la /path/to/project/
```

2. **修改权限：**
```bash
# 修改目录权限
chmod -R 755 /path/to/project/

# 修改文件所有者
chown -R $USER:$USER /path/to/project/
```

3. **检查磁盘空间：**
```bash
df -h
```

## 工具调用问题

### 问题：create_project 工具失败

**症状：**
```
Error: Template not found: frontend-project
```

**解决方案：**

1. **检查模板路径：**
```bash
ls -la templates/
ls -la examples/
```

2. **更新配置：**
```json
{
  "templatesPath": "./examples",
  "projectTemplates": {
    "frontend": {
      "source": "./examples/frontend-project"
    },
    "backend": {
      "source": "./examples/backend-project"
    }
  }
}
```

### 问题：generate_crud_module 工具超时

**症状：**
```
Error: Tool execution timeout after 30000ms
```

**解决方案：**

1. **增加超时时间：**
```json
{
  "server": {
    "timeout": 60000
  }
}
```

2. **减少字段数量：**
```javascript
// 分批生成，每次不超过 10 个字段
const fields = allFields.slice(0, 10);
```

3. **检查磁盘 I/O：**
```bash
# 检查磁盘使用率
iostat -x 1 5

# 检查磁盘空间
df -h
```

### 问题：query_component 返回空结果

**症状：**
```
{
  "content": [
    {
      "type": "text",
      "text": "Component not found: ui-textfield"
    }
  ]
}
```

**解决方案：**

1. **检查组件名称：**
```bash
# 在 shared-project 中搜索组件
find /path/to/shared-project -name "*textfield*" -type f
```

2. **更新资源索引：**
```bash
# 重启服务器以重新构建索引
npm restart
```

3. **检查 shared-project 版本：**
```bash
cd /path/to/shared-project
git log --oneline -n 5
```

## 性能问题

### 问题：代码生成速度慢

**症状：**
- 生成单个组件需要超过 10 秒
- CPU 使用率持续很高

**解决方案：**

1. **使用 SSD 存储：**
```bash
# 检查存储类型
lsblk -d -o name,rota
```

2. **优化并发设置：**
```json
{
  "server": {
    "maxConcurrentRequests": 3
  }
}
```

3. **启用缓存：**
```json
{
  "caching": {
    "enabled": true,
    "ttl": 300000,
    "maxSize": 100
  }
}
```

### 问题：内存使用持续增长

**症状：**
- 内存使用率不断上升
- 最终导致 OOM 错误

**解决方案：**

1. **监控内存使用：**
```bash
# 实时监控
watch -n 1 'ps aux | grep balm-shared-mcp'

# 使用 htop
htop -p $(pgrep -f balm-shared-mcp)
```

2. **配置日志轮转：**
```json
{
  "logging": {
    "maxSize": "5MB",
    "maxFiles": 3,
    "compress": true
  }
}
```

3. **定期重启服务：**
```bash
# 使用 PM2 自动重启
pm2 start src/index.js --name balm-shared-mcp --max-memory-restart 500M
```

## 常见问题 FAQ

### Q1: 支持哪些 Node.js 版本？

**A:** 支持 Node.js 18.0.0 及以上版本。推荐使用 LTS 版本。

```bash
# 检查版本
node --version

# 升级到 LTS 版本
nvm install --lts
nvm use --lts
```

### Q2: 可以同时运行多个实例吗？

**A:** 可以，但需要注意以下几点：

1. **使用不同的配置文件：**
```bash
CONFIG_PATH=./config-dev.json npm start &
CONFIG_PATH=./config-prod.json npm start &
```

2. **使用不同的日志目录：**
```json
{
  "logging": {
    "file": "./logs/instance-1/app.log"
  }
}
```

### Q3: 如何备份和恢复配置？

**A:** 配置文件和模板都是文本文件，可以直接备份：

```bash
# 备份配置
cp config.json config.json.backup
tar -czf backup-$(date +%Y%m%d).tar.gz config.json templates/ logs/

# 恢复配置
cp config.json.backup config.json
```

### Q4: 如何更新到新版本？

**A:** 更新步骤：

```bash
# 1. 备份当前配置
cp config.json config.json.backup

# 2. 拉取最新代码
git pull origin main

# 3. 更新依赖
npm install

# 4. 运行测试
npm test

# 5. 重启服务
npm restart
```

### Q5: 支持 Windows 系统吗？

**A:** 支持，但需要注意路径分隔符：

```json
{
  "sharedProjectPath": "C:\\path\\to\\shared-project",
  "templatesPath": ".\\templates"
}
```

### Q6: 如何自定义代码模板？

**A:** 创建自定义模板：

1. **复制现有模板：**
```bash
cp -r templates/ custom-templates/
```

2. **修改模板文件：**
```handlebars
<!-- custom-templates/component.hbs -->
<template>
  <div class="{{kebabCase name}}">
    {{#each fields}}
    <ui-{{component}} v-model="form.{{name}}" label="{{label}}"></ui-{{component}}>
    {{/each}}
  </div>
</template>
```

3. **更新配置：**
```json
{
  "templatesPath": "./custom-templates"
}
```

## 日志分析

### 日志级别说明

| 级别 | 描述 | 用途 |
|------|------|------|
| debug | 详细调试信息 | 开发和故障排除 |
| info | 一般信息 | 正常运行监控 |
| warn | 警告信息 | 潜在问题提醒 |
| error | 错误信息 | 错误和异常 |

### 常见日志模式

**正常启动：**
```
[2025-01-28T10:00:00.000Z] INFO: BalmSharedMCP server starting...
[2025-01-28T10:00:00.100Z] INFO: Registered 6 tools across 3 categories
[2025-01-28T10:00:00.200Z] INFO: BalmSharedMCP server started successfully
```

**工具调用：**
```
[2025-01-28T10:01:00.000Z] INFO: [Request 1] Tool call initiated {"toolName":"create_project"}
[2025-01-28T10:01:05.000Z] INFO: [Request 1] Tool execution completed {"success":true}
```

**错误模式：**
```
[2025-01-28T10:02:00.000Z] ERROR: Tool execution failed {"toolName":"create_project","error":"ENOENT: no such file or directory"}
```

### 日志分析工具

```bash
# 查看最近的错误
grep "ERROR" logs/balm-shared-mcp.log | tail -10

# 统计工具调用次数
grep "Tool call initiated" logs/balm-shared-mcp.log | awk '{print $8}' | sort | uniq -c

# 查看性能统计
grep "execution completed" logs/balm-shared-mcp.log | grep -o '"duration":[0-9]*' | awk -F: '{sum+=$2; count++} END {print "Average:", sum/count "ms"}'
```

## 获取帮助

### 自助资源

1. **查看文档：**
   - [API 文档](./API.md)
   - [安装指南](./INSTALLATION.md)
   - [README](../README.md)

2. **运行诊断：**
```bash
npm run diagnose  # 如果有此脚本
npm test
npm run test:integration
```

3. **搜索已知问题：**
   - 检查 GitHub Issues
   - 查看更新日志

### 报告问题

提交问题时，请包含以下信息：

1. **环境信息：**
```bash
# 收集系统信息
echo "OS: $(uname -a)"
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "Project version: $(npm list balm-shared-mcp --depth=0)"
```

2. **配置信息：**
```bash
# 脱敏后的配置文件
cat config.json | sed 's/\/.*\/shared-project/\/path\/to\/shared-project/g'
```

3. **错误日志：**
```bash
# 最近的错误日志
tail -50 logs/balm-shared-mcp.log
```

4. **重现步骤：**
   - 详细的操作步骤
   - 预期结果和实际结果
   - 错误截图（如果有）

### 联系方式

- **GitHub Issues**: 提交 bug 报告和功能请求
- **技术支持**: 联系开发团队
- **社区讨论**: 参与技术讨论

---

*本文档最后更新时间：2025年1月*