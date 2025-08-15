/**
 * CRUD Module Generation Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CodeGenerator } from '../../src/generators/code-generator.js';

describe('CodeGenerator - CRUD Module', () => {
  let codeGenerator;
  let mockFileSystemHandler;
  let mockConfig;

  beforeEach(() => {
    mockFileSystemHandler = {
      ensureDirectory: vi.fn(),
      writeFile: vi.fn(),
      readFile: vi.fn().mockResolvedValue(''),
      exists: vi.fn().mockResolvedValue(true)
    };

    mockConfig = {
      templatesPath: '/test/templates'
    };

    codeGenerator = new CodeGenerator(mockFileSystemHandler, mockConfig);
  });

  describe('generateCrudModule', () => {
    it('should generate complete CRUD module', async () => {
      const options = {
        module: 'user',
        model: 'user',
        projectPath: '/test/project',
        title: '用户管理',
        endpoint: '/api/user',
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
          },
          {
            name: 'status',
            label: '状态',
            type: 'select',
            options: {
              options: [
                { value: 'active', text: '激活' },
                { value: 'inactive', text: '未激活' }
              ]
            }
          }
        ]
      };

      const result = await codeGenerator.generateCrudModule(options);

      expect(result.success).toBe(true);
      expect(result.module).toBe('user');
      expect(result.model).toBe('user');
      expect(result.endpoint).toBe('/api/user');
      expect(result.generatedFiles).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.totalFiles).toBeGreaterThan(0);

      // Verify that all required files were generated
      expect(result.summary.modelConfig).toBeDefined();
      expect(result.summary.pages).toBeDefined();
      expect(result.summary.apiConfig).toBeDefined();
      expect(result.summary.routes).toBeDefined();
      expect(result.summary.mockData).toBeDefined();

      // Verify file system operations
      expect(mockFileSystemHandler.ensureDirectory).toHaveBeenCalled();
      expect(mockFileSystemHandler.writeFile).toHaveBeenCalled();
    });

    it('should handle missing required parameters', async () => {
      const options = {
        module: 'user',
        // missing model, fields, projectPath
      };

      await expect(codeGenerator.generateCrudModule(options))
        .rejects.toThrow('Missing required parameters');
    });

    it('should handle non-existent project path', async () => {
      mockFileSystemHandler.exists.mockResolvedValue(false);

      const options = {
        module: 'user',
        model: 'user',
        fields: [],
        projectPath: '/non/existent/path'
      };

      await expect(codeGenerator.generateCrudModule(options))
        .rejects.toThrow('Project path does not exist');
    });
  });

  describe('generateApiConfig', () => {
    it('should generate API configuration', async () => {
      const options = {
        name: 'user',
        model: 'user',
        endpoint: '/api/user',
        projectPath: '/test/project',
        operations: ['create', 'read', 'update', 'delete']
      };

      const result = await codeGenerator.generateApiConfig(options);

      expect(result.success).toBe(true);
      expect(result.filePath).toContain('user.js');
      expect(result.endpoint).toBe('/api/user');
      expect(result.operations).toEqual(['create', 'read', 'update', 'delete']);
      expect(result.generatedFiles).toHaveLength(1);
      expect(result.generatedFiles[0].type).toBe('api-config');
    });

    it('should handle custom actions', async () => {
      const options = {
        name: 'user',
        model: 'user',
        endpoint: '/api/user',
        projectPath: '/test/project',
        customActions: {
          activate: '/activate',
          deactivate: '/deactivate'
        }
      };

      const result = await codeGenerator.generateApiConfig(options);

      expect(result.success).toBe(true);
      expect(mockFileSystemHandler.writeFile).toHaveBeenCalled();
      
      const writeCall = mockFileSystemHandler.writeFile.mock.calls.find(
        call => call[0].includes('user.js')
      );
      expect(writeCall[1]).toContain('activate');
      expect(writeCall[1]).toContain('deactivate');
    });
  });

  describe('generateRouteConfig', () => {
    it('should generate route configuration', async () => {
      const options = {
        name: 'user',
        title: '用户管理',
        projectPath: '/test/project',
        requiresAuth: true,
        permissions: ['user:read', 'user:write']
      };

      const result = await codeGenerator.generateRouteConfig(options);

      expect(result.success).toBe(true);
      expect(result.filePath).toContain('user.js');
      expect(result.routes).toEqual([
        'user-list',
        'user-create',
        'user-detail',
        'user-edit'
      ]);
      expect(result.generatedFiles).toHaveLength(1);
      expect(result.generatedFiles[0].type).toBe('route-config');
    });

    it('should handle routes without authentication', async () => {
      const options = {
        name: 'public',
        title: '公开页面',
        projectPath: '/test/project',
        requiresAuth: false
      };

      const result = await codeGenerator.generateRouteConfig(options);

      expect(result.success).toBe(true);
      expect(mockFileSystemHandler.writeFile).toHaveBeenCalled();
    });
  });

  describe('generateMockData', () => {
    it('should generate mock data', async () => {
      const options = {
        name: 'user',
        endpoint: '/api/user',
        projectPath: '/test/project',
        title: '用户',
        fields: [
          { name: 'username', type: 'string' },
          { name: 'email', type: 'email' },
          { name: 'age', type: 'number' }
        ]
      };

      const result = await codeGenerator.generateMockData(options);

      expect(result.success).toBe(true);
      expect(result.filePath).toContain('user.js');
      expect(result.endpoint).toBe('/api/user');
      expect(result.methods).toContain('index');
      expect(result.methods).toContain('info');
      expect(result.methods).toContain('add');
      expect(result.methods).toContain('edit');
      expect(result.methods).toContain('delete');
      expect(result.generatedFiles).toHaveLength(1);
      expect(result.generatedFiles[0].type).toBe('mock-data');
    });

    it('should handle custom methods', async () => {
      const options = {
        name: 'user',
        endpoint: '/api/user',
        projectPath: '/test/project',
        fields: [],
        customMethods: {
          activate: { description: 'Activate user' },
          resetPassword: { description: 'Reset user password' }
        }
      };

      const result = await codeGenerator.generateMockData(options);

      expect(result.success).toBe(true);
      expect(result.methods).toContain('activate');
      expect(result.methods).toContain('resetPassword');
    });
  });

  describe('updateProjectStructureForModule', () => {
    it('should update project structure', async () => {
      await codeGenerator.updateProjectStructureForModule('/test/project', 'user', {
        hasRoutes: true,
        hasApi: true,
        hasMock: true
      });

      // Should not throw error even if files don't exist
      expect(mockFileSystemHandler.exists).toHaveBeenCalled();
    });
  });

  describe('index file updates', () => {
    it('should update API index', async () => {
      mockFileSystemHandler.readFile.mockResolvedValue('// existing content\n');

      await codeGenerator.updateApiIndex('/test/project', 'user');

      expect(mockFileSystemHandler.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('api/index.js'),
        expect.stringContaining('export { default as user }')
      );
    });

    it('should update routes index', async () => {
      mockFileSystemHandler.readFile.mockResolvedValue('// existing content\n');

      await codeGenerator.updateRoutesIndex('/test/project', 'user');

      expect(mockFileSystemHandler.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('routes/index.js'),
        expect.stringContaining('userRoutes')
      );
    });

    it('should update mock index', async () => {
      mockFileSystemHandler.readFile.mockResolvedValue('// existing content\n');

      await codeGenerator.updateMockIndex('/test/project', 'user');

      expect(mockFileSystemHandler.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('mock-server/index.js'),
        expect.stringContaining('getUserApis')
      );
    });

    it('should create new index files if they do not exist', async () => {
      mockFileSystemHandler.exists.mockResolvedValue(false);

      await codeGenerator.updateApiIndex('/test/project', 'user');
      await codeGenerator.updateRoutesIndex('/test/project', 'user');
      await codeGenerator.updateMockIndex('/test/project', 'user');

      expect(mockFileSystemHandler.writeFile).toHaveBeenCalledTimes(3);
    });
  });
});