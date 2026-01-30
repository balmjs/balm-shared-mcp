import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiManager } from '../api-manager.js';
import { BalmSharedMCPError } from '../../utils/errors.js';

describe('ApiManager', () => {
  let apiManager;
  const mockFileSystemHandler = {
    exists: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    readDirectory: vi.fn(),
    createDirectory: vi.fn()
  };

  const mockCodeGenerator = {
    generateApiConfig: vi.fn(),
    generateMockData: vi.fn(),
    templateHelpers: new Map([
      [
        'kebabCase',
        str =>
          str
            .replace(/([A-Z])/g, '-$1')
            .toLowerCase()
            .replace(/^-/, '')
      ],
      ['camelCase', str => str.replace(/-([a-z])/g, g => g[1].toUpperCase())],
      [
        'pascalCase',
        str => {
          const camelCase = str.replace(/-([a-z])/g, g => g[1].toUpperCase());
          return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
        }
      ]
    ])
  };

  const mockConfig = {
    defaultApiCategory: 'content'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    apiManager = new ApiManager(mockFileSystemHandler, mockCodeGenerator, mockConfig);
  });

  describe('generateApiConfig', () => {
    const validOptions = {
      model: 'User',
      endpoint: '/api/users',
      operations: ['create', 'read', 'update', 'delete'],
      projectPath: '/test/project'
    };

    beforeEach(() => {
      mockFileSystemHandler.exists.mockResolvedValue(true);
      mockFileSystemHandler.createDirectory.mockResolvedValue();
      mockFileSystemHandler.writeFile.mockResolvedValue();
      mockFileSystemHandler.readFile.mockResolvedValue('export default {};');
    });

    it('should generate API configuration successfully', async () => {
      const result = await apiManager.generateApiConfig(validOptions);

      expect(result.success).toBe(true);
      expect(result.model).toBe('User');
      expect(result.filePath).toContain('user.js');
      expect(mockFileSystemHandler.writeFile).toHaveBeenCalled();
    });

    it('should throw error for missing required parameters', async () => {
      const invalidOptions = { model: 'User' };

      await expect(apiManager.generateApiConfig(invalidOptions)).rejects.toThrow(
        BalmSharedMCPError
      );
    });

    it('should validate model name format', async () => {
      const invalidOptions = {
        ...validOptions,
        model: 'invalid-model-name'
      };

      await expect(apiManager.generateApiConfig(invalidOptions)).rejects.toThrow(
        BalmSharedMCPError
      );
    });

    it('should validate endpoint format', async () => {
      const invalidOptions = {
        ...validOptions,
        endpoint: 'invalid-endpoint'
      };

      await expect(apiManager.generateApiConfig(invalidOptions)).rejects.toThrow(
        BalmSharedMCPError
      );
    });

    it('should validate operations array', async () => {
      const invalidOptions = {
        ...validOptions,
        operations: ['invalid-operation']
      };

      await expect(apiManager.generateApiConfig(invalidOptions)).rejects.toThrow(
        BalmSharedMCPError
      );
    });

    it('should handle custom actions', async () => {
      const optionsWithCustomActions = {
        ...validOptions,
        customActions: {
          activate: 'POST /api/users/:id/activate',
          deactivate: 'POST /api/users/:id/deactivate'
        }
      };

      const result = await apiManager.generateApiConfig(optionsWithCustomActions);

      expect(result.success).toBe(true);
      expect(result.customActions).toEqual(optionsWithCustomActions.customActions);
    });

    it('should create apis directory if it does not exist', async () => {
      mockFileSystemHandler.exists.mockResolvedValue(false);

      await apiManager.generateApiConfig(validOptions);

      expect(mockFileSystemHandler.createDirectory).toHaveBeenCalledWith(
        expect.stringContaining('apis')
      );
    });
  });

  describe('updateApisIndex', () => {
    const projectPath = '/test/project';
    const modelName = 'User';

    beforeEach(() => {
      mockFileSystemHandler.exists.mockResolvedValue(true);
      mockFileSystemHandler.readFile.mockResolvedValue(`
import user from './user.js';
import product from './product.js';

export default {
  user,
  product
};
      `);
      mockFileSystemHandler.writeFile.mockResolvedValue();
    });

    it('should update apis index successfully', async () => {
      await apiManager.updateApisIndex(projectPath, modelName);

      expect(mockFileSystemHandler.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('index.js'),
        expect.stringContaining('user')
      );
    });

    it('should create new index file if it does not exist', async () => {
      mockFileSystemHandler.exists.mockResolvedValue(false);

      await apiManager.updateApisIndex(projectPath, modelName);

      expect(mockFileSystemHandler.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('index.js'),
        expect.stringContaining('export default')
      );
    });

    it('should handle invalid index file gracefully', async () => {
      mockFileSystemHandler.readFile.mockResolvedValue('invalid javascript');

      await apiManager.updateApisIndex(projectPath, modelName);

      // Should create a new index file
      expect(mockFileSystemHandler.writeFile).toHaveBeenCalled();
    });

    it('should avoid duplicate imports', async () => {
      mockFileSystemHandler.readFile.mockResolvedValue(`
import user from './user.js';

export default {
  user
};
      `);

      await apiManager.updateApisIndex(projectPath, 'User');

      const writeCall = mockFileSystemHandler.writeFile.mock.calls[0];
      const content = writeCall[1];

      // Should not duplicate the user import
      const importMatches = content.match(/import user from/g);
      expect(importMatches).toHaveLength(1);
    });
  });

  describe('generateMockData', () => {
    const options = {
      model: 'User',
      fields: [
        { name: 'id', type: 'number' },
        { name: 'name', type: 'string' },
        { name: 'email', type: 'string' },
        { name: 'active', type: 'boolean' }
      ],
      projectPath: '/test/project'
    };

    beforeEach(() => {
      mockFileSystemHandler.exists.mockResolvedValue(true);
      mockFileSystemHandler.createDirectory.mockResolvedValue();
      mockFileSystemHandler.writeFile.mockResolvedValue();
    });

    it('should generate mock data successfully', async () => {
      const result = await apiManager.generateMockData(options);

      expect(result.success).toBe(true);
      expect(result.model).toBe('User');
      expect(result.filePath).toContain('user.js');
      expect(mockFileSystemHandler.writeFile).toHaveBeenCalled();
    });

    it('should generate appropriate mock values for different field types', async () => {
      await apiManager.generateMockData(options);

      const writeCall = mockFileSystemHandler.writeFile.mock.calls[0];
      const content = writeCall[1];

      expect(content).toContain('id:');
      expect(content).toContain('name:');
      expect(content).toContain('email:');
      expect(content).toContain('active:');
    });

    it('should handle custom field types', async () => {
      const customOptions = {
        ...options,
        fields: [
          { name: 'createdAt', type: 'date' },
          { name: 'tags', type: 'array' },
          { name: 'profile', type: 'object' }
        ]
      };

      const result = await apiManager.generateMockData(customOptions);

      expect(result.success).toBe(true);
    });

    it('should create mock-server directory if it does not exist', async () => {
      mockFileSystemHandler.exists.mockResolvedValue(false);

      await apiManager.generateMockData(options);

      expect(mockFileSystemHandler.createDirectory).toHaveBeenCalledWith(
        expect.stringContaining('mock-server/modules')
      );
    });
  });

  describe('validateApiOptions', () => {
    it('should validate correct options', () => {
      const validOptions = {
        model: 'User',
        endpoint: '/api/users',
        operations: ['create', 'read'],
        projectPath: '/test/project'
      };

      expect(() => {
        apiManager.validateApiOptions(validOptions);
      }).not.toThrow();
    });

    it('should throw error for missing model', () => {
      const invalidOptions = {
        endpoint: '/api/users',
        operations: ['create'],
        projectPath: '/test/project'
      };

      expect(() => {
        apiManager.validateApiOptions(invalidOptions);
      }).toThrow(BalmSharedMCPError);
    });

    it('should throw error for invalid model name', () => {
      const invalidOptions = {
        model: 'invalid-model',
        endpoint: '/api/users',
        operations: ['create'],
        projectPath: '/test/project'
      };

      expect(() => {
        apiManager.validateApiOptions(invalidOptions);
      }).toThrow(BalmSharedMCPError);
    });

    it('should throw error for invalid endpoint', () => {
      const invalidOptions = {
        model: 'User',
        endpoint: 'invalid-endpoint',
        operations: ['create'],
        projectPath: '/test/project'
      };

      expect(() => {
        apiManager.validateApiOptions(invalidOptions);
      }).toThrow(BalmSharedMCPError);
    });

    it('should throw error for invalid operations', () => {
      const invalidOptions = {
        model: 'User',
        endpoint: '/api/users',
        operations: ['invalid'],
        projectPath: '/test/project'
      };

      expect(() => {
        apiManager.validateApiOptions(invalidOptions);
      }).toThrow(BalmSharedMCPError);
    });
  });

  describe('_generateApiTemplate', () => {
    it('should generate correct API template', () => {
      const options = {
        model: 'User',
        endpoint: '/api/users',
        operations: ['create', 'read', 'update', 'delete']
      };

      const template = apiManager._generateApiTemplate(options);

      expect(template).toContain("'User'");
      expect(template).toContain("'/api/users'");
      expect(template).toContain('create');
      expect(template).toContain('read');
      expect(template).toContain('update');
      expect(template).toContain('delete');
    });

    it('should include custom actions in template', () => {
      const options = {
        model: 'User',
        endpoint: '/api/users',
        operations: ['create', 'read'],
        customActions: {
          activate: 'POST /api/users/:id/activate'
        }
      };

      const template = apiManager._generateApiTemplate(options);

      expect(template).toContain('activate');
      expect(template).toContain('POST /api/users/:id/activate');
    });
  });

  describe('_generateMockTemplate', () => {
    it('should generate correct mock template', () => {
      const options = {
        model: 'User',
        fields: [
          { name: 'id', type: 'number' },
          { name: 'name', type: 'string' }
        ]
      };

      const template = apiManager._generateMockTemplate(options);

      expect(template).toContain('User');
      expect(template).toContain('id:');
      expect(template).toContain('name:');
    });

    it('should generate appropriate mock values', () => {
      const options = {
        model: 'User',
        fields: [
          { name: 'id', type: 'number' },
          { name: 'name', type: 'string' },
          { name: 'active', type: 'boolean' },
          { name: 'createdAt', type: 'date' }
        ]
      };

      const template = apiManager._generateMockTemplate(options);

      expect(template).toMatch(/id:\s*\d+/);
      expect(template).toMatch(/name:\s*['"`]/);
      expect(template).toMatch(/active:\s*(true|false)/);
      expect(template).toContain('createdAt:');
    });
  });

  describe('_getMockValue', () => {
    it('should return correct mock values for different types', () => {
      expect(apiManager._getMockValue('string', 'name')).toMatch(/['"`]/);
      expect(apiManager._getMockValue('number', 'id')).toMatch(/\d+/);
      expect(apiManager._getMockValue('boolean', 'active')).toMatch(/(true|false)/);
      expect(apiManager._getMockValue('date', 'createdAt')).toContain('Date');
      expect(apiManager._getMockValue('array', 'tags')).toContain('[');
      expect(apiManager._getMockValue('object', 'profile')).toContain('{');
    });

    it('should handle unknown types', () => {
      const result = apiManager._getMockValue('unknown', 'field');
      expect(result).toBe('null');
    });
  });

  describe('_parseExistingIndex', () => {
    it('should parse existing index file correctly', () => {
      const content = `
import user from './user.js';
import product from './product.js';

export default {
  user,
  product
};
      `;

      const result = apiManager._parseExistingIndex(content);

      expect(result.imports).toContain('user');
      expect(result.imports).toContain('product');
      expect(result.exports).toContain('user');
      expect(result.exports).toContain('product');
    });

    it('should handle empty or invalid content', () => {
      const result = apiManager._parseExistingIndex('invalid content');

      expect(result.imports).toEqual([]);
      expect(result.exports).toEqual([]);
    });
  });

  describe('_generateIndexContent', () => {
    it('should generate correct index content', () => {
      const imports = ['user', 'product'];
      const exports = ['user', 'product'];

      const content = apiManager._generateIndexContent(imports, exports);

      expect(content).toContain("import user from './user.js'");
      expect(content).toContain("import product from './product.js'");
      expect(content).toContain('export default {');
      expect(content).toContain('user,');
      expect(content).toContain('product');
    });

    it('should handle empty arrays', () => {
      const content = apiManager._generateIndexContent([], []);

      expect(content).toContain('export default {};');
    });
  });

  describe('error handling', () => {
    it('should handle file system errors gracefully', async () => {
      mockFileSystemHandler.writeFile.mockRejectedValue(new Error('Write failed'));

      const options = {
        model: 'User',
        endpoint: '/api/users',
        operations: ['create'],
        projectPath: '/test/project'
      };

      await expect(apiManager.generateApiConfig(options)).rejects.toThrow(BalmSharedMCPError);
    });

    it('should log validation errors', async () => {
      const invalidOptions = { model: 'invalid-model' };

      await expect(apiManager.generateApiConfig(invalidOptions)).rejects.toThrow();
    });
  });
});
