/**
 * Test Setup
 * 
 * Global test configuration and setup utilities.
 * Updated to use standardized mock patterns.
 */

import { beforeEach, afterEach, vi } from 'vitest';
import { logger } from '../src/utils/logger.js';
import { 
  createMockProjectConfig,
  mockResetUtils
} from './utils/mock-utilities.js';

// Set test log level to reduce noise
logger.setLevel('error');

// Global test setup
beforeEach(() => {
  // Clear all mocks before each test for isolation
  vi.clearAllMocks();
});

afterEach(() => {
  // Clean up after each test
  vi.clearAllMocks();
});

// Global test utilities - updated to use standardized patterns
global.testUtils = {
  createMockConfig: () => createMockProjectConfig({
    sharedProjectPath: './test-fixtures',
    templatesPath: './test-templates'
  }),
  
  createTempDir: async () => {
    const { mkdtemp } = await import('fs/promises');
    const { join } = await import('path');
    const { tmpdir } = await import('os');
    
    return mkdtemp(join(tmpdir(), 'balm-shared-mcp-test-'));
  },
  
  cleanupTempDir: async (dirPath) => {
    const { rm } = await import('fs/promises');
    try {
      await rm(dirPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  },

  // Add utility for resetting custom mock objects
  resetMocks: (mockObject) => {
    mockResetUtils.resetAllMocks(mockObject);
  },

  clearMocks: (mockObject) => {
    mockResetUtils.clearAllMocks(mockObject);
  }
};