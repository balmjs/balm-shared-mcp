/**
 * Code Generator Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CodeGenerator } from '../../src/generators/code-generator.js';
import { BalmSharedMCPError, ErrorCodes } from '../../src/utils/errors.js';

describe('CodeGenerator', () => {
  let codeGenerator;
  let mockFileSystemHandler;
  let mockConfig;

  beforeEach(() => {
    mockFileSystemHandler = {
      ensureDirectory: vi.fn().mockResolvedValue(true),
      writeFile: vi.fn().mockResolvedValue(true),
      readFile: vi.fn().mockResolvedValue('mock content'),
      exists: vi.fn().mockResolvedValue(true)
    };

    mockConfig = {
      templatesPath: './templates',
      sharedProjectPath: './yiban-shared'
    };

    codeGenerator = new CodeGenerator(mockFileSystemHandler, mockConfig);
  });

  describe('Template Engine', () => {
    it('should initialize with built-in templates', () => {
      expect(codeGenerator.templates.size).toBeGreaterThan(0);
      expect(codeGenerator.templates.has('vue-list-page')).toBe(true);
      expect(codeGenerator.templates.has('vue-detail-page')).toBe(true);
      expect(codeGenerator.templates.has('api-config')).toBe(true);
    });

    it('should initialize with template helpers', () => {
      expect(codeGenerator.templateHelpers.size).toBeGreaterThan(0);
      expect(codeGenerator.templateHelpers.has('camelCase')).toBe(true);
      expect(codeGenerator.templateHelpers.has('pascalCase')).toBe(true);
      expect(codeGenerator.templateHelpers.has('kebabCase')).toBe(true);
    });

    it('should register custom templates', () => {
      const customTemplate = {
        extension: '.js',
        template: 'console.log("{{message}}");'
      };

      codeGenerator.registerTemplate('custom-test', customTemplate);
      expect(codeGenerator.templates.has('custom-test')).toBe(true);
    });

    it('should register custom helpers', () => {
      const customHelper = (str) => str.toUpperCase();
      codeGenerator.registerHelper('upperCase', customHelper);
      
      expect(codeGenerator.templateHelpers.has('upperCase')).toBe(true);
      expect(codeGenerator.templateHelpers.get('upperCase')('test')).toBe('TEST');
    });
  });

  describe('Template Rendering', () => {
    it('should render simple variable substitution', () => {
      codeGenerator.registerTemplate('simple-test', {
        extension: '.txt',
        template: 'Hello {{name}}!'
      });

      const result = codeGenerator.renderTemplate('simple-test', { name: 'World' });
      expect(result.content).toBe('Hello World!');
      expect(result.extension).toBe('.txt');
    });

    it('should handle helper functions', () => {
      codeGenerator.registerTemplate('helper-test', {
        extension: '.txt',
        template: 'Class name: {{pascalCase name}}'
      });

      const result = codeGenerator.renderTemplate('helper-test', { name: 'user-profile' });
      expect(result.content).toBe('Class name: UserProfile');
    });

    it('should process conditional blocks', () => {
      codeGenerator.registerTemplate('conditional-test', {
        extension: '.txt',
        template: '{{#if showMessage}}Message: {{message}}{{/if}}'
      });

      const resultTrue = codeGenerator.renderTemplate('conditional-test', { 
        showMessage: true, 
        message: 'Hello' 
      });
      expect(resultTrue.content).toBe('Message: Hello');

      const resultFalse = codeGenerator.renderTemplate('conditional-test', { 
        showMessage: false, 
        message: 'Hello' 
      });
      expect(resultFalse.content).toBe('');
    });

    it('should process iteration blocks', () => {
      codeGenerator.registerTemplate('iteration-test', {
        extension: '.txt',
        template: '{{#each items}}Item {{@index}}: {{name}}\n{{/each}}'
      });

      const result = codeGenerator.renderTemplate('iteration-test', {
        items: [
          { name: 'First' },
          { name: 'Second' }
        ]
      });
      expect(result.content).toBe('Item 0: First\nItem 1: Second\n');
    });

    it('should throw error for non-existent template', () => {
      expect(() => {
        codeGenerator.renderTemplate('non-existent');
      }).toThrow(BalmSharedMCPError);
    });
  });

  describe('String Helpers', () => {
    it('should convert to camelCase', () => {
      const helper = codeGenerator.templateHelpers.get('camelCase');
      expect(helper('user-profile')).toBe('userProfile');
      expect(helper('my-component-name')).toBe('myComponentName');
    });

    it('should convert to PascalCase', () => {
      const helper = codeGenerator.templateHelpers.get('pascalCase');
      expect(helper('user-profile')).toBe('UserProfile');
      expect(helper('my-component-name')).toBe('MyComponentName');
    });

    it('should convert to kebab-case', () => {
      const helper = codeGenerator.templateHelpers.get('kebabCase');
      expect(helper('UserProfile')).toBe('user-profile');
      expect(helper('MyComponentName')).toBe('my-component-name');
    });

    it('should convert to snake_case', () => {
      const helper = codeGenerator.templateHelpers.get('snakeCase');
      expect(helper('UserProfile')).toBe('user_profile');
      expect(helper('MyComponentName')).toBe('my_component_name');
    });
  });

  describe('Mock Value Generation', () => {
    it('should generate appropriate mock values', () => {
      const helper = codeGenerator.templateHelpers.get('mockValue');
      
      expect(helper('string', 0)).toBe("'示例文本1'");
      expect(typeof helper('number', 0)).toBe('number');
      expect(typeof helper('boolean', 0)).toBe('boolean');
      expect(helper('email', 0)).toBe("'user1@example.com'");
    });
  });

  describe('Code Generation', () => {
    it('should generate file from template', async () => {
      codeGenerator.registerTemplate('file-test', {
        extension: '.js',
        template: 'export const {{name}} = "{{value}}";'
      });

      const result = await codeGenerator.generateFromTemplate(
        'file-test',
        { name: 'TEST_CONSTANT', value: 'test value' },
        '/test/output.js'
      );

      expect(mockFileSystemHandler.ensureDirectory).toHaveBeenCalledWith('/test');
      expect(mockFileSystemHandler.writeFile).toHaveBeenCalledWith(
        '/test/output.js',
        'export const TEST_CONSTANT = "test value";'
      );
      expect(result.path).toBe('/test/output.js');
      expect(result.template).toBe('file-test');
    });
  });

  describe('Context Validation', () => {
    it('should validate required fields for templates', () => {
      expect(() => {
        codeGenerator.validateContext('vue-list-page', { name: 'test' });
      }).toThrow(BalmSharedMCPError);

      expect(() => {
        codeGenerator.validateContext('vue-list-page', {
          name: 'test',
          model: 'testModel',
          fields: []
        });
      }).not.toThrow();
    });
  });

  describe('Code Formatting', () => {
    it('should format JavaScript code', () => {
      const unformatted = `function test(){
      
      
      return "hello";
      }`;
      
      const formatted = codeGenerator.formatCode(unformatted, 'javascript');
      expect(formatted).not.toContain('\n\n\n');
    });

    it('should format JSON code', () => {
      const unformatted = '{"name":"test","value":123}';
      const formatted = codeGenerator.formatCode(unformatted, 'json');
      expect(formatted).toContain('\n');
      expect(formatted).toContain('  ');
    });
  });

  describe('Page Component Generation', () => {
    beforeEach(() => {
      mockFileSystemHandler.exists.mockResolvedValue(true);
    });

    it('should generate list page component', async () => {
      const options = {
        name: 'user-list',
        type: 'list',
        model: 'user',
        projectPath: '/test/project',
        fields: [
          { name: 'id', label: 'ID' },
          { name: 'name', label: '姓名' }
        ]
      };

      const result = await codeGenerator.generatePageComponent(options);

      expect(result.success).toBe(true);
      expect(result.componentPath).toContain('user-list-list.vue');
      expect(result.template).toBe('vue-list-page');
      expect(mockFileSystemHandler.ensureDirectory).toHaveBeenCalled();
      expect(mockFileSystemHandler.writeFile).toHaveBeenCalled();
    });

    it('should generate detail page component', async () => {
      const options = {
        name: 'user-detail',
        type: 'detail',
        model: 'user',
        projectPath: '/test/project',
        fields: [
          { name: 'id', label: 'ID' },
          { name: 'name', label: '姓名' }
        ]
      };

      const result = await codeGenerator.generatePageComponent(options);

      expect(result.success).toBe(true);
      expect(result.componentPath).toContain('user-detail-detail.vue');
      expect(result.template).toBe('vue-detail-page');
    });

    it('should throw error for invalid component type', async () => {
      const options = {
        name: 'user-test',
        type: 'invalid',
        model: 'user',
        projectPath: '/test/project'
      };

      await expect(codeGenerator.generatePageComponent(options)).rejects.toThrow(BalmSharedMCPError);
    });

    it('should throw error for missing required parameters', async () => {
      const options = {
        name: 'user-test',
        type: 'list'
        // missing model and projectPath
      };

      await expect(codeGenerator.generatePageComponent(options)).rejects.toThrow(BalmSharedMCPError);
    });

    it('should throw error for non-existent project path', async () => {
      mockFileSystemHandler.exists.mockResolvedValue(false);

      const options = {
        name: 'user-test',
        type: 'list',
        model: 'user',
        projectPath: '/non/existent/project'
      };

      await expect(codeGenerator.generatePageComponent(options)).rejects.toThrow(BalmSharedMCPError);
    });
  });

  describe('Page Module Generation', () => {
    beforeEach(() => {
      mockFileSystemHandler.exists.mockResolvedValue(true);
    });

    it('should generate complete page module', async () => {
      const options = {
        name: 'user-management',
        model: 'user',
        projectPath: '/test/project',
        fields: [
          { name: 'id', label: 'ID' },
          { name: 'name', label: '姓名' }
        ]
      };

      const result = await codeGenerator.generatePageModule(options);

      expect(result.success).toBe(true);
      expect(result.components).toHaveLength(2);
      expect(result.indexFile).toContain('index.js');
      expect(result.generatedFiles).toHaveLength(3); // list, detail, index
    });
  });

  describe('Module Index Generation', () => {
    it('should generate module index content', () => {
      const content = codeGenerator.generateModuleIndex('user-management', ['list', 'detail']);
      
      expect(content).toContain('import UserManagementList');
      expect(content).toContain('import UserManagementDetail');
      expect(content).toContain('export {');
      expect(content).toContain('UserManagementList');
      expect(content).toContain('UserManagementDetail');
    });
  });

  describe('Route Configuration Generation', () => {
    beforeEach(() => {
      mockFileSystemHandler.exists.mockResolvedValue(true);
    });

    it('should generate route configuration', async () => {
      const options = {
        name: 'user-management',
        title: '用户管理',
        projectPath: '/test/project',
        requiresAuth: true,
        permissions: ['user:read', 'user:write']
      };

      const result = await codeGenerator.generateRouteConfig(options);

      expect(result.success).toBe(true);
      expect(result.routeFilePath).toContain('user-management.js');
      expect(result.template).toBe('route-config');
      expect(mockFileSystemHandler.writeFile).toHaveBeenCalled();
    });

    it('should generate route with permissions', async () => {
      const options = {
        name: 'admin-panel',
        title: '管理面板',
        projectPath: '/test/project',
        permissions: ['admin:read'],
        roles: ['admin']
      };

      const result = await codeGenerator.generateRouteWithPermissions(options);

      expect(result.success).toBe(true);
      expect(result.routeFilePath).toContain('admin-panel.js');
    });

    it('should throw error for missing required parameters', async () => {
      const options = {
        title: '测试页面'
        // missing name and projectPath
      };

      await expect(codeGenerator.generateRouteConfig(options)).rejects.toThrow(BalmSharedMCPError);
    });

    it('should throw error for non-existent project path', async () => {
      mockFileSystemHandler.exists.mockResolvedValue(false);

      const options = {
        name: 'test-route',
        projectPath: '/non/existent/project'
      };

      await expect(codeGenerator.generateRouteConfig(options)).rejects.toThrow(BalmSharedMCPError);
    });
  });

  describe('Navigation Configuration Generation', () => {
    beforeEach(() => {
      mockFileSystemHandler.exists.mockResolvedValue(true);
    });

    it('should generate navigation configuration', async () => {
      const options = {
        name: 'user-management',
        title: '用户管理',
        icon: 'user',
        projectPath: '/test/project'
      };

      const result = await codeGenerator.generateNavigationConfig(options);

      expect(result.success).toBe(true);
      expect(result.navFilePath).toContain('user-management.js');
      expect(result.template).toBe('nav-config');
    });
  });

  describe('Routing Module Generation', () => {
    beforeEach(() => {
      mockFileSystemHandler.exists.mockResolvedValue(true);
    });

    it('should generate complete routing module', async () => {
      const options = {
        name: 'user-management',
        title: '用户管理',
        projectPath: '/test/project',
        navigation: true
      };

      const result = await codeGenerator.generateRoutingModule(options);

      expect(result.success).toBe(true);
      expect(result.components).toHaveLength(2); // route + navigation
      expect(result.generatedFiles).toHaveLength(2);
    });

    it('should generate routing module without navigation', async () => {
      const options = {
        name: 'simple-page',
        projectPath: '/test/project',
        navigation: false
      };

      const result = await codeGenerator.generateRoutingModule(options);

      expect(result.success).toBe(true);
      expect(result.components).toHaveLength(1); // route only
    });
  });

  describe('Routes Index Management', () => {
    it('should create main routes index', async () => {
      // Mock file doesn't exist so it creates a new one
      mockFileSystemHandler.exists.mockResolvedValueOnce(false);
      
      const indexPath = '/test/routes/index.js';
      
      await codeGenerator.createMainRoutesIndex(indexPath, 'user-management', 'userManagement');

      expect(mockFileSystemHandler.writeFile).toHaveBeenCalledWith(
        indexPath,
        expect.stringContaining('userManagementRoutes')
      );
    });
  });

  describe('Built-in Templates', () => {
    it('should render Vue list page template', () => {
      const context = {
        name: 'user-list',
        model: 'user',
        fields: [
          { name: 'id', label: 'ID', sortable: true },
          { name: 'name', label: '姓名' },
          { name: 'email', label: '邮箱' }
        ]
      };

      const result = codeGenerator.renderTemplate('vue-list-page', context);
      expect(result.content).toContain('ui-list-view');
      expect(result.content).toContain('UserList');
      expect(result.content).toContain("field: 'id'");
      expect(result.extension).toBe('.vue');
    });

    it('should render API config template', () => {
      const context = {
        name: 'user-api',
        model: 'user',
        endpoint: '/api/users'
      };

      const result = codeGenerator.renderTemplate('api-config', context);
      expect(result.content).toContain('userApi');
      expect(result.content).toContain("'/api/users'");
      expect(result.extension).toBe('.js');
    });
  });
});