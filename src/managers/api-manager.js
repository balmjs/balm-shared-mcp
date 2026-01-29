/**
 * API Manager
 *
 * Handles API configuration generation and mock data management.
 */

import path from 'path';
import { logger } from '../utils/logger.js';
import { BalmSharedMCPError, ErrorCodes } from '../utils/errors.js';

export class ApiManager {
  constructor(fileSystemHandler, logger) {
    this.fileSystemHandler = fileSystemHandler;
    this.logger = logger || console;
  }

  /**
   * Generate API configuration
   */
  async generateApiConfig(options) {
    const {
      model,
      endpoint: _endpoint,
      operations: _operations,
      projectPath,
      customActions
    } = options;

    this.validateApiOptions(options);

    try {
      const apiDir = path.join(projectPath, 'src/scripts/apis');
      const apiFileName = `${model.toLowerCase()}.js`;
      const apiFilePath = path.join(apiDir, apiFileName);

      // Create directory if it doesn't exist
      const dirExists = await this.fileSystemHandler.exists(apiDir);
      if (!dirExists) {
        await this.fileSystemHandler.createDirectory(apiDir);
      }

      // Generate API template
      const template = this._generateApiTemplate(options);

      // Write API file
      await this.fileSystemHandler.writeFile(apiFilePath, template);

      this.logger.info(`Generated API configuration: ${apiFilePath}`);

      return {
        success: true,
        model,
        filePath: apiFilePath,
        customActions
      };
    } catch (error) {
      this.logger.error(`Failed to generate API config: ${error.message}`);
      throw new BalmSharedMCPError(
        ErrorCodes.API_GENERATION_FAILED,
        `Failed to generate API configuration: ${error.message}`
      );
    }
  }

