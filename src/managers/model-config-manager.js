/**
 * Model Config Manager
 *
 * Handles model configuration generation for forms and UI components.
 */

import path from 'path';
import { logger } from '../utils/logger.js';
import { BalmSharedMCPError, ErrorCodes } from '../utils/errors.js';

export class ModelConfigManager {
  constructor(fileSystemHandler, config) {
    this.fileSystemHandler = fileSystemHandler;

    // Handle both config object and logger (for backward compatibility with tests)
    if (config && typeof config.info === 'function') {
      // If config has logger methods, treat it as a logger
      this.logger = config;
      this.config = {};
    } else {
      // Otherwise treat it as config
      this.config = config || {};
      this.logger = logger; // Use imported logger
    }

    // Field type to UI component mapping
    this.componentMapping = this.initializeComponentMapping();

    // Validation rules mapping
    this.validationMapping = this.initializeValidationMapping();
  }

  /**
   * Initialize field type to UI component mapping
   */
  initializeComponentMapping() {
    return {
      // Text inputs
      string: 'ui-textfield',
      text: 'ui-textfield',
      textarea: 'ui-textarea',
      password: 'ui-textfield',
      email: 'ui-textfield',
      url: 'ui-textfield',
      phone: 'ui-textfield',

      // Numbers
      number: 'ui-textfield',
      integer: 'ui-textfield',
      float: 'ui-textfield',
      currency: 'ui-textfield',

      // Selections
      select: 'ui-select',
      multiselect: 'ui-select',
      radio: 'ui-radio-group',
      checkbox: 'ui-checkbox',
      switch: 'ui-switch',

      // Date and time
      date: 'ui-datepicker',
      datetime: 'ui-datepicker',
      time: 'ui-timepicker',
      daterange: 'ui-rangepicker',

      // File uploads
      file: 'ui-file',
      image: 'ui-file',
      avatar: 'ui-file',
      upload: 'ui-file-upload',

      // Rich content
      editor: 'ui-editor',
      markdown: 'ui-editor',

      // Special components
      color: 'ui-textfield',
      slider: 'ui-slider',
      rating: 'ui-rating',
      readonly: 'ui-readonly-item'
    };
  }

  /**
   * Initialize validation rules mapping
   */
  initializeValidationMapping() {
    return {
      required: { required: true },
      email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: '请输入有效的邮箱地址' },
      phone: { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码' },
      url: { pattern: /^https?:\/\/.+/, message: '请输入有效的URL地址' },
      number: { type: 'number', message: '请输入数字' },
      numeric: { type: 'number', message: '请输入数字' },
      integer: { type: 'integer', message: '请输入整数' },
      minLength: length => ({ minLength: length, message: `最少输入${length}个字符` }),
      maxLength: length => ({ maxLength: length, message: `最多输入${length}个字符` }),
      min: value => ({ min: value, message: `最小值为${value}` }),
      max: value => ({ max: value, message: `最大值为${value}` })
    };
  }

  /**
   * Map field type to UI component
   */
  mapFieldToComponent(fieldType, fieldOptions = {}) {
    const component = this.componentMapping[fieldType] || 'ui-textfield';

    // Handle special cases
    if (fieldType === 'select' && fieldOptions.multiple) {
      return 'ui-select';
    }

    if (fieldType === 'textfield' && fieldOptions.type === 'password') {
      return 'ui-textfield';
    }

    if (fieldType === 'file' && fieldOptions.accept?.includes('image')) {
      return 'ui-file';
    }

    return component;
  }

