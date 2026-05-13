/**
 * MCP Server Core Implementation
 *
 * Handles MCP protocol implementation, tool registration, and request routing.
 */

import { logger } from '../utils/logger.js';
import { BalmSharedMCPError, ErrorCodes } from '../utils/errors.js';
import { ToolRegistry } from './tool-registry.js';
import { ASTHandler } from '../handlers/ast-handler.js';

export class MCPServer {
  constructor(components) {
    this.projectManager = components.projectManager;
    this.codeGenerator = components.codeGenerator;
    this.resourceAnalyzer = components.resourceAnalyzer;
    this.fileSystemHandler = components.fileSystemHandler;
    this.config = components.config;
    this.astHandler = new ASTHandler(this.fileSystemHandler);

    this.toolRegistry = new ToolRegistry();
    this.requestCount = 0;
    this.startTime = Date.now();

    // Initialize server
    this.initialize();
  }

  /**
   * Initialize the MCP server
   */
  initialize() {
    try {
      logger.info('Initializing MCP Server...', {
        serverName: 'balm-shared-mcp',
        version: '1.0.0',
        startTime: new Date(this.startTime).toISOString()
      });

      this.registerTools();

      const stats = this.toolRegistry.getStatistics();
      logger.info('MCP Server initialized successfully', {
        toolCount: stats.totalTools,
        categories: stats.categories,
        availableTools: this.toolRegistry.list().map(tool => tool.name)
      });
    } catch (error) {
      logger.error('Failed to initialize MCP Server', { error: error.message });
      throw new BalmSharedMCPError(
        ErrorCodes.INVALID_CONFIGURATION,
        'MCP Server initialization failed',
        { originalError: error.message }
      );
    }
  }

