import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToolRegistry } from '../tool-registry.js';
import { BalmSharedMCPError } from '../../utils/errors.js';
import { 
  createMockTool,
  createMockMCPContext
} from '../../../tests/utils/mock-utilities.js';

describe('ToolRegistry', () => {
  let registry;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = new ToolRegistry();
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(registry.tools).toBeInstanceOf(Map);
      expect(registry.categories).toBeInstanceOf(Map);
      expect(registry.metadata).toBeDefined();
    });
  });

  describe('register', () => {
    let mockTool;

    beforeEach(() => {
      mockTool = createMockTool({
        name: 'test_tool',
        category: 'testing'
      });
    });

    it('should register tool successfully', () => {
      registry.register(
        mockTool.name,
        mockTool.description,
        mockTool.inputSchema,
        mockTool.handler,
        { category: mockTool.category }
      );

      expect(registry.tools.has('test_tool')).toBe(true);
      const registeredTool = registry.tools.get('test_tool');
      expect(registeredTool.interface.name).toBe('test_tool');
      expect(registeredTool.usage.callCount).toBe(0);
      expect(registeredTool.usage.errorCount).toBe(0);
    });

    it('should prevent duplicate tool registration by default', () => {
      registry.register(
        mockTool.name,
        mockTool.description,
        mockTool.inputSchema,
        mockTool.handler
      );

      expect(() => {
        registry.register(
          mockTool.name,
          mockTool.description,
          mockTool.inputSchema,
          mockTool.handler
        );
      }).toThrow(BalmSharedMCPError);
    });

    it('should allow duplicate registration with allowOverride', () => {
      registry.register(
        mockTool.name,
        mockTool.description,
        mockTool.inputSchema,
        mockTool.handler
      );

      expect(() => {
        registry.register(
          mockTool.name,
          mockTool.description,
          mockTool.inputSchema,
          mockTool.handler,
          { allowOverride: true }
        );
      }).not.toThrow();
    });

    it('should organize tools by category', () => {
      registry.register(
        mockTool.name,
        mockTool.description,
        mockTool.inputSchema,
        mockTool.handler,
        { category: mockTool.category }
      );

      expect(registry.categories.has('testing')).toBe(true);
      expect(registry.categories.get('testing')).toContain('test_tool');
    });
  });

  describe('execute', () => {
    let mockTool;
    let mockContext;

    beforeEach(() => {
      mockTool = createMockTool({
        name: 'test_tool',
        category: 'testing',
        handler: vi.fn().mockResolvedValue({ success: true, data: 'result' })
      });
      mockContext = createMockMCPContext();

      registry.register(
        mockTool.name,
        mockTool.description,
        mockTool.inputSchema,
        mockTool.handler,
        { category: mockTool.category }
      );
    });

    it('should execute tool successfully', async () => {
      const args = { name: 'Test User' };
      const result = await registry.execute('test_tool', args, mockContext);

      expect(mockTool.handler).toHaveBeenCalledWith(args, expect.objectContaining({
        requestId: mockContext.requestId,
        toolName: 'test_tool',
        category: 'testing'
      }));
      expect(result.content).toBeDefined();

      const tool = registry.tools.get('test_tool');
      expect(tool.usage.callCount).toBe(1);
      expect(tool.usage.errorCount).toBe(0);
    });

    it('should handle execution errors', async () => {
      const errorTool = {
        name: 'error_tool',
        description: 'Error tool',
        inputSchema: { 
          type: 'object',
          properties: {}
        },
        handler: vi.fn().mockRejectedValue(new Error('Execution failed'))
      };

      registry.register(
        errorTool.name,
        errorTool.description,
        errorTool.inputSchema,
        errorTool.handler
      );

      await expect(
        registry.execute('error_tool', {}, { requestId: 'test-123' })
      ).rejects.toThrow('Execution failed');

      const tool = registry.tools.get('error_tool');
      expect(tool.usage.callCount).toBe(1);
      expect(tool.usage.errorCount).toBe(1);
    });

    it('should throw error for non-existent tool', async () => {
      await expect(
        registry.execute('non_existent', {}, { requestId: 'test-123' })
      ).rejects.toThrow(BalmSharedMCPError);
    });

    it('should track execution times', async () => {
      const slowTool = {
        name: 'slow_tool',
        description: 'Slow tool',
        inputSchema: { 
          type: 'object',
          properties: {}
        },
        handler: vi.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return { success: true };
        })
      };

      registry.register(
        slowTool.name,
        slowTool.description,
        slowTool.inputSchema,
        slowTool.handler
      );

      await registry.execute('slow_tool', {}, { requestId: 'test-123' });

      const tool = registry.tools.get('slow_tool');
      expect(tool.usage.totalExecutionTime).toBeGreaterThan(0);
    });
  });

  describe('get', () => {
    const mockTool = {
      name: 'test_tool',
      description: 'Test tool',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      },
      handler: vi.fn().mockResolvedValue({ success: true })
    };

    beforeEach(() => {
      registry.register(
        mockTool.name,
        mockTool.description,
        mockTool.inputSchema,
        mockTool.handler
      );
    });

    it('should return tool by name', () => {
      const tool = registry.get('test_tool');
      expect(tool).toBeDefined();
      expect(tool.interface.name).toBe('test_tool');
    });

    it('should throw error for non-existent tool', () => {
      expect(() => {
        registry.get('non_existent');
      }).toThrow(BalmSharedMCPError);
    });
  });

  describe('list', () => {
    const mockTools = [
      {
        name: 'tool1',
        description: 'Tool 1',
        category: 'category1',
        inputSchema: { type: 'object', properties: {} },
        handler: vi.fn()
      },
      {
        name: 'tool2',
        description: 'Tool 2',
        category: 'category2',
        inputSchema: { type: 'object', properties: {} },
        handler: vi.fn()
      }
    ];

    beforeEach(() => {
      mockTools.forEach(tool => {
        registry.register(
          tool.name,
          tool.description,
          tool.inputSchema,
          tool.handler,
          { category: tool.category }
        );
      });
    });

    it('should return list of all tools', () => {
      const tools = registry.list();
      expect(tools).toHaveLength(2);
      expect(tools.map(t => t.name)).toContain('tool1');
      expect(tools.map(t => t.name)).toContain('tool2');
    });

    it('should filter tools by category', () => {
      const tools = registry.list({ category: 'category1' });
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('tool1');
    });
  });

  describe('unregister', () => {
    const mockTool = {
      name: 'test_tool',
      description: 'Test tool',
      category: 'testing',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      },
      handler: vi.fn().mockResolvedValue({ success: true })
    };

    beforeEach(() => {
      registry.register(
        mockTool.name,
        mockTool.description,
        mockTool.inputSchema,
        mockTool.handler,
        { category: mockTool.category }
      );
    });

    it('should unregister tool successfully', () => {
      registry.unregister('test_tool');
      expect(registry.tools.has('test_tool')).toBe(false);
    });

    it('should throw error for non-existent tool', () => {
      expect(() => {
        registry.unregister('non_existent');
      }).toThrow(BalmSharedMCPError);
    });

    it('should clean up empty categories', () => {
      registry.unregister('test_tool');
      expect(registry.categories.has('testing')).toBe(false);
    });
  });

  describe('getCategories', () => {
    it('should return all categories', () => {
      const tools = [
        { name: 'tool1', category: 'cat1' },
        { name: 'tool2', category: 'cat2' },
        { name: 'tool3', category: 'cat1' }
      ];

      tools.forEach(tool => {
        registry.register(
          tool.name,
          'Description',
          { type: 'object', properties: {} },
          vi.fn(),
          { category: tool.category }
        );
      });

      const categories = registry.getCategories();
      expect(categories).toHaveLength(2);
      expect(categories.map(c => c.name)).toContain('cat1');
      expect(categories.map(c => c.name)).toContain('cat2');
    });
  });

  describe('getStatistics', () => {
    it('should return usage statistics', () => {
      const tool = {
        name: 'test_tool',
        description: 'Test tool',
        inputSchema: { type: 'object', properties: {} },
        handler: vi.fn()
      };

      registry.register(
        tool.name,
        tool.description,
        tool.inputSchema,
        tool.handler
      );

      const stats = registry.getStatistics();
      expect(stats.totalTools).toBe(1);
      expect(stats.usage.totalCalls).toBe(0);
      expect(stats.usage.totalErrors).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all tools and categories', () => {
      const tool = {
        name: 'test_tool',
        description: 'Test tool',
        inputSchema: { type: 'object', properties: {} },
        handler: vi.fn()
      };

      registry.register(
        tool.name,
        tool.description,
        tool.inputSchema,
        tool.handler,
        { category: 'testing' }
      );

      registry.clear();

      expect(registry.tools.size).toBe(0);
      expect(registry.categories.size).toBe(0);
    });
  });
});