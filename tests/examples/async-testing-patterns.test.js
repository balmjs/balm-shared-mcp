/**
 * Async Testing Patterns Examples
 * 
 * This file demonstrates proper async/await testing patterns for various scenarios.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  createMockLogger,
  createMockFileSystemHandler,
  mockSetups,
  mockAssertions,
  createMockError
} from '../utils/mock-utilities.js';

// Example async service class
class AsyncFileService {
  constructor(fileSystemHandler, logger) {
    this.fileSystemHandler = fileSystemHandler;
    this.logger = logger;
  }

  async readAndProcessFile(filePath) {
    try {
      this.logger.info(`Reading file: ${filePath}`);
      const content = await this.fileSystemHandler.readFile(filePath);
      
      const processed = content.toUpperCase();
      
      this.logger.info(`File processed successfully: ${filePath}`);
      return { success: true, content: processed };
    } catch (error) {
      this.logger.error(`Failed to process file: ${filePath}`, { error: error.message });
      throw error;
    }
  }

  async createFileWithBackup(filePath, content) {
    try {
      // Check if file exists
      if (this.fileSystemHandler.exists(filePath)) {
        // Create backup
        const backupPath = `${filePath}.backup`;
        await this.fileSystemHandler.copyFile(filePath, backupPath);
        this.logger.info(`Backup created: ${backupPath}`);
      }

      // Write new content
      await this.fileSystemHandler.writeFile(filePath, content);
      this.logger.info(`File written: ${filePath}`);

      return { success: true, path: filePath };
    } catch (error) {
      this.logger.error(`Failed to create file with backup: ${filePath}`, { error: error.message });
      throw error;
    }
  }

  async batchProcessFiles(filePaths) {
    const results = [];
    
    for (const filePath of filePaths) {
      try {
        const result = await this.readAndProcessFile(filePath);
        results.push({ path: filePath, ...result });
      } catch (error) {
        results.push({ path: filePath, success: false, error: error.message });
      }
    }

    return results;
  }
}

describe('Async Testing Patterns', () => {
  let service;
  let mockFileSystemHandler;
  let mockLogger;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockLogger = createMockLogger();
    mockFileSystemHandler = createMockFileSystemHandler();
    
    service = new AsyncFileService(mockFileSystemHandler, mockLogger);
  });

  describe('Basic Async Success Patterns', () => {
    it('should handle simple async success case', async () => {
      // Arrange
      const filePath = '/test/file.txt';
      const fileContent = 'hello world';
      mockFileSystemHandler.readFile.mockResolvedValue(fileContent);

      // Act
      const result = await service.readAndProcessFile(filePath);

      // Assert
      expect(result.success).toBe(true);
      expect(result.content).toBe('HELLO WORLD');
      expect(mockFileSystemHandler.readFile).toHaveBeenCalledWith(filePath);
      mockAssertions.assertLoggerCalled(mockLogger, 'info', 'Reading file');
      mockAssertions.assertLoggerCalled(mockLogger, 'info', 'File processed successfully');
    });

    it('should handle async operation with multiple steps', async () => {
      // Arrange
      const filePath = '/test/existing.txt';
      const content = 'new content';
      
      mockFileSystemHandler.exists.mockReturnValue(true);
      mockFileSystemHandler.copyFile.mockResolvedValue();
      mockFileSystemHandler.writeFile.mockResolvedValue();

      // Act
      const result = await service.createFileWithBackup(filePath, content);

      // Assert
      expect(result.success).toBe(true);
      expect(result.path).toBe(filePath);
      
      // Verify sequence of operations
      expect(mockFileSystemHandler.exists).toHaveBeenCalledWith(filePath);
      expect(mockFileSystemHandler.copyFile).toHaveBeenCalledWith(filePath, `${filePath}.backup`);
      expect(mockFileSystemHandler.writeFile).toHaveBeenCalledWith(filePath, content);
      
      mockAssertions.assertLoggerCalled(mockLogger, 'info', 'Backup created');
      mockAssertions.assertLoggerCalled(mockLogger, 'info', 'File written');
    });
  });

  describe('Async Error Handling Patterns', () => {
    it('should handle async rejection with proper error propagation', async () => {
      // Arrange
      const filePath = '/test/nonexistent.txt';
      const error = createMockError('File not found', 'ENOENT');
      mockFileSystemHandler.readFile.mockRejectedValue(error);

      // Act & Assert
      await expect(service.readAndProcessFile(filePath))
        .rejects.toThrow('File not found');

      // Verify error was logged
      mockAssertions.assertLoggerCalled(mockLogger, 'error', 'Failed to process file');
    });

    it('should handle async errors in multi-step operations', async () => {
      // Arrange
      const filePath = '/test/file.txt';
      const content = 'content';
      
      mockFileSystemHandler.exists.mockReturnValue(true);
      mockFileSystemHandler.copyFile.mockResolvedValue(); // Backup succeeds
      mockFileSystemHandler.writeFile.mockRejectedValue(new Error('Write failed')); // Write fails

      // Act & Assert
      await expect(service.createFileWithBackup(filePath, content))
        .rejects.toThrow('Write failed');

      // Verify partial operations completed
      expect(mockFileSystemHandler.copyFile).toHaveBeenCalled();
      mockAssertions.assertLoggerCalled(mockLogger, 'info', 'Backup created');
      mockAssertions.assertLoggerCalled(mockLogger, 'error', 'Failed to create file with backup');
    });

    it('should handle timeout scenarios', async () => {
      // Arrange
      const filePath = '/test/slow-file.txt';
      
      // Mock a slow operation that times out
      mockFileSystemHandler.readFile.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Operation timed out')), 100)
        )
      );

      // Act & Assert
      await expect(service.readAndProcessFile(filePath))
        .rejects.toThrow('Operation timed out');
    });
  });

  describe('Batch Async Operations', () => {
    it('should handle batch operations with mixed success/failure', async () => {
      // Arrange
      const filePaths = ['/test/file1.txt', '/test/file2.txt', '/test/file3.txt'];
      
      mockFileSystemHandler.readFile
        .mockResolvedValueOnce('content1')  // file1 succeeds
        .mockRejectedValueOnce(new Error('File not found'))  // file2 fails
        .mockResolvedValueOnce('content3');  // file3 succeeds

      // Act
      const results = await service.batchProcessFiles(filePaths);

      // Assert
      expect(results).toHaveLength(3);
      
      // First file succeeded
      expect(results[0].success).toBe(true);
      expect(results[0].content).toBe('CONTENT1');
      
      // Second file failed
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('File not found');
      
      // Third file succeeded
      expect(results[2].success).toBe(true);
      expect(results[2].content).toBe('CONTENT3');
    });

    it('should handle all batch operations failing', async () => {
      // Arrange
      const filePaths = ['/test/file1.txt', '/test/file2.txt'];
      mockFileSystemHandler.readFile.mockRejectedValue(new Error('All files missing'));

      // Act
      const results = await service.batchProcessFiles(filePaths);

      // Assert
      expect(results).toHaveLength(2);
      expect(results.every(r => r.success === false)).toBe(true);
      expect(results.every(r => r.error === 'All files missing')).toBe(true);
    });
  });

  describe('Promise Chain Testing', () => {
    it('should test promise chains with proper async/await', async () => {
      // Arrange
      const filePath = '/test/chain.txt';
      mockSetups.setupSuccessfulFileOperations(mockFileSystemHandler);
      mockFileSystemHandler.readFile.mockResolvedValue('original');

      // Act - Chain of async operations
      const result = await service.readAndProcessFile(filePath)
        .then(result => ({ ...result, timestamp: Date.now() }))
        .then(result => ({ ...result, processed: true }));

      // Assert
      expect(result.success).toBe(true);
      expect(result.content).toBe('ORIGINAL');
      expect(result.timestamp).toBeDefined();
      expect(result.processed).toBe(true);
    });

    it('should handle promise chain errors', async () => {
      // Arrange
      const filePath = '/test/chain-error.txt';
      mockFileSystemHandler.readFile.mockRejectedValue(new Error('Chain failed'));

      // Act & Assert
      await expect(
        service.readAndProcessFile(filePath)
          .then(result => ({ ...result, timestamp: Date.now() }))
      ).rejects.toThrow('Chain failed');
    });
  });

  describe('Concurrent Async Operations', () => {
    it('should handle concurrent async operations', async () => {
      // Arrange
      const filePaths = ['/test/file1.txt', '/test/file2.txt', '/test/file3.txt'];
      mockFileSystemHandler.readFile
        .mockResolvedValueOnce('content1')
        .mockResolvedValueOnce('content2')
        .mockResolvedValueOnce('content3');

      // Act - Process files concurrently
      const promises = filePaths.map(path => service.readAndProcessFile(path));
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(3);
      expect(results.every(r => r.success === true)).toBe(true);
      expect(results[0].content).toBe('CONTENT1');
      expect(results[1].content).toBe('CONTENT2');
      expect(results[2].content).toBe('CONTENT3');
    });

    it('should handle concurrent operations with some failures', async () => {
      // Arrange
      const filePaths = ['/test/file1.txt', '/test/file2.txt'];
      mockFileSystemHandler.readFile
        .mockResolvedValueOnce('content1')
        .mockRejectedValueOnce(new Error('File 2 failed'));

      // Act & Assert - Use Promise.allSettled for mixed results
      const promises = filePaths.map(path => service.readAndProcessFile(path));
      const results = await Promise.allSettled(promises);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('fulfilled');
      expect(results[0].value.success).toBe(true);
      expect(results[1].status).toBe('rejected');
      expect(results[1].reason.message).toBe('File 2 failed');
    });
  });

  describe('Async Resource Cleanup', () => {
    it('should handle async cleanup in finally blocks', async () => {
      // Arrange
      const filePath = '/test/cleanup.txt';
      const cleanupSpy = vi.fn();
      
      // Mock service with cleanup
      const serviceWithCleanup = {
        ...service,
        async processWithCleanup(path) {
          try {
            return await service.readAndProcessFile(path);
          } finally {
            cleanupSpy();
          }
        }
      };

      mockFileSystemHandler.readFile.mockResolvedValue('content');

      // Act
      const result = await serviceWithCleanup.processWithCleanup(filePath);

      // Assert
      expect(result.success).toBe(true);
      expect(cleanupSpy).toHaveBeenCalled();
    });

    it('should handle cleanup even when operation fails', async () => {
      // Arrange
      const filePath = '/test/cleanup-error.txt';
      const cleanupSpy = vi.fn();
      
      const serviceWithCleanup = {
        ...service,
        async processWithCleanup(path) {
          try {
            return await service.readAndProcessFile(path);
          } finally {
            cleanupSpy();
          }
        }
      };

      mockFileSystemHandler.readFile.mockRejectedValue(new Error('Process failed'));

      // Act & Assert
      await expect(serviceWithCleanup.processWithCleanup(filePath))
        .rejects.toThrow('Process failed');

      // Cleanup should still be called
      expect(cleanupSpy).toHaveBeenCalled();
    });
  });
});