/**
 * Tool Interface Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ToolInterface } from '../../src/core/tool-interface.js';
import { BalmSharedMCPError, ErrorCodes } from '../../src/utils/errors.js';

describe('ToolInterface', () => {
  let validSchema;
  let mockHandler;

  beforeEach(() => {
    validSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', description: '名称' },
        age: { type: 'number', minimum: 0, maximum: 150 },
        email: { type: 'string', pattern: '^[^@]+@[^@]+\\.[^@]+$' },
        tags: { 
          type: 'array', 
          items: { type: 'string' },
          minItems: 1,
          maxItems: 5
        },
        active: { type: 'boolean' }
      },
      required: ['name', 'email']
    };

    mockHandler = async (args) => {
      return { success: true, data: args };
    };
  });

  describe('Tool Definition Validation', () => {
    it('should create a valid tool interface', () => {
      const tool = new ToolInterface(
        'test_tool',
        'Test tool description',
        validSchema,
        mockHandler
      );

      expect(tool.name).toBe('test_tool');
      expect(tool.description).toBe('Test tool description');
      expect(tool.inputSchema).toEqual(validSchema);
      expect(tool.handler).toBe(mockHandler);
      expect(tool.metadata).toBeDefined();
      expect(tool.metadata.createdAt).toBeDefined();
      expect(tool.metadata.version).toBe('1.0.0');
    });

    it('should throw error for invalid tool name', () => {
      expect(() => {
        new ToolInterface('', 'Description', validSchema, mockHandler);
      }).toThrow(BalmSharedMCPError);

      expect(() => {
        new ToolInterface(null, 'Description', validSchema, mockHandler);
      }).toThrow(BalmSharedMCPError);
    });

    it('should throw error for invalid description', () => {
      expect(() => {
        new ToolInterface('test', '', validSchema, mockHandler);
      }).toThrow(BalmSharedMCPError);
    });

    it('should throw error for invalid schema', () => {
      expect(() => {
        new ToolInterface('test', 'Description', null, mockHandler);
      }).toThrow(BalmSharedMCPError);

      expect(() => {
        new ToolInterface('test', 'Description', { type: 'string' }, mockHandler);
      }).toThrow(BalmSharedMCPError);
    });

    it('should throw error for invalid handler', () => {
      expect(() => {
        new ToolInterface('test', 'Description', validSchema, null);
      }).toThrow(BalmSharedMCPError);

      expect(() => {
        new ToolInterface('test', 'Description', validSchema, 'not a function');
      }).toThrow(BalmSharedMCPError);
    });
  });

  describe('Parameter Validation', () => {
    let tool;

    beforeEach(() => {
      tool = new ToolInterface('test_tool', 'Test tool', validSchema, mockHandler);
    });

    it('should validate correct parameters', () => {
      const validArgs = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
        tags: ['developer', 'javascript'],
        active: true
      };

      const result = tool.validateParameters(validArgs, 'test-request');
      expect(result).toEqual(validArgs);
    });

    it('should validate with only required parameters', () => {
      const minimalArgs = {
        name: 'Jane Doe',
        email: 'jane@example.com'
      };

      const result = tool.validateParameters(minimalArgs, 'test-request');
      expect(result.name).toBe('Jane Doe');
      expect(result.email).toBe('jane@example.com');
    });

    it('should throw error for missing required parameters', () => {
      const invalidArgs = {
        age: 25
        // Missing required 'name' and 'email'
      };

      expect(() => {
        tool.validateParameters(invalidArgs, 'test-request');
      }).toThrow(BalmSharedMCPError);
    });

    it('should validate string constraints', () => {
      const invalidEmail = {
        name: 'Test User',
        email: 'invalid-email'
      };

      expect(() => {
        tool.validateParameters(invalidEmail, 'test-request');
      }).toThrow(BalmSharedMCPError);
    });

    it('should validate number constraints', () => {
      const invalidAge = {
        name: 'Test User',
        email: 'test@example.com',
        age: -5 // Below minimum
      };

      expect(() => {
        tool.validateParameters(invalidAge, 'test-request');
      }).toThrow(BalmSharedMCPError);
    });

    it('should validate array constraints', () => {
      const tooManyTags = {
        name: 'Test User',
        email: 'test@example.com',
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6'] // Exceeds maxItems
      };

      expect(() => {
        tool.validateParameters(tooManyTags, 'test-request');
      }).toThrow(BalmSharedMCPError);
    });
  });

  describe('Tool Execution', () => {
    let tool;

    beforeEach(() => {
      tool = new ToolInterface('test_tool', 'Test tool', validSchema, mockHandler);
    });

    it('should execute tool with valid parameters', async () => {
      const args = {
        name: 'Test User',
        email: 'test@example.com'
      };

      const result = await tool.execute(args, { requestId: 'test-123' });
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0].type).toBe('text');
    });

    it('should handle tool execution errors', async () => {
      const errorHandler = async () => {
        throw new Error('Tool execution failed');
      };

      const errorTool = new ToolInterface(
        'error_tool',
        'Error tool',
        validSchema,
        errorHandler
      );

      const args = {
        name: 'Test User',
        email: 'test@example.com'
      };

      await expect(errorTool.execute(args, { requestId: 'test-123' })).rejects.toThrow();
    });
  });

  describe('Response Formatting', () => {
    let tool;

    beforeEach(() => {
      tool = new ToolInterface('test_tool', 'Test tool', validSchema, mockHandler);
    });

    it('should format string response', () => {
      const result = tool.formatResponse('Simple string response', 'test-123');
      
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('Simple string response');
    });

    it('should format object response', () => {
      const objectResponse = { status: 'success', data: { id: 1 } };
      const result = tool.formatResponse(objectResponse, 'test-123');
      
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe(JSON.stringify(objectResponse, null, 2));
    });

    it('should handle null/undefined response', () => {
      const result = tool.formatResponse(null, 'test-123');
      
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('Operation completed successfully');
    });

    it('should preserve MCP format response', () => {
      const mcpResponse = {
        content: [
          { type: 'text', text: 'Already formatted' }
        ]
      };
      
      const result = tool.formatResponse(mcpResponse, 'test-123');
      expect(result).toEqual(mcpResponse);
    });
  });

  describe('Schema Conversion', () => {
    let tool;

    beforeEach(() => {
      tool = new ToolInterface('test_tool', 'Test tool', validSchema, mockHandler);
    });

    it('should create Zod schema from JSON schema', () => {
      const zodSchema = tool.createZodSchema(validSchema);
      expect(zodSchema).toBeDefined();
      
      // Test valid data
      const validData = {
        name: 'Test',
        email: 'test@example.com'
      };
      
      expect(() => zodSchema.parse(validData)).not.toThrow();
    });

    it('should handle complex nested objects', () => {
      const complexSchema = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              profile: {
                type: 'object',
                properties: {
                  age: { type: 'number' }
                },
                required: ['age']
              }
            },
            required: ['name', 'profile']
          }
        },
        required: ['user']
      };

      const complexTool = new ToolInterface(
        'complex_tool',
        'Complex tool',
        complexSchema,
        mockHandler
      );

      const zodSchema = complexTool.createZodSchema(complexSchema);
      
      const validComplexData = {
        user: {
          name: 'John',
          profile: {
            age: 30
          }
        }
      };

      expect(() => zodSchema.parse(validComplexData)).not.toThrow();
    });
  });
});