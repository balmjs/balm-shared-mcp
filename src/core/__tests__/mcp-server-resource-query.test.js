/**
 * Tests for MCP Server Resource Query Tools
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

describe('MCPServer Resource Query Tools', () => {
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

  describe('queryComponent', () => {
    const validArgs = {
      name: 'yb-avatar',
      category: 'common'
    };

    beforeEach(() => {
      mockResourceAnalyzer.queryComponent.mockResolvedValue({
        name: 'yb-avatar',
        category: 'common',
        found: true,
        props: [{ name: 'size', type: 'String', default: 'medium' }],
        events: [{ name: 'click', source: 'emit' }],
        examples: [{ language: 'vue', code: '<yb-avatar size="large" />' }],
        documentation: 'Avatar component for displaying user avatars'
      });
    });

    it('should query component successfully with valid parameters', async () => {
      const result = await mcpServer.queryComponent(validArgs);

      expect(result.found).toBe(true);
      expect(result.name).toBe('yb-avatar');
      expect(result.category).toBe('common');
      expect(result.query).toBeDefined();
      expect(result.query.name).toBe('yb-avatar');
      expect(result.query.category).toBe('common');
      expect(result.query.timestamp).toBeDefined();
      expect(mockResourceAnalyzer.queryComponent).toHaveBeenCalledWith('yb-avatar', 'common');
    });

    it('should query component without category', async () => {
      const argsWithoutCategory = { name: 'yb-button' };

      const result = await mcpServer.queryComponent(argsWithoutCategory);

      expect(result.query.category).toBeNull();
      expect(mockResourceAnalyzer.queryComponent).toHaveBeenCalledWith('yb-button', undefined);
    });

    it('should throw error for missing required parameters', async () => {
      const invalidArgs = {}; // Missing name

      await expect(mcpServer.queryComponent(invalidArgs)).rejects.toThrow(BalmSharedMCPError);

      expect(mockResourceAnalyzer.queryComponent).not.toHaveBeenCalled();
    });

    it('should throw error for invalid name type', async () => {
      const invalidArgs = { name: 123 };

      await expect(mcpServer.queryComponent(invalidArgs)).rejects.toThrow(BalmSharedMCPError);
    });

    it('should throw error for empty name', async () => {
      const invalidArgs = { name: '   ' };

      await expect(mcpServer.queryComponent(invalidArgs)).rejects.toThrow(BalmSharedMCPError);
    });

    it('should throw error for invalid category type', async () => {
      const invalidArgs = { name: 'yb-avatar', category: 123 };

      await expect(mcpServer.queryComponent(invalidArgs)).rejects.toThrow(BalmSharedMCPError);
    });

    it('should throw error for invalid category value', async () => {
      const invalidArgs = { name: 'yb-avatar', category: 'invalid-category' };

      await expect(mcpServer.queryComponent(invalidArgs)).rejects.toThrow(BalmSharedMCPError);
    });

    it('should accept valid category values', async () => {
      const validCategories = ['common', 'form', 'chart', 'pro-views'];

      for (const category of validCategories) {
        const args = { name: 'test-component', category };
        await expect(mcpServer.queryComponent(args)).resolves.toBeDefined();
      }
    });

    it('should handle resource analyzer errors gracefully', async () => {
      mockResourceAnalyzer.queryComponent.mockRejectedValue(
        new Error('Component not found in index')
      );

      await expect(mcpServer.queryComponent(validArgs)).rejects.toThrow(BalmSharedMCPError);
    });

    it('should preserve BalmSharedMCPError from resource analyzer', async () => {
      const originalError = new BalmSharedMCPError(
        ErrorCodes.COMPONENT_NOT_FOUND,
        'Component not found'
      );
      mockResourceAnalyzer.queryComponent.mockRejectedValue(originalError);

      await expect(mcpServer.queryComponent(validArgs)).rejects.toThrow(originalError);
    });

    it('should handle null and undefined parameters', async () => {
      await expect(mcpServer.queryComponent(null)).rejects.toThrow(BalmSharedMCPError);

      await expect(mcpServer.queryComponent(undefined)).rejects.toThrow(BalmSharedMCPError);
    });
  });

  describe('getBestPractices', () => {
    const validArgs = {
      topic: 'component-usage'
    };

    beforeEach(() => {
      mockResourceAnalyzer.getBestPractices.mockResolvedValue({
        topic: 'component-usage',
        practices: [
          {
            type: 'component',
            name: 'yb-avatar',
            category: 'common',
            practice: 'Use size prop to control avatar dimensions',
            examples: [{ language: 'vue', code: '<yb-avatar size="large" />' }]
          }
        ],
        examples: [{ language: 'vue', code: 'Example usage code' }],
        references: []
      });
    });

    it('should get best practices successfully with valid parameters', async () => {
      const result = await mcpServer.getBestPractices(validArgs);

      expect(result.topic).toBe('component-usage');
      expect(result.practices).toBeDefined();
      expect(Array.isArray(result.practices)).toBe(true);
      expect(result.query).toBeDefined();
      expect(result.query.topic).toBe('component-usage');
      expect(result.query.timestamp).toBeDefined();
      expect(mockResourceAnalyzer.getBestPractices).toHaveBeenCalledWith('component-usage');
    });

    it('should throw error for missing required parameters', async () => {
      const invalidArgs = {}; // Missing topic

      await expect(mcpServer.getBestPractices(invalidArgs)).rejects.toThrow(BalmSharedMCPError);

      expect(mockResourceAnalyzer.getBestPractices).not.toHaveBeenCalled();
    });

    it('should throw error for invalid topic type', async () => {
      const invalidArgs = { topic: 123 };

      await expect(mcpServer.getBestPractices(invalidArgs)).rejects.toThrow(BalmSharedMCPError);
    });

    it('should throw error for empty topic', async () => {
      const invalidArgs = { topic: '   ' };

      await expect(mcpServer.getBestPractices(invalidArgs)).rejects.toThrow(BalmSharedMCPError);
    });

    it('should throw error for invalid topic value', async () => {
      const invalidArgs = { topic: 'invalid-topic' };

      await expect(mcpServer.getBestPractices(invalidArgs)).rejects.toThrow(BalmSharedMCPError);
    });

    it('should accept valid topic values', async () => {
      const validTopics = ['project-structure', 'api-config', 'component-usage', 'routing'];

      for (const topic of validTopics) {
        const args = { topic };
        await expect(mcpServer.getBestPractices(args)).resolves.toBeDefined();
      }
    });

    it('should handle resource analyzer errors gracefully', async () => {
      mockResourceAnalyzer.getBestPractices.mockRejectedValue(
        new Error('Best practices not found')
      );

      await expect(mcpServer.getBestPractices(validArgs)).rejects.toThrow(BalmSharedMCPError);
    });

    it('should preserve BalmSharedMCPError from resource analyzer', async () => {
      const originalError = new BalmSharedMCPError(ErrorCodes.INVALID_REQUEST, 'Invalid topic');
      mockResourceAnalyzer.getBestPractices.mockRejectedValue(originalError);

      await expect(mcpServer.getBestPractices(validArgs)).rejects.toThrow(originalError);
    });

    it('should handle null and undefined parameters', async () => {
      await expect(mcpServer.getBestPractices(null)).rejects.toThrow(BalmSharedMCPError);

      await expect(mcpServer.getBestPractices(undefined)).rejects.toThrow(BalmSharedMCPError);
    });
  });

  describe('parameter validation edge cases', () => {
    it('should provide helpful error messages for validation failures', async () => {
      try {
        await mcpServer.queryComponent({ name: 123 });
      } catch (error) {
        expect(error.message).toContain('Component name is required and must be a string');
        expect(error.details.name).toBe(123);
      }

      try {
        await mcpServer.getBestPractices({ topic: 'invalid' });
      } catch (error) {
        expect(error.message).toContain('Invalid topic: invalid');
        expect(error.details.validTopics).toContain('project-structure');
      }
    });

    it('should handle empty object parameters', async () => {
      await expect(mcpServer.queryComponent({})).rejects.toThrow(BalmSharedMCPError);

      await expect(mcpServer.getBestPractices({})).rejects.toThrow(BalmSharedMCPError);
    });
  });

  describe('logging and monitoring', () => {
    it('should log successful component query', async () => {
      const validArgs = { name: 'yb-avatar', category: 'common' };

      mockResourceAnalyzer.queryComponent.mockResolvedValue({
        found: true,
        name: 'yb-avatar',
        category: 'common'
      });

      await mcpServer.queryComponent(validArgs);

      expect(mockResourceAnalyzer.queryComponent).toHaveBeenCalled();
    });

    it('should log successful best practices query', async () => {
      const validArgs = { topic: 'component-usage' };

      mockResourceAnalyzer.getBestPractices.mockResolvedValue({
        topic: 'component-usage',
        practices: [],
        examples: []
      });

      await mcpServer.getBestPractices(validArgs);

      expect(mockResourceAnalyzer.getBestPractices).toHaveBeenCalled();
    });
  });

  describe('result formatting', () => {
    it('should add query metadata to component query results', async () => {
      const args = { name: 'yb-avatar', category: 'common' };

      mockResourceAnalyzer.queryComponent.mockResolvedValue({
        found: true,
        name: 'yb-avatar'
      });

      const result = await mcpServer.queryComponent(args);

      expect(result.query).toEqual({
        name: 'yb-avatar',
        category: 'common',
        timestamp: expect.any(String)
      });
    });

    it('should add query metadata to best practices results', async () => {
      const args = { topic: 'component-usage' };

      mockResourceAnalyzer.getBestPractices.mockResolvedValue({
        topic: 'component-usage',
        practices: []
      });

      const result = await mcpServer.getBestPractices(args);

      expect(result.query).toEqual({
        topic: 'component-usage',
        timestamp: expect.any(String)
      });
    });

    it('should handle null category in query metadata', async () => {
      const args = { name: 'yb-avatar' }; // No category

      mockResourceAnalyzer.queryComponent.mockResolvedValue({
        found: true,
        name: 'yb-avatar'
      });

      const result = await mcpServer.queryComponent(args);

      expect(result.query.category).toBeNull();
    });
  });
});
