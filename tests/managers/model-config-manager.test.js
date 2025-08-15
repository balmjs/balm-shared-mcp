/**
 * Model Config Manager Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModelConfigManager } from '../../src/managers/model-config-manager.js';

describe('ModelConfigManager', () => {
  let modelConfigManager;
  let mockFileSystemHandler;
  let mockConfig;

  beforeEach(() => {
    mockFileSystemHandler = {
      ensureDirectory: vi.fn(),
      writeFile: vi.fn(),
      exists: vi.fn().mockResolvedValue(true)
    };

    mockConfig = {
      templatesPath: '/test/templates'
    };

    modelConfigManager = new ModelConfigManager(mockFileSystemHandler, mockConfig);
  });

  describe('mapFieldToComponent', () => {
    it('should map string type to ui-textfield', () => {
      const component = modelConfigManager.mapFieldToComponent('string');
      expect(component).toBe('ui-textfield');
    });

    it('should map select type to ui-select', () => {
      const component = modelConfigManager.mapFieldToComponent('select');
      expect(component).toBe('ui-select');
    });

    it('should map date type to ui-datepicker', () => {
      const component = modelConfigManager.mapFieldToComponent('date');
      expect(component).toBe('ui-datepicker');
    });

    it('should default to ui-textfield for unknown types', () => {
      const component = modelConfigManager.mapFieldToComponent('unknown');
      expect(component).toBe('ui-textfield');
    });
  });

  describe('generateComponentProps', () => {
    it('should generate basic props for textfield', () => {
      const field = {
        type: 'string',
        options: {
          placeholder: 'Enter text',
          maxlength: 100
        }
      };

      const props = modelConfigManager.generateComponentProps(field);
      expect(props).toEqual({
        placeholder: 'Enter text',
        maxlength: 100
      });
    });

    it('should generate props for select field', () => {
      const field = {
        type: 'select',
        options: {
          options: [{ value: '1', text: 'Option 1' }],
          multiple: true,
          defaultLabel: 'Please select'
        }
      };

      const props = modelConfigManager.generateComponentProps(field);
      expect(props).toEqual({
        options: [{ value: '1', text: 'Option 1' }],
        multiple: true,
        defaultLabel: 'Please select'
      });
    });

    it('should generate props for number field with validation', () => {
      const field = {
        type: 'number',
        validation: {
          min: 0,
          max: 100
        },
        options: {
          step: 1
        }
      };

      const props = modelConfigManager.generateComponentProps(field);
      expect(props).toEqual({
        type: 'number',
        min: 0,
        max: 100,
        step: 1
      });
    });
  });

  describe('generateValidationConfig', () => {
    it('should generate required validation', () => {
      const field = { required: true };
      const validation = modelConfigManager.generateValidationConfig(field);
      expect(validation).toEqual([{ required: true }]);
    });

    it('should generate email validation', () => {
      const field = {
        validation: { email: true }
      };
      const validation = modelConfigManager.generateValidationConfig(field);
      expect(validation).toEqual([{
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: '请输入有效的邮箱地址'
      }]);
    });

    it('should generate multiple validation rules', () => {
      const field = {
        required: true,
        validation: {
          minLength: 5,
          maxLength: 20
        }
      };
      const validation = modelConfigManager.generateValidationConfig(field);
      expect(validation).toHaveLength(3);
      expect(validation[0]).toEqual({ required: true });
    });
  });

  describe('generateModelConfig', () => {
    it('should generate basic model config', async () => {
      const options = {
        name: 'User',
        fields: [
          {
            name: 'username',
            label: '用户名',
            type: 'string',
            required: true
          },
          {
            name: 'email',
            label: '邮箱',
            type: 'email',
            required: true
          }
        ]
      };

      const result = await modelConfigManager.generateModelConfig(options);
      
      expect(result.success).toBe(true);
      expect(result.config.fields).toHaveLength(2);
      expect(result.config.fields[0]).toEqual({
        label: '用户名',
        component: 'ui-textfield',
        key: 'username',
        value: '',
        validation: [{ required: true }]
      });
    });

    it('should handle complex field configurations', async () => {
      const options = {
        name: 'Product',
        fields: [
          {
            name: 'category',
            label: '分类',
            type: 'select',
            required: true,
            options: {
              options: [
                { value: '1', text: '电子产品' },
                { value: '2', text: '服装' }
              ],
              defaultLabel: '请选择分类'
            }
          },
          {
            name: 'price',
            label: '价格',
            type: 'number',
            validation: {
              min: 0,
              max: 10000
            },
            options: {
              step: 0.01
            }
          }
        ],
        formLayout: 'horizontal',
        submitText: '保存产品',
        cancelText: '取消'
      };

      const result = await modelConfigManager.generateModelConfig(options);
      
      expect(result.success).toBe(true);
      expect(result.config.layout).toBe('horizontal');
      expect(result.config.submitText).toBe('保存产品');
      expect(result.config.fields[0].component).toBe('ui-select');
      expect(result.config.fields[0].attrOrProp).toEqual({
        options: [
          { value: '1', text: '电子产品' },
          { value: '2', text: '服装' }
        ],
        defaultLabel: '请选择分类'
      });
    });
  });

  describe('generateModelConfigFile', () => {
    it('should generate model config file', async () => {
      const options = {
        name: 'User',
        projectPath: '/test/project',
        fields: [
          {
            name: 'username',
            label: '用户名',
            type: 'string',
            required: true
          }
        ]
      };

      const result = await modelConfigManager.generateModelConfigFile(options);
      
      expect(result.success).toBe(true);
      expect(result.filePath).toContain('user.js');
      expect(mockFileSystemHandler.ensureDirectory).toHaveBeenCalled();
      expect(mockFileSystemHandler.writeFile).toHaveBeenCalled();
      
      const writeCall = mockFileSystemHandler.writeFile.mock.calls[0];
      expect(writeCall[1]).toContain('export default () => [');
      expect(writeCall[1]).toContain("label: '用户名'");
      expect(writeCall[1]).toContain("component: 'ui-textfield'");
    });
  });

  describe('utility methods', () => {
    it('should convert to PascalCase', () => {
      expect(modelConfigManager.toPascalCase('user-profile')).toBe('UserProfile');
      expect(modelConfigManager.toPascalCase('user')).toBe('User');
    });

    it('should convert to kebab-case', () => {
      expect(modelConfigManager.toKebabCase('UserProfile')).toBe('user-profile');
      expect(modelConfigManager.toKebabCase('User')).toBe('user');
    });

    it('should convert to camelCase', () => {
      expect(modelConfigManager.toCamelCase('user-profile')).toBe('userProfile');
      expect(modelConfigManager.toCamelCase('user')).toBe('user');
    });
  });

  describe('customization', () => {
    it('should allow adding custom component mapping', () => {
      modelConfigManager.addComponentMapping('custom-field', 'ui-custom');
      const component = modelConfigManager.mapFieldToComponent('custom-field');
      expect(component).toBe('ui-custom');
    });

    it('should allow adding custom validation rule', () => {
      const customRule = { pattern: /^test/, message: 'Must start with test' };
      modelConfigManager.addValidationRule('custom', customRule);
      
      const field = { validation: { custom: true } };
      const validation = modelConfigManager.generateValidationConfig(field);
      expect(validation).toContain(customRule);
    });

    it('should get available components', () => {
      const components = modelConfigManager.getAvailableComponents();
      expect(components).toContain('string');
      expect(components).toContain('select');
      expect(components).toContain('date');
    });

    it('should get available validation rules', () => {
      const rules = modelConfigManager.getAvailableValidationRules();
      expect(rules).toContain('required');
      expect(rules).toContain('email');
      expect(rules).toContain('phone');
    });
  });
});