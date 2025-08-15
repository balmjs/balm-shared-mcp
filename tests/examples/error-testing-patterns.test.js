/**
 * Error Testing Patterns Examples
 * 
 * This file demonstrates comprehensive error testing patterns and conventions.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  createMockLogger,
  createMockFileSystemHandler,
  createMockError,
  mockSetups,
  mockAssertions
} from '../utils/mock-utilities.js';

// Mock BalmSharedMCPError for testing
class BalmSharedMCPError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'BalmSharedMCPError';
    this.cause = options.cause;
  }
}

// Example service class for error testing
class ErrorProneService {
  constructor(fileSystemHandler, logger) {
    this.fileSystemHandler = fileSystemHandler;
    this.logger = logger;
  }

  validateInput(input) {
    if (!input) {
      throw new BalmSharedMCPError('Input is required');
    }
    
    if (typeof input.name !== 'string' || input.name.trim() === '') {
      throw new BalmSharedMCPError('Name must be a non-empty string');
    }
    
    if (input.type && !['string', 'number', 'boolean'].includes(input.type)) {
      throw new BalmSharedMCPError(`Invalid type: ${input.type}. Must be string, number, or boolean`);
    }
    
    return true;
  }

  async processFileWithValidation(filePath, options = {}) {
    try {
      // Validate inputs
      if (!filePath || typeof filePath !== 'string') {
        throw new BalmSharedMCPError('File path must be a non-empty string');
      }

      this.validateInput(options);

      // Check file exists
      if (!this.fileSystemHandler.exists(filePath)) {
        throw new BalmSharedMCPError(`File not found: ${filePath}`);
      }

      // Read file
      const content = await this.fileSystemHandler.readFile(filePath);
      
      // Process content
      const processed = this.processContent(content, options);
      
      this.logger.info(`File processed successfully: ${filePath}`);
      return { success: true, data: processed };

    } catch (error) {
      // Log error with context
      this.logger.error('Failed to process file', {
        filePath,
        options,
        error: error.message,
        stack: error.stack
      });

      // Re-throw with additional context if it's not already a BalmSharedMCPError
      if (!(error instanceof BalmSharedMCPError)) {
        throw new BalmSharedMCPError(`File processing failed: ${error.message}`, { cause: error });
      }
      
      throw error;
    }
  }

  processContent(content, options) {
    if (!content) {
      throw new BalmSharedMCPError('Content cannot be empty');
    }

    if (options.type === 'json') {
      try {
        return JSON.parse(content);
      } catch (parseError) {
        throw new BalmSharedMCPError('Invalid JSON content', { cause: parseError });
      }
    }

    return content.trim();
  }

  async batchProcess(items) {
    const results = [];
    const errors = [];

    for (const item of items) {
      try {
        const result = await this.processFileWithValidation(item.path, item.options);
        results.push({ item, result });
      } catch (error) {
        errors.push({ item, error });
      }
    }

    if (errors.length > 0) {
      this.logger.warn(`Batch processing completed with ${errors.length} errors`);
    }

    return { results, errors };
  }
}

describe('Error Testing Patterns', () => {
  let service;
  let mockFileSystemHandler;
  let mockLogger;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockLogger = createMockLogger();
    mockFileSystemHandler = createMockFileSystemHandler();
    
    service = new ErrorProneService(mockFileSystemHandler, mockLogger);
  });

  describe('Input Validation Error Testing', () => {
    it('should throw BalmSharedMCPError for null input', () => {
      expect(() => service.validateInput(null))
        .toThrow(BalmSharedMCPError);
      
      expect(() => service.validateInput(null))
        .toThrow('Input is required');
    });

    it('should throw BalmSharedMCPError for undefined input', () => {
      expect(() => service.validateInput(undefined))
        .toThrow(BalmSharedMCPError);
    });

    it('should throw BalmSharedMCPError for empty name', () => {
      const input = { name: '' };
      
      expect(() => service.validateInput(input))
        .toThrow(BalmSharedMCPError);
      
      expect(() => service.validateInput(input))
        .toThrow('Name must be a non-empty string');
    });

    it('should throw BalmSharedMCPError for whitespace-only name', () => {
      const input = { name: '   ' };
      
      expect(() => service.validateInput(input))
        .toThrow('Name must be a non-empty string');
    });

    it('should throw BalmSharedMCPError for invalid type', () => {
      const input = { name: 'test', type: 'invalid' };
      
      expect(() => service.validateInput(input))
        .toThrow(BalmSharedMCPError);
      
      expect(() => service.validateInput(input))
        .toThrow('Invalid type: invalid');
    });

    it('should accept valid input without throwing', () => {
      const validInputs = [
        { name: 'test' },
        { name: 'test', type: 'string' },
        { name: 'test', type: 'number' },
        { name: 'test', type: 'boolean' }
      ];

      validInputs.forEach(input => {
        expect(() => service.validateInput(input)).not.toThrow();
      });
    });
  });

  describe('File System Error Testing', () => {
    it('should handle file not found errors', async () => {
      // Arrange
      const filePath = '/test/nonexistent.txt';
      mockFileSystemHandler.exists.mockReturnValue(false);

      // Act & Assert
      await expect(service.processFileWithValidation(filePath, { name: 'test' }))
        .rejects.toThrow(BalmSharedMCPError);
      
      await expect(service.processFileWithValidation(filePath, { name: 'test' }))
        .rejects.toThrow('File not found');
    });

    it('should handle file read permission errors', async () => {
      // Arrange
      const filePath = '/test/restricted.txt';
      mockFileSystemHandler.exists.mockReturnValue(true);
      mockFileSystemHandler.readFile.mockRejectedValue(
        createMockError('Permission denied', 'EACCES')
      );

      // Act & Assert
      await expect(service.processFileWithValidation(filePath, { name: 'test' }))
        .rejects.toThrow(BalmSharedMCPError);
      
      // Verify error logging
      mockAssertions.assertLoggerCalled(mockLogger, 'error', 'Failed to process file');
    });

    it('should handle file system timeout errors', async () => {
      // Arrange
      const filePath = '/test/slow.txt';
      mockFileSystemHandler.exists.mockReturnValue(true);
      mockFileSystemHandler.readFile.mockRejectedValue(
        createMockError('Operation timed out', 'ETIMEDOUT')
      );

      // Act & Assert
      await expect(service.processFileWithValidation(filePath, { name: 'test' }))
        .rejects.toThrow('File processing failed');
    });
  });

  describe('Content Processing Error Testing', () => {
    it('should handle empty content error', () => {
      expect(() => service.processContent('', { name: 'test' }))
        .toThrow(BalmSharedMCPError);
      
      expect(() => service.processContent('', { name: 'test' }))
        .toThrow('Content cannot be empty');
    });

    it('should handle JSON parsing errors', () => {
      const invalidJson = '{ invalid json }';
      
      expect(() => service.processContent(invalidJson, { name: 'test', type: 'json' }))
        .toThrow(BalmSharedMCPError);
      
      expect(() => service.processContent(invalidJson, { name: 'test', type: 'json' }))
        .toThrow('Invalid JSON content');
    });

    it('should preserve original error as cause in JSON parsing', () => {
      const invalidJson = '{ invalid json }';
      
      try {
        service.processContent(invalidJson, { name: 'test', type: 'json' });
      } catch (error) {
        expect(error).toBeInstanceOf(BalmSharedMCPError);
        expect(error.cause).toBeInstanceOf(SyntaxError);
        expect(error.message).toBe('Invalid JSON content');
      }
    });
  });

  describe('Error Context and Logging', () => {
    it('should log error context when file processing fails', async () => {
      // Arrange
      const filePath = '/test/error.txt';
      const options = { name: 'test', type: 'json' };
      
      mockFileSystemHandler.exists.mockReturnValue(true);
      mockFileSystemHandler.readFile.mockRejectedValue(new Error('Read failed'));

      // Act
      await expect(service.processFileWithValidation(filePath, options))
        .rejects.toThrow();

      // Assert error logging with context
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to process file',
        expect.objectContaining({
          filePath,
          options,
          error: 'Read failed',
          stack: expect.any(String)
        })
      );
    });

    it('should preserve error chain when wrapping errors', async () => {
      // Arrange
      const filePath = '/test/chain.txt';
      const originalError = new Error('Original error');
      
      mockFileSystemHandler.exists.mockReturnValue(true);
      mockFileSystemHandler.readFile.mockRejectedValue(originalError);

      // Act & Assert
      try {
        await service.processFileWithValidation(filePath, { name: 'test' });
      } catch (error) {
        expect(error).toBeInstanceOf(BalmSharedMCPError);
        expect(error.message).toContain('File processing failed');
        expect(error.cause).toBe(originalError);
      }
    });

    it('should not double-wrap BalmSharedMCPError', async () => {
      // Arrange
      const filePath = '/test/invalid-input.txt';
      
      // Act & Assert - Input validation throws BalmSharedMCPError
      await expect(service.processFileWithValidation(filePath, null))
        .rejects.toThrow(BalmSharedMCPError);
      
      // The error should not be wrapped again
      try {
        await service.processFileWithValidation(filePath, null);
      } catch (error) {
        expect(error.message).toBe('Input is required');
        expect(error.cause).toBeUndefined(); // Not wrapped
      }
    });
  });

  describe('Batch Error Handling', () => {
    it('should handle mixed success and failure in batch processing', async () => {
      // Arrange
      const items = [
        { path: '/test/success1.txt', options: { name: 'test1' } },
        { path: '/test/failure.txt', options: { name: 'test2' } },
        { path: '/test/success2.txt', options: { name: 'test3' } }
      ];

      mockFileSystemHandler.exists.mockImplementation(path => 
        !path.includes('failure')
      );
      mockFileSystemHandler.readFile
        .mockResolvedValueOnce('content1')
        .mockResolvedValueOnce('content2');

      // Act
      const result = await service.batchProcess(items);

      // Assert
      expect(result.results).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
      
      expect(result.results[0].result.success).toBe(true);
      expect(result.results[1].result.success).toBe(true);
      
      expect(result.errors[0].error).toBeInstanceOf(BalmSharedMCPError);
      expect(result.errors[0].error.message).toContain('File not found');
      
      mockAssertions.assertLoggerCalled(mockLogger, 'warn', 'Batch processing completed with 1 errors');
    });

    it('should handle all failures in batch processing', async () => {
      // Arrange
      const items = [
        { path: '/test/fail1.txt', options: { name: 'test1' } },
        { path: '/test/fail2.txt', options: { name: 'test2' } }
      ];

      mockFileSystemHandler.exists.mockReturnValue(false);

      // Act
      const result = await service.batchProcess(items);

      // Assert
      expect(result.results).toHaveLength(0);
      expect(result.errors).toHaveLength(2);
      
      result.errors.forEach(errorItem => {
        expect(errorItem.error).toBeInstanceOf(BalmSharedMCPError);
        expect(errorItem.error.message).toContain('File not found');
      });
    });
  });

  describe('Error Type Testing', () => {
    it('should distinguish between different error types', async () => {
      const testCases = [
        {
          name: 'BalmSharedMCPError for validation',
          setup: () => {},
          input: { path: '/test/file.txt', options: null },
          expectedType: BalmSharedMCPError,
          expectedMessage: 'Input is required'
        },
        {
          name: 'BalmSharedMCPError for file not found',
          setup: () => mockFileSystemHandler.exists.mockReturnValue(false),
          input: { path: '/test/missing.txt', options: { name: 'test' } },
          expectedType: BalmSharedMCPError,
          expectedMessage: 'File not found'
        },
        {
          name: 'Wrapped error for system failures',
          setup: () => {
            mockFileSystemHandler.exists.mockReturnValue(true);
            mockFileSystemHandler.readFile.mockRejectedValue(new Error('System error'));
          },
          input: { path: '/test/system.txt', options: { name: 'test' } },
          expectedType: BalmSharedMCPError,
          expectedMessage: 'File processing failed'
        }
      ];

      for (const testCase of testCases) {
        // Arrange
        vi.clearAllMocks();
        testCase.setup();

        // Act & Assert
        await expect(service.processFileWithValidation(testCase.input.path, testCase.input.options))
          .rejects.toThrow(testCase.expectedType);
        
        await expect(service.processFileWithValidation(testCase.input.path, testCase.input.options))
          .rejects.toThrow(testCase.expectedMessage);
      }
    });
  });

  describe('Error Recovery Testing', () => {
    it('should handle graceful degradation on non-critical errors', async () => {
      // This would be for services that can partially succeed
      const serviceWithRecovery = {
        ...service,
        async processWithRecovery(filePath, options) {
          try {
            return await service.processFileWithValidation(filePath, options);
          } catch (error) {
            if (error.message.includes('File not found')) {
              // Graceful degradation - return default result
              service.logger.warn(`File not found, using default: ${filePath}`);
              return { success: true, data: 'default content', isDefault: true };
            }
            throw error; // Re-throw other errors
          }
        }
      };

      // Arrange
      const filePath = '/test/missing.txt';
      mockFileSystemHandler.exists.mockReturnValue(false);

      // Act
      const result = await serviceWithRecovery.processWithRecovery(filePath, { name: 'test' });

      // Assert
      expect(result.success).toBe(true);
      expect(result.isDefault).toBe(true);
      mockAssertions.assertLoggerCalled(mockLogger, 'warn', 'File not found, using default');
    });
  });
});