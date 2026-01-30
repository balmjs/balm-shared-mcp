#!/usr/bin/env node

/**
 * Validate AI-EXAMPLES.md use cases
 *
 * This script validates that all examples in AI-EXAMPLES.md match the actual tool schemas
 */

import { MCPServer } from '../src/core/mcp-server.js';
import { ProjectManager } from '../src/managers/project-manager.js';
import { CodeGenerator } from '../src/generators/code-generator.js';
import { ResourceAnalyzer } from '../src/analyzers/resource-analyzer.js';
import { FileSystemHandler } from '../src/handlers/file-system-handler.js';

// Test cases from AI-EXAMPLES.md
const testCases = [
  {
    name: 'create_project - 示例 1：创建前端项目',
    tool: 'create_project',
    args: {
      name: 'my-webapp',
      type: 'frontend',
      path: '/Users/dev/company/my-webapp'
    },
    expectedFields: [
      'success',
      'message',
      'projectPath',
      'type',
      'template',
      'features',
      'nextSteps'
    ]
  },
  {
    name: 'create_project - 示例 2：创建后台项目（参考现有项目）',
    tool: 'create_project',
    args: {
      name: 'new-admin',
      type: 'backend',
      path: '/Users/dev/company/new-admin',
      referenceProject: 'company-admin'
    },
    expectedFields: ['success', 'message', 'projectPath', 'type', 'mode']
  },
  {
    name: 'analyze_project - 分析项目结构',
    tool: 'analyze_project',
    args: {
      path: '/Users/dev/company/my-app'
    },
    expectedFields: [
      'projectPath',
      'isValid',
      'projectType',
      'hasSharedProject',
      'structure',
      'configuration'
    ]
  },
  {
    name: 'generate_crud_module - 生成用户管理模块',
    tool: 'generate_crud_module',
    args: {
      module: 'user',
      model: 'User',
      fields: [
        { name: 'name', type: 'string', component: 'ui-textfield' },
        { name: 'email', type: 'string', component: 'ui-textfield' },
        { name: 'role', type: 'string', component: 'ui-select' },
        { name: 'createdAt', type: 'date', component: 'ui-datepicker' }
      ],
      projectPath: '/Users/dev/company/my-admin'
    },
    expectedFields: ['success', 'generatedFiles', 'summary']
  },
  {
    name: 'generate_page_component - 生成产品列表页',
    tool: 'generate_page_component',
    args: {
      name: 'product-list',
      type: 'list',
      model: 'Product',
      projectPath: '/Users/dev/company/my-shop'
    },
    expectedFields: ['success', 'generatedFiles', 'summary']
  },
  {
    name: 'generate_model_config - 生成订单表单配置',
    tool: 'generate_model_config',
    args: {
      name: 'Order',
      fields: [
        { name: 'orderNo', label: '订单号', type: 'string', required: true },
        {
          name: 'customerName',
          label: '客户姓名',
          type: 'string',
          required: true,
          validation: { minLength: 2, maxLength: 50 }
        },
        { name: 'amount', label: '订单金额', type: 'number', required: true },
        { name: 'orderDate', label: '下单日期', type: 'date', required: true }
      ],
      projectPath: '/Users/dev/company/my-shop',
      formLayout: 'vertical',
      submitText: '提交订单',
      cancelText: '取消'
    },
    expectedFields: ['success', 'configPath']
  },
  {
    name: 'query_component - 查询列表视图组件',
    tool: 'query_component',
    args: {
      name: 'ui-list-view',
      category: 'pro-views'
    },
    expectedFields: ['found', 'name', 'category']
  },
  {
    name: 'get_best_practices - 获取 API 配置最佳实践',
    tool: 'get_best_practices',
    args: {
      topic: 'api-config'
    },
    expectedFields: ['topic', 'practices', 'examples']
  }
];

// Initialize MCP Server
const config = {
  workspaceRoot: process.cwd(),
  sharedLibraryName: 'yiban-shared'
};

const fileSystemHandler = new FileSystemHandler();
const projectManager = new ProjectManager(fileSystemHandler, config);
const codeGenerator = new CodeGenerator(fileSystemHandler, config);
const resourceAnalyzer = new ResourceAnalyzer(config);

const mcpServer = new MCPServer({
  projectManager,
  codeGenerator,
  resourceAnalyzer,
  fileSystemHandler,
  config
});

