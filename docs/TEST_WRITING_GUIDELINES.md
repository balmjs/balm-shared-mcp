# Test Writing Guidelines

## Overview

This document provides comprehensive guidelines for writing consistent, maintainable, and reliable tests in the balm-shared-mcp project. These guidelines ensure all tests follow established patterns, use standardized mock utilities, and maintain high quality standards.

## Table of Contents

1. [Test Structure Standards](#test-structure-standards)
2. [Mock Patterns and Usage](#mock-patterns-and-usage)
3. [Async/Await Testing Patterns](#asyncawait-testing-patterns)
4. [Error Testing Conventions](#error-testing-conventions)
5. [Integration Testing Guidelines](#integration-testing-guidelines)
6. [Best Practices](#best-practices)
7. [Common Pitfalls](#common-pitfalls)
8. [Migration Guide](#migration-guide)

## Test Structure Standards

### Standard Test File Template

Every test file should follow this standardized structure:

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { YourClass } from '../your-class.js';
import { BalmSharedMCPError } from '../../utils/errors.js';
import { 
  createMockLogger,
  createMockFileSystemHandler,
  mockSetups,
  mockAssertions
} from '../../tests/utils/mock-utilities.js';

describe('YourClass', () => {
  let instance;
  let mockLogger;
  let mockFileSystemHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create standardized mocks
    mockLogger = createMockLogger();
    mockFileSystemHandler = createMockFileSystemHandler();
    
    // Setup default successful operations
    mockSetups.setupSuccessfulFileOperations(mockFileSystemHandler);
    
    // Initialize class under test
    instance = new YourClass(mockFileSystemHandler, mockLogger);
  });

  describe('methodName', () => {
    it('should handle success case', async () => {
      // Arrange
      const input = { test: 'data' };
      
      // Act
      const result = await instance.methodName(input);
      
      // Assert
      expect(result).toBeDefined();
      mockAssertions.assertFileWritten(mockFileSystemHandler, 'expected/path');
    });

    it('should handle error case', async () => {
      // Arrange
      mockSetups.setupFileNotFound(mockFileSystemHandler);
      
      // Act & Assert
      await expect(instance.methodName({}))
        .rejects.toThrow(BalmSharedMCPError);
      
      mockAssertions.assertLoggerCalled(mockLogger, 'error', 'Expected error');
    });
  });
});
```

### Test Organization Principles

#### 1. Nested Describe Blocks
Group related functionality using nested describe blocks:

```javascript
describe('ModelConfigManager', () => {
  describe('generateModelConfig', () => {
    describe('validation', () => {
      it('should validate model name format', () => {});
      it('should validate fields array', () => {});
    });
    
    describe('file operations', () => {
      it('should create directory if not exists', () => {});
      it('should write config file', () => {});
    });
  });
  
  describe('updateModelConfig', () => {
    // Update-specific tests
  });
});
```

#### 2. Descriptive Test Names
Write clear, descriptive test names that explain the scenario and expected outcome:

```javascript
// ✅ Good - Clear and descriptive
it('should create model config file when valid options provided', () => {});
it('should throw BalmSharedMCPError when model name is invalid', () => {});
it('should log error message when file write fails', () => {});

// ❌ Avoid - Vague and unclear
it('should work', () => {});
it('should fail', () => {});
it('test method', () => {});
```

#### 3. Arrange-Act-Assert Pattern
Structure test logic using the AAA pattern:

```javascript
it('should process file successfully', async () => {
  // Arrange - Set up test data and mocks
  const filePath = '/test/file.txt';
  const content = 'test content';
  mockSetups.setupSuccessfulFileOperations(mockFileSystemHandler);
  
  // Act - Execute the method under test
  const result = await instance.processFile(filePath, content);
  
  // Assert - Verify the expected outcomes
  expect(result.success).toBe(true);
  mockAssertions.assertFileWritten(mockFileSystemHandler, filePath, content);
});
```

## Mock Patterns and Usage

### Factory Functions

Always use factory functions for creating mocks to ensure consistency:

```javascript
// ✅ Good - Use factory functions
const mockLogger = createMockLogger();
const mockFileSystemHandler = createMockFileSystemHandler();
const mockTool = createMockTool({
  name: 'custom_tool',
  handler: vi.fn().mockResolvedValue({ success: true })
});

// ❌ Avoid - Manual mock creation
const mockLogger = {
  info: vi.fn(),
  error: vi.fn()
  // Missing methods, inconsistent structure
};
```

### Setup Helpers

Use setup helpers for common mock scenarios:

```javascript
// ✅ Good - Use setup helpers
mockSetups.setupSuccessfulFileOperations(mockFileSystemHandler);
mockSetups.setupFileNotFound(mockFileSystemHandler);
mockSetups.setupPermissionDenied(mockFileSystemHandler);

// ❌ Avoid - Manual mock setup
mockFileSystemHandler.exists.mockReturnValue(true);
mockFileSystemHandler.readFile.mockResolvedValue('content');
mockFileSystemHandler.writeFile.mockResolvedValue();
// ... many more lines
```

### Available Mock Factories

#### Core Mocks
- `createMockLogger()` - Standardized logger with all methods
- `createMockFileSystemHandler()` - Complete file system handler
- `createMockTool(overrides)` - Tool interface mock
- `createMockMCPContext(overrides)` - MCP execution context

#### Configuration Mocks
- `createMockProjectConfig(overrides)` - Project configuration
- `createMockModelOptions(overrides)` - Model generation options
- `createMockModelField(overrides)` - Individual model field

#### Utility Mocks
- `createMockFileStats(overrides)` - File system stats
- `createMockDirectoryEntry(name, isDirectory)` - Directory entries
- `createMockError(message, code)` - Standardized errors

### Setup Helper Functions

#### File Operations
```javascript
// Successful operations
mockSetups.setupSuccessfulFileOperations(mockFileSystemHandler);

// Error scenarios
mockSetups.setupFileNotFound(mockFileSystemHandler);
mockSetups.setupPermissionDenied(mockFileSystemHandler);

// Directory operations
mockSetups.setupSuccessfulDirectoryOperations(mockFileSystemHandler);

// JSON file operations
const jsonData = { name: 'test', version: '1.0.0' };
mockSetups.setupJsonFileOperations(mockFileSystemHandler, jsonData);
```

### Assertion Helpers

Use assertion helpers for consistent verification patterns:

```javascript
// File system assertions
mockAssertions.assertFileWritten(mockHandler, 'expected/path', 'expected content');
mockAssertions.assertDirectoryCreated(mockHandler, 'expected/path');
mockAssertions.assertFileRead(mockHandler, 'expected/path');

// Logger assertions
mockAssertions.assertLoggerCalled(mockLogger, 'info', 'Expected message');
mockAssertions.assertLoggerCalled(mockLogger, 'error', 'Error occurred');
```

## Async/Await Testing Patterns

### Success Cases

Test successful async operations with proper await handling:

```javascript
it('should handle async operation successfully', async () => {
  // Arrange
  const mockHandler = createMockFileSystemHandler();
  mockHandler.readFile.mockResolvedValue('file content');
  
  // Act
  const result = await instance.readFileMethod('/test/path');
  
  // Assert
  expect(result).toBe('file content');
  expect(mockHandler.readFile).toHaveBeenCalledWith('/test/path');
});
```

### Error Cases

Test async error scenarios using proper rejection handling:

```javascript
it('should handle async operation errors', async () => {
  // Arrange
  const mockHandler = createMockFileSystemHandler();
  mockHandler.readFile.mockRejectedValue(new Error('File not found'));
  
  // Act & Assert
  await expect(instance.readFileMethod('/test/path'))
    .rejects.toThrow('File not found');
});
```

### Complex Async Scenarios

For complex async operations with multiple steps:

```javascript
it('should handle multi-step async operation', async () => {
  // Arrange
  const mockHandler = createMockFileSystemHandler();
  mockHandler.exists.mockReturnValue(false);
  mockHandler.createDirectory.mockResolvedValue();
  mockHandler.writeFile.mockResolvedValue();
  
  // Act
  const result = await instance.createFileWithDirectory('/new/path/file.txt', 'content');
  
  // Assert
  expect(result.success).toBe(true);
  expect(mockHandler.createDirectory).toHaveBeenCalledWith('/new/path');
  expect(mockHandler.writeFile).toHaveBeenCalledWith('/new/path/file.txt', 'content');
});
```

### Async Error Propagation

Test that async errors are properly propagated and logged:

```javascript
it('should propagate async errors with proper logging', async () => {
  // Arrange
  const mockLogger = createMockLogger();
  const mockHandler = createMockFileSystemHandler();
  mockHandler.writeFile.mockRejectedValue(new Error('Write failed'));
  
  const instance = new YourClass(mockHandler, mockLogger);
  
  // Act & Assert
  await expect(instance.saveData('data'))
    .rejects.toThrow('Write failed');
  
  mockAssertions.assertLoggerCalled(mockLogger, 'error', 'Write failed');
});
```

## Error Testing Conventions

### Standard Error Testing

Always test error scenarios alongside success cases:

```javascript
describe('methodName', () => {
  it('should handle success case', async () => {
    // Test successful execution
  });

  it('should handle error case', async () => {
    // Test error scenario
  });
});
```

### BalmSharedMCPError Testing

Test custom error types with specific assertions:

```javascript
it('should throw BalmSharedMCPError for invalid input', async () => {
  // Arrange
  const invalidInput = { /* invalid data */ };
  
  // Act & Assert
  await expect(instance.method(invalidInput))
    .rejects.toThrow(BalmSharedMCPError);
  
  await expect(instance.method(invalidInput))
    .rejects.toThrow('Specific error message');
});
```

### Error Logging Verification

Verify that errors are properly logged:

```javascript
it('should log errors appropriately', async () => {
  // Arrange
  const mockLogger = createMockLogger();
  const mockHandler = createMockFileSystemHandler();
  mockHandler.writeFile.mockRejectedValue(new Error('Write failed'));
  
  const instance = new YourClass(mockHandler, mockLogger);
  
  // Act
  await expect(instance.writeMethod())
    .rejects.toThrow();
  
  // Assert
  mockAssertions.assertLoggerCalled(mockLogger, 'error', 'Write failed');
});
```

### Error Context Testing

Test that error context is properly preserved:

```javascript
it('should preserve error context in custom errors', async () => {
  // Arrange
  const originalError = new Error('Original error');
  mockHandler.readFile.mockRejectedValue(originalError);
  
  // Act & Assert
  await expect(instance.processFile('/test/file'))
    .rejects.toThrow(BalmSharedMCPError);
  
  // Verify error context is preserved
  try {
    await instance.processFile('/test/file');
  } catch (error) {
    expect(error.cause).toBe(originalError);
    expect(error.message).toContain('Failed to process file');
  }
});
```

## Integration Testing Guidelines

### Setup and Teardown

Use proper setup and teardown for integration tests:

```javascript
describe('Integration Tests', () => {
  let testProjectPath;
  let cleanup = [];

  beforeEach(async () => {
    // Create temporary test environment
    testProjectPath = await global.testUtils.createTempDir();
    cleanup.push(() => global.testUtils.cleanupTempDir(testProjectPath));
  });

  afterEach(async () => {
    // Clean up with proper error handling
    await Promise.allSettled(cleanup.map(fn => fn()));
    cleanup = [];
  });

  it('should handle integration scenario', async () => {
    // Integration test logic
  });
});
```

### Resource Testing

Test resource queries and data handling:

```javascript
it('should handle resource queries', async () => {
  // Arrange
  const componentData = testDataFactories.createComponentQueryData();
  const mockHandler = createMockFileSystemHandler();
  mockHandler.readFile.mockResolvedValue(JSON.stringify(componentData));
  
  const instance = new ResourceManager(mockHandler);
  
  // Act
  const result = await instance.queryComponent('ui-list-view');
  
  // Assert
  expect(result.found).toBe(true);
  expect(result.name).toBe('ui-list-view');
  expect(result.category).toBe('pro-views');
});
```

### End-to-End Workflow Testing

Test complete workflows with multiple components:

```javascript
it('should complete CRUD workflow successfully', async () => {
  // Arrange
  const mockLogger = createMockLogger();
  const mockHandler = createMockFileSystemHandler();
  const mockTool = createMockTool();
  
  mockSetups.setupSuccessfulFileOperations(mockHandler);
  
  const workflow = new CRUDWorkflow(mockHandler, mockLogger);
  
  // Act
  const result = await workflow.executeComplete({
    model: 'TestModel',
    fields: [{ name: 'title', type: 'string' }]
  });
  
  // Assert
  expect(result.success).toBe(true);
  mockAssertions.assertFileWritten(mockHandler, 'models/TestModel.js');
  mockAssertions.assertLoggerCalled(mockLogger, 'info', 'CRUD workflow completed');
});
```

## Best Practices

### 1. Test Isolation

Ensure tests are isolated and don't affect each other:

```javascript
beforeEach(() => {
  vi.clearAllMocks(); // Essential for test isolation
  
  // Recreate mocks for each test
  mockLogger = createMockLogger();
  mockFileSystemHandler = createMockFileSystemHandler();
});
```

### 2. Use Test Data Factories

Use factory functions for consistent test data:

```javascript
// ✅ Good - Use factories
const packageJson = testDataFactories.createPackageJson({
  name: 'custom-project',
  version: '2.0.0'
});

// ❌ Avoid - Inline test data
const packageJson = {
  name: 'custom-project',
  version: '2.0.0',
  // ... many more properties
};
```

### 3. Test Both Positive and Negative Cases

Always test both success and failure scenarios:

```javascript
describe('validateInput', () => {
  it('should accept valid input', () => {
    const validInput = { name: 'test', type: 'string' };
    expect(() => instance.validateInput(validInput)).not.toThrow();
  });

  it('should reject invalid input', () => {
    const invalidInput = { name: '', type: 'invalid' };
    expect(() => instance.validateInput(invalidInput)).toThrow(BalmSharedMCPError);
  });
});
```

### 4. Use Meaningful Assertions

Write assertions that clearly express the expected behavior:

```javascript
// ✅ Good - Clear and specific
expect(result.success).toBe(true);
expect(result.data).toHaveLength(3);
expect(result.data[0].name).toBe('expected-name');

// ❌ Avoid - Vague or unclear
expect(result).toBeTruthy();
expect(result.data).toBeDefined();
```

### 5. Group Related Tests

Use nested describe blocks to organize related tests:

```javascript
describe('FileProcessor', () => {
  describe('processTextFile', () => {
    it('should process .txt files', () => {});
    it('should process .md files', () => {});
  });
  
  describe('processJsonFile', () => {
    it('should process valid JSON', () => {});
    it('should handle invalid JSON', () => {});
  });
});
```

### 6. Mock External Dependencies

Mock all external dependencies to ensure test reliability:

```javascript
// Mock file system operations
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn()
  }
}));

// Mock external libraries
vi.mock('external-library', () => ({
  default: vi.fn(() => ({
    method: vi.fn().mockResolvedValue('mocked result')
  }))
}));
```

## Common Pitfalls

### 1. Not Clearing Mocks

**Problem**: Tests interfere with each other due to shared mock state.

```javascript
// ❌ Problem - Mocks not cleared
describe('MyClass', () => {
  const mockLogger = createMockLogger();
  
  it('first test', () => {
    mockLogger.info('first message');
    expect(mockLogger.info).toHaveBeenCalledTimes(1);
  });
  
  it('second test', () => {
    // This will fail because mockLogger.info was called in the previous test
    expect(mockLogger.info).toHaveBeenCalledTimes(0);
  });
});
```

**Solution**: Always clear mocks in beforeEach:

```javascript
// ✅ Solution - Clear mocks between tests
describe('MyClass', () => {
  let mockLogger;
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = createMockLogger();
  });
  
  // Tests are now isolated
});
```

### 2. Inconsistent Mock Structures

**Problem**: Manual mock creation leads to inconsistencies.

```javascript
// ❌ Problem - Inconsistent mock structure
const mockLogger1 = { info: vi.fn(), error: vi.fn() };
const mockLogger2 = { info: vi.fn(), error: vi.fn(), debug: vi.fn() };
```

**Solution**: Use factory functions:

```javascript
// ✅ Solution - Consistent mock structure
const mockLogger1 = createMockLogger();
const mockLogger2 = createMockLogger();
```

### 3. Missing Error Cases

**Problem**: Only testing success scenarios.

```javascript
// ❌ Problem - Only success case tested
describe('readFile', () => {
  it('should read file successfully', async () => {
    // Only tests success case
  });
});
```

**Solution**: Test both success and error cases:

```javascript
// ✅ Solution - Test both scenarios
describe('readFile', () => {
  it('should read file successfully', async () => {
    // Test success case
  });
  
  it('should handle file not found error', async () => {
    // Test error case
  });
});
```

### 4. Complex Mock Setup in Tests

**Problem**: Complex mock setup clutters test logic.

```javascript
// ❌ Problem - Complex setup in test
it('should process file', async () => {
  mockHandler.exists.mockReturnValue(true);
  mockHandler.readFile.mockResolvedValue('content');
  mockHandler.writeFile.mockResolvedValue();
  mockHandler.createDirectory.mockResolvedValue();
  // ... many more lines of setup
  
  const result = await instance.processFile('/test/file');
  
  expect(result.success).toBe(true);
});
```

**Solution**: Use setup helpers:

```javascript
// ✅ Solution - Use setup helpers
it('should process file', async () => {
  mockSetups.setupSuccessfulFileOperations(mockHandler);
  
  const result = await instance.processFile('/test/file');
  
  expect(result.success).toBe(true);
});
```

### 5. Improper Async Testing

**Problem**: Not properly handling async operations.

```javascript
// ❌ Problem - Missing await
it('should handle async operation', () => {
  const result = instance.asyncMethod(); // Missing await
  expect(result).toBe('expected'); // Will fail
});
```

**Solution**: Proper async/await usage:

```javascript
// ✅ Solution - Proper async handling
it('should handle async operation', async () => {
  const result = await instance.asyncMethod();
  expect(result).toBe('expected');
});
```

## Migration Guide

### Updating Existing Tests

Follow these steps to migrate existing tests to the standardized patterns:

#### Step 1: Update Imports

```javascript
// Before
import { vi } from 'vitest';

