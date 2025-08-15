#!/usr/bin/env node

/**
 * BalmSharedMCP Demo Project
 * 
 * 这个示例展示了如何使用 BalmSharedMCP 的各种工具来创建一个完整的管理系统项目。
 * 
 * 运行方式：
 * node examples/demo-project.js
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 模拟 MCP 工具调用
class MCPClient {
  constructor() {
    this.serverPath = join(__dirname, '../src/index.js');
  }

  async callTool(toolName, params) {
    return new Promise((resolve, reject) => {
      const child = spawn('node', [this.serverPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const request = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: params
        }
      };

      child.stdin.write(JSON.stringify(request) + '\n');
      child.stdin.end();

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          try {
            const response = JSON.parse(output);
            resolve(response.result);
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });

      child.on('error', reject);
    });
  }
}

// 演示项目配置
const DEMO_CONFIG = {
  projectName: 'demo-admin-system',
  projectPath: './examples/demo-admin-system',
  modules: [
    {
      name: 'user',
      model: 'User',
      fields: [
        { name: 'username', type: 'string', component: 'ui-textfield' },
        { name: 'email', type: 'email', component: 'ui-textfield' },
        { name: 'role', type: 'string', component: 'ui-select' },
        { name: 'status', type: 'boolean', component: 'ui-switch' },
        { name: 'lastLogin', type: 'datetime', component: 'ui-datetime-picker' }
      ]
    },
    {
      name: 'product',
      model: 'Product',
      fields: [
        { name: 'name', type: 'string', component: 'ui-textfield' },
        { name: 'description', type: 'text', component: 'ui-textarea' },
        { name: 'price', type: 'number', component: 'ui-textfield' },
        { name: 'category', type: 'string', component: 'ui-select' },
        { name: 'inStock', type: 'boolean', component: 'ui-switch' }
      ]
    },
    {
      name: 'order',
      model: 'Order',
      fields: [
        { name: 'orderNumber', type: 'string', component: 'ui-textfield' },
        { name: 'customerName', type: 'string', component: 'ui-textfield' },
        { name: 'totalAmount', type: 'number', component: 'ui-textfield' },
        { name: 'status', type: 'string', component: 'ui-select' },
        { name: 'orderDate', type: 'date', component: 'ui-datepicker' }
      ]
    }
  ]
};

// 主演示函数
async function runDemo() {
  const client = new MCPClient();
  
  console.log('🚀 BalmSharedMCP 演示项目开始');
  console.log('=' .repeat(50));

  try {
    // 步骤 1: 创建项目
    console.log('\n📁 步骤 1: 创建项目结构');
    console.log('-'.repeat(30));
    
    const projectResult = await client.callTool('create_project', {
      name: DEMO_CONFIG.projectName,
      type: 'frontend',
      path: DEMO_CONFIG.projectPath
    });
    
    console.log('✅ 项目创建成功');
    console.log(projectResult.content[0].text.substring(0, 200) + '...');

    // 步骤 2: 分析项目结构
    console.log('\n🔍 步骤 2: 分析项目结构');
    console.log('-'.repeat(30));
    
    const analysisResult = await client.callTool('analyze_project', {
      path: DEMO_CONFIG.projectPath
    });
    
    console.log('✅ 项目分析完成');
    console.log(analysisResult.content[0].text.substring(0, 200) + '...');

    // 步骤 3: 生成业务模块
    console.log('\n⚙️ 步骤 3: 生成业务模块');
    console.log('-'.repeat(30));
    
    for (const module of DEMO_CONFIG.modules) {
      console.log(`\n正在生成 ${module.name} 模块...`);
      
      const moduleResult = await client.callTool('generate_crud_module', {
        module: module.name,
        model: module.model,
        fields: module.fields,
        projectPath: DEMO_CONFIG.projectPath
      });
      
      console.log(`✅ ${module.name} 模块生成成功`);
      
      // 添加延迟避免过载
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 步骤 4: 查询组件信息
    console.log('\n📚 步骤 4: 查询组件使用信息');
    console.log('-'.repeat(30));
    
    const componentInfo = await client.callTool('query_component', {
      name: 'ui-list-view',
      category: 'pro-views'
    });
    
    console.log('✅ 组件信息查询成功');
    console.log(componentInfo.content[0].text.substring(0, 200) + '...');

    // 步骤 5: 获取最佳实践
    console.log('\n💡 步骤 5: 获取开发最佳实践');
    console.log('-'.repeat(30));
    
    const bestPractices = await client.callTool('get_best_practices', {
      topic: 'component-usage'
    });
    
    console.log('✅ 最佳实践获取成功');
    console.log(bestPractices.content[0].text.substring(0, 200) + '...');

    // 演示完成
    console.log('\n🎉 演示完成！');
    console.log('=' .repeat(50));
    console.log(`项目已创建在: ${DEMO_CONFIG.projectPath}`);
    console.log('生成的文件包括:');
    console.log('  - 用户管理模块 (user)');
    console.log('  - 商品管理模块 (product)');
    console.log('  - 订单管理模块 (order)');
    console.log('  - API 配置文件');
    console.log('  - Mock 数据文件');
    console.log('  - 表单配置文件');
    
    console.log('\n下一步:');
    console.log('  1. cd ' + DEMO_CONFIG.projectPath);
    console.log('  2. npm install');
    console.log('  3. npm run dev');

  } catch (error) {
    console.error('\n❌ 演示过程中出现错误:', error.message);
    console.error('\n请检查:');
    console.error('  1. BalmSharedMCP 服务器是否正常运行');
    console.error('  2. 配置文件是否正确');
    console.error('  3. shared-project 路径是否存在');
    process.exit(1);
  }
}

// 工具函数：显示使用帮助
function showHelp() {
  console.log(`
BalmSharedMCP 演示项目

用法:
  node examples/demo-project.js [选项]

选项:
  --help, -h     显示帮助信息
  --config, -c   指定配置文件路径
  --path, -p     指定项目创建路径

示例:
  node examples/demo-project.js
  node examples/demo-project.js --path ./my-demo-project
  node examples/demo-project.js --config ./custom-config.json

这个演示将会:
  1. 创建一个完整的管理系统项目
  2. 生成用户、商品、订单三个业务模块
  3. 展示各种 MCP 工具的使用方法
  4. 提供最佳实践指导

更多信息请查看: docs/EXAMPLES.md
`);
}

// 命令行参数处理
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

// 运行演示
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo().catch(error => {
    console.error('演示运行失败:', error);
    process.exit(1);
  });
}

export { runDemo, MCPClient, DEMO_CONFIG };