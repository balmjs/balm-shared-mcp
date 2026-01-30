/**
 * Mock Utilities
 *
 * Standardized mock patterns and utilities for consistent testing across the project.
 */

import { vi } from 'vitest';

/**
 * Logger Mock Factory
 * Creates a standardized logger mock with all common methods
 */
export const createMockLogger = () => ({
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  trace: vi.fn(),
  setLevel: vi.fn()
});

/**
 * FileSystem Handler Mock Factory
 * Creates a comprehensive file system handler mock with all methods
 */
export const createMockFileSystemHandler = () => ({
  // Basic file operations
  exists: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  copyFile: vi.fn(),
  deleteFile: vi.fn(),

  // Directory operations
  readDirectory: vi.fn(),
  listDirectory: vi.fn(),
  createDirectory: vi.fn(),
  deleteDirectory: vi.fn(),
  ensureDirectory: vi.fn(),
  copyDirectory: vi.fn(),

  // File system queries
  isDirectory: vi.fn(),
  isFile: vi.fn(),
  getStats: vi.fn(),

  // Path utilities
  resolvePath: vi.fn(),
  joinPath: vi.fn(),

  // JSON operations
  updateJsonFile: vi.fn()
});

/**
 * Tool Mock Factory
 * Creates a standardized tool mock for testing tool interfaces and registries
 */
export const createMockTool = (overrides = {}) => ({
  name: 'test_tool',
  description: 'Test tool for mocking',
  category: 'testing',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string' }
    }
  },
  handler: vi.fn().mockResolvedValue({ success: true, data: 'test result' }),
  ...overrides
});

/**
 * MCP Context Mock Factory
 * Creates a standardized MCP context mock for tool execution
 */
export const createMockMCPContext = (overrides = {}) => ({
  requestId: 'test-request-123',
  toolName: 'test_tool',
  category: 'testing',
  timestamp: new Date().toISOString(),
  ...overrides
});

/**
 * Project Configuration Mock Factory
 * Creates a standardized project configuration mock
 */
export const createMockProjectConfig = (overrides = {}) => ({
  sharedLibraryPath: '/test/yiban-shared',
  templatesPath: '/test/templates',
  defaultProjectConfig: {
    apiEndpoint: '/api',
    mockEnabled: true,
    authEnabled: true
  },
  logging: {
    level: 'error'
  },
  ...overrides
});

/**
 * Model Field Mock Factory
 * Creates standardized model field mocks for testing
 */
export const createMockModelField = (overrides = {}) => ({
  name: 'testField',
  type: 'string',
  component: 'ui-textfield',
  required: false,
  ...overrides
});

/**
 * Model Options Mock Factory
 * Creates standardized model options for testing model config generation
 */
export const createMockModelOptions = (overrides = {}) => ({
  model: 'TestModel',
  fields: [
    createMockModelField({ name: 'id', type: 'number', required: false }),
    createMockModelField({ name: 'name', type: 'string', required: true }),
    createMockModelField({ name: 'email', type: 'string', required: true })
  ],
  projectPath: '/test/project',
  ...overrides
});

/**
 * File Stats Mock Factory
 * Creates standardized file stats mock for file system operations
 */
export const createMockFileStats = (overrides = {}) => ({
  size: 1024,
  mtime: new Date('2023-01-01'),
  birthtime: new Date('2023-01-01'),
  isDirectory: () => false,
  isFile: () => true,
  ...overrides
});

/**
 * Directory Entry Mock Factory
 * Creates standardized directory entry mocks for directory listing
 */
export const createMockDirectoryEntry = (name, isDirectory = false, overrides = {}) => ({
  name,
  path: `/test/dir/${name}`,
  isDirectory: () => isDirectory,
  isFile: () => !isDirectory,
  ...overrides
});

/**
 * Error Mock Factory
 * Creates standardized error mocks for testing error handling
 */
export const createMockError = (message = 'Test error', code = 'TEST_ERROR') => {
  const error = new Error(message);
  error.code = code;
  return error;
};

/**
 * Async Mock Helper
 * Creates async mocks with proper promise handling
 */
export const createAsyncMock = (resolveValue, rejectValue = null) => {
  const mock = vi.fn();
  if (rejectValue) {
    mock.mockRejectedValue(rejectValue);
  } else {
    mock.mockResolvedValue(resolveValue);
  }
  return mock;
};

/**
 * Mock Setup Helpers
 * Utilities for setting up common mock scenarios
 */
export const mockSetups = {
  /**
   * Sets up file system handler for successful file operations
   */
  setupSuccessfulFileOperations: mockHandler => {
    mockHandler.exists.mockReturnValue(true);
    mockHandler.readFile.mockResolvedValue('file content');
    mockHandler.writeFile.mockResolvedValue();
    mockHandler.createDirectory.mockResolvedValue();
    mockHandler.copyFile.mockResolvedValue();
    mockHandler.deleteFile.mockResolvedValue();
  },

  /**
   * Sets up file system handler for file not found scenarios
   */
  setupFileNotFound: mockHandler => {
    mockHandler.exists.mockReturnValue(false);
    mockHandler.readFile.mockRejectedValue(createMockError('File not found', 'ENOENT'));
    mockHandler.getStats.mockRejectedValue(createMockError('File not found', 'ENOENT'));
  },

  /**
   * Sets up file system handler for permission denied scenarios
   */
  setupPermissionDenied: mockHandler => {
    mockHandler.exists.mockReturnValue(true);
    mockHandler.readFile.mockRejectedValue(createMockError('Permission denied', 'EACCES'));
    mockHandler.writeFile.mockRejectedValue(createMockError('Permission denied', 'EACCES'));
    mockHandler.deleteFile.mockRejectedValue(createMockError('Permission denied', 'EACCES'));
  },

  /**
   * Sets up directory operations for successful scenarios
   */
  setupSuccessfulDirectoryOperations: mockHandler => {
    mockHandler.listDirectory.mockResolvedValue([
      createMockDirectoryEntry('file1.txt', false),
      createMockDirectoryEntry('subdir', true)
    ]);
    mockHandler.readDirectory.mockResolvedValue(['file1.txt', 'subdir']);
    mockHandler.createDirectory.mockResolvedValue();
    mockHandler.deleteDirectory.mockResolvedValue();
    mockHandler.isDirectory.mockReturnValue(true);
    mockHandler.isFile.mockReturnValue(false);
  },

  /**
   * Sets up JSON file operations
   */
  setupJsonFileOperations: (mockHandler, jsonContent = {}) => {
    mockHandler.exists.mockReturnValue(true);
    mockHandler.readFile.mockResolvedValue(JSON.stringify(jsonContent));
    mockHandler.writeFile.mockResolvedValue();
    mockHandler.updateJsonFile.mockResolvedValue({ ...jsonContent });
  }
};

