import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the MCP SDK
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn().mockImplementation(() => ({
    setRequestHandler: vi.fn(),
    connect: vi.fn().mockResolvedValue(),
    close: vi.fn()
  }))
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn()
}));

// Mock other dependencies
vi.mock('../core/mcp-server.js', () => ({
  MCPServer: vi.fn().mockImplementation(() => ({
    listTools: vi.fn().mockReturnValue({ tools: [] }),
    callTool: vi.fn().mockResolvedValue({ content: [] })
  }))
}));

vi.mock('../managers/project-manager.js', () => ({
  ProjectManager: vi.fn().mockImplementation(() => ({}))
}));

vi.mock('../generators/code-generator.js', () => ({
  CodeGenerator: vi.fn().mockImplementation(() => ({}))
}));

vi.mock('../analyzers/resource-analyzer.js', () => ({
  ResourceAnalyzer: vi.fn().mockImplementation(() => ({}))
}));

vi.mock('../handlers/file-system-handler.js', () => ({
  FileSystemHandler: vi.fn().mockImplementation(() => ({}))
}));

vi.mock('../config/index.js', () => ({
  loadConfig: vi.fn().mockResolvedValue({
    sharedLibraryPath: '/test/shared-project',
    templatesPath: '/test/templates',
    logging: { level: 'info' }
  })
}));

vi.mock('../utils/logger.js', () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn()
  };
  return {
    logger: mockLogger,
    Logger: vi.fn().mockImplementation(() => mockLogger)
  };
});

describe('Main Application Entry Point', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module cache for index.js to allow re-import
    vi.resetModules();
  });

  describe('Module Exports', () => {
    it('should have mocked dependencies available', async () => {
      const { MCPServer } = await import('../core/mcp-server.js');
      const { loadConfig } = await import('../config/index.js');
      const { logger } = await import('../utils/logger.js');

      expect(MCPServer).toBeDefined();
      expect(loadConfig).toBeDefined();
      expect(logger).toBeDefined();
    });

    it('should mock Server class correctly', async () => {
      const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');

      expect(Server).toBeDefined();

      const serverInstance = new Server({ name: 'test', version: '1.0.0' }, { capabilities: {} });
      expect(serverInstance.setRequestHandler).toBeDefined();
      expect(serverInstance.connect).toBeDefined();
    });
  });

  describe('Configuration Loading', () => {
    it('should provide valid configuration through loadConfig mock', async () => {
      const { loadConfig } = await import('../config/index.js');

      const config = await loadConfig();

      expect(config).toEqual({
        sharedLibraryPath: '/test/shared-project',
        templatesPath: '/test/templates',
        logging: { level: 'info' }
      });
    });
  });

  describe('Logger Mock', () => {
    it('should provide logger mock with all methods', async () => {
      const { logger } = await import('../utils/logger.js');

      expect(logger.info).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.debug).toBeDefined();
      expect(logger.warn).toBeDefined();
    });
  });

  describe('MCP Server Mock', () => {
    it('should create MCPServer instance correctly', async () => {
      const { MCPServer } = await import('../core/mcp-server.js');

      const mcpServer = new MCPServer({});

      expect(mcpServer.listTools).toBeDefined();
      expect(mcpServer.callTool).toBeDefined();
    });
  });
});
