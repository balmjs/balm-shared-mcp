/**
 * Example Test File - Demonstrates Standardized Mock Patterns
 * 
 * This file serves as an example of how to use the standardized mock utilities
 * and testing patterns across the project.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  createMockLogger,
  createMockFileSystemHandler,
  createMockTool,
  createMockMCPContext,
  createMockModelOptions,
  mockSetups,
  mockAssertions,
  testDataFactories
} from '../utils/mock-utilities.js';

// Example class to test (this would be your actual class)
class ExampleService {
  constructor(fileSystemHandler, logger) {
    this.fileSystemHandler = fileSystemHandler;
    this.logger = logger;
  }

  async processFile(filePath, content) {
    try {
      this.logger.info(`Processing file: ${filePath}`);
      
      if (!this.fileSystemHandler.exists(filePath)) {
        await this.fileSystemHandler.writeFile(filePath, content);
        this.logger.info(`File created: ${filePath}`);
      } else {
        await this.fileSystemHandler.writeFile(filePath, content);
        this.logger.info(`File updated: ${filePath}`);
      }
      
      return { success: true, path: filePath };
    } catch (error) {
      this.logger.error('Failed to process file', { error: error.message });
      throw error;
    }
  }

  async readConfig(configPath) {
    const content = await this.fileSystemHandler.readFile(configPath);
    return JSON.parse(content);
  }
}

describe('ExampleService - Standardized Mock Patterns', () => {
  let service;
  let mockFileSystemHandler;
  let mockLogger;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Use factory functions for consistent mock creation
    mockLogger = createMockLogger();
    mockFileSystemHandler = createMockFileSystemHandler();
    
    // Use setup helpers for common scenarios
    mockSetups.setupSuccessfulFileOperations(mockFileSystemHandler);
    
    service = new ExampleService(mockFileSystemHandler, mockLogger);
  });

  describe('processFile', () => {
    it('should create new file when file does not exist', async () => {
      // Arrange
      const filePath = '/test/new-file.txt';
      const content = 'test content';
      mockFileSystemHandler.exists.mockReturnValue(false);

      // Act
      const result = await service.processFile(filePath, content);

      // Assert
      expect(result.success).toBe(true);
      expect(result.path).toBe(filePath);
      
      // Use assertion helpers for common patterns
      mockAssertions.assertFileWritten(mockFileSystemHandler, filePath, content);
      mockAssertions.assertLoggerCalled(mockLogger, 'info', 'Processing file');
      mockAssertions.assertLoggerCalled(mockLogger, 'info', 'File created');
    });

    it('should update existing file when file exists', async () => {
      // Arrange
      const filePath = '/test/existing-file.txt';
      const content = 'updated content';
      mockFileSystemHandler.exists.mockReturnValue(true);

      // Act
      const result = await service.processFile(filePath, content);

      // Assert
      expect(result.success).toBe(true);
      mockAssertions.assertFileWritten(mockFileSystemHandler, filePath, content);
      mockAssertions.assertLoggerCalled(mockLogger, 'info', 'File updated');
    });

    it('should handle file write errors gracefully', async () => {
      // Arrange
      const filePath = '/test/error-file.txt';
      const content = 'test content';
      mockSetups.setupPermissionDenied(mockFileSystemHandler);

      // Act & Assert
      await expect(service.processFile(filePath, content))
        .rejects.toThrow('Permission denied');
      
      mockAssertions.assertLoggerCalled(mockLogger, 'error', 'Failed to process file');
    });
  });

  describe('readConfig', () => {
    it('should read and parse JSON config successfully', async () => {
      // Arrange
      const configPath = '/test/config.json';
      const configData = testDataFactories.createPackageJson({
        name: 'test-config',
        version: '2.0.0'
      });
      
      mockSetups.setupJsonFileOperations(mockFileSystemHandler, configData);

      // Act
      const result = await service.readConfig(configPath);

      // Assert
      expect(result.name).toBe('test-config');
      expect(result.version).toBe('2.0.0');
      mockAssertions.assertFileRead(mockFileSystemHandler, configPath);
    });

    it('should handle file read errors', async () => {
      // Arrange
      const configPath = '/test/missing-config.json';
      mockSetups.setupFileNotFound(mockFileSystemHandler);

      // Act & Assert
      await expect(service.readConfig(configPath))
        .rejects.toThrow('File not found');
    });

    it('should handle invalid JSON gracefully', async () => {
      // Arrange
      const configPath = '/test/invalid-config.json';
      mockFileSystemHandler.readFile.mockResolvedValue('invalid json content');

      // Act & Assert
      await expect(service.readConfig(configPath))
        .rejects.toThrow();
    });
  });
});

describe('Tool Testing Examples', () => {
  let mockTool;
  let mockContext;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create standardized tool and context mocks
    mockTool = createMockTool({
      name: 'example_tool',
      category: 'examples',
      handler: vi.fn().mockResolvedValue({ success: true, data: 'example result' })
    });
    
    mockContext = createMockMCPContext({
      toolName: 'example_tool',
      category: 'examples'
    });
  });

  it('should execute tool with proper context', async () => {
    // Arrange
    const args = { input: 'test data' };

    // Act
    const result = await mockTool.handler(args, mockContext);

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toBe('example result');
    expect(mockTool.handler).toHaveBeenCalledWith(args, mockContext);
  });
});

describe('Model Configuration Examples', () => {
  it('should create model options with factory', () => {
    // Arrange & Act
    const modelOptions = createMockModelOptions({
      model: 'ExampleModel',
      fields: [
        { name: 'title', type: 'string', required: true },
        { name: 'active', type: 'boolean', component: 'ui-switch' }
      ]
    });

    // Assert
    expect(modelOptions.model).toBe('ExampleModel');
    expect(modelOptions.fields).toHaveLength(2);
    expect(modelOptions.fields[0].name).toBe('title');
    expect(modelOptions.fields[1].component).toBe('ui-switch');
  });
});

describe('Integration Test Examples', () => {
  let testProjectPath;
  let cleanup = [];

  beforeEach(async () => {
    // Use global test utilities for temporary directories
    testProjectPath = await global.testUtils.createTempDir();
    cleanup.push(() => global.testUtils.cleanupTempDir(testProjectPath));
  });

  afterEach(async () => {
    // Clean up with proper error handling
    await Promise.allSettled(cleanup.map(fn => fn()));
    cleanup = [];
  });

  it('should handle integration scenario', async () => {
    // This would be your actual integration test
    expect(testProjectPath).toBeDefined();
    expect(testProjectPath).toContain('balm-shared-mcp-test-');
  });
});