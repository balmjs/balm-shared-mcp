import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModelConfigManager } from '../model-config-manager.js';
import { BalmSharedMCPError } from '../../utils/errors.js';
import { 
  createMockLogger,
  createMockFileSystemHandler,
  createMockModelOptions,
  createMockModelField,
  mockSetups,
  mockAssertions
} from '../../../tests/utils/mock-utilities.js';

describe('ModelConfigManager', () => {
  let manager;
  let mockFileSystemHandler;
  let mockLogger;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = createMockLogger();
    mockFileSystemHandler = createMockFileSystemHandler();
    mockSetups.setupSuccessfulFileOperations(mockFileSystemHandler);
    
    manager = new ModelConfigManager(mockFileSystemHandler, mockLogger);
  });

  describe('generateModelConfig', () => {
    let validOptions;

    beforeEach(() => {
      validOptions = createMockModelOptions({
        model: 'User',
        fields: [
          createMockModelField({ name: 'id', type: 'number', required: false }),
          createMockModelField({ name: 'name', type: 'string', required: true }),
          createMockModelField({ name: 'email', type: 'string', required: true }),
          createMockModelField({ name: 'active', type: 'boolean', component: 'ui-switch', required: false })
        ]
      });
    });

    it('should generate model config successfully', async () => {
      const result = await manager.generateModelConfig(validOptions);

      expect(result.success).toBe(true);
      expect(result.model).toBe('User');
      expect(result.filePath).toContain('user.js');
      mockAssertions.assertFileWritten(mockFileSystemHandler, 'user.js');
    });

    it('should throw error for missing required parameters', async () => {
      const invalidOptions = { model: 'User' };

      await expect(manager.generateModelConfig(invalidOptions))
        .rejects.toThrow(BalmSharedMCPError);
      
      await expect(manager.generateModelConfig(invalidOptions))
        .rejects.toThrow('Fields array cannot be empty');
    });

    it('should throw error for non-array fields parameter', async () => {
      const invalidOptions = { 
        model: 'User',
        fields: 'not-an-array'
      };

      await expect(manager.generateModelConfig(invalidOptions))
        .rejects.toThrow(BalmSharedMCPError);
      
      await expect(manager.generateModelConfig(invalidOptions))
        .rejects.toThrow('Fields array is required for model config generation');
    });

    it('should validate model name format', async () => {
      const invalidOptions = {
        ...validOptions,
        model: 'invalid-model-name'
      };

      await expect(manager.generateModelConfig(invalidOptions))
        .rejects.toThrow(BalmSharedMCPError);
    });

    it('should validate fields array', async () => {
      const invalidOptions = {
        ...validOptions,
        fields: []
      };

      await expect(manager.generateModelConfig(invalidOptions))
        .rejects.toThrow(BalmSharedMCPError);
    });

    it('should validate field structure', async () => {
      const invalidOptions = {
        ...validOptions,
        fields: [
          { name: 'id' } // missing required properties (type)
        ]
      };

      await expect(manager.generateModelConfig(invalidOptions))
        .rejects.toThrow(BalmSharedMCPError);
      
      await expect(manager.generateModelConfig(invalidOptions))
        .rejects.toThrow('Field at index 0 is missing required properties (name, type)');
    });

    it('should create model-config directory if it does not exist', async () => {
      mockFileSystemHandler.exists.mockResolvedValue(false);

      await manager.generateModelConfig(validOptions);

      mockAssertions.assertDirectoryCreated(mockFileSystemHandler, 'model-config');
    });

    it('should handle validation rules', async () => {
      const optionsWithValidation = {
        ...validOptions,
        fields: [
          {
            name: 'email',
            type: 'string',
            component: 'ui-textfield',
            required: true,
            validation: 'email'
          }
        ]
      };

      const result = await manager.generateModelConfig(optionsWithValidation);

      expect(result.success).toBe(true);
    });
  });

  describe('validateModelOptions', () => {
    it('should validate correct options', () => {
      const validOptions = {
        model: 'User',
        fields: [
          { name: 'name', type: 'string', component: 'ui-textfield', required: true }
        ],
        projectPath: '/test/project'
      };

      expect(() => {
        manager.validateModelOptions(validOptions);
      }).not.toThrow();
    });

    it('should throw error for missing model', () => {
      const invalidOptions = {
        fields: [
          { name: 'name', type: 'string', component: 'ui-textfield', required: true }
        ],
        projectPath: '/test/project'
      };

      expect(() => {
        manager.validateModelOptions(invalidOptions);
      }).toThrow(BalmSharedMCPError);
    });

    it('should throw error for invalid model name', () => {
      const invalidOptions = {
        model: 'invalid-model',
        fields: [
          { name: 'name', type: 'string', component: 'ui-textfield', required: true }
        ],
        projectPath: '/test/project'
      };

      expect(() => {
        manager.validateModelOptions(invalidOptions);
      }).toThrow(BalmSharedMCPError);
    });

    it('should throw error for empty fields array', () => {
      const invalidOptions = {
        model: 'User',
        fields: [],
        projectPath: '/test/project'
      };

      expect(() => {
        manager.validateModelOptions(invalidOptions);
      }).toThrow(BalmSharedMCPError);
    });

    it('should throw error for invalid field structure', () => {
      const invalidOptions = {
        model: 'User',
        fields: [
          { name: 'invalid' } // missing required properties (type, component)
        ],
        projectPath: '/test/project'
      };

      expect(() => {
        manager.validateModelOptions(invalidOptions);
      }).toThrow(BalmSharedMCPError);
      
      expect(() => {
        manager.validateModelOptions(invalidOptions);
      }).toThrow('Field at index 0 is missing required properties (name, type, component)');
    });

    it('should throw error for missing project path', () => {
      const invalidOptions = {
        model: 'User',
        fields: [
          { name: 'name', type: 'string', component: 'ui-textfield', required: true }
        ]
        // missing projectPath
      };

      expect(() => {
        manager.validateModelOptions(invalidOptions);
      }).toThrow(BalmSharedMCPError);
      
      expect(() => {
        manager.validateModelOptions(invalidOptions);
      }).toThrow('Project path is required');
    });
  });

  describe('_generateModelTemplate', () => {
    it('should generate correct model template', () => {
      const options = {
        model: 'User',
        fields: [
          { name: 'id', type: 'number', component: 'ui-textfield', required: false },
          { name: 'name', type: 'string', component: 'ui-textfield', required: true }
        ]
      };

      const template = manager._generateModelTemplate(options);

      expect(template).toContain('User');
      expect(template).toContain('id');
      expect(template).toContain('name');
      expect(template).toContain('ui-textfield');
    });

    it('should include validation rules', () => {
      const options = {
        model: 'User',
        fields: [
          {
            name: 'email',
            type: 'string',
            component: 'ui-textfield',
            required: true,
            validation: 'email'
          }
        ]
      };

      const template = manager._generateModelTemplate(options);

      expect(template).toContain('email');
      expect(template).toContain('validation');
    });

    it('should handle different component types', () => {
      const options = {
        model: 'User',
        fields: [
          { name: 'name', type: 'string', component: 'ui-textfield', required: true },
          { name: 'active', type: 'boolean', component: 'ui-switch', required: false },
          { name: 'role', type: 'string', component: 'ui-select', required: true },
          { name: 'birthDate', type: 'date', component: 'ui-datepicker', required: false }
        ]
      };

      const template = manager._generateModelTemplate(options);

      expect(template).toContain('ui-textfield');
      expect(template).toContain('ui-switch');
      expect(template).toContain('ui-select');
      expect(template).toContain('ui-datepicker');
    });
  });

  describe('_generateFieldConfig', () => {
    it('should generate correct field config for textfield', () => {
      const field = {
        name: 'name',
        type: 'string',
        component: 'ui-textfield',
        required: true
      };

      const config = manager._generateFieldConfig(field);

      expect(config).toContain('name');
      expect(config).toContain('ui-textfield');
      expect(config).toContain('required: true');
    });

    it('should generate correct field config for select', () => {
      const field = {
        name: 'role',
        type: 'string',
        component: 'ui-select',
        required: true,
        options: ['admin', 'user', 'guest']
      };

      const config = manager._generateFieldConfig(field);

      expect(config).toContain('ui-select');
      expect(config).toContain('options');
      expect(config).toContain('admin');
    });

    it('should generate correct field config for switch', () => {
      const field = {
        name: 'active',
        type: 'boolean',
        component: 'ui-switch',
        required: false
      };

      const config = manager._generateFieldConfig(field);

      expect(config).toContain('ui-switch');
      expect(config).toContain('required: false');
    });

    it('should include validation rules', () => {
      const field = {
        name: 'email',
        type: 'string',
        component: 'ui-textfield',
        required: true,
        validation: 'email'
      };

      const config = manager._generateFieldConfig(field);

      expect(config).toContain('validation');
      expect(config).toContain('email');
    });

    it('should handle custom attributes', () => {
      const field = {
        name: 'password',
        type: 'string',
        component: 'ui-textfield',
        required: true,
        attributes: {
          type: 'password',
          minlength: 8
        }
      };

      const config = manager._generateFieldConfig(field);

      expect(config).toContain('attributes');
      expect(config).toContain('password');
      expect(config).toContain('minlength');
    });
  });

  describe('_getComponentConfig', () => {
    it('should return correct config for ui-textfield', () => {
      const config = manager._getComponentConfig('ui-textfield');

      expect(config).toHaveProperty('component');
      expect(config.component).toBe('ui-textfield');
    });

    it('should return correct config for ui-select', () => {
      const config = manager._getComponentConfig('ui-select');

      expect(config).toHaveProperty('component');
      expect(config.component).toBe('ui-select');
      expect(config).toHaveProperty('options');
    });

    it('should return correct config for ui-switch', () => {
      const config = manager._getComponentConfig('ui-switch');

      expect(config).toHaveProperty('component');
      expect(config.component).toBe('ui-switch');
    });

    it('should return correct config for ui-datepicker', () => {
      const config = manager._getComponentConfig('ui-datepicker');

      expect(config).toHaveProperty('component');
      expect(config.component).toBe('ui-datepicker');
    });

    it('should handle unknown components', () => {
      const config = manager._getComponentConfig('unknown-component');

      expect(config).toHaveProperty('component');
      expect(config.component).toBe('unknown-component');
    });
  });

  describe('_getValidationRules', () => {
    it('should return email validation rule', () => {
      const rules = manager._getValidationRules('email');

      expect(rules).toContain('email');
    });

    it('should return required validation rule', () => {
      const rules = manager._getValidationRules('required');

      expect(rules).toContain('required');
    });

    it('should return numeric validation rule', () => {
      const rules = manager._getValidationRules('numeric');

      expect(rules).toContain('numeric');
    });

    it('should handle multiple validation rules', () => {
      const rules = manager._getValidationRules(['required', 'email']);

      expect(rules).toContain('required');
      expect(rules).toContain('email');
    });

    it('should handle unknown validation rules', () => {
      const rules = manager._getValidationRules('unknown');

      expect(rules).toContain('unknown');
    });
  });

  describe('getSupportedComponents', () => {
    it('should return list of supported components', () => {
      const components = manager.getSupportedComponents();

      expect(components).toContain('ui-textfield');
      expect(components).toContain('ui-select');
      expect(components).toContain('ui-switch');
      expect(components).toContain('ui-datepicker');
      expect(components).toContain('ui-textarea');
      expect(components).toContain('ui-file-upload');
    });
  });

  describe('getSupportedValidations', () => {
    it('should return list of supported validations', () => {
      const validations = manager.getSupportedValidations();

      expect(validations).toContain('required');
      expect(validations).toContain('email');
      expect(validations).toContain('numeric');
      expect(validations).toContain('minLength');
      expect(validations).toContain('maxLength');
    });
  });

  describe('getFieldTypeDefaults', () => {
    it('should return defaults for string type', () => {
      const defaults = manager.getFieldTypeDefaults('string');

      expect(defaults.component).toBe('ui-textfield');
      expect(defaults.required).toBe(false);
    });

    it('should return defaults for number type', () => {
      const defaults = manager.getFieldTypeDefaults('number');

      expect(defaults.component).toBe('ui-textfield');
      expect(defaults.attributes.type).toBe('number');
    });

    it('should return defaults for boolean type', () => {
      const defaults = manager.getFieldTypeDefaults('boolean');

      expect(defaults.component).toBe('ui-switch');
    });

    it('should return defaults for date type', () => {
      const defaults = manager.getFieldTypeDefaults('date');

      expect(defaults.component).toBe('ui-datepicker');
    });

    it('should handle unknown types', () => {
      const defaults = manager.getFieldTypeDefaults('unknown');

      expect(defaults.component).toBe('ui-textfield');
    });
  });

  describe('error handling', () => {
    it('should handle file system errors gracefully', async () => {
      mockFileSystemHandler.writeFile.mockRejectedValue(new Error('Write failed'));

      const options = createMockModelOptions({
        fields: [createMockModelField({ name: 'name', required: true })]
      });

      await expect(manager.generateModelConfig(options))
        .rejects.toThrow(BalmSharedMCPError);

      mockAssertions.assertLoggerCalled(mockLogger, 'error', 'Failed to generate model config');
    });

    it('should log validation errors', async () => {
      const invalidOptions = { model: 'invalid-model' };

      await expect(manager.generateModelConfig(invalidOptions))
        .rejects.toThrow(BalmSharedMCPError);

      mockAssertions.assertLoggerCalled(mockLogger, 'error', 'Failed to generate model config');
    });
  });
});