  /**
   * Update APIs index file
   */
  async updateApisIndex(projectPath, modelName) {
    try {
      const indexPath = path.join(projectPath, 'src/scripts/apis/index.js');
      const modelKey = modelName.toLowerCase();

      let content = '';
      const indexExists = await this.fileSystemHandler.exists(indexPath);

      if (indexExists) {
        content = await this.fileSystemHandler.readFile(indexPath);
      }

      const parsed = this._parseExistingIndex(content);

      // Add new import if not already present
      if (!parsed.imports.includes(modelKey)) {
        parsed.imports.push(modelKey);
        parsed.exports.push(modelKey);
      }

      const newContent = this._generateIndexContent(parsed.imports, parsed.exports);
      await this.fileSystemHandler.writeFile(indexPath, newContent);

      this.logger.info(`Updated APIs index: ${indexPath}`);
    } catch (error) {
      this.logger.error(`Failed to update APIs index: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate mock data
   */
  async generateMockData(options) {
    const { model, fields: _fields, projectPath } = options;

    try {
      const mockDir = path.join(projectPath, 'mock-server/modules');
      const mockFileName = `${model.toLowerCase()}.js`;
      const mockFilePath = path.join(mockDir, mockFileName);

      // Create directory if it doesn't exist
      const dirExists = await this.fileSystemHandler.exists(mockDir);
      if (!dirExists) {
        await this.fileSystemHandler.createDirectory(mockDir);
      }

      // Generate mock template
      const template = this._generateMockTemplate(options);

      // Write mock file
      await this.fileSystemHandler.writeFile(mockFilePath, template);

      this.logger.info(`Generated mock data: ${mockFilePath}`);

      return {
        success: true,
        model,
        filePath: mockFilePath
      };
    } catch (error) {
      this.logger.error(`Failed to generate mock data: ${error.message}`);
      throw new BalmSharedMCPError(
        ErrorCodes.MOCK_GENERATION_FAILED,
        `Failed to generate mock data: ${error.message}`
      );
    }
  }

  /**
   * Validate API options
   */
  validateApiOptions(options) {
    const { model, endpoint, operations, projectPath } = options;

    if (!model) {
      throw new BalmSharedMCPError(ErrorCodes.INVALID_GENERATOR_CONFIG, 'Model name is required');
    }

    if (!/^[A-Z][a-zA-Z0-9]*$/.test(model)) {
      throw new BalmSharedMCPError(
        ErrorCodes.INVALID_GENERATOR_CONFIG,
        'Model name must be in PascalCase format'
      );
    }

    if (!endpoint) {
      throw new BalmSharedMCPError(ErrorCodes.INVALID_GENERATOR_CONFIG, 'Endpoint is required');
    }

    if (!endpoint.startsWith('/')) {
      throw new BalmSharedMCPError(
        ErrorCodes.INVALID_GENERATOR_CONFIG,
        'Endpoint must start with /'
      );
    }

    if (!operations || !Array.isArray(operations)) {
      throw new BalmSharedMCPError(
        ErrorCodes.INVALID_GENERATOR_CONFIG,
        'Operations array is required'
      );
    }

    const validOperations = ['create', 'read', 'update', 'delete'];
    const invalidOps = operations.filter(op => !validOperations.includes(op));
    if (invalidOps.length > 0) {
      throw new BalmSharedMCPError(
        ErrorCodes.INVALID_GENERATOR_CONFIG,
        `Invalid operations: ${invalidOps.join(', ')}`
      );
    }

    if (!projectPath) {
      throw new BalmSharedMCPError(ErrorCodes.INVALID_GENERATOR_CONFIG, 'Project path is required');
    }
  }

  /**
   * Generate API template
   */
  _generateApiTemplate(options) {
    const { model, endpoint, operations, customActions = {} } = options;

    let template = `export default [\n  '${model}',\n  '${endpoint}',\n  [`;

    operations.forEach((op, index) => {
      template += `'${op}'`;
      if (index < operations.length - 1) {
        template += ', ';
      }
    });

    template += ']';

    if (Object.keys(customActions).length > 0) {
      template += ',\n  {\n    crud: {\n';
      Object.entries(customActions).forEach(([action, config], index) => {
        template += `      ${action}: '${config}'`;
        if (index < Object.entries(customActions).length - 1) {
          template += ',';
        }
        template += '\n';
      });
      template += '    }\n  }';
    }

    template += '\n];\n';

    return template;
  }

  /**
   * Generate mock template
   */
  _generateMockTemplate(options) {
    const { model, fields = [] } = options;

    let template = `export default {\n  name: '${model}',\n  data: [\n    {\n`;

    fields.forEach((field, index) => {
      const mockValue = this._getMockValue(field.type, field.name);
      template += `      ${field.name}: ${mockValue}`;
      if (index < fields.length - 1) {
        template += ',';
      }
      template += '\n';
    });

    template += '    }\n  ]\n};\n';

    return template;
  }

  /**
   * Get mock value for field type
   */
  _getMockValue(type, fieldName) {
    switch (type.toLowerCase()) {
      case 'string':
        return `'Sample ${fieldName}'`;
      case 'number':
        return (Math.floor(Math.random() * 100) + 1).toString();
      case 'boolean':
        return Math.random() > 0.5 ? 'true' : 'false';
      case 'date':
        return 'new Date()';
      case 'array':
        return '[]';
      case 'object':
        return '{}';
      default:
        return 'null';
    }
  }

  /**
   * Parse existing index file
   */
  _parseExistingIndex(content) {
    const imports = [];
    const exports = [];

    if (!content) {
      return { imports, exports };
    }

    try {
      // Extract imports
      const importMatches = content.match(/import\s+(\w+)\s+from\s+['"`]\.\/(\w+)\.js['"`]/g);
      if (importMatches) {
        importMatches.forEach(match => {
          const nameMatch = match.match(/import\s+(\w+)/);
          if (nameMatch) {
            imports.push(nameMatch[1]);
          }
        });
      }

      // Extract exports
      const exportMatch = content.match(/export\s+default\s+\{([^}]+)\}/);
      if (exportMatch) {
        const [, exportContent] = exportMatch;
        const exportNames = exportContent
          .split(',')
          .map(name => name.trim())
          .filter(name => name);
        exports.push(...exportNames);
      }
    } catch {
      // If parsing fails, return empty arrays
    }

    return { imports, exports };
  }

  /**
   * Generate index content
   */
  _generateIndexContent(imports, exports) {
    let content = '';

    // Generate imports
    imports.forEach(imp => {
      content += `import ${imp} from './${imp}.js';\n`;
    });

    if (exports.length === 0) {
      content += '\nexport default {};\n';
    } else {
      content += '\nexport default {\n';

      // Generate exports
      exports.forEach((exp, index) => {
        content += `  ${exp}`;
        if (index < exports.length - 1) {
          content += ',';
        }
        content += '\n';
      });

      content += '};\n';
    }

    return content;
  }

  /**
   * Generate complete API module (configuration + mock data)
   */
  async generateApiModule(options) {
    const {
      name,
      model,
      endpoint,
      projectPath,
      operations = ['create', 'read', 'update', 'delete'],
      customActions = {},
      fields = [],
      title,
      category = 'content',
      generateMock = true,
      responseHandler: _responseHandler,
      errorHandler: _errorHandler,
      ...otherOptions
    } = options;

    logger.info(`Generating API module: ${name} for model: ${model}`);

    try {
      // Validate required parameters
      if (!name || !model || !endpoint || !projectPath) {
        throw new BalmSharedMCPError(
          ErrorCodes.INVALID_GENERATOR_CONFIG,
          'Missing required parameters for API module generation',
          { provided: Object.keys(options), required: ['name', 'model', 'endpoint', 'projectPath'] }
        );
      }

      const results = [];

      // Generate API configuration
      const apiResult = await this.codeGenerator.generateApiConfig({
        name,
        model,
        endpoint,
        projectPath,
        operations,
        customActions,
        category,
        fields,
        title,
        ...otherOptions
      });
      results.push(apiResult);

      // Generate mock data if requested
      if (generateMock) {
        const mockResult = await this.codeGenerator.generateMockData({
          name,
          endpoint,
          fields,
          title: title || name,
          projectPath,
          category,
          ...otherOptions
        });
        results.push(mockResult);
      }

      logger.info(`Generated API module: ${name} with ${results.length} components`);

      return {
        success: true,
        message: `API module ${name} generated successfully`,
        name,
        model,
        endpoint,
        category,
        components: results,
        generatedFiles: results.flatMap(r => r.generatedFiles)
      };
    } catch (error) {
      logger.error(`Failed to generate API module: ${name}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Generate CRUD API configuration
   */
  async generateCrudApi(options) {
    const {
      name,
      model,
      endpoint,
      projectPath,
      category = 'content',
      customActions = {},
      ...otherOptions
    } = options;

    logger.info(`Generating CRUD API: ${name}`);

    // Standard CRUD operations
    const operations = ['create', 'read', 'update', 'delete'];

    // Standard CRUD action mappings
    const standardActions = {
      create: 'add',
      read: {
        list: 'index',
        detail: 'info'
      },
      update: 'edit',
      delete: 'delete'
    };

    // Merge with custom actions
    const finalActions = { ...standardActions, ...customActions };

    return await this.codeGenerator.generateApiConfig({
      name,
      model,
      endpoint,
      projectPath,
      operations,
      customActions: finalActions,
      category,
      ...otherOptions
    });
  }

  /**
   * Generate API configuration with custom operations
   */
  async generateCustomApi(options) {
    const {
      name,
      model,
      endpoint,
      projectPath,
      operations,
      customActions = {},
      category = 'content',
      ...otherOptions
    } = options;

    logger.info(`Generating custom API: ${name} with operations: ${operations.join(', ')}`);

    return await this.codeGenerator.generateApiConfig({
      name,
      model,
      endpoint,
      projectPath,
      operations,
      customActions,
      category,
      ...otherOptions
    });
  }

  /**
   * Update existing API configuration
   */
  async updateApiConfig(options) {
    const { name, projectPath, category = 'content', updates = {}, ...otherOptions } = options;
    void otherOptions; // Mark as intentionally unused

    logger.info(`Updating API configuration: ${name}`);

    try {
      // Find existing API configuration file
      const apiDir = path.join(projectPath, 'src/scripts/apis', category);
      const apiFileName = `${this.codeGenerator.templateHelpers.get('kebabCase')(name)}.js`;
      const apiFilePath = path.join(apiDir, apiFileName);

      const apiExists = await this.fileSystemHandler.exists(apiFilePath);
      if (!apiExists) {
        throw new BalmSharedMCPError(
          ErrorCodes.FILE_NOT_FOUND,
          `API configuration file not found: ${apiFilePath}`,
          { apiFilePath, name, category }
        );
      }

      // Read existing configuration
      const existingContent = await this.fileSystemHandler.readFile(apiFilePath);

      // Parse and update configuration
      // This is a simplified approach - in a real implementation, you might want to use AST parsing
      let updatedContent = existingContent;

      // Update operations if provided
      if (updates.operations) {
        const operationsRegex = /\[(.*?)\]/s;
        const operationsMatch = existingContent.match(operationsRegex);
        if (operationsMatch) {
          const newOperations = JSON.stringify(updates.operations);
          updatedContent = updatedContent.replace(operationsRegex, newOperations);
        }
      }

      // Update custom actions if provided
      if (updates.customActions) {
        // This would require more sophisticated parsing in a real implementation
        logger.warn('Custom actions update not fully implemented - manual editing required');
      }

      // Write updated configuration
      await this.fileSystemHandler.writeFile(apiFilePath, updatedContent);

      logger.info(`Updated API configuration: ${apiFilePath}`);

      return {
        success: true,
        message: `API configuration ${name} updated successfully`,
        apiFilePath,
        updates
      };
    } catch (error) {
      logger.error(`Failed to update API configuration: ${name}`, { error: error.message });

      if (error instanceof BalmSharedMCPError) {
        throw error;
      }

      throw new BalmSharedMCPError(
        ErrorCodes.API_UPDATE_FAILED,
        `Failed to update API configuration: ${error.message}`,
        { name, projectPath, category, originalError: error.message }
      );
    }
  }

  /**
   * List all API configurations in a project
   */
  async listApiConfigurations(projectPath) {
    logger.info(`Listing API configurations in project: ${projectPath}`);

    try {
      const apisDir = path.join(projectPath, 'src/scripts/apis');
      const apisDirExists = await this.fileSystemHandler.exists(apisDir);

      if (!apisDirExists) {
        return {
          success: true,
          message: 'No APIs directory found',
          apis: []
        };
      }

      const apis = [];
      const categories = await this.fileSystemHandler.readDirectory(apisDir);

      for (const category of categories) {
        const categoryPath = path.join(apisDir, category);
        const isDirectory = await this.fileSystemHandler.isDirectory(categoryPath);

        if (isDirectory) {
          const categoryFiles = await this.fileSystemHandler.readDirectory(categoryPath);

          for (const file of categoryFiles) {
            if (file.endsWith('.js') && file !== 'index.js') {
              const apiName = file.replace('.js', '');
              const apiPath = path.join(categoryPath, file);

              try {
                const content = await this.fileSystemHandler.readFile(apiPath);
                const apiInfo = this.parseApiConfiguration(content, apiName, category);
                apis.push(apiInfo);
              } catch (error) {
                logger.warn(`Failed to parse API configuration: ${apiPath}`, {
                  error: error.message
                });
              }
            }
          }
        }
      }

      logger.info(`Found ${apis.length} API configurations`);

      return {
        success: true,
        message: `Found ${apis.length} API configurations`,
        apis
      };
    } catch (error) {
      logger.error('Failed to list API configurations', { error: error.message });

      throw new BalmSharedMCPError(
        ErrorCodes.API_LIST_FAILED,
        `Failed to list API configurations: ${error.message}`,
        { projectPath, originalError: error.message }
      );
    }
  }

  /**
   * Parse API configuration from file content
   */
  parseApiConfiguration(content, apiName, category) {
    try {
      // Simple regex-based parsing - in a real implementation, use AST parsing

      // Extract all quoted strings from the content
      const quotedStrings = content.match(/'([^']+)'/g) || [];

      let model = 'unknown';
      let endpoint = 'unknown';
      let operations = [];

      // If we have at least 2 quoted strings, use them as model and endpoint
      if (quotedStrings.length >= 2) {
        model = quotedStrings[0].replace(/'/g, '');
        endpoint = quotedStrings[1].replace(/'/g, '');
      }

      // Extract operations from the remaining quoted strings (skip first 2)
      if (quotedStrings.length > 2) {
        operations = quotedStrings.slice(2).map(op => op.replace(/'/g, ''));
      }

      return {
        name: apiName,
        model,
        endpoint,
        operations,
        category,
        hasCustomActions: content.includes('crud:'),
        filePath: `src/scripts/apis/${category}/${apiName}.js`
      };
    } catch (error) {
      return {
        name: apiName,
        model: 'unknown',
        endpoint: 'unknown',
        operations: [],
        category,
        hasCustomActions: false,
        filePath: `src/scripts/apis/${category}/${apiName}.js`,
        parseError: error.message
      };
    }
  }

  /**
   * Validate API configuration
   */
  async validateApiConfiguration(projectPath, apiName, category = 'content') {
    logger.info(`Validating API configuration: ${apiName}`);

    try {
      const apiDir = path.join(projectPath, 'src/scripts/apis', category);
      const apiFileName = `${this.codeGenerator.templateHelpers.get('kebabCase')(apiName)}.js`;
      const apiFilePath = path.join(apiDir, apiFileName);

      const apiExists = await this.fileSystemHandler.exists(apiFilePath);
      if (!apiExists) {
        return {
          valid: false,
          errors: [`API configuration file not found: ${apiFilePath}`],
          warnings: []
        };
      }

      const content = await this.fileSystemHandler.readFile(apiFilePath);
      const errors = [];
      const warnings = [];

      // Basic validation checks
      if (!content.includes('export default')) {
        errors.push('Missing default export');
      }

      if (!content.match(/\[.*?,.*?,.*?\]/s)) {
        errors.push(
          'Invalid API configuration format - should be [model, endpoint, operations, options?]'
        );
      }

      // Check if properly imported in category index
      const categoryIndexPath = path.join(apiDir, 'index.js');
      const categoryIndexExists = await this.fileSystemHandler.exists(categoryIndexPath);

      if (categoryIndexExists) {
        const indexContent = await this.fileSystemHandler.readFile(categoryIndexPath);
        const importName = `${this.codeGenerator.templateHelpers.get('camelCase')(apiName)}Apis`;

        if (!indexContent.includes(importName)) {
          warnings.push('API not imported in category index file');
        }
      } else {
        warnings.push('Category index file not found');
      }

      // Check if category is imported in main index
      const mainIndexPath = path.join(projectPath, 'src/scripts/apis/index.js');
      const mainIndexExists = await this.fileSystemHandler.exists(mainIndexPath);

      if (mainIndexExists) {
        const mainContent = await this.fileSystemHandler.readFile(mainIndexPath);
        const categoryImport = `${this.codeGenerator.templateHelpers.get('camelCase')(category)}Apis`;

        if (!mainContent.includes(categoryImport)) {
          warnings.push('Category not imported in main APIs index');
        }
      } else {
        warnings.push('Main APIs index file not found');
      }

      const isValid = errors.length === 0;

      logger.info(`API configuration validation ${isValid ? 'passed' : 'failed'}: ${apiName}`);

      return {
        valid: isValid,
        errors,
        warnings,
        apiFilePath
      };
    } catch (error) {
      logger.error(`Failed to validate API configuration: ${apiName}`, { error: error.message });

      return {
        valid: false,
        errors: [`Validation failed: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Generate API documentation
   */
  async generateApiDocumentation(projectPath, outputPath) {
    logger.info(`Generating API documentation for project: ${projectPath}`);

    try {
      const apiList = await this.listApiConfigurations(projectPath);

      if (!apiList.success) {
        throw new Error('Failed to list API configurations');
      }

      const documentation = this.buildApiDocumentation(apiList.apis);

      await this.fileSystemHandler.writeFile(outputPath, documentation);

      logger.info(`Generated API documentation: ${outputPath}`);

      return {
        success: true,
        message: 'API documentation generated successfully',
        outputPath,
        apiCount: apiList.apis.length
      };
    } catch (error) {
      logger.error('Failed to generate API documentation', { error: error.message });

      throw new BalmSharedMCPError(
        ErrorCodes.DOCUMENTATION_GENERATION_FAILED,
        `Failed to generate API documentation: ${error.message}`,
        { projectPath, outputPath, originalError: error.message }
      );
    }
  }

  /**
   * Build API documentation content
   */
  buildApiDocumentation(apis) {
    const groupedApis = apis.reduce((groups, api) => {
      if (!groups[api.category]) {
        groups[api.category] = [];
      }
      groups[api.category].push(api);
      return groups;
    }, {});

    let documentation = `# API Documentation

Generated by BalmSharedMCP on ${new Date().toISOString()}

## Overview

This document describes all API configurations in the project.

`;

    Object.keys(groupedApis).forEach(category => {
      documentation += `## ${category.charAt(0).toUpperCase() + category.slice(1)} APIs\n\n`;

      groupedApis[category].forEach(api => {
        documentation += `### ${api.name}\n\n`;
        documentation += `- **Model**: ${api.model}\n`;
        documentation += `- **Endpoint**: ${api.endpoint}\n`;
        documentation += `- **Operations**: ${api.operations.join(', ')}\n`;
        documentation += `- **File**: ${api.filePath}\n`;

        if (api.hasCustomActions) {
          documentation += '- **Custom Actions**: Yes\n';
        }

        if (api.parseError) {
          documentation += `- **Parse Error**: ${api.parseError}\n`;
        }

        documentation += '\n';
      });
    });

    return documentation;
  }
}