  /**
   * Generate component attributes and properties
   */
  generateComponentProps(field) {
    const { type, options = {}, validation = {} } = field;
    const props = {};

    // Common props
    if (options.placeholder) {
      props.placeholder = options.placeholder;
    }

    if (options.disabled) {
      props.disabled = options.disabled;
    }

    if (options.readonly) {
      props.readonly = options.readonly;
    }

    // Type-specific props
    switch (type) {
      case 'textfield':
      case 'string':
      case 'text':
        if (options.maxlength) {
          props.maxlength = options.maxlength;
        }
        if (options.type) {
          props.type = options.type; // password, email, etc.
        }
        break;

      case 'textarea':
        if (options.rows) {
          props.rows = options.rows;
        }
        if (options.maxlength) {
          props.maxlength = options.maxlength;
        }
        break;

      case 'number':
      case 'integer':
      case 'float':
        props.type = 'number';
        if (validation.min !== undefined) {
          props.min = validation.min;
        }
        if (validation.max !== undefined) {
          props.max = validation.max;
        }
        if (options.step) {
          props.step = options.step;
        }
        break;

      case 'select':
      case 'multiselect':
        if (options.options) {
          props.options = options.options;
        }
        if (options.multiple) {
          props.multiple = options.multiple;
        }
        if (options.defaultLabel) {
          props.defaultLabel = options.defaultLabel;
        }
        if (options.optionFormat) {
          props.optionFormat = options.optionFormat;
        }
        break;

      case 'radio':
        if (options.options) {
          props.options = options.options;
        }
        if (options.optionFormat) {
          props.optionFormat = options.optionFormat;
        }
        break;

      case 'checkbox':
        if (options.trueValue !== undefined) {
          props.trueValue = options.trueValue;
        }
        if (options.falseValue !== undefined) {
          props.falseValue = options.falseValue;
        }
        break;

      case 'date':
      case 'datetime':
        if (options.format) {
          props.format = options.format;
        }
        if (options.disabledDate) {
          props.disabledDate = options.disabledDate;
        }
        break;

      case 'file':
      case 'image':
        if (options.accept) {
          props.accept = options.accept;
        }
        if (options.multiple) {
          props.multiple = options.multiple;
        }
        if (options.maxSize) {
          props.maxSize = options.maxSize;
        }
        break;

      case 'editor':
        if (options.toolbar) {
          props.toolbar = options.toolbar;
        }
        if (options.height) {
          props.height = options.height;
        }
        break;
    }

    return props;
  }

  /**
   * Generate validation configuration
   */
  generateValidationConfig(field) {
    const { validation = {}, required = false } = field;
    const validationRules = [];

    // Required validation
    if (required) {
      validationRules.push(this.validationMapping.required);
    }

    // Type-specific validation
    Object.keys(validation).forEach(rule => {
      const value = validation[rule];

      if (this.validationMapping[rule]) {
        if (typeof this.validationMapping[rule] === 'function') {
          validationRules.push(this.validationMapping[rule](value));
        } else {
          validationRules.push(this.validationMapping[rule]);
        }
      } else if (rule === 'custom' && typeof value === 'object') {
        validationRules.push(value);
      }
    });

    return validationRules.length > 0 ? validationRules : undefined;
  }

