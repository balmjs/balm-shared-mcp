#!/usr/bin/env node

/**
 * BalmSharedMCP - Model Context Protocol Server
 * 
 * Entry point for the MCP server that provides intelligent interaction
 * capabilities with the shared-project frontend resource library.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { MCPServer } from './core/mcp-server.js';
import { ProjectManager } from './managers/project-manager.js';
import { CodeGenerator } from './generators/code-generator.js';
import { ResourceAnalyzer } from './analyzers/resource-analyzer.js';
import { FileSystemHandler } from './handlers/file-system-handler.js';
import { loadConfig } from './config/index.js';
import { logger } from './utils/logger.js';

/**
 * Initialize and start the MCP server
 */
async function main() {
  try {
    // Load configuration
    const config = await loadConfig();
    logger.info('BalmSharedMCP server starting...', { config });

    // Initialize core components
    const fileSystemHandler = new FileSystemHandler();
    const resourceAnalyzer = new ResourceAnalyzer(config.sharedLibraryPath);
    const projectManager = new ProjectManager(fileSystemHandler, config);
    const codeGenerator = new CodeGenerator(fileSystemHandler, config);

    // Create MCP server instance
    const mcpServer = new MCPServer({
      projectManager,
      codeGenerator,
      resourceAnalyzer,
      fileSystemHandler,
      config
    });

    // Create and configure the server
    const server = new Server(
      {
        name: 'balm-shared-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Register tool handlers
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return mcpServer.listTools();
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      return mcpServer.callTool(request.params);
    });

    // Start the server
    const transport = new StdioServerTransport();
    await server.connect(transport);

    logger.info('BalmSharedMCP server started successfully');

  } catch (error) {
    logger.error('Failed to start BalmSharedMCP server', { error: error.message });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  logger.error('Unhandled error in main process', { error: error.message });
  process.exit(1);
});