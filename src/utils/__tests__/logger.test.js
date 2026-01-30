/**
 * Tests for Enhanced Logging System
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { Logger, LogLevel, LogCategory, logger } from '../logger.js';

// Mock fs module
vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn(),
    appendFile: vi.fn(),
    stat: vi.fn(),
    readdir: vi.fn(),
    readFile: vi.fn(),
    unlink: vi.fn()
  },
  mkdir: vi.fn(),
  appendFile: vi.fn(),
  stat: vi.fn(),
  readdir: vi.fn(),
  readFile: vi.fn(),
  unlink: vi.fn()
}));

describe('Logger', () => {
  let testLogger;
  let consoleSpy;

  beforeEach(() => {
    testLogger = new Logger({
      enableFileLogging: false, // Disable file logging for tests
      level: 'debug'
    });

    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Logging', () => {
    it('should log debug messages', async () => {
      await testLogger.debug('Debug message', { test: true });

      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('"level":"DEBUG"'));
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Debug message"')
      );
    });

    it('should log info messages', async () => {
      await testLogger.info('Info message', { category: LogCategory.SYSTEM });

      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('"level":"INFO"'));
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('"category":"system"'));
    });

    it('should log warning messages', async () => {
      await testLogger.warn('Warning message');

      expect(consoleSpy.warn).toHaveBeenCalledWith(expect.stringContaining('"level":"WARN"'));
    });

    it('should log error messages', async () => {
      await testLogger.error('Error message', { errorCode: 'TEST_ERROR' });

      expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('"level":"ERROR"'));
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('"errorCode":"TEST_ERROR"')
      );
    });
  });

  describe('Log Levels', () => {
    it('should respect log level filtering', async () => {
      testLogger.setLevel('warn');

      await testLogger.debug('Debug message');
      await testLogger.info('Info message');
      await testLogger.warn('Warning message');
      await testLogger.error('Error message');

      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });

    it('should check if level should be logged', () => {
      testLogger.setLevel('info');

      expect(testLogger.shouldLog('debug')).toBe(false);
      expect(testLogger.shouldLog('info')).toBe(true);
      expect(testLogger.shouldLog('warn')).toBe(true);
      expect(testLogger.shouldLog('error')).toBe(true);
    });
  });

  describe('Message Formatting', () => {
    it('should format messages with structured data', () => {
      const formatted = testLogger.formatMessage('info', 'Test message', {
        category: LogCategory.USER_ACTION,
        userId: 'user123'
      });

      expect(formatted).toMatchObject({
        level: 'INFO',
        message: 'Test message',
        category: LogCategory.USER_ACTION,
        userId: 'user123'
      });
      expect(formatted.timestamp).toBeDefined();
      expect(formatted.requestId).toBeDefined();
    });

    it('should generate unique request IDs', () => {
      const id1 = testLogger.generateRequestId();
      const id2 = testLogger.generateRequestId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/);
    });
  });

  describe('Audit Logging', () => {
    it('should log audit events', async () => {
      await testLogger.audit('user_login', {
        userId: 'user123',
        ip: '192.168.1.1'
      });

      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('"level":"AUDIT"'));
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('"action":"user_login"'));
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('"category":"audit"'));
    });

    it('should log user actions', async () => {
      await testLogger.logUserAction('create_project', {
        projectName: 'test-project',
        userId: 'user123'
      });

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('"auditType":"user_action"')
      );
    });

    it('should log system events', async () => {
      await testLogger.logSystemEvent('server_start', {
        version: '1.0.0'
      });

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('"auditType":"system_event"')
      );
    });
  });

  describe('Performance Logging', () => {
    it('should log performance metrics', async () => {
      await testLogger.performance('api_response_time', 150, {
        endpoint: '/api/projects',
        unit: 'ms'
      });

      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('"level":"PERFORMANCE"'));
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('"metric":"api_response_time"')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('"value":150'));
    });

    it('should handle performance timers', async () => {
      testLogger.startTimer('test_operation', { operation: 'test' });

      // Simulate some delay
      await new Promise(resolve => setTimeout(resolve, 10));

      const duration = await testLogger.endTimer('test_operation');

      expect(duration).toBeGreaterThan(0);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('"metric":"test_operation"')
      );
    });

    it('should warn when ending non-existent timer', async () => {
      await testLogger.endTimer('non_existent_timer');

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining("Timer 'non_existent_timer' not found")
      );
    });
  });

  describe('Specialized Logging Methods', () => {
    it('should log tool execution', async () => {
      await testLogger.logToolExecution('create-component', 'execute', {
        success: true,
        duration: 250,
        data: { componentName: 'TestComponent' }
      });

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('"category":"tool_execution"')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('"toolName":"create-component"')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('"success":true'));
    });

    it('should log project operations', async () => {
      await testLogger.logProjectOperation('analyze', '/path/to/project', {
        success: true,
        duration: 500
      });

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('"category":"project_operation"')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('"operation":"analyze"'));
    });

    it('should log file operations', async () => {
      await testLogger.logFileOperation('read', '/path/to/file.js', {
        success: true,
        fileSize: 1024
      });

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('"category":"file_operation"')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('"fileSize":1024'));
    });
  });

  describe('Child Logger', () => {
    it('should create child logger with additional context', async () => {
      const childLogger = testLogger.child({
        userId: 'user123',
        sessionId: 'session456'
      });

      await childLogger.info('Child logger message');

      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('"userId":"user123"'));
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('"sessionId":"session456"')
      );
    });
  });

  describe('File Logging', () => {
    it('should have file logging configuration', () => {
      const fileLogger = new Logger({
        enableFileLogging: true,
        logDirectory: '/tmp/test-logs'
      });

      expect(fileLogger.enableFileLogging).toBe(true);
      expect(fileLogger.logDirectory).toBe('/tmp/test-logs');
    });

    it('should disable file logging when configured', () => {
      const fileLogger = new Logger({
        enableFileLogging: false
      });

      expect(fileLogger.enableFileLogging).toBe(false);
    });
  });

  describe('Log Statistics', () => {
    it('should return file logging disabled status', async () => {
      const stats = await testLogger.getLogStats();
      expect(stats.fileLogging).toBe(false);
    });

    it('should handle file logging disabled in stats', async () => {
      const fileLogger = new Logger({
        enableFileLogging: true,
        logDirectory: '/tmp/test-logs'
      });

      // Test that getLogStats method exists and can be called
      expect(typeof fileLogger.getLogStats).toBe('function');

      // For now, just test that it doesn't throw
      const stats = await fileLogger.getLogStats();
      expect(stats).toBeDefined();
    });
  });
});

describe('Default Logger Instance', () => {
  it('should export default logger instance', () => {
    expect(logger).toBeInstanceOf(Logger);
  });

  it('should have correct log levels', () => {
    expect(LogLevel.DEBUG).toBe('debug');
    expect(LogLevel.INFO).toBe('info');
    expect(LogLevel.WARN).toBe('warn');
    expect(LogLevel.ERROR).toBe('error');
    expect(LogLevel.AUDIT).toBe('audit');
    expect(LogLevel.PERFORMANCE).toBe('performance');
  });

  it('should have correct log categories', () => {
    expect(LogCategory.SYSTEM).toBe('system');
    expect(LogCategory.USER_ACTION).toBe('user_action');
    expect(LogCategory.TOOL_EXECUTION).toBe('tool_execution');
    expect(LogCategory.AUDIT).toBe('audit');
  });
});
