/**
 * Code Generator
 *
 * Handles code generation for components, pages, and configurations.
 */

import path from 'path';
import { logger } from '../utils/logger.js';
import { BalmSharedMCPError, ErrorCodes } from '../utils/errors.js';
import { ModelConfigManager } from '../managers/model-config-manager.js';

export class CodeGenerator {
  constructor(fileSystemHandler, config) {
    this.fileSystemHandler = fileSystemHandler;
    this.config = config;
    this.templates = new Map();
    this.templateHelpers = new Map();

    // Initialize model config manager
    this.modelConfigManager = new ModelConfigManager(fileSystemHandler, config);

    // Initialize built-in templates
    this.initializeTemplates();
    this.initializeHelpers();
  }

  /**
   * Initialize built-in templates
   */
  initializeTemplates() {
    // Vue List Page Template
    this.templates.set('vue-list-page', {
      extension: '.vue',
      template: `<template>
  <div class="{{kebabCase name}}-list">
    <ui-list-view
      :model="model"
      :thead="thead"
      :tbody="tbody"
      :top-action-config="topActionConfig"
      :row-action-config="rowActionConfig"
      @action="handleAction"
    />
  </div>
</template>

<script>
import { UiListView } from 'balm-ui-pro';
{{#if hasCustomActions}}
import { {{pascalCase name}}Actions } from '../config/{{kebabCase name}}-actions';
{{/if}}

export default {
  name: '{{pascalCase name}}List',
  components: {
    UiListView
  },
  data() {
    return {
      model: '{{camelCase model}}',
      thead: [
{{#each fields}}
        {
          field: '{{name}}',
          text: '{{label}}',
          {{#if sortable}}sort: true,{{/if}}
          {{#if width}}width: {{width}},{{/if}}
        },
{{/each}}
      ],
      tbody: [
{{#each fields}}
        '{{name}}',
{{/each}}
      ],
      topActionConfig: [
        {
          type: 'primary',
          text: '新增',
          action: 'create'
        }
      ],
      rowActionConfig: [
        {
          type: 'text',
          text: '查看',
          action: 'view'
        },
        {
          type: 'text',
          text: '编辑',
          action: 'edit'
        },
        {
          type: 'text',
          text: '删除',
          action: 'delete',
          confirm: true
        }
      ]
    };
  },
  methods: {
    handleAction(action, data) {
      switch (action.action) {
        case 'create':
          this.$router.push({ name: '{{camelCase name}}-create' });
          break;
        case 'view':
          this.$router.push({ 
            name: '{{camelCase name}}-detail', 
            params: { id: data.id } 
          });
          break;
        case 'edit':
          this.$router.push({ 
            name: '{{camelCase name}}-edit', 
            params: { id: data.id } 
          });
          break;
        case 'delete':
          this.handleDelete(data);
          break;
        default:
          {{#if hasCustomActions}}
          {{pascalCase name}}Actions.handleAction(action, data, this);
          {{else}}
          console.warn('Unknown action:', action);
          {{/if}}
      }
    },
    async handleDelete(data) {
      try {
        await this.$api.{{camelCase model}}.delete(data.id);
        this.$toast('删除成功');
        this.$refs.listView.refresh();
      } catch (error) {
        this.$toast('删除失败: ' + error.message);
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.{{kebabCase name}}-list {
  padding: 20px;
}
</style>
`
    });

    // Vue Detail Page Template
    this.templates.set('vue-detail-page', {
      extension: '.vue',
      template: `<template>
  <div class="{{kebabCase name}}-detail">
    <ui-detail-view
      :model="model"
      :model-path="modelPath"
      :config="config"
      :readonly="readonly"
      @save="handleSave"
      @cancel="handleCancel"
    />
  </div>
</template>

<script>
import { UiDetailView } from 'balm-ui-pro';
{{#if hasModelConfig}}
import { {{camelCase name}}Config } from '../config/{{kebabCase name}}-config';
{{/if}}

export default {
  name: '{{pascalCase name}}Detail',
  components: {
    UiDetailView
  },
  props: {
    readonly: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      model: '{{camelCase model}}',
      modelPath: this.$route.params.id ? \`{{camelCase model}}/\${this.$route.params.id}\` : '{{camelCase model}}',
      config: {{#if hasModelConfig}}{{camelCase name}}Config{{else}}{
        fields: [
{{#each fields}}
          {
            field: '{{name}}',
            label: '{{label}}',
            component: '{{component}}',
            {{#if required}}required: true,{{/if}}
            {{#if validation}}validation: '{{validation}}',{{/if}}
            {{#if options}}options: {{json options}},{{/if}}
          },
{{/each}}
        ]
      }{{/if}}
    };
  },
  computed: {
    isEdit() {
      return !!this.$route.params.id;
    }
  },
  methods: {
    async handleSave(data) {
      try {
        if (this.isEdit) {
          await this.$api.{{camelCase model}}.update(this.$route.params.id, data);
          this.$toast('更新成功');
        } else {
          await this.$api.{{camelCase model}}.create(data);
          this.$toast('创建成功');
        }
        this.$router.push({ name: '{{camelCase name}}-list' });
      } catch (error) {
        this.$toast('保存失败: ' + error.message);
      }
    },
    handleCancel() {
      this.$router.push({ name: '{{camelCase name}}-list' });
    }
  }
};
</script>

<style lang="scss" scoped>
.{{kebabCase name}}-detail {
  padding: 20px;
}
</style>
`
    });

    // API Configuration Template
    this.templates.set('api-config', {
      extension: '.js',
      template: `/**
 * {{pascalCase name}} API Configuration
 * Generated by BalmSharedMCP
 */

export const {{camelCase name}} = [
  '{{camelCase model}}',
  '{{endpoint}}',
  {{operations}},
  {{customActionsConfig}}
];

export default [{{camelCase name}}];
`
    });

    // Route Configuration Template
    this.templates.set('route-config', {
      extension: '.js',
      template: `/**
 * {{pascalCase name}} Routes Configuration
 * Generated by BalmSharedMCP
 */

export const {{camelCase name}}Routes = [
  {
    path: '/{{kebabCase name}}',
    name: '{{camelCase name}}-list',
    component: () => import('../pages/{{kebabCase name}}/{{kebabCase name}}-list.vue'),
    {{#if requiresAuth}}
    meta: {
      requiresAuth: true,
      {{#if permissions}}
      permissions: {{json permissions}},
      {{/if}}
      title: '{{title}}列表'
    }
    {{/if}}
  },
  {
    path: '/{{kebabCase name}}/create',
    name: '{{camelCase name}}-create',
    component: () => import('../pages/{{kebabCase name}}/{{kebabCase name}}-detail.vue'),
    {{#if requiresAuth}}
    meta: {
      requiresAuth: true,
      {{#if permissions}}
      permissions: {{json permissions}},
      {{/if}}
      title: '新增{{title}}'
    }
    {{/if}}
  },
  {
    path: '/{{kebabCase name}}/:id',
    name: '{{camelCase name}}-detail',
    component: () => import('../pages/{{kebabCase name}}/{{kebabCase name}}-detail.vue'),
    props: { readonly: true },
    {{#if requiresAuth}}
    meta: {
      requiresAuth: true,
      {{#if permissions}}
      permissions: {{json permissions}},
      {{/if}}
      title: '{{title}}详情'
    }
    {{/if}}
  },
  {
    path: '/{{kebabCase name}}/:id/edit',
    name: '{{camelCase name}}-edit',
    component: () => import('../pages/{{kebabCase name}}/{{kebabCase name}}-detail.vue'),
    {{#if requiresAuth}}
    meta: {
      requiresAuth: true,
      {{#if permissions}}
      permissions: {{json permissions}},
      {{/if}}
      title: '编辑{{title}}'
    }
    {{/if}}
  }
];
`
    });

    // Mock Data Template
    this.templates.set('mock-data', {
      extension: '.js',
      template: `import { responseHandler, errorHandler } from '@mock-server/handler';

/**
 * {{pascalCase name}} Mock Data
 * Generated by BalmSharedMCP
 */

// Mock data generator
function generate{{pascalCase name}}Data(count = 10) {
  const data = [];
  for (let i = 1; i <= count; i++) {
    data.push({
      id: i,
{{#each fields}}
      {{name}}: {{mockValue type @index}},
{{/each}}
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  return data;
}

const {{camelCase name}}Data = generate{{pascalCase name}}Data();

export function get{{pascalCase name}}Apis(server) {
  // POST {{endpoint}}/index - List with pagination
  server.post('{{endpoint}}/index', (schema, request) => {
    const requestData = JSON.parse(request.requestBody);
    const { page = 1, pageSize = 10, ...filters } = requestData;
    
    let filteredData = {{camelCase name}}Data;

    // Apply filters
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        filteredData = filteredData.filter(item => 
          String(item[key]).toLowerCase().includes(String(filters[key]).toLowerCase())
        );
      }
    });

    // Pagination
    const start = (page - 1) * pageSize;
    const end = start + parseInt(pageSize);
    const paginatedData = filteredData.slice(start, end);

    return responseHandler({
      list: paginatedData,
      total: filteredData.length
    });
  });

  // POST {{endpoint}}/info - Get single item
  server.post('{{endpoint}}/info', (schema, request) => {
    const data = JSON.parse(request.requestBody);
    const item = {{camelCase name}}Data.find(item => item.id == data.id);
    
    return item ? responseHandler(item) : errorHandler('{{title}}不存在');
  });

  // POST {{endpoint}}/add - Create new item
  server.post('{{endpoint}}/add', (schema, request) => {
    const data = JSON.parse(request.requestBody);
    const newItem = {
      id: Math.max(...{{camelCase name}}Data.map(item => item.id)) + 1,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    {{camelCase name}}Data.push(newItem);
    
    return responseHandler(newItem);
  });

  // POST {{endpoint}}/edit - Update item
  server.post('{{endpoint}}/edit', (schema, request) => {
    const data = JSON.parse(request.requestBody);
    const index = {{camelCase name}}Data.findIndex(item => item.id == data.id);
    
    if (index !== -1) {
      {{camelCase name}}Data[index] = {
        ...{{camelCase name}}Data[index],
        ...data,
        updatedAt: new Date().toISOString()
      };
      
      return responseHandler({{camelCase name}}Data[index]);
    } else {
      return errorHandler('{{title}}不存在');
    }
  });

  // POST {{endpoint}}/delete - Delete item
  server.post('{{endpoint}}/delete', (schema, request) => {
    const data = JSON.parse(request.requestBody);
    const index = {{camelCase name}}Data.findIndex(item => item.id == data.id);
    
    if (index !== -1) {
      {{camelCase name}}Data.splice(index, 1);
      return responseHandler();
    } else {
      return errorHandler('{{title}}不存在');
    }
  });

{{#if customMethods}}
{{#each customMethods}}
  // POST {{../endpoint}}/{{@key}} - {{this.description}}
  server.post('{{../endpoint}}/{{@key}}', (schema, request) => {
    const data = JSON.parse(request.requestBody);
    // TODO: Implement custom method {{@key}}
    return responseHandler(data);
  });
{{/each}}
{{/if}}
}
`
    });

    // Model Config Template
    this.templates.set('model-config', {
      extension: '.js',
      template: `/**
 * {{pascalCase name}} Model Configuration
 * Generated by BalmSharedMCP
 */

export const {{camelCase name}}Config = {
  fields: [
{{#each fields}}
    {
      field: '{{name}}',
      label: '{{label}}',
      component: '{{component}}',
      {{#if required}}required: true,{{/if}}
      {{#if validation}}validation: '{{validation}}',{{/if}}
      {{#if placeholder}}placeholder: '{{placeholder}}',{{/if}}
      {{#if options}}options: {{json options}},{{/if}}
      {{#if props}}props: {{json props}},{{/if}}
    },
{{/each}}
  ],
  {{#if validationRules}}
  validationRules: {{json validationRules}},
  {{/if}}
  {{#if formLayout}}
  layout: '{{formLayout}}',
  {{/if}}
  {{#if submitText}}
  submitText: '{{submitText}}',
  {{/if}}
  {{#if cancelText}}
  cancelText: '{{cancelText}}',
  {{/if}}
};
`
    });
  }

