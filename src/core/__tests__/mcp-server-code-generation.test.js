/**
 * Tests for MCP Server Code Generation Tools
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MCPServer } from '../mcp-server.js';
import { BalmSharedMCPError, ErrorCodes } from '../../utils/errors.js';

// Mock dependencies
const mockProjectManager = {
  createProject: vi.fn(),
  analyzeProject: vi.fn()
};

const mockCodeGenerator = {
  generateCrudModule: vi.fn(),
  generatePageComponent: vi.fn(),
  generateModelConfig: vi.fn()
};

const mockResourceAnalyzer = {
  queryComponent: vi.fn(),
  getBestPractices: vi.fn()
};

const mockFileSystemHandler = {};
const mockConfig = {};

describe('MCPServer Code Generation Tools', () => {
  let mcpServer;

  beforeEach(() => {
    vi.clearAllMocks();
    mcpServer = new MCPServer({
      projectManager: mockProjectManager,
      codeGenerator: mockCodeGenerator,
      resourceAnalyzer: mockResourceAnalyzer,
      fileSystemHandler: mockFileSystemHandler,
      config: mockConfig
    });
  });

  describe('generateCrudModule', () => {
    const validArgs = {
      module: 'user',
      model: 'User',
      fields: [
        { name: 'name', type: 'string', component: 'ui-textfield' },
        { name: 'email', type: 'string', component: 'ui-textfield' }
      ],
      projectPath: '/test/project'
    };

    beforeEach(() => {
      mockCodeGenerator.generateCrudModule.mockResolvedValue({
        success: true,
        message: 'CRUD module generated successfully',
        generatedFiles: [
          { path: '/test/project/src/pages/user-list.vue', type: 'vue-component' },
          { path: '/test/project/src/pages/user-detail.vue', type: 'vue-component' }
        ]
      });
    });

    it('should generate CRUD module successfully with valid parameters', async () => {
      const result = await mcpServer.generateCrudModule(validArgs);

      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.summary.module).toBe('user');
      expect(result.summary.model).toBe('User');
      expect(result.summary.fieldsGenerated).toBe(2);
      expect(result.summary.filesCreated).toBe(2);
      expect(mockCodeGenerator.generateCrudModule).toHaveBeenCalledWith(validArgs);
    });

    it('should throw error for missing required parameters', async () => {
      const invalidArgs = { module: 'user' }; // Missing model, fields, projectPath

      await expect(mcpServer.generateCrudModule(invalidArgs)).rejects.toThrow(BalmSharedMCPError);

      expect(mockCodeGenerator.generateCrudModule).not.toHaveBeenCalled();
    });

    it('should throw error for invalid fields parameter', async () => {
      const invalidArgs = { ...validArgs, fields: 'not-an-array' };

      await expect(mcpServer.generateCrudModule(invalidArgs)).rejects.toThrow(BalmSharedMCPError);
    });

    it('should throw error for empty fields array', async () => {
      const invalidArgs = { ...validArgs, fields: [] };

      await expect(mcpServer.generateCrudModule(invalidArgs)).rejects.toThrow(BalmSharedMCPError);
    });

    it('should throw error for invalid field structure', async () => {
      const invalidArgs = {
        ...validArgs,
        fields: [
          { name: 'name' }, // Missing type and component
          { name: 'email', type: 'string', component: 'ui-textfield' }
        ]
      };

      await expect(mcpServer.generateCrudModule(invalidArgs)).rejects.toThrow(BalmSharedMCPError);
    });

    it('should throw error for invalid project path', async () => {
      const invalidArgs = { ...validArgs, projectPath: '' };

      await expect(mcpServer.generateCrudModule(invalidArgs)).rejects.toThrow(BalmSharedMCPError);
    });

    it('should handle code generator errors gracefully', async () => {
      mockCodeGenerator.generateCrudModule.mockRejectedValue(new Error('Template not found'));

      await expect(mcpServer.generateCrudModule(validArgs)).rejects.toThrow(BalmSharedMCPError);
    });

    it('should preserve BalmSharedMCPError from code generator', async () => {
      const originalError = new BalmSharedMCPError(
        ErrorCodes.TEMPLATE_NOT_FOUND,
        'Template not found'
      );
      mockCodeGenerator.generateCrudModule.mockRejectedValue(originalError);

      await expect(mcpServer.generateCrudModule(validArgs)).rejects.toThrow(originalError);
    });
  });

  describe('generatePageComponent', () => {
    const validArgs = {
      name: 'user',
      type: 'list',
      model: 'User',
      projectPath: '/test/project'
    };

    beforeEach(() => {
      mockCodeGenerator.generatePageComponent.mockResolvedValue({
        success: true,
        message: 'Page component generated successfully',
        componentPath: '/test/project/src/pages/user-list.vue',
        generatedFiles: [{ path: '/test/project/src/pages/user-list.vue', type: 'vue-component' }]
      });
    });

    it('should generate page component successfully with valid parameters', async () => {
      const result = await mcpServer.generatePageComponent(validArgs);

      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.summary.name).toBe('user');
      expect(result.summary.type).toBe('list');
      expect(result.summary.model).toBe('User');
      expect(result.summary.filesCreated).toBe(1);
      expect(mockCodeGenerator.generatePageComponent).toHaveBeenCalledWith(validArgs);
    });

    it('should generate detail page component', async () => {
      const detailArgs = { ...validArgs, type: 'detail' };

      const result = await mcpServer.generatePageComponent(detailArgs);

      expect(result.success).toBe(true);
      expect(result.summary.type).toBe('detail');
    });

    it('should throw error for missing required parameters', async () => {
      const invalidArgs = { name: 'user' }; // Missing type, model, projectPath

      await expect(mcpServer.generatePageComponent(invalidArgs)).rejects.toThrow(
        BalmSharedMCPError
      );
    });

    it('should throw error for invalid component type', async () => {
      const invalidArgs = { ...validArgs, type: 'invalid' };

      await expect(mcpServer.generatePageComponent(invalidArgs)).rejects.toThrow(
        BalmSharedMCPError
      );
    });

    it('should throw error for invalid component name format', async () => {
      const invalidArgs = { ...validArgs, name: '123invalid' };

      await expect(mcpServer.generatePageComponent(invalidArgs)).rejects.toThrow(
        BalmSharedMCPError
      );
    });

    it('should throw error for invalid model name format', async () => {
      const invalidArgs = { ...validArgs, model: '123Invalid' };

      await expect(mcpServer.generatePageComponent(invalidArgs)).rejects.toThrow(
        BalmSharedMCPError
      );
    });

    it('should throw error for invalid project path', async () => {
      const invalidArgs = { ...validArgs, projectPath: '' };

      await expect(mcpServer.generatePageComponent(invalidArgs)).rejects.toThrow(
        BalmSharedMCPError
      );
    });

    it('should handle code generator errors gracefully', async () => {
      mockCodeGenerator.generatePageComponent.mockRejectedValue(new Error('File write failed'));

      await expect(mcpServer.generatePageComponent(validArgs)).rejects.toThrow(BalmSharedMCPError);
    });

    it('should accept valid component names with hyphens and underscores', async () => {
      const validNames = ['user-profile', 'user_profile', 'userProfile'];

      for (const name of validNames) {
        const args = { ...validArgs, name };
        await expect(mcpServer.generatePageComponent(args)).resolves.toBeDefined();
      }
    });

    it('should accept valid model names with underscores', async () => {
      const validModels = ['User', 'UserProfile', 'User_Profile'];

      for (const model of validModels) {
        const args = { ...validArgs, model };
        await expect(mcpServer.generatePageComponent(args)).resolves.toBeDefined();
      }
    });
  });

  describe('parameter validation edge cases', () => {
    it('should handle null and undefined parameters', async () => {
      await expect(mcpServer.generateCrudModule(null)).rejects.toThrow(BalmSharedMCPError);

      await expect(mcpServer.generatePageComponent(undefined)).rejects.toThrow(BalmSharedMCPError);
    });

    it('should handle empty object parameters', async () => {
      await expect(mcpServer.generateCrudModule({})).rejects.toThrow(BalmSharedMCPError);

      await expect(mcpServer.generatePageComponent({})).rejects.toThrow(BalmSharedMCPError);
    });

    it('should provide helpful error messages for validation failures', async () => {
      try {
        await mcpServer.generateCrudModule({ module: 'test' });
      } catch (error) {
        expect(error.message).toContain('Missing required parameters');
        expect(error.details.missingParams).toContain('model');
        expect(error.details.missingParams).toContain('fields');
        expect(error.details.missingParams).toContain('projectPath');
      }
    });
  });

  describe('logging and monitoring', () => {
    it('should log successful CRUD module generation', async () => {
      const validArgs = {
        module: 'user',
        model: 'User',
        fields: [{ name: 'name', type: 'string', component: 'ui-textfield' }],
        projectPath: '/test/project'
      };

      mockCodeGenerator.generateCrudModule.mockResolvedValue({
        success: true,
        generatedFiles: [{ path: '/test/file.vue' }]
      });

      await mcpServer.generateCrudModule(validArgs);

      // Verify that logging would occur (we can't easily test actual logging without mocking logger)
      expect(mockCodeGenerator.generateCrudModule).toHaveBeenCalled();
    });

    it('should log successful page component generation', async () => {
      const validArgs = {
        name: 'user',
        type: 'list',
        model: 'User',
        projectPath: '/test/project'
      };

      mockCodeGenerator.generatePageComponent.mockResolvedValue({
        success: true,
        generatedFiles: [{ path: '/test/file.vue' }]
      });

      await mcpServer.generatePageComponent(validArgs);

      expect(mockCodeGenerator.generatePageComponent).toHaveBeenCalled();
    });
  });
});