/**
 * Mock Assertion Helpers
 * Common assertion patterns for mocks
 */
export const mockAssertions = {
  /**
   * Asserts that a file was written with expected content
   */
  assertFileWritten: (mockHandler, expectedPath, expectedContent = null) => {
    expect(mockHandler.writeFile).toHaveBeenCalled();
    const calls = mockHandler.writeFile.mock.calls;
    const matchingCall = calls.find(
      call => call[0].includes(expectedPath) || call[0] === expectedPath
    );
    expect(matchingCall).toBeDefined();

    if (expectedContent !== null) {
      expect(matchingCall[1]).toContain(expectedContent);
    }
  },

  /**
   * Asserts that a directory was created
   */
  assertDirectoryCreated: (mockHandler, expectedPath) => {
    expect(mockHandler.createDirectory).toHaveBeenCalled();
    const calls = mockHandler.createDirectory.mock.calls;
    const matchingCall = calls.find(
      call => call[0].includes(expectedPath) || call[0] === expectedPath
    );
    expect(matchingCall).toBeDefined();
  },

  /**
   * Asserts that a file was read
   */
  assertFileRead: (mockHandler, expectedPath) => {
    expect(mockHandler.readFile).toHaveBeenCalled();
    const calls = mockHandler.readFile.mock.calls;
    const matchingCall = calls.find(
      call => call[0].includes(expectedPath) || call[0] === expectedPath
    );
    expect(matchingCall).toBeDefined();
  },

  /**
   * Asserts that logger was called with expected level and message
   */
  assertLoggerCalled: (mockLogger, level, expectedMessage = null) => {
    expect(mockLogger[level]).toHaveBeenCalled();

    if (expectedMessage !== null) {
      const calls = mockLogger[level].mock.calls;
      const matchingCall = calls.find(
        call =>
          call[0].includes(expectedMessage) ||
          (call[1] && JSON.stringify(call[1]).includes(expectedMessage))
      );
      expect(matchingCall).toBeDefined();
    }
  }
};

/**
 * Test Data Factories
 * Common test data generators
 */
export const testDataFactories = {
  /**
   * Creates a valid package.json content
   */
  createPackageJson: (overrides = {}) => ({
    name: 'test-project',
    version: '1.0.0',
    description: 'Test project',
    dependencies: {
      vue: '^3.0.0',
      balm: '^4.0.0'
    },
    devDependencies: {
      vitest: '^1.0.0'
    },
    ...overrides
  }),

  /**
   * Creates component query test data
   */
  createComponentQueryData: () => ({
    'pro-views': {
      'ui-list-view': {
        name: 'ui-list-view',
        category: 'pro-views',
        description: 'List view component',
        usage: ['list', 'table', 'grid'],
        props: ['data', 'columns', 'pagination']
      },
      'ui-detail-view': {
        name: 'ui-detail-view',
        category: 'pro-views',
        description: 'Detail view component',
        usage: ['form', 'display', 'edit'],
        props: ['data', 'fields', 'readonly']
      }
    },
    common: {
      'ui-button': {
        name: 'ui-button',
        category: 'common',
        description: 'Button component',
        usage: ['action', 'submit', 'cancel'],
        props: ['text', 'type', 'disabled']
      }
    }
  }),

  /**
   * Creates best practices test data
   */
  createBestPracticesData: () => ({
    'project-structure': {
      topic: 'project-structure',
      practices: [
        'Use consistent directory structure',
        'Separate concerns properly',
        'Follow naming conventions'
      ]
    },
    'api-config': {
      topic: 'api-config',
      practices: [
        'Use environment variables for endpoints',
        'Implement proper error handling',
        'Add request/response interceptors'
      ]
    },
    'component-usage': {
      topic: 'component-usage',
      practices: [
        'Use props for component configuration',
        'Emit events for parent communication',
        'Follow single responsibility principle'
      ]
    },
    routing: {
      topic: 'routing',
      practices: [
        'Use named routes for navigation',
        'Implement lazy loading for routes',
        'Add route guards for authentication'
      ]
    }
  })
};

/**
 * Mock Reset Utilities
 * Helpers for resetting mocks between tests
 */
export const mockResetUtils = {
  /**
   * Resets all mocks in an object
   */
  resetAllMocks: mockObject => {
    Object.values(mockObject).forEach(mock => {
      if (typeof mock === 'function' && mock.mockReset) {
        mock.mockReset();
      }
    });
  },

  /**
   * Clears all mock calls in an object
   */
  clearAllMocks: mockObject => {
    Object.values(mockObject).forEach(mock => {
      if (typeof mock === 'function' && mock.mockClear) {
        mock.mockClear();
      }
    });
  }
};