  /**
   * Register all available tools using the tool registry
   */
  registerTools() {
    // Project management tools
    this.toolRegistry.register(
      'create_project',
      '创建基于shared-project的新项目',
      {
        type: 'object',
        properties: {
          name: { type: 'string', description: '项目名称' },
          type: { type: 'string', enum: ['frontend', 'backend'], description: '项目类型' },
          path: { type: 'string', description: '项目路径' },
          referenceProject: {
            type: 'string',
            description:
              '参考项目路径（可选，相对于 WORKSPACE_ROOT 或绝对路径）。如果提供，将使用复制模式而非 balm init'
          }
        },
        required: ['name', 'type', 'path']
      },
      this.createProject.bind(this),
      { category: 'project-management', tags: ['project', 'creation'] }
    );

    this.toolRegistry.register(
      'analyze_project',
      '分析项目结构和配置',
      {
        type: 'object',
        properties: {
          path: { type: 'string', description: '项目路径' }
        },
        required: ['path']
      },
      this.analyzeProject.bind(this),
      { category: 'project-management', tags: ['project', 'analysis'] }
    );

    // Code generation tools
    this.toolRegistry.register(
      'generate_crud_module',
      '生成完整的CRUD业务模块',
      {
        type: 'object',
        properties: {
          module: { type: 'string', description: '模块名称' },
          model: { type: 'string', description: '数据模型名称' },
          fields: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                type: { type: 'string' },
                component: { type: 'string' }
              },
              required: ['name', 'type', 'component']
            }
          },
          projectPath: { type: 'string', description: '项目路径' }
        },
        required: ['module', 'model', 'fields', 'projectPath']
      },
      this.generateCrudModule.bind(this),
      { category: 'code-generation', tags: ['crud', 'module', 'generation'] }
    );

    this.toolRegistry.register(
      'generate_page_component',
      '生成页面组件',
      {
        type: 'object',
        properties: {
          name: { type: 'string', description: '组件名称' },
          type: { type: 'string', enum: ['list', 'detail'], description: '组件类型' },
          model: { type: 'string', description: '关联的数据模型' },
          projectPath: { type: 'string', description: '项目路径' }
        },
        required: ['name', 'type', 'model', 'projectPath']
      },
      this.generatePageComponent.bind(this),
      { category: 'code-generation', tags: ['component', 'page', 'generation'] }
    );

    this.toolRegistry.register(
      'generate_model_config',
      '生成表单配置文件',
      {
        type: 'object',
        properties: {
          name: { type: 'string', description: '模型名称' },
          fields: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: '字段名称' },
                label: { type: 'string', description: '字段标签' },
                type: { type: 'string', description: '字段类型' },
                required: { type: 'boolean', description: '是否必填' },
                defaultValue: { description: '默认值' },
                options: { type: 'object', description: '字段选项' },
                validation: { type: 'object', description: '验证规则' }
              },
              required: ['name', 'label', 'type']
            },
            description: '字段定义数组'
          },
          projectPath: { type: 'string', description: '项目路径' },
          outputPath: { type: 'string', description: '输出路径（可选）' },
          formLayout: { type: 'string', enum: ['vertical', 'horizontal'], description: '表单布局' },
          submitText: { type: 'string', description: '提交按钮文本' },
          cancelText: { type: 'string', description: '取消按钮文本' }
        },
        required: ['name', 'fields', 'projectPath']
      },
      this.generateModelConfig.bind(this),
      { category: 'code-generation', tags: ['model-config', 'form', 'generation'] }
    );

    // Resource query tools
    this.toolRegistry.register(
      'query_component',
      '查询shared-project组件信息',
      {
        type: 'object',
        properties: {
          name: { type: 'string', description: '组件名称' },
          category: {
            type: 'string',
            enum: ['common', 'form', 'chart', 'pro-views'],
            description: '组件分类'
          }
        },
        required: ['name']
      },
      this.queryComponent.bind(this),
      { category: 'resource-query', tags: ['component', 'query'] }
    );

    this.toolRegistry.register(
      'get_best_practices',
      '获取最佳实践和代码示例',
      {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: '主题',
            enum: ['project-structure', 'api-config', 'component-usage', 'routing']
          }
        },
        required: ['topic']
      },
      this.getBestPractices.bind(this),
      { category: 'resource-query', tags: ['best-practices', 'documentation'] }
    );

    this.toolRegistry.register(
      'extract_local_pattern',
      '提取项目中已有的代码范例 (Few-shot)',
      {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: '目标项目或具体文件的路径'
          }
        },
        required: ['path']
      },
      this.extractLocalPattern.bind(this),
      { category: 'resource-query', tags: ['pattern', 'example'] }
    );

    this.toolRegistry.register(
      'analyze_project_context',
      '智能分析当前项目的元数据 (如源码目录、别名映射等)',
      {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: '项目根目录路径'
          }
        },
        required: ['path']
      },
      this.analyzeProjectContext.bind(this),
      { category: 'resource-query', tags: ['context', 'analyze'] }
    );

    // --- Action Tools (Phase 3) ---
    this.toolRegistry.register(
      'scaffold_module_structure',
      '创建模块的基础空目录结构 (如 apis/, pages/, routes/)',
      {
        type: 'object',
        properties: {
          projectPath: { type: 'string', description: '项目根目录路径' },
          moduleName: { type: 'string', description: '模块名称' }
        },
        required: ['projectPath', 'moduleName']
      },
      this.scaffoldModuleStructure.bind(this),
      { category: 'code-generation', tags: ['scaffold', 'directory'] }
    );

    this.toolRegistry.register(
      'ast_insert_import',
      '安全地向 JS/SCSS 索引文件中插入 import 语句或扩展数组',
      {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: '目标文件路径' },
          importStatement: { type: 'string', description: '要插入的 import 语句' },
          arrayName: { type: 'string', description: '(可选) 要扩展的数组名称，如 apis 或 routes' },
          arrayElement: { type: 'string', description: '(可选) 要追加到数组中的元素' }
        },
        required: ['filePath']
      },
      this.astInsertImport.bind(this),
      { category: 'code-generation', tags: ['ast', 'import', 'injection'] }
    );

    this.toolRegistry.register(
      'write_component',
      '写入组件代码并进行基础格式化',
      {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: '目标文件路径' },
          content: { type: 'string', description: '完整的代码内容文本' }
        },
        required: ['filePath', 'content']
      },
      this.writeComponent.bind(this),
      { category: 'code-generation', tags: ['write', 'component'] }
    );

    const stats = this.toolRegistry.getStatistics();
    logger.info(`Registered ${stats.totalTools} tools across ${stats.categories} categories`);
  }
  /**
   * Register a tool with the server (legacy method for backward compatibility)
   */
  registerTool(name, handler, schema) {
    this.toolRegistry.register(name, schema.description, schema.inputSchema, handler, {
      category: 'general'
    });
    logger.debug(`Registered tool: ${name}`);
  }

  /**
   * List all available tools
   */
  async listTools() {
    const tools = this.toolRegistry.list();
    return { tools };
  }

  /**
   * Call a specific tool using the tool registry
   */
  async callTool(params) {
    const requestId = ++this.requestCount;
    const { name, arguments: args } = params;

    logger.info(`[Request ${requestId}] Tool call initiated`, {
      requestId,
      toolName: name,
      timestamp: new Date().toISOString()
    });

    try {
      // Execute tool through registry with enhanced context
      const result = await this.toolRegistry.execute(name, args, {
        requestId,
        serverInstance: this,
        timestamp: new Date().toISOString()
      });

      logger.info(`[Request ${requestId}] Tool execution completed`, {
        requestId,
        toolName: name,
        success: true
      });

      return result;
    } catch (error) {
      logger.error(`[Request ${requestId}] Tool execution failed`, {
        requestId,
        toolName: name,
        error: error.message,
        stack: error.stack
      });

      // Return error as MCP content instead of throwing
      // Throwing causes generic "MCP ERROR" in clients with no useful info
      const errorMessage =
        error instanceof BalmSharedMCPError
          ? `[${error.code}] ${error.message}`
          : `Tool execution failed: ${error.message}`;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: true,
                message: errorMessage,
                toolName: name,
                requestId,
                details: error.details || null
              },
              null,
              2
            )
          }
        ],
        isError: true
      };
    }
  }

  /**
   * Get server statistics including tool usage
   */
  getStatistics() {
    return {
      server: {
        uptime: Date.now() - this.startTime,
        requestCount: this.requestCount,
        startTime: new Date(this.startTime).toISOString()
      },
      tools: this.toolRegistry.getStatistics()
    };
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category) {
    return this.toolRegistry.getByCategory(category);
  }

  /**
   * Get all tool categories
   */
  getToolCategories() {
    return this.toolRegistry.getCategories();
  }

  /**
   * Validate all registered tools
   */
  validateAllTools() {
    return this.toolRegistry.validateAll();
  }

  // Tool implementations (placeholders for now)
  async createProject(args) {
    return this.projectManager.createProject(args);
  }

  async analyzeProject(args) {
    return this.projectManager.analyzeProject(args.path);
  }

  async generateCrudModule(args) {
    try {
      // Handle null/undefined args
      if (!args || typeof args !== 'object') {
        throw new BalmSharedMCPError(
          ErrorCodes.VALIDATION_FAILED,
          'Invalid arguments: must be an object',
          { args }
        );
      }

      // Validate required parameters
      const requiredParams = ['module', 'model', 'fields', 'projectPath'];
      const missingParams = requiredParams.filter(param => !args[param]);

      if (missingParams.length > 0) {
        throw new BalmSharedMCPError(
          ErrorCodes.VALIDATION_FAILED,
          `Missing required parameters: ${missingParams.join(', ')}`,
          { missingParams, provided: Object.keys(args) }
        );
      }

      // Validate fields array
      if (!Array.isArray(args.fields) || args.fields.length === 0) {
        throw new BalmSharedMCPError(
          ErrorCodes.VALIDATION_FAILED,
          'Fields must be a non-empty array',
          { fields: args.fields }
        );
      }

      // Validate each field structure
      for (const field of args.fields) {
        if (!field.name || !field.type || !field.component) {
          throw new BalmSharedMCPError(
            ErrorCodes.VALIDATION_FAILED,
            'Each field must have name, type, and component properties',
            { invalidField: field }
          );
        }
      }

      // Validate project path format
      if (typeof args.projectPath !== 'string' || args.projectPath.trim() === '') {
        throw new BalmSharedMCPError(
          ErrorCodes.VALIDATION_FAILED,
          'Project path must be a non-empty string',
          { projectPath: args.projectPath }
        );
      }

      logger.info('Generating CRUD module', {
        module: args.module,
        model: args.model,
        fieldCount: args.fields.length,
        projectPath: args.projectPath
      });

      // Extract idiomatic patterns from current project and shared project
      let patterns = {};
      try {
        const currentProjectPatterns = await this.resourceAnalyzer.extractProjectPatterns(
          args.projectPath
        );
        const sharedProjectPath = await this.projectManager.getSharedProjectPath(args.projectPath);
        const sharedProjectPatterns =
          await this.resourceAnalyzer.extractProjectPatterns(sharedProjectPath);

        // Merge patterns: current project takes priority
        patterns = {
          topActionConfig:
            currentProjectPatterns.topActionConfig || sharedProjectPatterns.topActionConfig,
          rowActionConfig:
            currentProjectPatterns.rowActionConfig || sharedProjectPatterns.rowActionConfig,
          handleAction: currentProjectPatterns.handleAction || sharedProjectPatterns.handleAction
        };

        if (patterns.topActionConfig || patterns.rowActionConfig || patterns.handleAction) {
          logger.info('Idiomatic patterns extracted successfully');
        }
      } catch (error) {
        logger.warn('Failed to extract idiomatic patterns:', error.message);
      }

      const result = await this.codeGenerator.generateCrudModule({
        ...args,
        patterns
      });

      // Add generation summary to result
      result.summary = {
        module: args.module,
        model: args.model,
        fieldsGenerated: args.fields.length,
        filesCreated: result.generatedFiles?.length || 0,
        timestamp: new Date().toISOString()
      };

      logger.info('CRUD module generated successfully', result.summary);
      return result;
    } catch (error) {
      logger.error('Failed to generate CRUD module', {
        module: args?.module,
        error: error.message,
        stack: error.stack
      });

      if (error instanceof BalmSharedMCPError) {
        throw error;
      }

      throw new BalmSharedMCPError(
        ErrorCodes.CODE_GENERATION_FAILED,
        `CRUD module generation failed: ${error.message}`,
        { module: args?.module, originalError: error.message }
      );
    }
  }

  async generatePageComponent(args) {
    try {
      // Handle null/undefined args
      if (!args || typeof args !== 'object') {
        throw new BalmSharedMCPError(
          ErrorCodes.VALIDATION_FAILED,
          'Invalid arguments: must be an object',
          { args }
        );
      }

      // Validate required parameters
      const requiredParams = ['name', 'type', 'model', 'projectPath'];
      const missingParams = requiredParams.filter(param => !args[param]);

      if (missingParams.length > 0) {
        throw new BalmSharedMCPError(
          ErrorCodes.VALIDATION_FAILED,
          `Missing required parameters: ${missingParams.join(', ')}`,
          { missingParams, provided: Object.keys(args) }
        );
      }

      // Validate component type
      const validTypes = ['list', 'detail'];
      if (!validTypes.includes(args.type)) {
        throw new BalmSharedMCPError(
          ErrorCodes.VALIDATION_FAILED,
          `Invalid component type: ${args.type}. Must be one of: ${validTypes.join(', ')}`,
          { type: args.type, validTypes }
        );
      }

      // Validate name format (should be valid identifier)
      if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(args.name)) {
        throw new BalmSharedMCPError(
          ErrorCodes.VALIDATION_FAILED,
          'Component name must be a valid identifier (letters, numbers, underscore, hyphen)',
          { name: args.name }
        );
      }

      // Validate model format
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(args.model)) {
        throw new BalmSharedMCPError(
          ErrorCodes.VALIDATION_FAILED,
          'Model name must be a valid identifier (letters, numbers, underscore)',
          { model: args.model }
        );
      }

      // Validate project path format
      if (typeof args.projectPath !== 'string' || args.projectPath.trim() === '') {
        throw new BalmSharedMCPError(
          ErrorCodes.VALIDATION_FAILED,
          'Project path must be a non-empty string',
          { projectPath: args.projectPath }
        );
      }

      logger.info('Generating page component', {
        name: args.name,
        type: args.type,
        model: args.model,
        projectPath: args.projectPath
      });

      // Extract idiomatic patterns from current project and shared project
      let patterns = {};
      try {
        const currentProjectPatterns = await this.resourceAnalyzer.extractProjectPatterns(
          args.projectPath
        );
        const sharedProjectPath = await this.projectManager.getSharedProjectPath(args.projectPath);
        const sharedProjectPatterns =
          await this.resourceAnalyzer.extractProjectPatterns(sharedProjectPath);

        // Merge patterns: current project takes priority
        patterns = {
          topActionConfig:
            currentProjectPatterns.topActionConfig || sharedProjectPatterns.topActionConfig,
          rowActionConfig:
            currentProjectPatterns.rowActionConfig || sharedProjectPatterns.rowActionConfig,
          handleAction: currentProjectPatterns.handleAction || sharedProjectPatterns.handleAction
        };

        if (patterns.topActionConfig || patterns.rowActionConfig || patterns.handleAction) {
          logger.info('Idiomatic patterns extracted successfully');
        }
      } catch (error) {
        logger.warn('Failed to extract idiomatic patterns:', error.message);
      }

      const result = await this.codeGenerator.generatePageComponent({
        ...args,
        patterns
      });

      // Add generation summary to result
      result.summary = {
        name: args.name,
        type: args.type,
        model: args.model,
        filesCreated: result.generatedFiles?.length || 0,
        timestamp: new Date().toISOString()
      };

      logger.info('Page component generated successfully', result.summary);
      return result;
    } catch (error) {
      logger.error('Failed to generate page component', {
        name: args?.name,
        type: args?.type,
        error: error.message,
        stack: error.stack
      });

      if (error instanceof BalmSharedMCPError) {
        throw error;
      }

      throw new BalmSharedMCPError(
        ErrorCodes.CODE_GENERATION_FAILED,
        `Page component generation failed: ${error.message}`,
        { name: args?.name, type: args?.type, originalError: error.message }
      );
    }
  }

  async queryComponent(args) {
    try {
      // Handle null/undefined args
      if (!args || typeof args !== 'object') {
        throw new BalmSharedMCPError(
          ErrorCodes.VALIDATION_FAILED,
          'Invalid arguments: must be an object',
          { args }
        );
      }

      // Validate required parameters
      if (!args.name || typeof args.name !== 'string') {
        throw new BalmSharedMCPError(
          ErrorCodes.VALIDATION_FAILED,
          'Component name is required and must be a string',
          { name: args.name }
        );
      }

      // Validate component name format
      if (args.name.trim() === '') {
        throw new BalmSharedMCPError(
          ErrorCodes.VALIDATION_FAILED,
          'Component name cannot be empty',
          { name: args.name }
        );
      }

      // Validate category if provided
      if (args.category && typeof args.category !== 'string') {
        throw new BalmSharedMCPError(ErrorCodes.VALIDATION_FAILED, 'Category must be a string', {
          category: args.category
        });
      }

      // Validate category enum if provided
      const validCategories = ['common', 'form', 'chart', 'pro-views'];
      if (args.category && !validCategories.includes(args.category)) {
        throw new BalmSharedMCPError(
          ErrorCodes.VALIDATION_FAILED,
          `Invalid category: ${args.category}. Must be one of: ${validCategories.join(', ')}`,
          { category: args.category, validCategories }
        );
      }

      logger.info('Querying component', {
        name: args.name,
        category: args.category || 'all'
      });

      const rawResult = await this.resourceAnalyzer.queryComponent(args.name, args.category);

      // Format the result as Markdown for better LLM comprehension
      let markdownOutput = `# Component Query: ${args.name}\n\n`;

      if (!rawResult.found) {
        markdownOutput += `❌ **Not Found**\n\nCould not find component '${args.name}'.\n`;
        if (rawResult.suggestions && rawResult.suggestions.length > 0) {
          markdownOutput += `**Did you mean?**\n${rawResult.suggestions.map(s => `- \`${s.name}\` (${s.category})`).join('\n')}\n`;
        }
        return markdownOutput;
      }

      markdownOutput += `✅ **Found** in category: \`${rawResult.category}\`\n\n`;

      if (rawResult.documentation) {
        markdownOutput += `## Description\n${rawResult.documentation}\n\n`;
      }

      if (rawResult.props && rawResult.props.length > 0) {
        markdownOutput += '## Props\n| Name | Type | Default | Description |\n|---|---|---|---|\n';
        rawResult.props.forEach(p => {
          markdownOutput += `| \`${p.name}\` | \`${p.type}\` | \`${p.default || '-'}\` | ${p.description || '-'} |\n`;
        });
        markdownOutput += '\n';
      }

      if (rawResult.events && rawResult.events.length > 0) {
        markdownOutput += '## Events\n| Name | Description |\n|---|---|\n';
        rawResult.events.forEach(e => {
          markdownOutput += `| \`${e.name}\` | ${e.description || '-'} |\n`;
        });
        markdownOutput += '\n';
      }

      if (rawResult.usage) {
        markdownOutput += `## Usage Example\n\`\`\`vue\n${rawResult.usage}\n\`\`\`\n\n`;
      }

      logger.info('Component query completed', {
        name: args.name,
        found: rawResult.found,
        category: rawResult.category
      });

      return markdownOutput;
    } catch (error) {
      logger.error('Failed to query component', {
        name: args?.name,
        category: args?.category,
        error: error.message,
        stack: error.stack
      });

      if (error instanceof BalmSharedMCPError) {
        throw error;
      }

      throw new BalmSharedMCPError(
        ErrorCodes.TOOL_EXECUTION_FAILED,
        `Component query failed: ${error.message}`,
        { name: args?.name, category: args?.category, originalError: error.message }
      );
    }
  }

  async getBestPractices(args) {
    try {
      // Handle null/undefined args
      if (!args || typeof args !== 'object') {
        throw new BalmSharedMCPError(
          ErrorCodes.VALIDATION_FAILED,
          'Invalid arguments: must be an object',
          { args }
        );
      }

      // Validate required parameters
      if (!args.topic || typeof args.topic !== 'string') {
        throw new BalmSharedMCPError(
          ErrorCodes.VALIDATION_FAILED,
          'Topic is required and must be a string',
          { topic: args.topic }
        );
      }

      // Validate topic format
      if (args.topic.trim() === '') {
        throw new BalmSharedMCPError(ErrorCodes.VALIDATION_FAILED, 'Topic cannot be empty', {
          topic: args.topic
        });
      }

      // Validate topic enum
      const validTopics = ['project-structure', 'api-config', 'component-usage', 'routing'];
      if (!validTopics.includes(args.topic)) {
        throw new BalmSharedMCPError(
          ErrorCodes.VALIDATION_FAILED,
          `Invalid topic: ${args.topic}. Must be one of: ${validTopics.join(', ')}`,
          { topic: args.topic, validTopics }
        );
      }

      logger.info('Getting best practices', {
        topic: args.topic
      });

      const rawResult = await this.resourceAnalyzer.getBestPractices(args.topic);

      // Format the result as Markdown for better LLM comprehension
      let markdownOutput = `# Best Practices: ${args.topic}\n\n`;

      if (!rawResult.practices || rawResult.practices.length === 0) {
        return `${markdownOutput}No specific best practices found for topic '${args.topic}'.\n`;
      }

      rawResult.practices.forEach(p => {
        if (p.practice) {
          markdownOutput += `## ${p.name || 'General Practice'}\n`;
          markdownOutput += `${p.practice}\n\n`;
        }
      });

      if (rawResult.examples && rawResult.examples.length > 0) {
        markdownOutput += '## Examples\n\n';
        rawResult.examples.forEach(ex => {
          markdownOutput += `### ${ex.title || 'Example'}\n`;
          markdownOutput += `\`\`\`javascript\n${ex.code}\n\`\`\`\n\n`;
        });
      }

      logger.info('Best practices query completed', {
        topic: args.topic,
        practicesCount: rawResult.practices?.length || 0,
        examplesCount: rawResult.examples?.length || 0
      });

      return markdownOutput;
    } catch (error) {
      logger.error('Failed to get best practices', {
        topic: args?.topic,
        error: error.message,
        stack: error.stack
      });

      if (error instanceof BalmSharedMCPError) {
        throw error;
      }

      throw new BalmSharedMCPError(
        ErrorCodes.TOOL_EXECUTION_FAILED,
        `Best practices query failed: ${error.message}`,
        { topic: args?.topic, originalError: error.message }
      );
    }
  }

  async generateModelConfig(args) {
    return this.codeGenerator.generateModelConfig(args);
  }

  async extractLocalPattern(args) {
    try {
      if (!args || !args.path) {
        throw new BalmSharedMCPError(ErrorCodes.VALIDATION_FAILED, 'Path is required');
      }

      logger.info('Extracting local pattern', { path: args.path });
      const patterns = await this.resourceAnalyzer.extractProjectPatterns(args.path);

      let markdownOutput = '# Local Patterns Extracted\n\n';

      if (patterns.topActionConfig) {
        markdownOutput += `## Top Action Config\n\`\`\`javascript\n${patterns.topActionConfig}\n\`\`\`\n\n`;
      }
      if (patterns.rowActionConfig) {
        markdownOutput += `## Row Action Config\n\`\`\`javascript\n${patterns.rowActionConfig}\n\`\`\`\n\n`;
      }
      if (patterns.handleAction) {
        markdownOutput += `## Handle Action Method\n\`\`\`javascript\n${patterns.handleAction}\n\`\`\`\n\n`;
      }

      if (!patterns.topActionConfig && !patterns.rowActionConfig && !patterns.handleAction) {
        markdownOutput += 'No standard patterns found at the specified path.\n';
      }

      return markdownOutput;
    } catch (error) {
      logger.error('Failed to extract pattern', { error: error.message });
      throw error;
    }
  }

  async analyzeProjectContext(args) {
    try {
      if (!args || !args.path) {
        throw new BalmSharedMCPError(ErrorCodes.VALIDATION_FAILED, 'Path is required');
      }

      logger.info('Analyzing project context', { path: args.path });

      const scriptsDir = await this.fileSystemHandler.getScriptsDir(args.path);
      const sharedProjectPath = await this.projectManager.getSharedProjectPath(args.path);

      let markdownOutput = '# Project Context Analysis\n\n';
      markdownOutput += `- **Target Project Path:** \`${args.path}\`\n`;
      markdownOutput += `- **Detected Scripts Directory:** \`${scriptsDir}\`\n`;
      markdownOutput += `- **Resolved Shared Project Path:** \`${sharedProjectPath}\`\n\n`;
      markdownOutput += '## Structural Assumptions\n';
      markdownOutput += `- API Index: \`${scriptsDir}/apis/index.js\`\n`;
      markdownOutput += `- Routes Config: \`${scriptsDir}/routes/config.js\`\n`;
      markdownOutput += `- Styles Index: \`${scriptsDir.replace('/scripts', '/styles')}/pages/_index.scss\`\n`;
      markdownOutput += `- Mock Server: \`${args.path}/mock-server/apis/index.js\`\n`;

      return markdownOutput;
    } catch (error) {
      logger.error('Failed to analyze project context', { error: error.message });
      throw error;
    }
  }

  async scaffoldModuleStructure(args) {
    try {
      if (!args || !args.projectPath || !args.moduleName) {
        throw new BalmSharedMCPError(
          ErrorCodes.VALIDATION_FAILED,
          'projectPath and moduleName are required'
        );
      }

      await this.fileSystemHandler.ensureModuleStructure(args.projectPath, args.moduleName);

      return {
        success: true,
        message: `Module structure scaffolded for ${args.moduleName}`,
        projectPath: args.projectPath,
        moduleName: args.moduleName
      };
    } catch (error) {
      logger.error('Failed to scaffold module structure', { error: error.message });
      throw error;
    }
  }

  async astInsertImport(args) {
    try {
      if (!args || !args.filePath) {
        throw new BalmSharedMCPError(ErrorCodes.VALIDATION_FAILED, 'filePath is required');
      }

      let importSuccess = false;
      let arraySuccess = false;

      if (args.importStatement) {
        importSuccess = await this.astHandler.insertImport(args.filePath, args.importStatement);
      }

      if (args.arrayName && args.arrayElement) {
        arraySuccess = await this.astHandler.expandArray(
          args.filePath,
          args.arrayName,
          args.arrayElement
        );
      }

      return {
        success: importSuccess || arraySuccess,
        message: `AST injection completed. Import inserted: ${importSuccess}, Array expanded: ${arraySuccess}`,
        filePath: args.filePath
      };
    } catch (error) {
      logger.error('Failed to execute AST injection', { error: error.message });
      throw error;
    }
  }

  async writeComponent(args) {
    try {
      if (!args || !args.filePath || !args.content) {
        throw new BalmSharedMCPError(
          ErrorCodes.VALIDATION_FAILED,
          'filePath and content are required'
        );
      }

      // Basic formatting based on file extension
      let formattedContent = args.content;
      if (args.filePath.endsWith('.js') || args.filePath.endsWith('.vue')) {
        formattedContent = this.codeGenerator.formatJavaScript(args.content);
      }

      await this.fileSystemHandler.writeFile(args.filePath, formattedContent);

      return {
        success: true,
        message: `Successfully wrote formatted content to ${args.filePath}`,
        filePath: args.filePath
      };
    } catch (error) {
      logger.error('Failed to write component', { error: error.message });
      throw error;
    }
  }
}
