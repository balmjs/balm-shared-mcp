# Test Patterns and Mock Guidelines

This document outlines standardized testing patterns and mock utilities for the balm-shared-mcp project.

## Overview

Consistent testing patterns improve code maintainability, reduce duplication, and make tests easier to understand and debug. This guide provides standardized mock utilities and testing patterns to be used across all test files.

## Mock Utilities

### Import Mock Utilities

```javascript
import { 
  createMockLogger,
  createMockFileSystemHandler,
  createMockTool,
  createMockMCPContext,
  mockSetups,
  mockAssertions,
  testDataFactories
} from '../utils/mock-utilities.js';
```

### Basic Mock Creation

#### Logger Mock
```javascript
const mockLogger = createMockLogger();

// Usage in tests
expect(mockLogger.info).toHaveBeenCalledWith('Expected message');
expect(mockLogger.error).toHaveBeenCalledWith(
  expect.stringContaining('Error occurred'),
  expect.objectContaining({ error: expect.any(String) })
);
```

#### FileSystem Handler Mock
```javascript
const mockFileSystemHandler = createMockFileSystemHandler();

// Setup for successful operations
mockSetups.setupSuccessfulFileOperations(mockFileSystemHandler);

// Setup for specific scenarios
mockSetups.setupFileNotFound(mockFileSystemHandler);
mockSetups.setupPermissionDenied(mockFileSystemHandler);
```

#### Tool Mock
```javascript
const mockTool = createMockTool({
  name: 'custom_tool',
  handler: vi.fn().mockResolvedValue({ success: true, data: 'custom result' })
});
```

## Standard Test Structure

### Test File Template

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { YourClass } from '../your-class.js';
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
    mockLogger = createMockLogger();
    mockFileSystemHandler = createMockFileSystemHandler();
    
    // Setup default successful operations
    mockSetups.setupSuccessfulFileOperations(mockFileSystemHandler);
    
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
        .rejects.toThrow('Expected error message');
      
      mockAssertions.assertLoggerCalled(mockLogger, 'error', 'Expected error');
    });
  });
});
```

### Async/Await Testing Patterns

#### Success Cases
```javascript
it('should handle async operation successfully', async () => {
  const mockHandler = createMockFileSystemHandler();
  mockHandler.readFile.mockResolvedValue('file content');
  
  const result = await instance.readFileMethod('/test/path');
  
  expect(result).toBe('file content');
  expect(mockHandler.readFile).toHaveBeenCalledWith('/test/path');
});
```

#### Error Cases
```javascript
it('should handle async operation errors', async () => {
  const mockHandler = createMockFileSystemHandler();
  mockHandler.readFile.mockRejectedValue(new Error('File not found'));
  
  await expect(instance.readFileMethod('/test/path'))
    .rejects.toThrow('File not found');
});
```

### Mock Setup Patterns

#### File Operations
```javascript
// Successful file operations
mockSetups.setupSuccessfulFileOperations(mockFileSystemHandler);

// File not found scenario
mockSetups.setupFileNotFound(mockFileSystemHandler);

// Permission denied scenario
mockSetups.setupPermissionDenied(mockFileSystemHandler);

// JSON file operations
const jsonData = { name: 'test', version: '1.0.0' };
mockSetups.setupJsonFileOperations(mockFileSystemHandler, jsonData);
```

#### Directory Operations
```javascript
mockSetups.setupSuccessfulDirectoryOperations(mockFileSystemHandler);

// Custom directory listing
mockFileSystemHandler.listDirectory.mockResolvedValue([
  createMockDirectoryEntry('file1.txt', false),
  createMockDirectoryEntry('subdir', true)
]);
```

### Assertion Patterns

#### File System Assertions
```javascript
// Assert file was written
mockAssertions.assertFileWritten(mockFileSystemHandler, 'expected/path', 'expected content');

// Assert directory was created
mockAssertions.assertDirectoryCreated(mockFileSystemHandler, 'expected/path');

// Assert file was read
mockAssertions.assertFileRead(mockFileSystemHandler, 'expected/path');
```

#### Logger Assertions
```javascript
// Assert logger was called
mockAssertions.assertLoggerCalled(mockLogger, 'info', 'Expected message');
mockAssertions.assertLoggerCalled(mockLogger, 'error', 'Error occurred');
```

#### Custom Assertions
```javascript
// Tool execution assertions
expect(mockTool.handler).toHaveBeenCalledWith(
  expectedArgs,
  expect.objectContaining({
    requestId: expect.any(String),
    toolName: 'expected_tool_name'
  })
);

