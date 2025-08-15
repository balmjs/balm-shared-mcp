/**
 * Tool Registry Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ToolRegistry } from '../../src/core/tool-registry.js';
import { BalmSharedMCPError, ErrorCodes } from '../../src/utils/errors.js';

describe('ToolRegistry', () => {
  let registry;
  let mockHandler;
  let validSchema;

  beforeEach(() => {
    registry = new ToolRegistry();
    
    validSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', description: '名称' },
        value: { type: 'number', description: '数值' }
      },
      required: ['name']
    };

    mockHandler = async (args) => {
      return { success: true, input: args };
    };
  });

  describe('Tool Registration', () => {
    it('should register a new tool successfully', () => {
      const toolInterface = registry.register(
        'test_tool',
        'Test tool description',
        validSchema,
        mockHandler,
        { category: 'testing', tags: ['test', 'demo'] }
      );

      expect(toolInterface).toBeDefined();
      expect(registry.has('test_tool')).toBe(true);
      
      const stats = registry.getStatistics();
      expect(stats.totalTools).toBe(1);
      expect(stats.categories).toBe(1);
    });

    it('should prevent duplicate tool registration by default', () => {
      registry.register('duplicate_tool', 'First registration', validSchema, mockHandler);
      
      expect(() => {
        registry.register('duplicate_tool', 'Second registration', validSchema, mockHandler);
      }).toThrow(BalmSharedMCPError);
    });

    it('should allow tool override when specified', () => {
      registry.register('override_tool', 'First registration', validSchema, mockHandler);
      
      expect(() => {
        registry.register(
          'override_tool', 
          'Second registration', 
          validSchema, 
          mockHandler,
          { allowOverride: true }
        );
      }).not.toThrow();
    });

    it('should categorize tools correctly', () => {
      registry.register('tool1', 'Tool 1', validSchema, mockHandler, { category: 'cat1' });
      registry.register('tool2', 'Tool 2', validSchema, mockHandler, { category: 'cat1' });
      registry.register('tool3', 'Tool 3', validSchema, mockHandler, { category: 'cat2' });

      const categories = registry.getCategories();
      expect(categories).toHaveLength(2);
      
      const cat1 = categories.find(c => c.name === 'cat1');
      expect(cat1.toolCount).toBe(2);
      expect(cat1.tools).toContain('tool1');
      expect(cat1.tools).toContain('tool2');
    });

    it('should handle tags correctly', () => {
      registry.register(
        'tagged_tool',
        'Tagged tool',
        validSchema,
        mockHandler,
        { tags: ['tag1', 'tag2', 'common'] }
      );

      const tools = registry.list({ tags: ['tag1'] });
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('tagged_tool');
      expect(tools[0].tags).toContain('tag1');
    });
  });

  describe('Tool Retrieval', () => {
    beforeEach(() => {
      registry.register('tool1', 'Tool 1', validSchema, mockHandler, { category: 'cat1' });
      registry.register('tool2', 'Tool 2', validSchema, mockHandler, { category: 'cat2' });
      registry.register('tool3', 'Tool 3', validSchema, mockHandler, { category: 'cat1' });
    });

    it('should get tool by name', () => {
      const tool = registry.get('tool1');
      expect(tool).toBeDefined();
      expect(tool.category).toBe('cat1');
      expect(tool.interface).toBeDefined();
    });

    it('should throw error for non-existent tool', () => {
      expect(() => {
        registry.get('non_existent_tool');
      }).toThrow(BalmSharedMCPError);
    });

    it('should list all tools', () => {
      const tools = registry.list();
      expect(tools).toHaveLength(3);
      
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('tool1');
      expect(toolNames).toContain('tool2');
      expect(toolNames).toContain('tool3');
    });

    it('should filter tools by category', () => {
      const cat1Tools = registry.list({ category: 'cat1' });
      expect(cat1Tools).toHaveLength(2);
      
      const toolNames = cat1Tools.map(t => t.name);
      expect(toolNames).toContain('tool1');
      expect(toolNames).toContain('tool3');
    });

    it('should get tools by category', () => {
      const cat1Tools = registry.getByCategory('cat1');
      expect(cat1Tools).toHaveLength(2);
    });

    it('should return empty array for non-existent category', () => {
      const tools = registry.getByCategory('non_existent');
      expect(tools).toHaveLength(0);
    });
  });

  describe('Tool Execution', () => {
    beforeEach(() => {
      registry.register('exec_tool', 'Execution tool', validSchema, mockHandler);
    });

    it('should execute tool successfully', async () => {
      const args = { name: 'test', value: 42 };
      const result = await registry.execute('exec_tool', args, { requestId: 'test-123' });
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    });

    it('should update usage statistics on execution', async () => {
      const args = { name: 'test' };
      
      await registry.execute('exec_tool', args);
      await registry.execute('exec_tool', args);
      
      const tool = registry.get('exec_tool');
      expect(tool.usage.callCount).toBe(2);
      expect(tool.usage.lastCalled).toBeDefined();
      expect(tool.usage.totalExecutionTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle execution errors', async () => {
      const errorHandler = async () => {
        throw new Error('Execution failed');
      };

      registry.register('error_tool', 'Error tool', validSchema, errorHandler);
      
      const args = { name: 'test' };
      
      await expect(registry.execute('error_tool', args)).rejects.toThrow();
      
      const tool = registry.get('error_tool');
      expect(tool.usage.errorCount).toBe(1);
    });

    it('should throw error for non-existent tool execution', async () => {
      await expect(registry.execute('non_existent', {})).rejects.toThrow(BalmSharedMCPError);
    });
  });

  describe('Tool Management', () => {
    beforeEach(() => {
      registry.register('temp_tool', 'Temporary tool', validSchema, mockHandler);
    });

    it('should unregister tool successfully', () => {
      expect(registry.has('temp_tool')).toBe(true);
      
      registry.unregister('temp_tool');
      
      expect(registry.has('temp_tool')).toBe(false);
    });

    it('should throw error when unregistering non-existent tool', () => {
      expect(() => {
        registry.unregister('non_existent_tool');
      }).toThrow(BalmSharedMCPError);
    });

    it('should clear all tools', () => {
      registry.register('tool1', 'Tool 1', validSchema, mockHandler);
      registry.register('tool2', 'Tool 2', validSchema, mockHandler);
      
      expect(registry.getStatistics().totalTools).toBe(3); // Including temp_tool
      
      registry.clear();
      
      expect(registry.getStatistics().totalTools).toBe(0);
    });
  });

  describe('Statistics and Validation', () => {
    beforeEach(() => {
      registry.register('stat_tool1', 'Stat tool 1', validSchema, mockHandler);
      registry.register('stat_tool2', 'Stat tool 2', validSchema, mockHandler);
    });

    it('should provide accurate statistics', () => {
      const stats = registry.getStatistics();
      
      expect(stats.totalTools).toBe(2);
      expect(stats.categories).toBe(1); // Both use default 'general' category
      expect(stats.metadata).toBeDefined();
      expect(stats.metadata.totalRegistrations).toBe(2);
      expect(stats.usage).toBeDefined();
    });

    it('should validate all tools', () => {
      const results = registry.validateAll();
      
      expect(results).toHaveLength(2);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(true);
    });

    it('should detect invalid tools during validation', () => {
      // Manually corrupt a tool to test validation
      const tool = registry.get('stat_tool1');
      tool.interface.name = null; // Make it invalid
      
      const results = registry.validateAll();
      const invalidTool = results.find(r => r.name === 'stat_tool1');
      
      expect(invalidTool.valid).toBe(false);
      expect(invalidTool.error).toBeDefined();
    });
  });

  describe('Usage Statistics Tracking', () => {
    let fastHandler;
    let slowHandler;

    beforeEach(() => {
      fastHandler = async (args) => {
        return { result: 'fast', args };
      };

      slowHandler = async (args) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { result: 'slow', args };
      };

      registry.register('fast_tool', 'Fast tool', validSchema, fastHandler);
      registry.register('slow_tool', 'Slow tool', validSchema, slowHandler);
    });

    it('should track most and least used tools', async () => {
      // Execute fast_tool more times
      await registry.execute('fast_tool', { name: 'test1' });
      await registry.execute('fast_tool', { name: 'test2' });
      await registry.execute('fast_tool', { name: 'test3' });
      
      // Execute slow_tool once
      await registry.execute('slow_tool', { name: 'test1' });
      
      const stats = registry.getStatistics();
      expect(stats.usage.mostUsedTool).toBe('fast_tool');
      expect(stats.usage.leastUsedTool).toBe('slow_tool');
      expect(stats.usage.totalCalls).toBe(4);
    });

    it('should track execution times', async () => {
      await registry.execute('fast_tool', { name: 'test' });
      await registry.execute('slow_tool', { name: 'test' });
      
      const fastTool = registry.get('fast_tool');
      const slowTool = registry.get('slow_tool');
      
      expect(fastTool.usage.totalExecutionTime).toBeGreaterThanOrEqual(0);
      expect(slowTool.usage.totalExecutionTime).toBeGreaterThanOrEqual(10);
    });
  });
});