console.log('='.repeat(80));
console.log('验证 AI-EXAMPLES.md 中的用例');
console.log('='.repeat(80));
console.log('');

async function validateToolSchema(toolName, args) {
  const tools = await mcpServer.listTools();
  const tool = tools.tools.find(t => t.name === toolName);

  if (!tool) {
    return { valid: false, error: `工具 "${toolName}" 未找到` };
  }

  // Validate required parameters
  const schema = tool.inputSchema;
  const required = schema.required || [];
  const properties = schema.properties || {};

  const missingParams = required.filter(param => !(param in args));
  if (missingParams.length > 0) {
    return {
      valid: false,
      error: `缺少必需参数: ${missingParams.join(', ')}`
    };
  }

  // Validate parameter types
  for (const [key, value] of Object.entries(args)) {
    if (!(key in properties)) {
      return {
        valid: false,
        error: `未知参数: ${key}`
      };
    }

    const propSchema = properties[key];
    const actualType = Array.isArray(value) ? 'array' : typeof value;

    // Check type
    if (propSchema.type && propSchema.type !== actualType) {
      return {
        valid: false,
        error: `参数 "${key}" 类型错误: 期望 ${propSchema.type}, 实际 ${actualType}`
      };
    }

    // Check enum values
    if (propSchema.enum && !propSchema.enum.includes(value)) {
      return {
        valid: false,
        error: `参数 "${key}" 值无效: 必须是 ${propSchema.enum.join(', ')} 之一`
      };
    }
  }

  return { valid: true, tool };
}

async function runValidation() {
  let passedCount = 0;
  let failedCount = 0;
  const results = [];

  for (const testCase of testCases) {
    console.log(`测试: ${testCase.name}`);
    console.log(`工具: ${testCase.tool}`);
    console.log('参数:', JSON.stringify(testCase.args, null, 2));

    try {
      const validation = await validateToolSchema(testCase.tool, testCase.args);

      if (!validation.valid) {
        console.log(`❌ 验证失败: ${validation.error}`);
        failedCount++;
        results.push({ testCase: testCase.name, status: 'FAILED', error: validation.error });
      } else {
        console.log('✅ 参数验证通过');
        console.log(`   工具描述: ${validation.tool.description}`);
        passedCount++;
        results.push({ testCase: testCase.name, status: 'PASSED' });
      }
    } catch (error) {
      console.log(`❌ 验证出错: ${error.message}`);
      failedCount++;
      results.push({ testCase: testCase.name, status: 'ERROR', error: error.message });
    }

    console.log('');
  }

  console.log('='.repeat(80));
  console.log('验证结果汇总');
  console.log('='.repeat(80));
  console.log('');
  console.log(`总测试数: ${testCases.length}`);
  console.log(`✅ 通过: ${passedCount}`);
  console.log(`❌ 失败: ${failedCount}`);
  console.log('');

  if (failedCount > 0) {
    console.log('失败的测试:');
    results
      .filter(r => r.status !== 'PASSED')
      .forEach(r => {
        console.log(`  - ${r.testCase}: ${r.error}`);
      });
    console.log('');
  }

  // Additional validation: Check if all tools are documented
  console.log('='.repeat(80));
  console.log('检查工具文档完整性');
  console.log('='.repeat(80));
  console.log('');

  const tools = await mcpServer.listTools();
  const documentedTools = new Set(testCases.map(tc => tc.tool));
  const allTools = tools.tools.map(t => t.name);

  console.log(`MCP 服务器中的所有工具 (${allTools.length}):`);
  allTools.forEach(tool => {
    const isDocumented = documentedTools.has(tool);
    console.log(
      `  ${isDocumented ? '✅' : '⚠️ '} ${tool}${isDocumented ? '' : ' (未在 AI-EXAMPLES.md 中记录)'}`
    );
  });
  console.log('');

  // Check for documented but non-existent tools
  const nonExistentTools = Array.from(documentedTools).filter(tool => !allTools.includes(tool));
  if (nonExistentTools.length > 0) {
    console.log('⚠️  文档中记录但不存在的工具:');
    nonExistentTools.forEach(tool => {
      console.log(`  - ${tool}`);
    });
    console.log('');
  }

  console.log('='.repeat(80));
  console.log('验证完成');
  console.log('='.repeat(80));

  process.exit(failedCount > 0 ? 1 : 0);
}

runValidation().catch(error => {
  console.error('验证过程出错:', error);
  process.exit(1);
});
