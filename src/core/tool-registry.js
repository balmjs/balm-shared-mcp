/**
 * Tool Registry and Management System
 *
 * Manages tool registration, discovery, and lifecycle for the MCP server.
 */

import { logger } from '../utils/logger.js';
import { BalmSharedMCPError, ErrorCodes } from '../utils/errors.js';
import { ToolInterface } from './tool-interface.js';

export class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.categories = new Map();
    this.metadata = {
      createdAt: new Date().toISOString(),
      totalRegistrations: 0,
      lastRegistration: null
    };
  }

  /**
   * Register a new tool
   */
  register(name, description, inputSchema, handler, options = {}) {
    try {
      // Create tool interface
      const toolInterface = new ToolInterface(name, description, inputSchema, handler);

      // Check for duplicate registration
      if (this.tools.has(name)) {
        if (!options.allowOverride) {
          throw new BalmSharedMCPError(
            ErrorCodes.TOOL_ALREADY_EXISTS,
            `Tool '${name}' is already registered`
          );
        }
        logger.warn(`Overriding existing tool: ${name}`);
      }

      // Register the tool
      this.tools.set(name, {
        interface: toolInterface,
        category: options.category || 'general',
        tags: options.tags || [],
        registeredAt: new Date().toISOString(),
        usage: {
          callCount: 0,
          lastCalled: null,
          totalExecutionTime: 0,
          errorCount: 0
        }
      });

      // Update category mapping
      const category = options.category || 'general';
      if (!this.categories.has(category)) {
        this.categories.set(category, new Set());
      }
      this.categories.get(category).add(name);

      // Update metadata
      this.metadata.totalRegistrations++;
      this.metadata.lastRegistration = new Date().toISOString();

      logger.info(`Tool registered successfully: ${name}`, {
        category,
        tags: options.tags,
        totalTools: this.tools.size
      });

      return toolInterface;
    } catch (error) {
      logger.error(`Failed to register tool: ${name}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Unregister a tool
   */
  unregister(name) {
    if (!this.tools.has(name)) {
      throw new BalmSharedMCPError(ErrorCodes.TOOL_NOT_FOUND, `Tool '${name}' not found`);
    }

    const tool = this.tools.get(name);

    // Remove from category mapping
    this.categories.get(tool.category)?.delete(name);
    if (this.categories.get(tool.category)?.size === 0) {
      this.categories.delete(tool.category);
    }

    // Remove from registry
    this.tools.delete(name);

    logger.info(`Tool unregistered: ${name}`, {
      remainingTools: this.tools.size
    });
  }

  /**
   * Get a tool by name
   */
  get(name) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new BalmSharedMCPError(ErrorCodes.TOOL_NOT_FOUND, `Tool '${name}' not found`);
    }
    return tool;
  }

  /**
   * Check if a tool exists
   */
  has(name) {
    return this.tools.has(name);
  }

  /**
   * List all registered tools
   */
  list(options = {}) {
    const { category, tags, includeUsage = false } = options;

    let tools = Array.from(this.tools.entries());

    // Filter by category
    if (category) {
      tools = tools.filter(([, tool]) => tool.category === category);
    }

    // Filter by tags
    if (tags && tags.length > 0) {
      tools = tools.filter(([, tool]) => tags.some(tag => tool.tags.includes(tag)));
    }

    return tools.map(([name, tool]) => {
      const definition = tool.interface.getDefinition();

      const result = {
        name,
        description: definition.description,
        inputSchema: definition.inputSchema,
        category: tool.category,
        tags: tool.tags,
        registeredAt: tool.registeredAt
      };

      if (includeUsage) {
        result.usage = tool.usage;
      }

      return result;
    });
  }

  /**
   * Get tools by category
   */
  getByCategory(category) {
    const toolNames = this.categories.get(category);
    if (!toolNames) {
      return [];
    }

    return Array.from(toolNames).map(name => ({
      name,
      ...this.tools.get(name)
    }));
  }

  /**
   * Get all categories
   */
  getCategories() {
    return Array.from(this.categories.keys()).map(category => ({
      name: category,
      toolCount: this.categories.get(category).size,
      tools: Array.from(this.categories.get(category))
    }));
  }

  /**
   * Execute a tool
   */
  async execute(name, args, context = {}) {
    const tool = this.get(name);
    const startTime = Date.now();

    try {
      // Update usage statistics
      tool.usage.callCount++;
      tool.usage.lastCalled = new Date().toISOString();

      // Execute the tool
      const result = await tool.interface.execute(args, {
        ...context,
        toolName: name,
        category: tool.category
      });

      // Update execution time
      const executionTime = Date.now() - startTime;
      tool.usage.totalExecutionTime += executionTime;

      logger.debug(`Tool executed successfully: ${name}`, {
        executionTime: `${executionTime}ms`,
        callCount: tool.usage.callCount
      });

      return result;
    } catch (error) {
      // Update error statistics
      tool.usage.errorCount++;

      logger.error(`Tool execution failed: ${name}`, {
        error: error.message,
        callCount: tool.usage.callCount,
        errorCount: tool.usage.errorCount
      });

      throw error;
    }
  }

  /**
   * Get registry statistics
   */
  getStatistics() {
    const stats = {
      totalTools: this.tools.size,
      categories: this.categories.size,
      metadata: this.metadata,
      usage: {
        totalCalls: 0,
        totalErrors: 0,
        totalExecutionTime: 0,
        mostUsedTool: null,
        leastUsedTool: null
      }
    };

    let maxCalls = 0;
    let minCalls = Infinity;
    let maxCallsTool = null;
    let minCallsTool = null;

    for (const [name, tool] of this.tools.entries()) {
      stats.usage.totalCalls += tool.usage.callCount;
      stats.usage.totalErrors += tool.usage.errorCount;
      stats.usage.totalExecutionTime += tool.usage.totalExecutionTime;

      if (tool.usage.callCount > maxCalls) {
        maxCalls = tool.usage.callCount;
        maxCallsTool = name;
      }

      if (tool.usage.callCount < minCalls) {
        minCalls = tool.usage.callCount;
        minCallsTool = name;
      }
    }

    stats.usage.mostUsedTool = maxCallsTool;
    stats.usage.leastUsedTool = minCallsTool;

    return stats;
  }

  /**
   * Validate all registered tools
   */
  validateAll() {
    const results = [];

    for (const [name, tool] of this.tools.entries()) {
      try {
        tool.interface.validateToolDefinition();
        results.push({ name, valid: true });
      } catch (error) {
        results.push({
          name,
          valid: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Clear all tools
   */
  clear() {
    const count = this.tools.size;
    this.tools.clear();
    this.categories.clear();

    logger.info('Cleared all tools from registry', { clearedCount: count });
  }
}