  /**
   * Initialize template helpers
   */
  initializeHelpers() {
    // String transformation helpers
    this.templateHelpers.set('camelCase', (str) => {
      return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    });

    this.templateHelpers.set('pascalCase', (str) => {
      const camelCase = this.templateHelpers.get('camelCase')(str);
      return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
    });

    this.templateHelpers.set('kebabCase', (str) => {
      return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
    });

    this.templateHelpers.set('snakeCase', (str) => {
      return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
    });

    // JSON helper
    this.templateHelpers.set('json', (obj) => {
      return JSON.stringify(obj, null, 2);
    });

    // Mock value generator
    this.templateHelpers.set('mockValue', (type, index) => {
      switch (type) {
        case 'string':
          return `'示例文本${index + 1}'`;
        case 'number':
          return Math.floor(Math.random() * 1000) + 1;
        case 'boolean':
          return Math.random() > 0.5;
        case 'date':
          return `new Date('2024-01-${String(index + 1).padStart(2, '0')}').toISOString()`;
        case 'email':
          return `'user${index + 1}@example.com'`;
        case 'phone':
          return `'138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}'`;
        case 'url':
          return `'https://example.com/item${index + 1}'`;
        default:
          return `'默认值${index + 1}'`;
      }
    });
  }

  /**
   * Register a custom template
   */
  registerTemplate(name, template) {
    if (typeof template === 'string') {
      this.templates.set(name, { extension: '.txt', template });
    } else {
      this.templates.set(name, template);
    }
    logger.debug(`Registered template: ${name}`);
  }

  /**
   * Register a custom helper function
   */
  registerHelper(name, helperFn) {
    this.templateHelpers.set(name, helperFn);
    logger.debug(`Registered helper: ${name}`);
  }

  /**
   * Render a template with given context
   */
  renderTemplate(templateName, context = {}) {
    const templateConfig = this.templates.get(templateName);
    if (!templateConfig) {
      throw new BalmSharedMCPError(
        ErrorCodes.TEMPLATE_NOT_FOUND,
        `Template '${templateName}' not found`,
        { templateName, availableTemplates: Array.from(this.templates.keys()) }
      );
    }

    let { template } = templateConfig;

    try {
      // Process template with context
      template = this.processTemplate(template, context);

      return {
        content: template,
        extension: templateConfig.extension || '.txt'
      };
    } catch (error) {
      throw new BalmSharedMCPError(
        ErrorCodes.TEMPLATE_RENDER_ERROR,
        `Failed to render template '${templateName}': ${error.message}`,
        { templateName, context, originalError: error.message }
      );
    }
  }

  /**
   * Process template string with context and helpers
   */
  processTemplate(template, context) {
    // Handle iteration blocks first (they need to be processed before variable substitution)
    template = this.processIterations(template, context);

    // Handle conditional blocks
    template = this.processConditionals(template, context);

    // Handle helper functions {{helper variable}}
    template = template.replace(/\{\{(\w+)\s+([^}]+)\}\}/g, (match, helper, variable) => {
      const helperFn = this.templateHelpers.get(helper);
      if (helperFn) {
        const value = this.resolveVariable(variable.trim(), context);
        return helperFn(value);
      }
      return match;
    });