// Error type assertions
expect(error).toBeInstanceOf(BalmSharedMCPError);
expect(error.message).toContain('Expected error message');
```

## Error Testing Patterns

### Standard Error Testing
```javascript
it('should throw BalmSharedMCPError for invalid input', async () => {
  const invalidInput = { /* invalid data */ };
  
  await expect(instance.method(invalidInput))
    .rejects.toThrow(BalmSharedMCPError);
  
  await expect(instance.method(invalidInput))
    .rejects.toThrow('Specific error message');
});
```

### Error Logging Testing
```javascript
it('should log errors appropriately', async () => {
  mockFileSystemHandler.writeFile.mockRejectedValue(new Error('Write failed'));
  
  await expect(instance.writeMethod())
    .rejects.toThrow();
  
  mockAssertions.assertLoggerCalled(mockLogger, 'error', 'Write failed');
});
```

## Integration Test Patterns

### Setup and Teardown
```javascript
describe('Integration Tests', () => {
  let testProjectPath;
  let cleanup = [];

  beforeEach(async () => {
    testProjectPath = await testUtils.createTempDir();
    cleanup.push(() => testUtils.cleanupTempDir(testProjectPath));
  });

  afterEach(async () => {
    await Promise.allSettled(cleanup.map(fn => fn()));
    cleanup = [];
  });
});
```

### Resource Testing
```javascript
it('should handle resource queries', async () => {
  const componentData = testDataFactories.createComponentQueryData();
  
  // Mock file system to return test data
  mockFileSystemHandler.readFile.mockResolvedValue(
    JSON.stringify(componentData)
  );
  
  const result = await instance.queryComponent('ui-list-view');
  
  expect(result.found).toBe(true);
  expect(result.name).toBe('ui-list-view');
});
```

## Mock Reset and Cleanup

### Between Tests
```javascript
beforeEach(() => {
  vi.clearAllMocks(); // Clear all vitest mocks
  
  // Or use utility for custom mock objects
  mockResetUtils.clearAllMocks(customMockObject);
});
```

### Complete Reset
```javascript
beforeEach(() => {
  vi.resetAllMocks(); // Reset all mock implementations
  
  // Recreate mocks if needed
  mockLogger = createMockLogger();
  mockFileSystemHandler = createMockFileSystemHandler();
});
```

## Best Practices

### 1. Use Factory Functions
Always use the provided factory functions instead of creating mocks manually:

```javascript
// ✅ Good
const mockLogger = createMockLogger();

// ❌ Avoid
const mockLogger = {
  info: vi.fn(),
  error: vi.fn()
  // Missing methods, inconsistent structure
};
```

### 2. Use Setup Helpers
Leverage setup helpers for common scenarios:

```javascript
// ✅ Good
mockSetups.setupSuccessfulFileOperations(mockFileSystemHandler);

// ❌ Avoid
mockFileSystemHandler.exists.mockReturnValue(true);
mockFileSystemHandler.readFile.mockResolvedValue('content');
// ... many more lines
```

### 3. Use Assertion Helpers
Use assertion helpers for common patterns:

```javascript
// ✅ Good
mockAssertions.assertFileWritten(mockHandler, 'path', 'content');

// ❌ Avoid
expect(mockHandler.writeFile).toHaveBeenCalled();
const calls = mockHandler.writeFile.mock.calls;
// ... complex assertion logic
```

### 4. Test Both Success and Error Cases
Always test both success and error scenarios:

```javascript
describe('methodName', () => {
  it('should handle success case', async () => {
    // Test success
  });

  it('should handle error case', async () => {
    // Test error
  });
});
```

### 5. Use Descriptive Test Names
Write clear, descriptive test names:

```javascript
// ✅ Good
it('should create model config file when valid options provided', () => {});
it('should throw BalmSharedMCPError when model name is invalid', () => {});

// ❌ Avoid
it('should work', () => {});
it('should fail', () => {});
```

### 6. Group Related Tests
Use nested describe blocks to group related functionality:

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
});
```

## Common Pitfalls to Avoid

### 1. Not Clearing Mocks
Always clear mocks between tests to avoid test interference:

```javascript
beforeEach(() => {
  vi.clearAllMocks(); // Essential for test isolation
});
```

### 2. Inconsistent Mock Structures
Use factory functions to ensure consistent mock structures across tests.

### 3. Missing Error Cases
Always test error scenarios, not just success cases.

### 4. Complex Mock Setup in Tests
Move complex mock setup to helper functions or beforeEach blocks.

### 5. Not Testing Async Operations Properly
Use proper async/await patterns and test both resolved and rejected promises.

## Migration Guide

### Updating Existing Tests

1. **Import mock utilities**:
   ```javascript
   import { createMockLogger, createMockFileSystemHandler } from '../utils/mock-utilities.js';
   ```

2. **Replace manual mock creation**:
   ```javascript
   // Before
   const mockLogger = { info: vi.fn(), error: vi.fn() };
   
   // After
   const mockLogger = createMockLogger();
   ```

3. **Use setup helpers**:
   ```javascript
   // Before
   mockHandler.exists.mockReturnValue(true);
   mockHandler.readFile.mockResolvedValue('content');
   
   // After
   mockSetups.setupSuccessfulFileOperations(mockHandler);
   ```

4. **Use assertion helpers**:
   ```javascript
   // Before
   expect(mockHandler.writeFile).toHaveBeenCalled();
   
   // After
   mockAssertions.assertFileWritten(mockHandler, 'expected/path');
   ```

This standardization will make tests more maintainable, consistent, and easier to understand across the entire project.

## Additional Resources

For comprehensive test writing guidelines, including detailed patterns and best practices, see:

- **[Test Writing Guidelines](./TEST_WRITING_GUIDELINES.md)** - Complete guide to writing tests in this project
- **[Async Testing Examples](../tests/examples/async-testing-patterns.test.js)** - Comprehensive async/await testing patterns
- **[Error Testing Examples](../tests/examples/error-testing-patterns.test.js)** - Error handling and testing conventions
- **[Standardized Test Example](../tests/examples/standardized-test-example.test.js)** - Complete example using all patterns

These resources provide detailed examples and explanations for all testing scenarios covered in this project.