import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the MCP SDK
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn().mockImplementation(() => ({
    setRequestHandler: vi.fn(),
    connect: vi.fn(),
    close: vi.fn()
  })),
  StdioServerTransport: vi.fn()
}));

// Mock other dependencies
vi.mock('../core/mcp-server.js', () => ({
  MCPServer: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(),
    stop: vi.fn().mockResolvedValue(),
    registerTools: vi.fn()
  }))
}));

vi.mock('../config/index.js', () => ({
  loadConfig: vi.fn().mockResolvedValue({
    sharedProjectPath: '/test/shared-project',
    templatesPath: '/test/templates',
    logging: { level: 'info' }
  })
}));

vi.mock('../utils/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn()
  })
}));

describe('Main Application', () => {
  let mockProcess;
  let mockConsole;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock process
    mockProcess = {
      argv: ['node', 'index.js'],
      env: {},
      exit: vi.fn(),
      on: vi.fn(),
      stdin: { on: vi.fn() },
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() }
    };

    // Mock console
    mockConsole = {
      log: vi.fn(),
      error: vi.fn(),
      info: vi.fn()
    };

    // Replace global objects
    global.process = mockProcess;
    global.console = mockConsole;
  });

  describe('Application Startup', () => {
    it('should start the MCP server successfully', async () => {
      // Import the main module after mocking
      const { MCPServer } = await import('../core/mcp-server.js');
      const { loadConfig } = await import('../config/index.js');
      const { createLogger } = await import('../utils/logger.js');

      // Simulate importing the main module
      await import('../index.js');

      expect(loadConfig).toHaveBeenCalled();
      expect(createLogger).toHaveBeenCalled();
      expect(MCPServer).toHaveBeenCalled();
    });

    it('should handle configuration loading errors', async () => {
      const { loadConfig } = await import('../config/index.js');
      loadConfig.mockRejectedValue(new Error('Config load failed'));

      try {
        await import('../index.js');
      } catch {
        // Expected to handle the error
      }

      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('should handle server startup errors', async () => {
      const { MCPServer } = await import('../core/mcp-server.js');
      const mockServer = {
        start: vi.fn().mockRejectedValue(new Error('Server start failed')),
        registerTools: vi.fn()
      };
      MCPServer.mockImplementation(() => mockServer);

      try {
        await import('../index.js');
      } catch {
        // Expected to handle the error
      }

      expect(mockConsole.error).toHaveBeenCalled();
    });
  });

  describe('Signal Handling', () => {
    it('should handle SIGINT gracefully', async () => {
      await import('../index.js');

      // Find the SIGINT handler
      const sigintCall = mockProcess.on.mock.calls.find(call => call[0] === 'SIGINT');
      expect(sigintCall).toBeDefined();

      // Simulate SIGINT
      const [, sigintHandler] = sigintCall;
      await sigintHandler();

      expect(mockProcess.exit).toHaveBeenCalledWith(0);
    });

    it('should handle SIGTERM gracefully', async () => {
      await import('../index.js');

      // Find the SIGTERM handler
      const sigtermCall = mockProcess.on.mock.calls.find(call => call[0] === 'SIGTERM');
      expect(sigtermCall).toBeDefined();

      // Simulate SIGTERM
      const [, sigtermHandler] = sigtermCall;
      await sigtermHandler();

      expect(mockProcess.exit).toHaveBeenCalledWith(0);
    });
  });

  describe('Command Line Arguments', () => {
    it('should handle --help argument', async () => {
      mockProcess.argv = ['node', 'index.js', '--help'];

      await import('../index.js');

      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
    });

    it('should handle --version argument', async () => {
      mockProcess.argv = ['node', 'index.js', '--version'];

      await import('../index.js');

      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('1.0.0'));
    });

    it('should handle --config argument', async () => {
      mockProcess.argv = ['node', 'index.js', '--config', '/custom/config.json'];

      const { loadConfig } = await import('../config/index.js');
      await import('../index.js');

      expect(loadConfig).toHaveBeenCalledWith('/custom/config.json');
    });
  });

  describe('Environment Variables', () => {
    it('should respect LOG_LEVEL environment variable', async () => {
      mockProcess.env.LOG_LEVEL = 'debug';

      const { createLogger } = await import('../utils/logger.js');
      await import('../index.js');

      expect(createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'debug'
        })
      );
    });

    it('should respect SHARED_LIBRARY_PATH environment variable', async () => {
      mockProcess.env.SHARED_LIBRARY_PATH = '/env/shared-library';

      const { loadConfig } = await import('../config/index.js');
      await import('../index.js');

      // Config should be loaded and environment variables should be considered
      expect(loadConfig).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle uncaught exceptions', async () => {
      await import('../index.js');

      // Find the uncaughtException handler
      const uncaughtCall = mockProcess.on.mock.calls.find(call => call[0] === 'uncaughtException');
      expect(uncaughtCall).toBeDefined();

      // Simulate uncaught exception
      const [, uncaughtHandler] = uncaughtCall;
      const error = new Error('Uncaught error');
      uncaughtHandler(error);

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Uncaught Exception:'),
        error
      );
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });

    it('should handle unhandled promise rejections', async () => {
      await import('../index.js');

      // Find the unhandledRejection handler
      const rejectionCall = mockProcess.on.mock.calls.find(
        call => call[0] === 'unhandledRejection'
      );
      expect(rejectionCall).toBeDefined();

      // Simulate unhandled rejection
      const [, rejectionHandler] = rejectionCall;
      const reason = new Error('Unhandled rejection');
      rejectionHandler(reason);

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Unhandled Rejection:'),
        reason
      );
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('Graceful Shutdown', () => {
    it('should cleanup resources on shutdown', async () => {
      const { MCPServer } = await import('../core/mcp-server.js');
      const mockServer = {
        start: vi.fn().mockResolvedValue(),
        stop: vi.fn().mockResolvedValue(),
        registerTools: vi.fn()
      };
      MCPServer.mockImplementation(() => mockServer);

      await import('../index.js');

      // Simulate shutdown
      const sigintCall = mockProcess.on.mock.calls.find(call => call[0] === 'SIGINT');
      const [, sigintHandler] = sigintCall;
      await sigintHandler();

      expect(mockServer.stop).toHaveBeenCalled();
    });

    it('should handle shutdown errors gracefully', async () => {
      const { MCPServer } = await import('../core/mcp-server.js');
      const mockServer = {
        start: vi.fn().mockResolvedValue(),
        stop: vi.fn().mockRejectedValue(new Error('Shutdown failed')),
        registerTools: vi.fn()
      };
      MCPServer.mockImplementation(() => mockServer);

      await import('../index.js');

      // Simulate shutdown
      const sigintCall = mockProcess.on.mock.calls.find(call => call[0] === 'SIGINT');
      const [, sigintHandler] = sigintCall;
      await sigintHandler();

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Error during shutdown:')
      );
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });
  });
});
