/**
 * MCP Tool Interface Specification
 *
 * Defines the standard interface for MCP tools, including JSON Schema validation,
 * parameter validation, and response formatting.
 */

import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { BalmSharedMCPError, ErrorCodes } from '../utils/errors.js';

/**
 * Base tool interface that all MCP tools must implement
 */
export class ToolInterface {
  constructor(name, description, inputSchema, handler) {
    this.name = name;
    this.description = description;
    this.inputSchema = inputSchema;
    this.handler = handler;
    this.metadata = {
      createdAt: new Date().toISOString(),
      version: '1.0.0'
    };

    // Validate the tool definition
    this.validateToolDefinition();
  }

  /**
   * Validate the tool definition against MCP standards
   */
  validateToolDefinition() {
    if (!this.name || typeof this.name !== 'string') {
      throw new BalmSharedMCPError(
        ErrorCodes.INVALID_TOOL_DEFINITION,
        'Tool name must be a non-empty string'
      );
    }

    if (!this.description || typeof this.description !== 'string') {
      throw new BalmSharedMCPError(
        ErrorCodes.INVALID_TOOL_DEFINITION,
        'Tool description must be a non-empty string'
      );
    }

    if (!this.inputSchema || typeof this.inputSchema !== 'object') {
      throw new BalmSharedMCPError(
        ErrorCodes.INVALID_TOOL_DEFINITION,
        'Tool input schema must be a valid JSON Schema object'
      );
    }

    if (!this.handler || typeof this.handler !== 'function') {
      throw new BalmSharedMCPError(
        ErrorCodes.INVALID_TOOL_DEFINITION,
        'Tool handler must be a function'
      );
    }

    // Validate JSON Schema structure
    this.validateJsonSchema(this.inputSchema);
  }

  /**
   * Validate JSON Schema structure
   */
  validateJsonSchema(schema) {
    const requiredFields = ['type', 'properties'];

    for (const field of requiredFields) {
      if (!schema[field]) {
        throw new BalmSharedMCPError(
          ErrorCodes.INVALID_TOOL_DEFINITION,
          `Tool input schema must have '${field}' property`
        );
      }
    }

    if (schema.type !== 'object') {
      throw new BalmSharedMCPError(
        ErrorCodes.INVALID_TOOL_DEFINITION,
        'Tool input schema type must be "object"'
      );
    }

    if (typeof schema.properties !== 'object') {
      throw new BalmSharedMCPError(
        ErrorCodes.INVALID_TOOL_DEFINITION,
        'Tool input schema properties must be an object'
      );
    }
  }

  /**
   * Get tool definition for MCP protocol
   */
  getDefinition() {
    return {
      name: this.name,
      description: this.description,
      inputSchema: this.inputSchema,
      metadata: this.metadata
    };
  }

  /**
   * Execute the tool with parameter validation
   */
  async execute(args, context = {}) {
    const requestId = context.requestId || 'unknown';

    try {
      // Validate input parameters
      const validatedArgs = this.validateParameters(args, requestId);

      // Execute the tool handler
      const result = await this.handler(validatedArgs, context);

      // Format and validate response
      return this.formatResponse(result, requestId);
    } catch (error) {
      logger.error(`Tool ${this.name} execution failed`, {
        requestId,
        error: error.message,
        args
      });
      throw error;
    }
  }

  /**
   * Validate input parameters against the schema
   */
  validateParameters(args, requestId) {
    try {
      const zodSchema = this.createZodSchema(this.inputSchema);
      return zodSchema.parse(args);
    } catch (error) {
      throw new BalmSharedMCPError(
        ErrorCodes.VALIDATION_FAILED,
        `Parameter validation failed: ${error.message}`,
        {
          toolName: this.name,
          requestId,
          validationError: error.message,
          providedArgs: args,
          expectedSchema: this.inputSchema
        }
      );
    }
  }

  /**
   * Create Zod schema from JSON Schema
   */
  createZodSchema(jsonSchema) {
    const properties = {};
    const required = jsonSchema.required || [];

    for (const [key, prop] of Object.entries(jsonSchema.properties)) {
      let zodType = this.createZodTypeFromProperty(prop);

      if (!required.includes(key)) {
        zodType = zodType.optional();
      }

      properties[key] = zodType;
    }

    return z.object(properties);
  }

  /**
   * Create Zod type from JSON Schema property
   */
  createZodTypeFromProperty(prop) {
    switch (prop.type) {
      case 'string':
        let stringType = z.string();
        if (prop.enum) {
          stringType = z.enum(prop.enum);
        }
        if (prop.minLength) {
          stringType = stringType.min(prop.minLength);
        }
        if (prop.maxLength) {
          stringType = stringType.max(prop.maxLength);
        }
        if (prop.pattern) {
          stringType = stringType.regex(new RegExp(prop.pattern));
        }
        return stringType;

      case 'number':
        let numberType = z.number();
        if (prop.minimum !== undefined) {
          numberType = numberType.min(prop.minimum);
        }
        if (prop.maximum !== undefined) {
          numberType = numberType.max(prop.maximum);
        }
        return numberType;

      case 'integer':
        let intType = z.number().int();
        if (prop.minimum !== undefined) {
          intType = intType.min(prop.minimum);
        }
        if (prop.maximum !== undefined) {
          intType = intType.max(prop.maximum);
        }
        return intType;

      case 'boolean':
        return z.boolean();

      case 'array':
        if (prop.items) {
          const itemType = this.createZodTypeFromProperty(prop.items);
          let arrayType = z.array(itemType);
          if (prop.minItems) {
            arrayType = arrayType.min(prop.minItems);
          }
          if (prop.maxItems) {
            arrayType = arrayType.max(prop.maxItems);
          }
          return arrayType;
        }
        return z.array(z.any());

      case 'object':
        if (prop.properties) {
          const objectProperties = {};
          const objectRequired = prop.required || [];

          for (const [objKey, objProp] of Object.entries(prop.properties)) {
            let objType = this.createZodTypeFromProperty(objProp);
            if (!objectRequired.includes(objKey)) {
              objType = objType.optional();
            }
            objectProperties[objKey] = objType;
          }

          return z.object(objectProperties);
        }
        return z.object({}).passthrough();

      default:
        return z.any();
    }
  }

  /**
   * Format response according to MCP protocol
   */
  formatResponse(result, requestId) {
    if (result === null || result === undefined) {
      return {
        content: [
          {
            type: 'text',
            text: 'Operation completed successfully'
          }
        ]
      };
    }

    // Handle different result types
    if (typeof result === 'string') {
      return {
        content: [
          {
            type: 'text',
            text: result
          }
        ]
      };
    }

    if (typeof result === 'object') {
      // Check if it's already in MCP format
      if (result.content && Array.isArray(result.content)) {
        return result;
      }

      // Format as JSON text
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }

    // Convert other types to string
    return {
      content: [
        {
          type: 'text',
          text: String(result)
        }
      ]
    };
  }
}
