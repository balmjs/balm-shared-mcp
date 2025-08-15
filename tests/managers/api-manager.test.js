/**
 * API Manager Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiManager } from '../../src/managers/api-manager.js';
import { BalmSharedMCPError, ErrorCodes } from '../../src/utils/errors.js';

describe('ApiManager', () => {
  let apiManager;
  let mockFileSystemHandler;
  let mockCodeGenerator;
  let mockConfig;

  beforeEach(() => {
    mockFileSystemHandler = {
      exists: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
      readDirectory: vi.fn(),
      isDirectory: vi.fn(),
      ensureDirectory: vi.fn()
    };

    mockCodeGenerator = {
      generateApiConfig: vi.fn(),
      generateMockData: vi.fn(),
      templateHelpers: new Map([
        ['kebabCase', (str) => str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')],
        ['camelCase', (str) => str.replace(/-([a-z])/g, (g) => g[1].toUpperCase())],
        ['pascalCase', (str) => {
          const camelCase = str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
          return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
        }]
      ])
    };

    mockConfig = {
      defaultApiCategory: 'content'
    };

    apiManager = new ApiManager(mockFileSystemHandler, mockCodeGenerator, mockConfig);
  });

  describe('generateApiModule', () => {
    it('should generate API configuration and mock data', async () => {
      const options = {
        name: 'user',
        model: 'user',
        endpoint: '/user',
        projectPath: '/test/project',
        fields: [
          { name: 'name', type: 'string', label: '姓名' },
          { name: 'email', type: 'email', label: '邮箱' }
        ],
        title: '用户'
      };

      mockCodeGenerator.generateApiConfig.mockResolvedValue({
        success: true,
        message: 'API config generated',
        generatedFiles: [{ path: '/test/api.js', type: 'api-config' }]
      });

      mockCodeGenerator.generateMockData.mockResolvedValue({
        success: true,
        message: 'Mock data generated',
        generatedFiles: [{ path: '/test/mock.js', type: 'mock-data' }]
      });

      const result = await apiManager.generateApiModule(options);

      expect(result.success).toBe(true);
      expect(result.name).toBe('user');
      expect(result.model).toBe('user');
      expect(result.endpoint).toBe('/user');
      expect(result.components).toHaveLength(2);
      expect(result.generatedFiles).toHaveLength(2);

      expect(mockCodeGenerator.generateApiConfig).toHaveBeenCalledWith({
        name: 'user',
        model: 'user',
        endpoint: '/user',
        projectPath: '/test/project',
        operations: ['create', 'read', 'update', 'delete'],
        customActions: {},
        category: 'content',
        fields: options.fields,
        title: '用户'
      });

      expect(mockCodeGenerator.generateMockData).toHaveBeenCalledWith({
        name: 'user',
        endpoint: '/user',
        fields: options.fields,
        title: '用户',
        projectPath: '/test/project',
        category: 'content'
      });
    });

    it('should skip mock data generation when generateMock is false', async () => {
      const options = {
        name: 'user',
        model: 'user',
        endpoint: '/user',
        projectPath: '/test/project',
        generateMock: false
      };

      mockCodeGenerator.generateApiConfig.mockResolvedValue({
        success: true,
        message: 'API config generated',
        generatedFiles: [{ path: '/test/api.js', type: 'api-config' }]
      });

      const result = await apiManager.generateApiModule(options);

      expect(result.success).toBe(true);
      expect(result.components).toHaveLength(1);
      expect(mockCodeGenerator.generateApiConfig).toHaveBeenCalled();
      expect(mockCodeGenerator.generateMockData).not.toHaveBeenCalled();
    });

    it('should throw error for missing required parameters', async () => {
      const options = {
        name: 'user'
        // missing model, endpoint, projectPath
      };

      await expect(apiManager.generateApiModule(options))
        .rejects.toThrow(BalmSharedMCPError);
    });
  });

  describe('generateCrudApi', () => {
    it('should generate CRUD API with standard operations', async () => {
      const options = {
        name: 'product',
        model: 'product',
        endpoint: '/product',
        projectPath: '/test/project'
      };

      mockCodeGenerator.generateApiConfig.mockResolvedValue({
        success: true,
        message: 'CRUD API generated'
      });

      const result = await apiManager.generateCrudApi(options);

      expect(result.success).toBe(true);
      expect(mockCodeGenerator.generateApiConfig).toHaveBeenCalledWith({
        name: 'product',
        model: 'product',
        endpoint: '/product',
        projectPath: '/test/project',
        operations: ['create', 'read', 'update', 'delete'],
        customActions: {
          create: 'add',
          read: {
            list: 'index',
            detail: 'info'
          },
          update: 'edit',
          delete: 'delete'
        },
        category: 'content'
      });
    });

    it('should merge custom actions with standard actions', async () => {
      const options = {
        name: 'product',
        model: 'product',
        endpoint: '/product',
        projectPath: '/test/project',
        customActions: {
          read: {
            list: 'list',
            detail: 'show'
          },
          custom: 'customAction'
        }
      };

      mockCodeGenerator.generateApiConfig.mockResolvedValue({
        success: true,
        message: 'CRUD API generated'
      });

      await apiManager.generateCrudApi(options);

      expect(mockCodeGenerator.generateApiConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          customActions: {
            create: 'add',
            read: {
              list: 'list',
              detail: 'show'
            },
            update: 'edit',
            delete: 'delete',
            custom: 'customAction'
          }
        })
      );
    });
  });

  describe('generateCustomApi', () => {
    it('should generate API with custom operations', async () => {
      const options = {
        name: 'auth',
        model: 'user',
        endpoint: '/auth',
        projectPath: '/test/project',
        operations: ['read', 'update'],
        customActions: {
          read: { profile: 'me' },
          update: { login: 'login', logout: 'logout' }
        }
      };

      mockCodeGenerator.generateApiConfig.mockResolvedValue({
        success: true,
        message: 'Custom API generated'
      });

      const result = await apiManager.generateCustomApi(options);

      expect(result.success).toBe(true);
      expect(mockCodeGenerator.generateApiConfig).toHaveBeenCalledWith({
        name: 'auth',
        model: 'user',
        endpoint: '/auth',
        projectPath: '/test/project',
        operations: ['read', 'update'],
        customActions: {
          read: { profile: 'me' },
          update: { login: 'login', logout: 'logout' }
        },
        category: 'content'
      });
    });
  });

  describe('updateApiConfig', () => {
    it('should update existing API configuration', async () => {
      const options = {
        name: 'user',
        projectPath: '/test/project',
        updates: {
          operations: ['read', 'update']
        }
      };

      const existingContent = `export default [
  [
    'user',
    '/user',
    ['create', 'read', 'update', 'delete']
  ]
];`;

      mockFileSystemHandler.exists.mockResolvedValue(true);
      mockFileSystemHandler.readFile.mockResolvedValue(existingContent);
      mockFileSystemHandler.writeFile.mockResolvedValue();

      const result = await apiManager.updateApiConfig(options);

      expect(result.success).toBe(true);
      expect(mockFileSystemHandler.exists).toHaveBeenCalledWith('/test/project/src/scripts/apis/content/user.js');
      expect(mockFileSystemHandler.readFile).toHaveBeenCalledWith('/test/project/src/scripts/apis/content/user.js');
      expect(mockFileSystemHandler.writeFile).toHaveBeenCalled();
    });

    it('should throw error if API configuration file not found', async () => {
      const options = {
        name: 'nonexistent',
        projectPath: '/test/project',
        updates: {}
      };

      mockFileSystemHandler.exists.mockResolvedValue(false);

      await expect(apiManager.updateApiConfig(options))
        .rejects.toThrow(BalmSharedMCPError);
    });
  });

  describe('listApiConfigurations', () => {
    it('should list all API configurations in project', async () => {
      mockFileSystemHandler.exists.mockResolvedValue(true);
      mockFileSystemHandler.readDirectory
        .mockResolvedValueOnce(['common', 'content']) // categories
        .mockResolvedValueOnce(['auth.js', 'index.js']) // common files
        .mockResolvedValueOnce(['user.js', 'product.js', 'index.js']); // content files

      mockFileSystemHandler.isDirectory.mockResolvedValue(true);

      const authContent = `export default [
  [
    'user',
    '/auth',
    ['read', 'update'],
    {
      crud: {
        read: { profile: 'me' },
        update: { login: 'login', logout: 'logout' }
      }
    }
  ]
];`;

      const userContent = `export default [
  [
    'user',
    '/user',
    ['create', 'read', 'update', 'delete']
  ]
];`;

      const productContent = `export default [
  [
    'product',
    '/product',
    ['create', 'read', 'update', 'delete']
  ]
];`;

      mockFileSystemHandler.readFile
        .mockResolvedValueOnce(authContent)
        .mockResolvedValueOnce(userContent)
        .mockResolvedValueOnce(productContent);

      const result = await apiManager.listApiConfigurations('/test/project');

      expect(result.success).toBe(true);
      expect(result.apis).toHaveLength(3);
      
      const authApi = result.apis.find(api => api.name === 'auth');
      expect(authApi).toEqual({
        name: 'auth',
        model: 'user',
        endpoint: '/auth',
        operations: ['read', 'update', 'me', 'login', 'logout'],
        category: 'common',
        hasCustomActions: true,
        filePath: 'src/scripts/apis/common/auth.js'
      });

      const userApi = result.apis.find(api => api.name === 'user');
      expect(userApi).toEqual({
        name: 'user',
        model: 'user',
        endpoint: '/user',
        operations: ['create', 'read', 'update', 'delete'],
        category: 'content',
        hasCustomActions: false,
        filePath: 'src/scripts/apis/content/user.js'
      });
    });

    it('should return empty list if APIs directory does not exist', async () => {
      mockFileSystemHandler.exists.mockResolvedValue(false);

      const result = await apiManager.listApiConfigurations('/test/project');

      expect(result.success).toBe(true);
      expect(result.apis).toHaveLength(0);
      expect(result.message).toBe('No APIs directory found');
    });
  });

  describe('parseApiConfiguration', () => {
    it('should parse simple API configuration', () => {
      const content = `export default [
  [
    'user',
    '/user',
    ['create', 'read', 'update', 'delete']
  ]
];`;

      const result = apiManager.parseApiConfiguration(content, 'user', 'content');

      expect(result).toEqual({
        name: 'user',
        model: 'user',
        endpoint: '/user',
        operations: ['create', 'read', 'update', 'delete'],
        category: 'content',
        hasCustomActions: false,
        filePath: 'src/scripts/apis/content/user.js'
      });
    });

    it('should parse API configuration with custom actions', () => {
      const content = `export default [
  [
    'user',
    '/auth',
    ['read', 'update'],
    {
      crud: {
        read: { profile: 'me' },
        update: { login: 'login', logout: 'logout' }
      }
    }
  ]
];`;

      const result = apiManager.parseApiConfiguration(content, 'auth', 'common');

      expect(result).toEqual({
        name: 'auth',
        model: 'user',
        endpoint: '/auth',
        operations: ['read', 'update', 'me', 'login', 'logout'],
        category: 'common',
        hasCustomActions: true,
        filePath: 'src/scripts/apis/common/auth.js'
      });
    });

    it('should handle parse errors gracefully', () => {
      const content = 'invalid javascript content';

      const result = apiManager.parseApiConfiguration(content, 'invalid', 'content');

      expect(result.name).toBe('invalid');
      expect(result.model).toBe('unknown');
      expect(result.endpoint).toBe('unknown');
      expect(result.operations).toEqual([]);
      expect(result.parseError).toBeUndefined();
    });
  });

  describe('validateApiConfiguration', () => {
    it('should validate correct API configuration', async () => {
      const validContent = `export default [
  [
    'user',
    '/user',
    ['create', 'read', 'update', 'delete']
  ]
];`;

      const categoryIndexContent = `import userApis from './user';

export default [...userApis];`;

      const mainIndexContent = `import contentApis from './content';

export default {
  apis: [...contentApis]
};`;

      mockFileSystemHandler.exists.mockResolvedValue(true);
      mockFileSystemHandler.readFile
        .mockResolvedValueOnce(validContent) // API file
        .mockResolvedValueOnce(categoryIndexContent) // category index
        .mockResolvedValueOnce(mainIndexContent); // main index

      const result = await apiManager.validateApiConfiguration('/test/project', 'user');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect missing API configuration file', async () => {
      mockFileSystemHandler.exists.mockResolvedValue(false);

      const result = await apiManager.validateApiConfiguration('/test/project', 'nonexistent');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('API configuration file not found: /test/project/src/scripts/apis/content/nonexistent.js');
    });

    it('should detect invalid API configuration format', async () => {
      const invalidContent = `export default {
  model: 'user',
  endpoint: '/user'
};`;

      mockFileSystemHandler.exists.mockResolvedValue(true);
      mockFileSystemHandler.readFile.mockResolvedValue(invalidContent);

      const result = await apiManager.validateApiConfiguration('/test/project', 'user');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid API configuration format - should be [model, endpoint, operations, options?]');
    });

    it('should warn about missing imports', async () => {
      const validContent = `export default [
  [
    'user',
    '/user',
    ['create', 'read', 'update', 'delete']
  ]
];`;

      const categoryIndexContent = `export default [];`; // missing import
      const mainIndexContent = `export default { apis: [] };`; // missing category import

      mockFileSystemHandler.exists.mockResolvedValue(true);
      mockFileSystemHandler.readFile
        .mockResolvedValueOnce(validContent)
        .mockResolvedValueOnce(categoryIndexContent)
        .mockResolvedValueOnce(mainIndexContent);

      const result = await apiManager.validateApiConfiguration('/test/project', 'user');

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('API not imported in category index file');
      expect(result.warnings).toContain('Category not imported in main APIs index');
    });
  });

  describe('generateApiDocumentation', () => {
    it('should generate API documentation', async () => {
      const mockApis = [
        {
          name: 'user',
          model: 'user',
          endpoint: '/user',
          operations: ['create', 'read', 'update', 'delete'],
          category: 'content',
          hasCustomActions: false,
          filePath: 'src/scripts/apis/content/user.js'
        },
        {
          name: 'auth',
          model: 'user',
          endpoint: '/auth',
          operations: ['read', 'update'],
          category: 'common',
          hasCustomActions: true,
          filePath: 'src/scripts/apis/common/auth.js'
        }
      ];

      // Mock the listApiConfigurations method
      vi.spyOn(apiManager, 'listApiConfigurations').mockResolvedValue({
        success: true,
        apis: mockApis
      });

      mockFileSystemHandler.writeFile.mockResolvedValue();

      const result = await apiManager.generateApiDocumentation('/test/project', '/test/docs.md');

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/test/docs.md');
      expect(result.apiCount).toBe(2);
      expect(mockFileSystemHandler.writeFile).toHaveBeenCalledWith(
        '/test/docs.md',
        expect.stringContaining('# API Documentation')
      );
      expect(mockFileSystemHandler.writeFile).toHaveBeenCalledWith(
        '/test/docs.md',
        expect.stringContaining('## Common APIs')
      );
      expect(mockFileSystemHandler.writeFile).toHaveBeenCalledWith(
        '/test/docs.md',
        expect.stringContaining('## Content APIs')
      );
    });
  });

  describe('buildApiDocumentation', () => {
    it('should build documentation content from API list', () => {
      const apis = [
        {
          name: 'user',
          model: 'user',
          endpoint: '/user',
          operations: ['create', 'read', 'update', 'delete'],
          category: 'content',
          hasCustomActions: false,
          filePath: 'src/scripts/apis/content/user.js'
        },
        {
          name: 'auth',
          model: 'user',
          endpoint: '/auth',
          operations: ['read', 'update'],
          category: 'common',
          hasCustomActions: true,
          filePath: 'src/scripts/apis/common/auth.js'
        }
      ];

      const documentation = apiManager.buildApiDocumentation(apis);

      expect(documentation).toContain('# API Documentation');
      expect(documentation).toContain('## Content APIs');
      expect(documentation).toContain('## Common APIs');
      expect(documentation).toContain('### user');
      expect(documentation).toContain('### auth');
      expect(documentation).toContain('- **Model**: user');
      expect(documentation).toContain('- **Endpoint**: /user');
      expect(documentation).toContain('- **Operations**: create, read, update, delete');
      expect(documentation).toContain('- **Custom Actions**: Yes');
    });
  });
});