    // Handle simple variable substitution {{variable}} (do this last)
    template = template.replace(/\{\{([^}#/]+)\}\}/g, (match, variable) => {
      const trimmedVar = variable.trim();
      const resolved = this.resolveVariable(trimmedVar, context);
      return resolved !== undefined ? resolved : match;
    });

    return template;
  }

  /**
   * Resolve variable from context
   */
  resolveVariable(variable, context) {
    // Handle special iteration variables
    if (variable.startsWith('@')) {
      return context[variable];
    }

    const parts = variable.split('.');
    let value = context;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Process conditional blocks in template
   */
  processConditionals(template, context) {
    const conditionalRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;

    return template.replace(conditionalRegex, (match, condition, content) => {
      const conditionValue = this.resolveVariable(condition.trim(), context);
      return conditionValue ? content : '';
    });
  }

  /**
   * Process iteration blocks in template
   */
  processIterations(template, context) {
    const iterationRegex = /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

    return template.replace(iterationRegex, (match, arrayVar, content) => {
      const array = this.resolveVariable(arrayVar.trim(), context);
      if (!Array.isArray(array)) {
        return '';
      }

      return array.map((item, index) => {
        // Process the content with direct variable replacement to avoid context conflicts
        let processedContent = content;

        // Handle iteration-specific variables first
        processedContent = processedContent.replace(/\{\{@index\}\}/g, index);
        processedContent = processedContent.replace(/\{\{@key\}\}/g, item.key || index);
        processedContent = processedContent.replace(/\{\{@first\}\}/g, index === 0);
        processedContent = processedContent.replace(/\{\{@last\}\}/g, index === array.length - 1);

        // Replace item properties directly in the content
        Object.keys(item).forEach(key => {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          processedContent = processedContent.replace(regex, item[key]);
        });

        // Process remaining template with original context
        return this.processTemplate(processedContent, context);
      }).join('');
    });
  }

  /**
   * Generate code from template
   */
  async generateFromTemplate(templateName, context, outputPath) {
    const rendered = this.renderTemplate(templateName, context);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    await this.fileSystemHandler.ensureDirectory(outputDir);

    // Write generated content to file
    await this.fileSystemHandler.writeFile(outputPath, rendered.content);

    logger.info(`Generated file from template '${templateName}': ${outputPath}`);

    return {
      path: outputPath,
      content: rendered.content,
      template: templateName
    };
  }

  /**
   * Format generated code
   */
  formatCode(content, fileType = 'javascript') {
    // Basic formatting for different file types
    switch (fileType) {
      case 'javascript':
      case 'vue':
        return this.formatJavaScript(content);
      case 'json':
        try {
          return JSON.stringify(JSON.parse(content), null, 2);
        } catch {
          return content;
        }
      default:
        return content;
    }
  }

  /**
   * Basic JavaScript/Vue formatting
   */
  formatJavaScript(content) {
    // Remove extra blank lines
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

    // Fix indentation issues
    const lines = content.split('\n');
    let indentLevel = 0;
    const indentSize = 2;

    const formattedLines = lines.map(line => {
      const trimmed = line.trim();

      if (trimmed.includes('}') && !trimmed.includes('{')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      const formatted = trimmed ? ' '.repeat(indentLevel * indentSize) + trimmed : '';

      if (trimmed.includes('{') && !trimmed.includes('}')) {
        indentLevel++;
      }

      return formatted;
    });

    return formattedLines.join('\n');
  }

  /**
   * Validate template context
   */
  validateContext(templateName, context) {
    const requiredFields = this.getRequiredFields(templateName);
    const missingFields = requiredFields.filter(field => !(field in context));

    if (missingFields.length > 0) {
      throw new BalmSharedMCPError(
        ErrorCodes.INVALID_TEMPLATE_CONTEXT,
        `Missing required fields for template '${templateName}': ${missingFields.join(', ')}`,
        { templateName, missingFields, providedFields: Object.keys(context) }
      );
    }
  }

  /**
   * Get required fields for a template
   */
  getRequiredFields(templateName) {
    // Define required fields for each template
    const templateRequirements = {
      'vue-list-page': ['name', 'model', 'fields'],
      'vue-detail-page': ['name', 'model', 'fields'],
      'api-config': ['name', 'model', 'endpoint'],
      'route-config': ['name', 'title'],
      'mock-data': ['name', 'endpoint'],
      'model-config': ['name', 'fields']
    };

    return templateRequirements[templateName] || [];
  }

  /**
   * Generate a complete CRUD module
   */
  async generateCrudModule(options) {
    const { 
      module, 
      model, 
      fields = [], 
      projectPath,
      title,
      endpoint,
      requiresAuth = true,
      permissions = [],
      ...otherOptions 
    } = options;

    logger.info(`Generating CRUD module: ${module} for model: ${model}`);

    try {
      // Validate required parameters
      if (!module || !model || !Array.isArray(fields) || !projectPath) {
        throw new BalmSharedMCPError(
          ErrorCodes.INVALID_GENERATOR_CONFIG,
          'Missing required parameters for CRUD module generation',
          { provided: Object.keys(options), required: ['module', 'model', 'fields', 'projectPath'] }
        );
      }

      // Ensure project path exists
      const projectExists = await this.fileSystemHandler.exists(projectPath);
      if (!projectExists) {
        throw new BalmSharedMCPError(
          ErrorCodes.PROJECT_NOT_FOUND,
          `Project path does not exist: ${projectPath}`,
          { projectPath }
        );
      }

      const generatedFiles = [];
      const moduleTitle = title || module;
      const apiEndpoint = endpoint || `/api/${this.templateHelpers.get('kebabCase')(model)}`;

      // 1. Generate model configuration
      logger.info(`Generating model config for module: ${module}`);
      const modelConfigResult = await this.generateModelConfig({
        name: this.templateHelpers.get('pascalCase')(model),
        fields,
        projectPath,
        ...otherOptions
      });
      generatedFiles.push(...modelConfigResult.generatedFiles);

      // 2. Generate page components (list and detail)
      logger.info(`Generating page components for module: ${module}`);
      const pageModuleResult = await this.generatePageModule({
        name: module,
        model,
        projectPath,
        fields,
        title: moduleTitle,
        hasModelConfig: true,
        ...otherOptions
      });
      generatedFiles.push(...pageModuleResult.generatedFiles);

      // 3. Generate API configuration
      logger.info(`Generating API config for module: ${module}`);
      const apiConfigResult = await this.generateApiConfig({
        name: module,
        model,
        endpoint: apiEndpoint,
        projectPath,
        operations: ['create', 'read', 'update', 'delete'],
        ...otherOptions
      });
      generatedFiles.push(...apiConfigResult.generatedFiles);

      // 4. Generate route configuration
      logger.info(`Generating routes for module: ${module}`);
      const routeConfigResult = await this.generateRouteConfig({
        name: module,
        title: moduleTitle,
        projectPath,
        requiresAuth,
        permissions,
        ...otherOptions
      });
      generatedFiles.push(...routeConfigResult.generatedFiles);

      // 5. Generate mock data
      logger.info(`Generating mock data for module: ${module}`);
      const mockDataResult = await this.generateMockData({
        name: module,
        endpoint: apiEndpoint,
        fields,
        projectPath,
        title: moduleTitle,
        ...otherOptions
      });
      generatedFiles.push(...mockDataResult.generatedFiles);

      // 6. Update project structure and dependencies
      await this.updateProjectStructureForModule(projectPath, module, {
        hasRoutes: true,
        hasApi: true,
        hasMock: true
      });

      logger.info(`Generated complete CRUD module: ${module} with ${generatedFiles.length} files`);

      return {
        success: true,
        message: `CRUD module ${module} generated successfully`,
        module,
        model,
        endpoint: apiEndpoint,
        generatedFiles,
        summary: {
          modelConfig: modelConfigResult.filePath,
          pages: pageModuleResult.components.map(c => c.componentPath),
          apiConfig: apiConfigResult.filePath,
          routes: routeConfigResult.filePath,
          mockData: mockDataResult.filePath,
          totalFiles: generatedFiles.length
        }
      };

    } catch (error) {
      logger.error(`Failed to generate CRUD module: ${module}`, { error: error.message });

      if (error instanceof BalmSharedMCPError) {
        throw error;
      }

      throw new BalmSharedMCPError(
        ErrorCodes.CODE_GENERATION_FAILED,
        `Failed to generate CRUD module: ${error.message}`,
        { module, model, projectPath, originalError: error.message }
      );
    }
  }

  /**
   * Generate model configuration file
   */
  async generateModelConfig(options) {
    const { name, fields, projectPath, ...otherOptions } = options;

    logger.info(`Generating model config: ${name}`);

    try {
      // Validate required parameters
      if (!name || !Array.isArray(fields) || !projectPath) {
        throw new BalmSharedMCPError(
          ErrorCodes.INVALID_GENERATOR_CONFIG,
          'Missing required parameters for model config generation',
          { provided: Object.keys(options), required: ['name', 'fields', 'projectPath'] }
        );
      }

      // Ensure project path exists
      const projectExists = await this.fileSystemHandler.exists(projectPath);
      if (!projectExists) {
        throw new BalmSharedMCPError(
          ErrorCodes.PROJECT_NOT_FOUND,
          `Project path does not exist: ${projectPath}`,
          { projectPath }
        );
      }

      // Generate model config file using the model config manager
      const result = await this.modelConfigManager.generateModelConfigFile({
        name,
        fields,
        projectPath,
        ...otherOptions
      });

      logger.info(`Generated model config: ${result.filePath}`);

      return {
        success: true,
        message: `Model config ${name} generated successfully`,
        filePath: result.filePath,
        config: result.config,
        generatedFiles: [
          {
            path: result.filePath,
            type: 'model-config',
            content: result.content
          }
        ]
      };

    } catch (error) {
      logger.error(`Failed to generate model config: ${name}`, { error: error.message });

      if (error instanceof BalmSharedMCPError) {
        throw error;
      }

      throw new BalmSharedMCPError(
        ErrorCodes.CODE_GENERATION_FAILED,
        `Failed to generate model config: ${error.message}`,
        { name, projectPath, originalError: error.message }
      );
    }
  }

  /**
   * Generate a page component
   */
  async generatePageComponent(options) {
    const { name, type, model, projectPath, fields = [], title, ...otherOptions } = options;

    logger.info(`Generating ${type} page component: ${name}`);

    try {
      // Validate required parameters
      if (!name || !type || !model || !projectPath) {
        throw new BalmSharedMCPError(
          ErrorCodes.INVALID_GENERATOR_CONFIG,
          'Missing required parameters for page component generation',
          { provided: Object.keys(options), required: ['name', 'type', 'model', 'projectPath'] }
        );
      }

      // Validate component type
      const validTypes = ['list', 'detail'];
      if (!validTypes.includes(type)) {
        throw new BalmSharedMCPError(
          ErrorCodes.INVALID_GENERATOR_CONFIG,
          `Invalid component type: ${type}. Must be one of: ${validTypes.join(', ')}`,
          { type, validTypes }
        );
      }

      // Ensure project path exists
      const projectExists = await this.fileSystemHandler.exists(projectPath);
      if (!projectExists) {
        throw new BalmSharedMCPError(
          ErrorCodes.PROJECT_NOT_FOUND,
          `Project path does not exist: ${projectPath}`,
          { projectPath }
        );
      }

      // Prepare template context
      const context = {
        name,
        model,
        fields,
        title: title || name,
        hasCustomActions: otherOptions.hasCustomActions || false,
        hasModelConfig: otherOptions.hasModelConfig || false,
        ...otherOptions
      };

      // Determine template name and output path
      const templateName = type === 'list' ? 'vue-list-page' : 'vue-detail-page';
      const componentFileName = `${this.templateHelpers.get('kebabCase')(name)}-${type}.vue`;
      const componentDir = path.join(projectPath, 'src/scripts/pages', this.templateHelpers.get('kebabCase')(name));
      const componentPath = path.join(componentDir, componentFileName);

      // Validate template context
      this.validateContext(templateName, context);

      // Generate the component file
      const generatedFile = await this.generateFromTemplate(templateName, context, componentPath);

      // Format the generated code
      generatedFile.content = this.formatCode(generatedFile.content, 'vue');
      await this.fileSystemHandler.writeFile(componentPath, generatedFile.content);

      logger.info(`Generated ${type} page component: ${componentPath}`);

      return {
        success: true,
        message: `${type} page component ${name} generated successfully`,
        componentPath,
        componentDir,
        fileName: componentFileName,
        template: templateName,
        generatedFiles: [
          {
            path: componentPath,
            type: 'vue-component',
            content: generatedFile.content
          }
        ]
      };

    } catch (error) {
      logger.error(`Failed to generate ${type} page component: ${name}`, { error: error.message });

      if (error instanceof BalmSharedMCPError) {
        throw error;
      }

      throw new BalmSharedMCPError(
        ErrorCodes.CODE_GENERATION_FAILED,
        `Failed to generate ${type} page component: ${error.message}`,
        { name, type, model, projectPath, originalError: error.message }
      );
    }
  }

  /**
   * Generate both list and detail page components for a module
   */
  async generatePageModule(options) {
    const { name, model, projectPath, fields = [], title, ...otherOptions } = options;

    logger.info(`Generating page module: ${name}`);

    try {
      const results = [];

      // Generate list page
      const listResult = await this.generatePageComponent({
        name,
        type: 'list',
        model,
        projectPath,
        fields,
        title,
        ...otherOptions
      });
      results.push(listResult);

      // Generate detail page
      const detailResult = await this.generatePageComponent({
        name,
        type: 'detail',
        model,
        projectPath,
        fields,
        title,
        ...otherOptions
      });
      results.push(detailResult);

      // Create index file for the module
      const moduleDir = path.join(projectPath, 'src/scripts/pages', this.templateHelpers.get('kebabCase')(name));
      const indexPath = path.join(moduleDir, 'index.js');

      const indexContent = this.generateModuleIndex(name, ['list', 'detail']);
      await this.fileSystemHandler.writeFile(indexPath, indexContent);

      logger.info(`Generated page module: ${name} with ${results.length} components`);

      return {
        success: true,
        message: `Page module ${name} generated successfully`,
        moduleDir,
        components: results,
        indexFile: indexPath,
        generatedFiles: [
          ...results.flatMap(r => r.generatedFiles),
          {
            path: indexPath,
            type: 'module-index',
            content: indexContent
          }
        ]
      };

    } catch (error) {
      logger.error(`Failed to generate page module: ${name}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Generate module index file
   */
  generateModuleIndex(moduleName, componentTypes) {
    const kebabName = this.templateHelpers.get('kebabCase')(moduleName);
    const pascalName = this.templateHelpers.get('pascalCase')(moduleName);

    const imports = componentTypes.map(type =>
      `import ${pascalName}${this.templateHelpers.get('pascalCase')(type)} from './${kebabName}-${type}.vue';`
    ).join('\n');

    const exports = componentTypes.map(type =>
      `  ${pascalName}${this.templateHelpers.get('pascalCase')(type)}`
    ).join(',\n');

    return `/**
 * ${pascalName} Module
 * Generated by BalmSharedMCP
 */

${imports}

export {
${exports}
};

export default {
${exports}
};
`;
  }

  /**
   * Update project structure after component generation
   */
  async updateProjectStructure(projectPath, moduleName, componentType) {
    try {
      // Update pages index file if it exists
      const pagesIndexPath = path.join(projectPath, 'src/scripts/pages/index.js');
      const pagesIndexExists = await this.fileSystemHandler.exists(pagesIndexPath);

      if (pagesIndexExists) {
        await this.updatePagesIndex(pagesIndexPath, moduleName);
      }

      // Update routes if routes directory exists
      const routesDir = path.join(projectPath, 'src/scripts/routes');
      const routesDirExists = await this.fileSystemHandler.exists(routesDir);

      if (routesDirExists) {
        await this.updateRoutesStructure(routesDir, moduleName, componentType);
      }

      logger.info(`Updated project structure for module: ${moduleName}`);

    } catch (error) {
      logger.warn(`Failed to update project structure: ${error.message}`);
      // Don't throw error here as component generation was successful
    }
  }

  /**
   * Update pages index file
   */
  async updatePagesIndex(indexPath, moduleName) {
    try {
      const content = await this.fileSystemHandler.readFile(indexPath);
      const kebabName = this.templateHelpers.get('kebabCase')(moduleName);
      const pascalName = this.templateHelpers.get('pascalCase')(moduleName);

      // Check if module is already imported
      if (content.includes(`from './${kebabName}'`)) {
        return; // Already exists
      }

      // Add import statement
      const importStatement = `export * from './${kebabName}';`;
      const updatedContent = content + '\n' + importStatement;

      await this.fileSystemHandler.writeFile(indexPath, updatedContent);
      logger.debug(`Updated pages index: ${indexPath}`);

    } catch (error) {
      logger.warn(`Failed to update pages index: ${error.message}`);
    }
  }



  /**
   * Generate route configuration for a module
   */
  async generateRouteConfig(options) {
    const {
      name,
      title,
      projectPath,
      requiresAuth = true,
      permissions = [],
      ...otherOptions
    } = options;

    logger.info(`Generating route config: ${name}`);

    try {
      // Validate required parameters
      if (!name || !projectPath) {
        throw new BalmSharedMCPError(
          ErrorCodes.INVALID_GENERATOR_CONFIG,
          'Missing required parameters for route config generation',
          { provided: Object.keys(options), required: ['name', 'projectPath'] }
        );
      }

      // Ensure project path exists
      const projectExists = await this.fileSystemHandler.exists(projectPath);
      if (!projectExists) {
        throw new BalmSharedMCPError(
          ErrorCodes.PROJECT_NOT_FOUND,
          `Project path does not exist: ${projectPath}`,
          { projectPath }
        );
      }

      // Prepare template context
      const context = {
        name,
        title: title || name,
        requiresAuth,
        permissions: permissions.length > 0 ? permissions : undefined,
        ...otherOptions
      };

      // Determine output path
      const routesDir = path.join(projectPath, 'src/scripts/routes');
      const routePath = path.join(routesDir, `${this.templateHelpers.get('kebabCase')(name)}.js`);

      // Generate the route config file
      const generatedFile = await this.generateFromTemplate('route-config', context, routePath);

      // Format the generated code
      generatedFile.content = this.formatCode(generatedFile.content, 'javascript');
      await this.fileSystemHandler.writeFile(routePath, generatedFile.content);

      logger.info(`Generated route config: ${routePath}`);

      return {
        success: true,
        message: `Route config ${name} generated successfully`,
        filePath: routePath,
        routeFilePath: routePath,
        template: 'route-config',
        routes: [
          `${this.templateHelpers.get('camelCase')(name)}-list`,
          `${this.templateHelpers.get('camelCase')(name)}-create`,
          `${this.templateHelpers.get('camelCase')(name)}-detail`,
          `${this.templateHelpers.get('camelCase')(name)}-edit`
        ],
        generatedFiles: [
          {
            path: routePath,
            type: 'route-config',
            content: generatedFile.content
          }
        ]
      };

    } catch (error) {
      logger.error(`Failed to generate route config: ${name}`, { error: error.message });

      if (error instanceof BalmSharedMCPError) {
        throw error;
      }

      throw new BalmSharedMCPError(
        ErrorCodes.CODE_GENERATION_FAILED,
        `Failed to generate route config: ${error.message}`,
        { name, title, projectPath, originalError: error.message }
      );
    }
  }

  /**
   * Generate mock data for a module
   */
  async generateMockData(options) {
    const {
      name,
      endpoint,
      fields = [],
      projectPath,
      title,
      customMethods = {},
      ...otherOptions
    } = options;

    logger.info(`Generating mock data: ${name}`);

    try {
      // Validate required parameters
      if (!name || !endpoint || !projectPath) {
        throw new BalmSharedMCPError(
          ErrorCodes.INVALID_GENERATOR_CONFIG,
          'Missing required parameters for mock data generation',
          { provided: Object.keys(options), required: ['name', 'endpoint', 'projectPath'] }
        );
      }

      // Prepare template context
      const context = {
        name,
        endpoint,
        fields,
        title: title || name,
        customMethods: Object.keys(customMethods).length > 0 ? customMethods : undefined,
        ...otherOptions
      };

      // Determine output path
      const mockDir = path.join(projectPath, 'mock-server/apis');
      const mockPath = path.join(mockDir, `${this.templateHelpers.get('kebabCase')(name)}.js`);

      // Generate the mock data file
      const generatedFile = await this.generateFromTemplate('mock-data', context, mockPath);

      // Format the generated code
      generatedFile.content = this.formatCode(generatedFile.content, 'javascript');
      await this.fileSystemHandler.writeFile(mockPath, generatedFile.content);

      logger.info(`Generated mock data: ${mockPath}`);

      return {
        success: true,
        message: `Mock data ${name} generated successfully`,
        filePath: mockPath,
        endpoint,
        methods: ['index', 'info', 'add', 'edit', 'delete', ...Object.keys(customMethods)],
        generatedFiles: [
          {
            path: mockPath,
            type: 'mock-data',
            content: generatedFile.content
          }
        ]
      };

    } catch (error) {
      logger.error(`Failed to generate mock data: ${name}`, { error: error.message });

      if (error instanceof BalmSharedMCPError) {
        throw error;
      }

      throw new BalmSharedMCPError(
        ErrorCodes.CODE_GENERATION_FAILED,
        `Failed to generate mock data: ${error.message}`,
        { name, endpoint, projectPath, originalError: error.message }
      );
    }
  }

  /**
   * Update project structure after module generation
   */
  async updateProjectStructureForModule(projectPath, moduleName, options = {}) {
    const { hasRoutes = false, hasApi = false, hasMock = false } = options;

    try {
      logger.info(`Updating project structure for module: ${moduleName}`);

      // Update API index if API config was generated
      if (hasApi) {
        await this.updateApiIndex(projectPath, moduleName);
      }

      // Update routes index if routes were generated
      if (hasRoutes) {
        await this.updateRoutesIndex(projectPath, moduleName);
      }

      // Update mock server index if mock data was generated
      if (hasMock) {
        await this.updateMockIndex(projectPath, moduleName);
      }

      // Update pages index (already handled in generatePageModule)
      await this.updatePagesIndex(
        path.join(projectPath, 'src/scripts/pages/index.js'),
        moduleName
      );

      logger.info(`Updated project structure for module: ${moduleName}`);

    } catch (error) {
      logger.warn(`Failed to update project structure: ${error.message}`);
      // Don't throw error here as module generation was successful
    }
  }

  /**
   * Update API index file
   */
  async updateApiIndex(projectPath, moduleName) {
    try {
      const apiIndexPath = path.join(projectPath, 'src/scripts/config/api/index.js');
      const kebabName = this.templateHelpers.get('kebabCase')(moduleName);

      // Check if index file exists
      const indexExists = await this.fileSystemHandler.exists(apiIndexPath);
      if (!indexExists) {
        // Create new index file
        const indexContent = `export { default as ${this.templateHelpers.get('camelCase')(moduleName)} } from './${kebabName}.js';\n`;
        await this.fileSystemHandler.writeFile(apiIndexPath, indexContent);
        return;
      }

      // Read existing content
      const content = await this.fileSystemHandler.readFile(apiIndexPath);

      // Check if module is already imported
      if (content.includes(`from './${kebabName}.js'`)) {
        return; // Already exists
      }

      // Add import statement
      const importStatement = `export { default as ${this.templateHelpers.get('camelCase')(moduleName)} } from './${kebabName}.js';`;
      const updatedContent = content + '\n' + importStatement;

      await this.fileSystemHandler.writeFile(apiIndexPath, updatedContent);
      logger.debug(`Updated API index: ${apiIndexPath}`);

    } catch (error) {
      logger.warn(`Failed to update API index: ${error.message}`);
    }
  }

  /**
   * Update routes index file
   */
  async updateRoutesIndex(projectPath, moduleName) {
    try {
      const routesIndexPath = path.join(projectPath, 'src/scripts/routes/index.js');
      const kebabName = this.templateHelpers.get('kebabCase')(moduleName);
      const camelName = this.templateHelpers.get('camelCase')(moduleName);

      // Check if index file exists
      const indexExists = await this.fileSystemHandler.exists(routesIndexPath);
      if (!indexExists) {
        // Create new index file
        const indexContent = `import { ${camelName}Routes } from './${kebabName}.js';\n\nexport const routes = [\n  ...${camelName}Routes\n];\n`;
        await this.fileSystemHandler.writeFile(routesIndexPath, indexContent);
        return;
      }

      // Read existing content
      const content = await this.fileSystemHandler.readFile(routesIndexPath);

      // Check if module is already imported
      if (content.includes(`from './${kebabName}.js'`)) {
        return; // Already exists
      }

      // Add import statement
      const importStatement = `import { ${camelName}Routes } from './${kebabName}.js';`;
      
      // Add to routes array
      let updatedContent = content;
      
      // Add import at the top
      if (content.includes('import')) {
        updatedContent = content.replace(
          /(import.*\n)/,
          `$1${importStatement}\n`
        );
      } else {
        updatedContent = importStatement + '\n\n' + content;
      }

      // Add to routes array
      if (content.includes('export const routes = [')) {
        updatedContent = updatedContent.replace(
          /export const routes = \[/,
          `export const routes = [\n  ...${camelName}Routes,`
        );
      } else {
        updatedContent += `\nexport const routes = [\n  ...${camelName}Routes\n];\n`;
      }

      await this.fileSystemHandler.writeFile(routesIndexPath, updatedContent);
      logger.debug(`Updated routes index: ${routesIndexPath}`);

    } catch (error) {
      logger.warn(`Failed to update routes index: ${error.message}`);
    }
  }

  /**
   * Update mock server index file
   */
  async updateMockIndex(projectPath, moduleName) {
    try {
      const mockIndexPath = path.join(projectPath, 'mock-server/index.js');
      const kebabName = this.templateHelpers.get('kebabCase')(moduleName);
      const pascalName = this.templateHelpers.get('pascalCase')(moduleName);

      // Check if index file exists
      const indexExists = await this.fileSystemHandler.exists(mockIndexPath);
      if (!indexExists) {
        // Create new index file
        const indexContent = `import { get${pascalName}Apis } from './apis/${kebabName}.js';\n\nexport function setupMockServer(server) {\n  get${pascalName}Apis(server);\n}\n`;
        await this.fileSystemHandler.writeFile(mockIndexPath, indexContent);
        return;
      }

      // Read existing content
      const content = await this.fileSystemHandler.readFile(mockIndexPath);

      // Check if module is already imported
      if (content.includes(`from './apis/${kebabName}.js'`)) {
        return; // Already exists
      }

      // Add import statement
      const importStatement = `import { get${pascalName}Apis } from './apis/${kebabName}.js';`;
      
      let updatedContent = content;
      
      // Add import at the top
      if (content.includes('import')) {
        updatedContent = content.replace(
          /(import.*\n)/,
          `$1${importStatement}\n`
        );
      } else {
        updatedContent = importStatement + '\n\n' + content;
      }

      // Add to setupMockServer function
      if (content.includes('export function setupMockServer(server) {')) {
        updatedContent = updatedContent.replace(
          /export function setupMockServer\(server\) \{/,
          `export function setupMockServer(server) {\n  get${pascalName}Apis(server);`
        );
      } else {
        updatedContent += `\nexport function setupMockServer(server) {\n  get${pascalName}Apis(server);\n}\n`;
      }

      await this.fileSystemHandler.writeFile(mockIndexPath, updatedContent);
      logger.debug(`Updated mock index: ${mockIndexPath}`);

    } catch (error) {
      logger.warn(`Failed to update mock index: ${error.message}`);
    }
  }

  /**
   * Generate API configuration for a module
   */
  async generateApiConfig(options) {
    const {
      name,
      model,
      endpoint,
      projectPath,
      operations = ['create', 'read', 'update', 'delete'],
      customActions = {},
      category = 'content',
      responseHandler,
      errorHandler,
      ...otherOptions
    } = options;

    logger.info(`Generating API configuration: ${name} for model: ${model}`);

    try {
      // Validate required parameters
      if (!name || !model || !endpoint || !projectPath) {
        throw new BalmSharedMCPError(
          ErrorCodes.INVALID_GENERATOR_CONFIG,
          'Missing required parameters for API configuration generation',
          { provided: Object.keys(options), required: ['name', 'model', 'endpoint', 'projectPath'] }
        );
      }

      // Ensure project path exists
      const projectExists = await this.fileSystemHandler.exists(projectPath);
      if (!projectExists) {
        throw new BalmSharedMCPError(
          ErrorCodes.PROJECT_NOT_FOUND,
          `Project path does not exist: ${projectPath}`,
          { projectPath }
        );
      }

      // Prepare template context
      const operationsStr = JSON.stringify(operations);
      
      let customActionsConfig = '';
      if (Object.keys(customActions).length > 0) {
        const customActionsStr = Object.entries(customActions)
          .map(([key, value]) => `    ${key}: '${value}'`)
          .join(',\n');
        
        customActionsConfig = `,\n  {\n    crud: {\n${customActionsStr}\n    }`;
        
        if (responseHandler) {
          customActionsConfig += `,\n    responseHandler: ${responseHandler}`;
        }
        
        if (errorHandler) {
          customActionsConfig += `,\n    errorHandler: ${errorHandler}`;
        }
        
        customActionsConfig += '\n  }';
      }

      const context = {
        name,
        model,
        endpoint,
        operations: operationsStr,
        customActionsConfig,
        ...otherOptions
      };

      // Determine output paths
      const apiDir = path.join(projectPath, 'src/scripts/config/api');
      const apiFileName = `${this.templateHelpers.get('kebabCase')(name)}.js`;
      const apiFilePath = path.join(apiDir, apiFileName);

      // Validate template context
      this.validateContext('api-config', context);

      // Generate the API configuration file
      const generatedFile = await this.generateFromTemplate('api-config', context, apiFilePath);

      // Format the generated code
      generatedFile.content = this.formatCode(generatedFile.content, 'javascript');
      await this.fileSystemHandler.writeFile(apiFilePath, generatedFile.content);

      // Update API index file
      await this.updateApiIndex(projectPath, name);

      logger.info(`Generated API configuration: ${apiFilePath}`);

      return {
        success: true,
        message: `API configuration ${name} generated successfully`,
        filePath: apiFilePath,
        apiDir,
        fileName: apiFileName,
        endpoint,
        operations,
        generatedFiles: [
          {
            path: apiFilePath,
            type: 'api-config',
            content: generatedFile.content
          }
        ]
      };

    } catch (error) {
      logger.error(`Failed to generate API configuration: ${name}`, { error: error.message });

      if (error instanceof BalmSharedMCPError) {
        throw error;
      }

      throw new BalmSharedMCPError(
        ErrorCodes.CODE_GENERATION_FAILED,
        `Failed to generate API configuration: ${error.message}`,
        { name, model, endpoint, projectPath, originalError: error.message }
      );
    }
  }

  /**
   * Update API category index file
   */
  async updateApiCategoryIndex(categoryDir, apiName, apiFileName) {
    try {
      const indexPath = path.join(categoryDir, 'index.js');
      const camelName = this.templateHelpers.get('camelCase')(apiName);
      const importName = `${camelName}Apis`;
      const fileNameWithoutExt = apiFileName.replace('.js', '');

      let content = '';
      let imports = [];
      let exports = [];

      // Read existing index file if it exists
      const indexExists = await this.fileSystemHandler.exists(indexPath);
      if (indexExists) {
        content = await this.fileSystemHandler.readFile(indexPath);

        // Parse existing imports and exports
        const importMatches = content.match(/import\s+(\w+)\s+from\s+['"]\.\/([^'"]+)['"]/g) || [];
        imports = importMatches.map(match => {
          const [, importName, fileName] = match.match(/import\s+(\w+)\s+from\s+['"]\.\/([^'"]+)['"]/);
          return { importName, fileName };
        });

        const exportMatch = content.match(/export\s+default\s+\[(.*?)\]/s);
        if (exportMatch) {
          exports = exportMatch[1]
            .split(',')
            .map(exp => exp.trim().replace(/\.\.\./g, ''))
            .filter(exp => exp && exp !== '');
        }
      }

      // Check if API is already imported
      const existingImport = imports.find(imp => imp.fileName === fileNameWithoutExt);
      if (!existingImport) {
        // Add new import
        imports.push({ importName, fileName: fileNameWithoutExt });
        exports.push(`...${importName}`);

        // Generate new index content
        const importStatements = imports
          .map(({ importName, fileName }) => `import ${importName} from './${fileName}';`)
          .join('\n');

        const exportStatement = `export default [${exports.join(', ')}];`;

        const newContent = `${importStatements}\n\n${exportStatement}\n`;

        await this.fileSystemHandler.writeFile(indexPath, newContent);
        logger.debug(`Updated API category index: ${indexPath}`);
      }

    } catch (error) {
      logger.warn(`Failed to update API category index: ${error.message}`);
    }
  }

  /**
   * Update main APIs index file
   */
  async updateMainApiIndex(projectPath, category) {
    try {
      const mainIndexPath = path.join(projectPath, 'src/scripts/apis/index.js');
      const mainIndexExists = await this.fileSystemHandler.exists(mainIndexPath);

      if (!mainIndexExists) {
        // Create main index file if it doesn't exist
        const defaultContent = `// Reference https://legacy.pro.balmjs.com/#/plugins/api-model
import { isDev } from '@/config';

const debug = isDev ? 'user' : false;

export default {
  crud: {
    create: 'add',
    read: {
      list: 'index',
      detail: 'info'
    },
    update: 'edit',
    delete: 'delete'
  },
  urlToCamelCase: true,
  apis: [],
  debug
};
`;
        await this.fileSystemHandler.writeFile(mainIndexPath, defaultContent);
      }

      const content = await this.fileSystemHandler.readFile(mainIndexPath);
      const camelCategory = this.templateHelpers.get('camelCase')(category);
      const importName = `${camelCategory}Apis`;

      // Check if category is already imported
      if (!content.includes(`import ${importName} from './${category}';`)) {
        // Add import statement
        const importStatement = `import ${importName} from './${category}';`;

        // Find the position to insert the import (after existing imports)
        const lines = content.split('\n');
        let insertIndex = 0;

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith('import ') && lines[i].includes('from \'./')) {
            insertIndex = i + 1;
          } else if (lines[i].trim() === '' && insertIndex > 0) {
            break;
          }
        }

        lines.splice(insertIndex, 0, importStatement);

        // Update the apis array
        const updatedContent = lines.join('\n');
        const apisArrayMatch = updatedContent.match(/apis:\s*\[(.*?)\]/s);

        if (apisArrayMatch) {
          const currentApis = apisArrayMatch[1].trim();
          const newApis = currentApis
            ? `${currentApis}, ...${importName}`
            : `...${importName}`;

          const finalContent = updatedContent.replace(
            /apis:\s*\[(.*?)\]/s,
            `apis: [${newApis}]`
          );

          await this.fileSystemHandler.writeFile(mainIndexPath, finalContent);
          logger.debug(`Updated main API index: ${mainIndexPath}`);
        }
      }

    } catch (error) {
      logger.warn(`Failed to update main API index: ${error.message}`);
    }
  }

  /**
   * Generate route configuration with permissions
   */
  async generateRouteWithPermissions(options) {
    const { name, title, projectPath, permissions = [], roles = [], ...otherOptions } = options;

    logger.info(`Generating route with permissions: ${name}`);

    try {
      // Validate required parameters
      if (!name || !projectPath) {
        throw new BalmSharedMCPError(
          ErrorCodes.INVALID_GENERATOR_CONFIG,
          'Missing required parameters for route with permissions generation',
          { provided: Object.keys(options), required: ['name', 'projectPath'] }
        );
      }

      // Ensure project path exists
      const projectExists = await this.fileSystemHandler.exists(projectPath);
      if (!projectExists) {
        throw new BalmSharedMCPError(
          ErrorCodes.PROJECT_NOT_FOUND,
          `Project path does not exist: ${projectPath}`,
          { projectPath }
        );
      }

      // Prepare template context with permissions
      const context = {
        name,
        title: title || name,
        requiresAuth: true,
        permissions,
        roles,
        ...otherOptions
      };

      // Generate route file
      const routeFileName = `${this.templateHelpers.get('kebabCase')(name)}.js`;
      const routeDir = path.join(projectPath, 'src/scripts/routes');
      const routeFilePath = path.join(routeDir, routeFileName);

      // Validate template context
      this.validateContext('route-config', context);

      // Generate the route file
      const generatedFile = await this.generateFromTemplate('route-config', context, routeFilePath);

      logger.info(`Generated route with permissions: ${routeFilePath}`);

      return {
        success: true,
        message: `Route with permissions ${name} generated successfully`,
        routeFilePath,
        template: 'route-config',
        permissions,
        roles,
        generatedFiles: [
          {
            path: routeFilePath,
            type: 'route-config',
            content: generatedFile.content
          }
        ]
      };

    } catch (error) {
      logger.error(`Failed to generate route with permissions: ${name}`, { error: error.message });

      if (error instanceof BalmSharedMCPError) {
        throw error;
      }

      throw new BalmSharedMCPError(
        ErrorCodes.CODE_GENERATION_FAILED,
        `Failed to generate route with permissions: ${error.message}`,
        { name, projectPath, originalError: error.message }
      );
    }
  }

  /**
   * Generate navigation configuration
   */
  async generateNavigationConfig(options) {
    const { name, title, icon, projectPath, ...otherOptions } = options;

    logger.info(`Generating navigation config: ${name}`);

    try {
      // Validate required parameters
      if (!name || !projectPath) {
        throw new BalmSharedMCPError(
          ErrorCodes.INVALID_GENERATOR_CONFIG,
          'Missing required parameters for navigation config generation',
          { provided: Object.keys(options), required: ['name', 'projectPath'] }
        );
      }

      // Ensure project path exists
      const projectExists = await this.fileSystemHandler.exists(projectPath);
      if (!projectExists) {
        throw new BalmSharedMCPError(
          ErrorCodes.PROJECT_NOT_FOUND,
          `Project path does not exist: ${projectPath}`,
          { projectPath }
        );
      }

      // Add navigation template if not exists
      if (!this.templates.has('nav-config')) {
        this.templates.set('nav-config', {
          extension: '.js',
          template: `/**
 * {{pascalCase name}} Navigation Configuration
 * Generated by BalmSharedMCP
 */

export const {{camelCase name}}Navigation = {
  name: '{{camelCase name}}',
  title: '{{title}}',
  {{#if icon}}icon: '{{icon}}',{{/if}}
  path: '/{{kebabCase name}}',
  {{#if children}}
  children: [
{{#each children}}
    {
      name: '{{name}}',
      title: '{{title}}',
      path: '{{path}}',
      {{#if icon}}icon: '{{icon}}',{{/if}}
    },
{{/each}}
  ],
  {{/if}}
  {{#if permissions}}
  permissions: {{json permissions}},
  {{/if}}
  {{#if roles}}
  roles: {{json roles}},
  {{/if}}
};

export default {{camelCase name}}Navigation;
`
        });
      }

      // Prepare template context
      const context = {
        name,
        title: title || name,
        icon: icon || 'menu',
        ...otherOptions
      };

      // Generate navigation file
      const navFileName = `${this.templateHelpers.get('kebabCase')(name)}.js`;
      const navDir = path.join(projectPath, 'src/scripts/navigation');
      const navFilePath = path.join(navDir, navFileName);

      // Generate the navigation file
      const generatedFile = await this.generateFromTemplate('nav-config', context, navFilePath);

      logger.info(`Generated navigation config: ${navFilePath}`);

      return {
        success: true,
        message: `Navigation config ${name} generated successfully`,
        navFilePath,
        template: 'nav-config',
        generatedFiles: [
          {
            path: navFilePath,
            type: 'nav-config',
            content: generatedFile.content
          }
        ]
      };

    } catch (error) {
      logger.error(`Failed to generate navigation config: ${name}`, { error: error.message });

      if (error instanceof BalmSharedMCPError) {
        throw error;
      }

      throw new BalmSharedMCPError(
        ErrorCodes.CODE_GENERATION_FAILED,
        `Failed to generate navigation config: ${error.message}`,
        { name, projectPath, originalError: error.message }
      );
    }
  }

  /**
   * Generate complete routing module (routes + navigation)
   */
  async generateRoutingModule(options) {
    const { name, title, projectPath, navigation = true, ...otherOptions } = options;

    logger.info(`Generating routing module: ${name}`);

    try {
      // Validate required parameters
      if (!name || !projectPath) {
        throw new BalmSharedMCPError(
          ErrorCodes.INVALID_GENERATOR_CONFIG,
          'Missing required parameters for routing module generation',
          { provided: Object.keys(options), required: ['name', 'projectPath'] }
        );
      }

      // Ensure project path exists
      const projectExists = await this.fileSystemHandler.exists(projectPath);
      if (!projectExists) {
        throw new BalmSharedMCPError(
          ErrorCodes.PROJECT_NOT_FOUND,
          `Project path does not exist: ${projectPath}`,
          { projectPath }
        );
      }

      const generatedFiles = [];
      const components = [];

      // 1. Generate route configuration
      const routeResult = await this.generateRouteConfig({
        name,
        title,
        projectPath,
        ...otherOptions
      });
      generatedFiles.push(...routeResult.generatedFiles);
      components.push({
        type: 'route',
        path: routeResult.filePath
      });

      // 2. Generate navigation configuration if requested
      if (navigation) {
        const navResult = await this.generateNavigationConfig({
          name,
          title,
          projectPath,
          ...otherOptions
        });
        generatedFiles.push(...navResult.generatedFiles);
        components.push({
          type: 'navigation',
          path: navResult.navFilePath
        });
      }

      logger.info(`Generated routing module: ${name} with ${components.length} components`);

      return {
        success: true,
        message: `Routing module ${name} generated successfully`,
        module: name,
        components,
        generatedFiles,
        summary: {
          totalComponents: components.length,
          hasNavigation: navigation,
          totalFiles: generatedFiles.length
        }
      };

    } catch (error) {
      logger.error(`Failed to generate routing module: ${name}`, { error: error.message });

      if (error instanceof BalmSharedMCPError) {
        throw error;
      }

      throw new BalmSharedMCPError(
        ErrorCodes.CODE_GENERATION_FAILED,
        `Failed to generate routing module: ${error.message}`,
        { name, projectPath, originalError: error.message }
      );
    }
  }

  /**
   * Create main routes index file
   */
  async createMainRoutesIndex(indexPath, moduleName, moduleVarName) {
    logger.info(`Creating main routes index: ${indexPath}`);

    try {
      // Ensure directory exists
      const indexDir = path.dirname(indexPath);
      await this.fileSystemHandler.ensureDirectory(indexDir);

      // Check if index file exists
      const indexExists = await this.fileSystemHandler.exists(indexPath);

      if (!indexExists) {
        // Create new index file
        const defaultContent = `/**
 * Routes Index
 * Generated by BalmSharedMCP
 */

import { ${moduleVarName}Routes } from './${this.templateHelpers.get('kebabCase')(moduleName)}';

export const routes = [
  ...${moduleVarName}Routes,
];

export default routes;
`;
        await this.fileSystemHandler.writeFile(indexPath, defaultContent);
      } else {
        // Update existing index file
        const content = await this.fileSystemHandler.readFile(indexPath);
        const importStatement = `import { ${moduleVarName}Routes } from './${this.templateHelpers.get('kebabCase')(moduleName)}';`;

        // Check if import already exists
        if (!content.includes(importStatement)) {
          // Add import statement
          const lines = content.split('\n');
          let insertIndex = 0;

          // Find position to insert import
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('import ') && lines[i].includes('Routes')) {
              insertIndex = i + 1;
            } else if (lines[i].trim() === '' && insertIndex > 0) {
              break;
            }
          }

          lines.splice(insertIndex, 0, importStatement);

          // Update routes array
          const updatedContent = lines.join('\n');
          const routesArrayMatch = updatedContent.match(/routes\s*=\s*\[(.*?)\]/s);

          if (routesArrayMatch) {
            const currentRoutes = routesArrayMatch[1].trim();
            const newRoutes = currentRoutes
              ? `${currentRoutes}, ...${moduleVarName}Routes`
              : `...${moduleVarName}Routes`;

            const finalContent = updatedContent.replace(
              /routes\s*=\s*\[(.*?)\]/s,
              `routes = [${newRoutes}]`
            );

            await this.fileSystemHandler.writeFile(indexPath, finalContent);
          }
        }
      }

      logger.info(`Created/updated main routes index: ${indexPath}`);

    } catch (error) {
      logger.error(`Failed to create main routes index: ${error.message}`);
      throw new BalmSharedMCPError(
        ErrorCodes.CODE_GENERATION_FAILED,
        `Failed to create main routes index: ${error.message}`,
        { indexPath, moduleName, originalError: error.message }
      );
    }
  }

}
