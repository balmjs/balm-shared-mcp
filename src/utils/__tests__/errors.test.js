/**
 * Tests for Error Handling System
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BalmSharedMCPError,
  ErrorCodes,
  ErrorSeverity,
  ErrorCategory,
  createError,
  createLocalizedError,
  wrapError,
  withErrorHandling,
  validateInput,
  ErrorRecoveryManager
} from '../errors.js';

// Mock fs/promises module
vi.mock('fs/promises', () => ({
  mkdir: vi.fn()
}));

describe('BalmSharedMCPError', () => {
  it('should create error with basic properties', () => {
    const error = new BalmSharedMCPError(
      ErrorCodes.TOOL_NOT_FOUND,
      'Tool not found',
      { toolName: 'test-tool' }
    );

    expect(error.name).toBe('BalmSharedMCPError');
    expect(error.code).toBe(ErrorCodes.TOOL_NOT_FOUND);
    expect(error.message).toBe('Tool not found');
    expect(error.details.toolName).toBe('test-tool');
    expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    expect(error.category).toBe(ErrorCategory.INTERNAL);
  });

  it('should create error with custom options', () => {
    const error = new BalmSharedMCPError(
      ErrorCodes.PERMISSION_DENIED,
      'Access denied',
      { path: '/test' },
      {
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.SYSTEM,
        locale: 'en'
      }
    );

    expect(error.severity).toBe(ErrorSeverity.HIGH);
    expect(error.category).toBe(ErrorCategory.SYSTEM);
    expect(error.locale).toBe('en');
  });

  it('should get localized message in Chinese', () => {
    const error = new BalmSharedMCPError(
      ErrorCodes.TOOL_NOT_FOUND,
      'Tool not found',
      { toolName: 'test-tool' },
      { locale: 'zh' }
    );

    const localizedMessage = error.getLocalizedMessage();
    expect(localizedMessage).toBe('工具 "test-tool" 未找到');
  });

  it('should get localized message in English', () => {
    const error = new BalmSharedMCPError(
      ErrorCodes.TOOL_NOT_FOUND,
      'Tool not found',
      { toolName: 'test-tool' },
      { locale: 'en' }
    );

    const localizedMessage = error.getLocalizedMessage('en');
    expect(localizedMessage).toBe('Tool "test-tool" not found');
  });

  it('should get suggestions for error', () => {
    const error = new BalmSharedMCPError(
      ErrorCodes.TOOL_NOT_FOUND,
      'Tool not found',
      { toolName: 'test-tool' }
    );

    const suggestions = error.getSuggestions();
    expect(suggestions).toContain('检查工具名称是否正确');
    expect(suggestions).toContain('确认工具已正确注册');
  });

  it('should check if error can be recovered', () => {
    const recoverableError = new BalmSharedMCPError(
      ErrorCodes.PROJECT_NOT_FOUND,
      'Project not found'
    );
    expect(recoverableError.canRecover()).toBe(true);

    const nonRecoverableError = new BalmSharedMCPError(
      ErrorCodes.TOOL_NOT_FOUND,
      'Tool not found'
    );
    expect(nonRecoverableError.canRecover()).toBe(false);
  });

  it('should get recovery strategy', () => {
    const error = new BalmSharedMCPError(
      ErrorCodes.PROJECT_NOT_FOUND,
      'Project not found'
    );

    expect(error.getRecoveryStrategy()).toBe('suggest_create_project');
  });

  it('should get user-friendly info', () => {
    const error = new BalmSharedMCPError(
      ErrorCodes.TOOL_NOT_FOUND,
      'Tool not found',
      { toolName: 'test-tool' }
    );

    const info = error.getUserFriendlyInfo();
    expect(info.message).toBe('工具 "test-tool" 未找到');
    expect(info.suggestions).toBeInstanceOf(Array);
    expect(info.canRecover).toBe(false);
    expect(info.severity).toBe(ErrorSeverity.MEDIUM);
  });

  it('should serialize to JSON correctly', () => {
    const originalError = new Error('Original error');
    const error = new BalmSharedMCPError(
      ErrorCodes.TOOL_EXECUTION_FAILED,
      'Execution failed',
      { error: 'Original error', context: 'test' },
      { originalError }
    );

    const json = error.toJSON();
    expect(json.name).toBe('BalmSharedMCPError');
    expect(json.code).toBe(ErrorCodes.TOOL_EXECUTION_FAILED);
    expect(json.localizedMessage).toBe('工具执行失败: Original error');
    expect(json.originalError.message).toBe('Original error');
  });
});

describe('Error Creation Functions', () => {
  it('should create error with createError', () => {
    const error = createError(
      ErrorCodes.VALIDATION_FAILED,
      'Validation failed',
      { field: 'name' }
    );

    expect(error).toBeInstanceOf(BalmSharedMCPError);
    expect(error.code).toBe(ErrorCodes.VALIDATION_FAILED);
  });

  it('should create localized error with createLocalizedError', () => {
    const error = createLocalizedError(
      ErrorCodes.FILE_NOT_FOUND,
      { path: '/test/file.txt' },
      { locale: 'zh' }
    );

    expect(error.message).toBe('文件未找到: /test/file.txt');
  });

  it('should wrap error with wrapError', () => {
    const originalError = new Error('Original error');
    const wrappedError = wrapError(
      originalError,
      ErrorCodes.TOOL_EXECUTION_FAILED,
      'Tool failed',
      { context: 'test' }
    );

    expect(wrappedError.originalError).toBe(originalError);
    expect(wrappedError.code).toBe(ErrorCodes.TOOL_EXECUTION_FAILED);
  });
});

describe('withErrorHandling', () => {
  it('should handle successful function execution', async () => {
    const fn = async (x) => x * 2;
    const wrappedFn = withErrorHandling(fn, { operation: 'multiply' });

    const result = await wrappedFn(5);
    expect(result).toBe(10);
  });

  it('should wrap unknown errors', async () => {
    const fn = async () => {
      throw new Error('Unknown error');
    };
    const wrappedFn = withErrorHandling(fn, { operation: 'test' });

    await expect(wrappedFn()).rejects.toThrow(BalmSharedMCPError);
  });

  it('should pass through BalmSharedMCPError', async () => {
    const originalError = createError(ErrorCodes.VALIDATION_FAILED, 'Validation failed');
    const fn = async () => {
      throw originalError;
    };
    const wrappedFn = withErrorHandling(fn);

    await expect(wrappedFn()).rejects.toBe(originalError);
  });
});

describe('validateInput', () => {
  it('should validate required fields', () => {
    const schema = {
      required: ['name', 'type']
    };

    expect(() => {
      validateInput({ name: 'test' }, schema);
    }).toThrow(BalmSharedMCPError);

    expect(() => {
      validateInput({ name: 'test', type: 'component' }, schema);
    }).not.toThrow();
  });

  it('should validate field types', () => {
    const schema = {
      properties: {
        count: { type: 'number' },
        name: { type: 'string' }
      }
    };

    expect(() => {
      validateInput({ count: 'invalid', name: 'test' }, schema);
    }).toThrow(BalmSharedMCPError);

    expect(() => {
      validateInput({ count: 42, name: 'test' }, schema);
    }).not.toThrow();
  });

  it('should validate enum values', () => {
    const schema = {
      properties: {
        status: { enum: ['active', 'inactive', 'pending'] }
      }
    };

    expect(() => {
      validateInput({ status: 'invalid' }, schema);
    }).toThrow(BalmSharedMCPError);

    expect(() => {
      validateInput({ status: 'active' }, schema);
    }).not.toThrow();
  });
});

describe('ErrorRecoveryManager', () => {
  let recoveryManager;

  beforeEach(() => {
    recoveryManager = new ErrorRecoveryManager();
  });

  it('should attempt recovery for recoverable errors', async () => {
    // Mock fs.mkdir for the recovery handler
    const fs = await import('fs/promises');
    vi.mocked(fs.mkdir).mockResolvedValue();
    
    const error = createError(
      ErrorCodes.DIRECTORY_NOT_FOUND,
      'Directory not found',
      { path: '/test/dir' }
    );

    const result = await recoveryManager.attemptRecovery(error);
    expect(result.success).toBe(true);
    expect(result.message).toContain('Created directory');
  });

  it('should fail recovery for non-recoverable errors', async () => {
    const error = createError(
      ErrorCodes.TOOL_NOT_FOUND,
      'Tool not found'
    );

    const result = await recoveryManager.attemptRecovery(error);
    expect(result.success).toBe(false);
    expect(result.message).toBe('Error cannot be automatically recovered');
  });

  it('should handle non-MCP errors', async () => {
    const error = new Error('Regular error');

    const result = await recoveryManager.attemptRecovery(error);
    expect(result.success).toBe(false);
    expect(result.message).toBe('Cannot recover from non-MCP errors');
  });

  it('should register custom recovery handlers', async () => {
    const customHandler = async (error) => ({
      success: true,
      message: 'Custom recovery successful'
    });

    recoveryManager.registerRecoveryHandler('custom_strategy', customHandler);

    // Mock an error with custom strategy
    const error = createError(ErrorCodes.VALIDATION_FAILED, 'Test error');
    error.getRecoveryStrategy = () => 'custom_strategy';
    error.canRecover = () => true;

    const result = await recoveryManager.attemptRecovery(error);
    expect(result.success).toBe(true);
    expect(result.message).toBe('Custom recovery successful');
  });
});