// After
import { vi } from 'vitest';
import { 
  createMockLogger,
  createMockFileSystemHandler,
  mockSetups,
  mockAssertions
} from '../../tests/utils/mock-utilities.js';
```

#### Step 2: Replace Manual Mock Creation

```javascript
// Before
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
};

// After
const mockLogger = createMockLogger();
```

#### Step 3: Use Setup Helpers

```javascript
// Before
mockHandler.exists.mockReturnValue(true);
mockHandler.readFile.mockResolvedValue('content');
mockHandler.writeFile.mockResolvedValue();

// After
mockSetups.setupSuccessfulFileOperations(mockHandler);
```

#### Step 4: Use Assertion Helpers

```javascript
// Before
expect(mockHandler.writeFile).toHaveBeenCalled();
const calls = mockHandler.writeFile.mock.calls;
expect(calls[0][0]).toBe('expected/path');

// After
mockAssertions.assertFileWritten(mockHandler, 'expected/path');
```

#### Step 5: Add Mock Clearing

```javascript
// Before
describe('MyClass', () => {
  // No mock clearing
});

// After
describe('MyClass', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
});
```

### Migration Checklist

- [ ] Import mock utilities
- [ ] Replace manual mock creation with factory functions
- [ ] Use setup helpers for common scenarios
- [ ] Use assertion helpers for verification
- [ ] Add proper mock clearing in beforeEach
- [ ] Test both success and error cases
- [ ] Use descriptive test names
- [ ] Follow AAA pattern (Arrange-Act-Assert)

## Conclusion

Following these guidelines will ensure that all tests in the balm-shared-mcp project are:

- **Consistent** - Using standardized patterns and utilities
- **Maintainable** - Easy to update and extend
- **Reliable** - Properly isolated and deterministic
- **Readable** - Clear structure and meaningful assertions
- **Comprehensive** - Testing both success and error scenarios

For questions or clarifications about these guidelines, refer to the existing examples in `tests/examples/standardized-test-example.test.js` or consult the mock utilities documentation in `tests/utils/mock-utilities.js`.