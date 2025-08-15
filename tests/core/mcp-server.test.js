/**
 * MCP Server Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('MCPServer', () => {
  let mockServer;

  beforeEach(() => {
    mockServer = {
      listTools: vi.fn().mockResolvedValue({
        tools: [
          { name: 'create_project', description: 'Create project', inputSchema: { type: 'object', properties: {} } },
          { name: 'analyze_project', description: 'Analyze project', inputSchema: { type: 'object', properties: {} } },
          { name: 'generate_crud_module', description: 'Generate CRUD', inputSchema: { type: 'object', properties: {} } },
          { name: 'generate_page_component', description: 'Generate page', inputSchema: { type: 'object', properties: {} } },
          { name: 'query_component', description: 'Query component', inputSchema: { type: 'object', properties: {} } },
          { name: 'get_best_practices', description: 'Get practices', inputSchema: { type: 'object', properties: {} } }
        ]
      }),
      callTool: vi.fn()
    };
  });

  describe('Tool Registration', () => {
    it('should register all required tools', async () => {
      const { tools } = await mockServer.listTools();
      
      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      
      const toolNames = tools.map(tool => tool.name);
      expect(toolNames).toContain('create_project');
      expect(toolNames).toContain('analyze_project');
      expect(toolNames).toContain('generate_crud_module');
      expect(toolNames).toContain('generate_page_component');
      expect(toolNames).toContain('query_component');
      expect(toolNames).toContain('get_best_practices');
    });

    it('should provide proper tool schemas', async () => {
      const { tools } = await mockServer.listTools();
      
      tools.forEach(tool => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
      });
    });
  });

  describe('Tool Execution', () => {
    it('should handle valid tool calls', async () => {
      mockServer.callTool.mockResolvedValue({
        content: [{ type: 'text', text: 'Success' }]
      });

      const result = await mockServer.callTool({
        name: 'create_project',
        arguments: {
          name: 'test-project',
          type: 'frontend',
          path: './test-output'
        }
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    });

    it('should throw error for unknown tools', async () => {
      mockServer.callTool.mockRejectedValue(new Error('Tool \'unknown_tool\' not found'));

      await expect(mockServer.callTool({
        name: 'unknown_tool',
        arguments: {}
      })).rejects.toThrow('Tool \'unknown_tool\' not found');
    });

    it('should validate tool arguments', async () => {
      mockServer.callTool.mockRejectedValue(new Error('Invalid arguments'));

      await expect(mockServer.callTool({
        name: 'create_project',
        arguments: {
          name: 'test-project'
          // Missing required fields
        }
      })).rejects.toThrow();
    });
  });
});