import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToolInterface } from '../tool-interface.js';
import { BalmSharedMCPError } from '../../utils/errors.js';
import { createMockLogger, createMockTool } from '../../../tests/utils/mock-utilities.js';

describe('ToolInterface', () => {
  let toolInterface;
  let mockLogger;
  let mockTool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = createMockLogger();
    mockTool = createMockTool();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = createMockLogger();
    mockTool = createMockTool();

    toolInterface = new ToolInterface(
      mockTool.name,
      mockTool.description,
      mockTool.inputSchema,
      mockTool.handler
    );
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(toolInterface.name).toBe('test_tool');
      expect(toolInterface.description).toBe('Test tool for mocking');
      expect(toolInterface.inputSchema).toEqual(mockTool.inputSchema);
      expect(toolInterface.handler).toBe(mockTool.handler);
      expect(toolInterface.metadata).toBeDefined();
    });

    it('should throw error for invalid name', () => {
      expect(() => {
        new ToolInterface('', 'description', {}, vi.fn());
      }).toThrow(BalmSharedMCPError);
    });

    it('should throw error for invalid description', () => {
      expect(() => {
        new ToolInterface('name', '', {}, vi.fn());
      }).toThrow(BalmSharedMCPError);
    });
  });

  describe('getDefinition', () => {
    it('should return tool definition', () => {
      const definition = toolInterface.getDefinition();

      expect(definition.name).toBe('test_tool');
      expect(definition.description).toBe('Test tool for mocking');
      expect(definition.inputSchema).toEqual(mockTool.inputSchema);
      expect(definition.metadata).toBeDefined();
    });
  });

  describe('execute', () => {
    const mockTool = {
      name: 'test_tool',
      description: 'Test tool',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', required: true }
        }
      },
      handler: vi.fn().mockResolvedValue({ success: true, data: 'test result' })
    };

    beforeEach(() => {
      toolInterface = new ToolInterface(
        mockTool.name,
        mockTool.description,
        mockTool.inputSchema,
        mockTool.handler
      );
    });

    it('should execute tool successfully', async () => {
      const args = { name: 'Test User' };
      const result = await toolInterface.execute(args, { requestId: 'test-123' });

      expect(mockTool.handler).toHaveBeenCalledWith(args, { requestId: 'test-123' });
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    it('should handle tool execution errors', async () => {
      const errorTool = {
        name: 'error_tool',
        description: 'Error tool',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' }
          }
        },
        handler: vi.fn().mockRejectedValue(new Error('Tool execution failed'))
      };

      const errorToolInterface = new ToolInterface(
        errorTool.name,
        errorTool.description,
        errorTool.inputSchema,
        errorTool.handler
      );

      await expect(
        errorToolInterface.execute({ name: 'Test User' }, { requestId: 'test-123' })
      ).rejects.toThrow('Tool execution failed');
    });
  });

  describe('validateParameters', () => {
    it('should validate correct input against schema', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['name']
      };

      const testTool = new ToolInterface('test_tool', 'Test tool', schema, vi.fn());

      const input = { name: 'John', age: 30 };

      expect(() => {
        testTool.validateParameters(input, 'test-123');
      }).not.toThrow();
    });

    it('should throw error for invalid input', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' }
        },
        required: ['name']
      };

      const testTool = new ToolInterface('test_tool', 'Test tool', schema, vi.fn());

      const input = { age: 30 }; // missing required 'name'

      expect(() => {
        testTool.validateParameters(input, 'test-123');
      }).toThrow(BalmSharedMCPError);
    });

    it('should handle complex nested schemas', () => {
      const schema = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              contacts: {
                type: 'array',
                items: { type: 'string' }
              }
            },
            required: ['name']
          }
        },
        required: ['user']
      };

      const testTool = new ToolInterface('test_tool', 'Test tool', schema, vi.fn());

      const input = {
        user: {
          name: 'John',
          contacts: ['email@example.com', 'phone']
        }
      };

      expect(() => {
        testTool.validateParameters(input, 'test-123');
      }).not.toThrow();
    });
  });

  describe('formatResponse', () => {
    it('should format string response', () => {
      const result = toolInterface.formatResponse('test result', 'test-123');

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('test result');
    });

    it('should format object response', () => {
      const result = toolInterface.formatResponse({ success: true, data: 'test' }, 'test-123');

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('"success": true');
    });

    it('should handle null/undefined response', () => {
      const result = toolInterface.formatResponse(null, 'test-123');

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('Operation completed successfully');
    });

    it('should preserve MCP format response', () => {
      const mcpResponse = {
        content: [{ type: 'text', text: 'Already formatted' }]
      };

      const result = toolInterface.formatResponse(mcpResponse, 'test-123');
      expect(result).toEqual(mcpResponse);
    });
  });

  describe('validateJsonSchema', () => {
    it('should validate correct schema', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      };

      expect(() => {
        toolInterface.validateJsonSchema(schema);
      }).not.toThrow();
    });

    it('should throw error for missing type', () => {
      const schema = {
        properties: {
          name: { type: 'string' }
        }
      };

      expect(() => {
        toolInterface.validateJsonSchema(schema);
      }).toThrow(BalmSharedMCPError);
    });

    it('should throw error for missing properties', () => {
      const schema = {
        type: 'object'
      };

      expect(() => {
        toolInterface.validateJsonSchema(schema);
      }).toThrow(BalmSharedMCPError);
    });

    it('should throw error for non-object type', () => {
      const schema = {
        type: 'string',
        properties: {}
      };

      expect(() => {
        toolInterface.validateJsonSchema(schema);
      }).toThrow(BalmSharedMCPError);
    });
  });
});