  /**
   * Generate model configuration from field definitions
   */
  async generateModelConfig(options) {
    const {
      name,
      model, // Support both 'name' and 'model' parameter names
      fields = [],
      formLayout = 'vertical',
      submitText = '保存',
      cancelText = '取消',
      validationRules = {},
      projectPath
    } = options;

    // Use model if name is not provided (for backward compatibility with tests)
    const modelName = name || model;

    this.logger.info(`Generating model config for: ${modelName}`);

    try {
      // Validate input
      if (!modelName) {
        throw new BalmSharedMCPError(
          ErrorCodes.INVALID_GENERATOR_CONFIG,
          'Model name is required for model config generation',
          { name: modelName }
        );
      }

      if (!Array.isArray(fields)) {
        throw new BalmSharedMCPError(
          ErrorCodes.INVALID_GENERATOR_CONFIG,
          'Fields array is required for model config generation',
          { name: modelName, fieldsType: typeof fields }
        );
      }

      // Validate model name format (should be PascalCase)
      if (!/^[A-Z][a-zA-Z0-9]*$/.test(modelName)) {
        throw new BalmSharedMCPError(
          ErrorCodes.INVALID_GENERATOR_CONFIG,
          'Model name must be in PascalCase format',
          { name: modelName }
        );
      }

      // Validate fields array is not empty
      if (fields.length === 0) {
        throw new BalmSharedMCPError(
          ErrorCodes.INVALID_GENERATOR_CONFIG,
          'Fields array cannot be empty',
          { name: modelName, fieldsCount: fields.length }
        );
      }

      // Validate each field has required properties
      fields.forEach((field, index) => {
        if (!field.name || !field.type) {
          throw new BalmSharedMCPError(
            ErrorCodes.INVALID_GENERATOR_CONFIG,
            `Field at index ${index} is missing required properties (name, type)`,
            { field, index }
          );
        }
      });

      // Generate field configurations
      const configFields = fields.map(field => {
        const {
          name: fieldName,
          label,
          type,
          defaultValue = '',
          required: _required = false,
          ...fieldOptions
        } = field;

        // Map field type to component
        const component = this.mapFieldToComponent(type, fieldOptions);

        // Generate component props
        const attrOrProp = this.generateComponentProps(field);

        // Generate validation
        const validation = this.generateValidationConfig(field);

        const configField = {
          label: label || fieldName,
          component,
          key: fieldName,
          value: defaultValue
        };

        // Add props if any
        if (Object.keys(attrOrProp).length > 0) {
          configField.attrOrProp = attrOrProp;
        }

        // Add validation if any
        if (validation) {
          configField.validation = validation;
        }

        // Add conditional rendering if specified
        if (fieldOptions.if !== undefined) {
          configField.if = fieldOptions.if;
        }

        return configField;
      });

      // Build complete configuration
      const modelConfig = {
        fields: configFields,
        layout: formLayout,
        submitText,
        cancelText
      };

      // Add global validation rules if provided
      if (Object.keys(validationRules).length > 0) {
        modelConfig.validationRules = validationRules;
      }

      this.logger.info(`Generated model config with ${configFields.length} fields`);

      // If projectPath is provided, also generate the file
      let filePath;
      if (projectPath) {
        const result = await this.generateModelConfigFile({
          name: modelName,
          fields,
          projectPath,
          formLayout,
          submitText,
          cancelText,
          validationRules
        });
        ({ filePath } = result);
      }

      return {
        success: true,
        model: modelName,
        config: modelConfig,
        fieldsCount: configFields.length,
        filePath:
          filePath ||
          (projectPath
            ? `${projectPath}/src/model-config/${this.toKebabCase(modelName)}.js`
            : undefined)
      };
    } catch (error) {
      this.logger.error(`Failed to generate model config: ${modelName}`, { error: error.message });

      if (error instanceof BalmSharedMCPError) {
        throw error;
      }

      throw new BalmSharedMCPError(
        ErrorCodes.CODE_GENERATION_FAILED,
        `Failed to generate model config: ${error.message}`,
        { name: modelName, originalError: error.message }
      );
    }
  }

  /**
   * Generate model config file
   */
  async generateModelConfigFile(options) {
    const { name, model, projectPath, outputPath, ...configOptions } = options;
    const modelName = name || model;

    this.logger.info(`Generating model config file: ${modelName}`);

    try {
      // Generate the configuration (without projectPath to avoid recursion)
      const { config } = await this.generateModelConfig({
        name: modelName,
        ...configOptions,
        projectPath: undefined // Remove projectPath to avoid recursion
      });

      // Prepare template context
      const context = {
        name: modelName,
        config: JSON.stringify(config, null, 2),
        fields: config.fields,
        hasValidationRules: !!config.validationRules,
        validationRules: config.validationRules,
        formLayout: config.layout,
        submitText: config.submitText,
        cancelText: config.cancelText
      };
      void context; // Mark as intentionally unused, prepared for future template engine

      // Generate file content using template
      const template = `/**
 * {{pascalCase name}} Model Configuration
 * Generated by BalmSharedMCP
 */

export default () => [
{{#each fields}}
  {
    label: '{{label}}',
    component: '{{component}}',
    key: '{{key}}',
    value: {{#if value}}'{{value}}'{{else}}''{{/if}}{{#if attrOrProp}},
    attrOrProp: {{json attrOrProp}}{{/if}}{{#if validation}},
    validation: {{json validation}}{{/if}}{{#if if}},
    if: {{if}}{{/if}}
  }{{#unless @last}},{{/unless}}
{{/each}}
];
`;

      // Process template
      let content = template;

      // Simple template processing
      content = content.replace(/\{\{pascalCase name\}\}/g, this.toPascalCase(modelName));

      // Process fields iteration
      const fieldsContent = config.fields
        .map((field, index) => {
          let fieldStr = `  {\n    label: '${field.label}',\n    component: '${field.component}',\n    key: '${field.key}',\n    value: ${typeof field.value === 'string' ? `'${field.value}'` : field.value || "''"}`;

          if (field.attrOrProp) {
            fieldStr += `,\n    attrOrProp: ${JSON.stringify(field.attrOrProp, null, 6).replace(/\n/g, '\n    ')}`;
          }

          if (field.validation) {
            fieldStr += `,\n    validation: ${JSON.stringify(field.validation, null, 6).replace(/\n/g, '\n    ')}`;
          }

          if (field.if !== undefined) {
            fieldStr += `,\n    if: ${field.if}`;
          }

          fieldStr += '\n  }';

          if (index < config.fields.length - 1) {
            fieldStr += ',';
          }

          return fieldStr;
        })
        .join('\n');

      content = content.replace(/\{\{#each fields\}\}[\s\S]*?\{\{\/each\}\}/g, fieldsContent);

      // Determine output path
      const finalOutputPath =
        outputPath ||
        path.join(
          projectPath,
          'src/scripts/pages',
          this.toKebabCase(modelName),
          'model-config',
          `${this.toKebabCase(modelName)}.js`
        );

      // Ensure output directory exists
      const outputDir = path.dirname(finalOutputPath);

      // Check if directory exists, create if not
      if (this.fileSystemHandler.exists) {
        const dirExists = await this.fileSystemHandler.exists(outputDir);
        if (!dirExists && this.fileSystemHandler.createDirectory) {
          await this.fileSystemHandler.createDirectory(outputDir);
        }
      }

      if (this.fileSystemHandler.ensureDirectory) {
        await this.fileSystemHandler.ensureDirectory(outputDir);
      }

      // Write the file
      await this.fileSystemHandler.writeFile(finalOutputPath, content);

      this.logger.info(`Generated model config file: ${finalOutputPath}`);

      return {
        success: true,
        message: 'Model config file generated successfully',
        filePath: finalOutputPath,
        config,
        content
      };
    } catch (error) {
      this.logger.error(`Failed to generate model config file: ${modelName}`, {
        error: error.message
      });

      if (error instanceof BalmSharedMCPError) {
        throw error;
      }

      throw new BalmSharedMCPError(
        ErrorCodes.CODE_GENERATION_FAILED,
        `Failed to generate model config file: ${error.message}`,
        { name: modelName, projectPath, originalError: error.message }
      );
    }
  }

  /**
   * Convert string to PascalCase
   */
  toPascalCase(str) {
    return str
      .replace(/-([a-z])/g, g => g[1].toUpperCase())
      .replace(/^([a-z])/, g => g.toUpperCase());
  }

  /**
   * Convert string to kebab-case
   */
  toKebabCase(str) {
    return str
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');
  }

  /**
   * Convert string to camelCase
   */
  toCamelCase(str) {
    return str.replace(/-([a-z])/g, g => g[1].toUpperCase());
  }

  /**
   * Add custom component mapping
   */
  addComponentMapping(fieldType, component) {
    this.componentMapping[fieldType] = component;
    this.logger.debug(`Added component mapping: ${fieldType} -> ${component}`);
  }

  /**
   * Add custom validation rule
   */
  addValidationRule(ruleName, ruleConfig) {
    this.validationMapping[ruleName] = ruleConfig;
    this.logger.debug(`Added validation rule: ${ruleName}`);
  }

  /**
   * Get available component types
   */
  getAvailableComponents() {
    return Object.keys(this.componentMapping);
  }

  /**
   * Get available validation rules
   */
  getAvailableValidationRules() {
    return Object.keys(this.validationMapping);
  }

  /**
   * Get supported components (alias for getAvailableComponents)
   */
  getSupportedComponents() {
    return Object.values(this.componentMapping).filter(
      (value, index, self) => self.indexOf(value) === index
    );
  }

  /**
   * Get supported validations (alias for getAvailableValidationRules)
   */
  getSupportedValidations() {
    return this.getAvailableValidationRules();
  }

  /**
   * Get field type defaults
   */
  getFieldTypeDefaults(fieldType) {
    const component = this.mapFieldToComponent(fieldType);
    const defaults = {
      component,
      required: false
    };

    // Add type-specific defaults
    switch (fieldType) {
      case 'number':
      case 'integer':
      case 'float':
        defaults.attributes = { type: 'number' };
        break;
      case 'boolean':
        defaults.component = 'ui-switch';
        break;
      case 'date':
      case 'datetime':
        defaults.component = 'ui-datepicker';
        break;
      case 'textarea':
        defaults.component = 'ui-textarea';
        break;
      case 'select':
      case 'multiselect':
        defaults.component = 'ui-select';
        break;
      case 'file':
      case 'image':
        defaults.component = 'ui-file-upload';
        break;
      default:
        defaults.component = 'ui-textfield';
    }

    return defaults;
  }

  /**
   * Validate model options
   */
  validateModelOptions(options) {
    const { model, fields, projectPath } = options;

    if (!model) {
      throw new BalmSharedMCPError(ErrorCodes.INVALID_GENERATOR_CONFIG, 'Model name is required', {
        model
      });
    }

    // Validate model name format (should be PascalCase)
    if (!/^[A-Z][a-zA-Z0-9]*$/.test(model)) {
      throw new BalmSharedMCPError(
        ErrorCodes.INVALID_GENERATOR_CONFIG,
        'Model name must be in PascalCase format',
        { model }
      );
    }

    if (!Array.isArray(fields) || fields.length === 0) {
      throw new BalmSharedMCPError(
        ErrorCodes.INVALID_GENERATOR_CONFIG,
        'Fields array is required and cannot be empty',
        { fields }
      );
    }

    // Validate each field
    fields.forEach((field, index) => {
      if (!field.name || !field.type || !field.component) {
        throw new BalmSharedMCPError(
          ErrorCodes.INVALID_GENERATOR_CONFIG,
          `Field at index ${index} is missing required properties (name, type, component)`,
          { field, index }
        );
      }
    });

    if (!projectPath) {
      throw new BalmSharedMCPError(
        ErrorCodes.INVALID_GENERATOR_CONFIG,
        'Project path is required',
        { projectPath }
      );
    }
  }

  /**
   * Generate model template
   */
  _generateModelTemplate(options) {
    const { model, fields } = options;

    const fieldsConfig = fields.map(field => this._generateFieldConfig(field)).join(',\n');

    return `/**
 * ${model} Model Configuration
 * Generated by BalmSharedMCP
 */

export default () => [
${fieldsConfig}
];`;
  }

  /**
   * Generate field configuration
   */
  _generateFieldConfig(field) {
    const {
      name,
      type: _type,
      component,
      required = false,
      validation,
      attributes,
      options
    } = field;

    let config = `  {
    label: '${name}',
    component: '${component}',
    key: '${name}',
    required: ${required}`;

    if (validation) {
      config += `,
    validation: '${validation}'`;
    }

    if (attributes) {
      config += `,
    attributes: ${JSON.stringify(attributes)}`;
    }

    if (options) {
      config += `,
    options: ${JSON.stringify(options)}`;
    }

    config += '\n  }';

    return config;
  }

  /**
   * Get component configuration
   */
  _getComponentConfig(componentType) {
    const config = {
      component: componentType
    };

    // Add component-specific configuration
    switch (componentType) {
      case 'ui-select':
        config.options = [];
        break;
      case 'ui-datepicker':
        config.format = 'YYYY-MM-DD';
        break;
      case 'ui-file-upload':
        config.accept = '*';
        break;
    }

    return config;
  }

  /**
   * Get validation rules
   */
  _getValidationRules(validationType) {
    if (Array.isArray(validationType)) {
      return validationType.join(', ');
    }
    return validationType;
  }
}
