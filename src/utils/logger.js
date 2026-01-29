/**
 * Enhanced Logging System
 *
 * Provides structured logging with file output, audit trails, and performance monitoring.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Log levels with numeric priorities
 */
export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  AUDIT: 'audit',
  PERFORMANCE: 'performance'
};

/**
 * Log categories for better organization
 */
export const LogCategory = {
  SYSTEM: 'system',
  USER_ACTION: 'user_action',
  TOOL_EXECUTION: 'tool_execution',
  PROJECT_OPERATION: 'project_operation',
  FILE_OPERATION: 'file_operation',
  TEMPLATE_OPERATION: 'template_operation',
  ERROR_HANDLING: 'error_handling',
  PERFORMANCE: 'performance',
  AUDIT: 'audit'
};

/**
 * Enhanced Logger class with file output and structured logging
 */
class Logger {
  constructor(options = {}) {
    this.level = options.level || process.env.LOG_LEVEL || 'info';
    this.enableFileLogging = options.enableFileLogging !== false;
    this.logDirectory = options.logDirectory || path.join(__dirname, '../../logs');
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
    this.maxFiles = options.maxFiles || 5;

    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      audit: 4,
      performance: 4
    };

    // Performance tracking
    this.performanceTimers = new Map();

    // Initialize log directory
    this.initializeLogDirectory();
  }

  /**
   * Initialize log directory structure
   */
  async initializeLogDirectory() {
    if (!this.enableFileLogging) {
      return;
    }

    try {
      await fs.mkdir(this.logDirectory, { recursive: true });
      await fs.mkdir(path.join(this.logDirectory, 'audit'), { recursive: true });
      await fs.mkdir(path.join(this.logDirectory, 'performance'), { recursive: true });
      await fs.mkdir(path.join(this.logDirectory, 'errors'), { recursive: true });
    } catch (error) {
      console.error('Failed to initialize log directory:', error);
    }
  }

  /**
   * Set log level
   */
  setLevel(level) {
    if (Object.hasOwn(this.levels, level)) {
      this.level = level;
    }
  }

  /**
   * Check if message should be logged based on level
   */
  shouldLog(level) {
    return this.levels[level] >= this.levels[this.level];
  }

  /**
   * Format log message with structured data
   */
  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      category: meta.category || LogCategory.SYSTEM,
      sessionId: meta.sessionId || 'unknown',
      userId: meta.userId || 'system',
      requestId: meta.requestId || this.generateRequestId(),
      ...meta
    };

    return logEntry;
  }

  /**
   * Generate unique request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Write log to file
   */
  async writeToFile(logEntry, filename = 'app.log') {
    if (!this.enableFileLogging) {
      return;
    }

    try {
      const logPath = path.join(this.logDirectory, filename);
      const logLine = `${JSON.stringify(logEntry)}\n`;

      // Check file size and rotate if necessary
      await this.rotateLogIfNeeded(logPath);

      await fs.appendFile(logPath, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Rotate log file if it exceeds max size
   */
  async rotateLogIfNeeded(logPath) {
    try {
      const stats = await fs.stat(logPath);
      if (stats.size > this.maxFileSize) {
        await this.rotateLogFile(logPath);
      }
    } catch {
      // File doesn't exist yet, no need to rotate
    }
  }

  /**
   * Rotate log file
   */
  async rotateLogFile(logPath) {
    const dir = path.dirname(logPath);
    const basename = path.basename(logPath, '.log');

    // Move existing rotated files
    for (let i = this.maxFiles - 1; i > 0; i--) {
      const oldFile = path.join(dir, `${basename}.${i}.log`);
      const newFile = path.join(dir, `${basename}.${i + 1}.log`);

      try {
        await fs.rename(oldFile, newFile);
      } catch {
        // File doesn't exist, continue
      }
    }

    // Move current file to .1
    const rotatedFile = path.join(dir, `${basename}.1.log`);
    try {
      await fs.rename(logPath, rotatedFile);
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  /**
   * Debug level logging
   */
  async debug(message, meta = {}) {
    if (this.shouldLog('debug')) {
      const logEntry = this.formatMessage('debug', message, meta);
      console.log(JSON.stringify(logEntry));
      await this.writeToFile(logEntry);
    }
  }

  /**
   * Info level logging
   */
  async info(message, meta = {}) {
    if (this.shouldLog('info')) {
      const logEntry = this.formatMessage('info', message, meta);
      console.log(JSON.stringify(logEntry));
      await this.writeToFile(logEntry);
    }
  }

  /**
   * Warning level logging
   */
  async warn(message, meta = {}) {
    if (this.shouldLog('warn')) {
      const logEntry = this.formatMessage('warn', message, meta);
      console.warn(JSON.stringify(logEntry));
      await this.writeToFile(logEntry);
    }
  }

  /**
   * Error level logging
   */
  async error(message, meta = {}) {
    if (this.shouldLog('error')) {
      const logEntry = this.formatMessage('error', message, {
        ...meta,
        category: meta.category || LogCategory.ERROR_HANDLING
      });
      console.error(JSON.stringify(logEntry));
      await this.writeToFile(logEntry, 'errors/error.log');
    }
  }

  /**
   * Audit logging for user actions and system events
   */
  async audit(action, details = {}) {
    const logEntry = this.formatMessage('audit', `Audit: ${action}`, {
      ...details,
      category: LogCategory.AUDIT,
      action,
      auditType: details.auditType || 'user_action'
    });

    console.log(JSON.stringify(logEntry));
    await this.writeToFile(logEntry, 'audit/audit.log');
  }

  /**
   * Performance logging and monitoring
   */
  async performance(metric, value, meta = {}) {
    const logEntry = this.formatMessage('performance', `Performance: ${metric}`, {
      ...meta,
      category: LogCategory.PERFORMANCE,
      metric,
      value,
      unit: meta.unit || 'ms'
    });

    console.log(JSON.stringify(logEntry));
    await this.writeToFile(logEntry, 'performance/performance.log');
  }

  /**
   * Start performance timer
   */
  startTimer(name, meta = {}) {
    this.performanceTimers.set(name, {
      startTime: Date.now(),
      meta
    });
  }

  /**
   * End performance timer and log result
   */
  async endTimer(name, additionalMeta = {}) {
    const timer = this.performanceTimers.get(name);
    if (!timer) {
      await this.warn(`Timer '${name}' not found`, { category: LogCategory.PERFORMANCE });
      return;
    }

    const duration = Date.now() - timer.startTime;
    this.performanceTimers.delete(name);

    await this.performance(name, duration, {
      ...timer.meta,
      ...additionalMeta,
      duration
    });

    return duration;
  }

  /**
   * Log tool execution
   */
  async logToolExecution(toolName, operation, result, meta = {}) {
    await this.info(`Tool execution: ${toolName}.${operation}`, {
      ...meta,
      category: LogCategory.TOOL_EXECUTION,
      toolName,
      operation,
      success: result.success || false,
      duration: result.duration || 0,
      resultSize: result.data ? JSON.stringify(result.data).length : 0
    });
  }

  /**
   * Log user action
   */
  async logUserAction(action, details = {}) {
    await this.audit(action, {
      ...details,
      auditType: 'user_action',
      category: LogCategory.USER_ACTION
    });
  }

  /**
   * Log system event
   */
  async logSystemEvent(event, details = {}) {
    await this.audit(event, {
      ...details,
      auditType: 'system_event',
      category: LogCategory.SYSTEM
    });
  }

  /**
   * Log project operation
   */
  async logProjectOperation(operation, projectPath, result, meta = {}) {
    await this.info(`Project operation: ${operation}`, {
      ...meta,
      category: LogCategory.PROJECT_OPERATION,
      operation,
      projectPath,
      success: result.success || false,
      duration: result.duration || 0
    });
  }

  /**
   * Log file operation
   */
  async logFileOperation(operation, filePath, result, meta = {}) {
    await this.info(`File operation: ${operation}`, {
      ...meta,
      category: LogCategory.FILE_OPERATION,
      operation,
      filePath,
      success: result.success || false,
      fileSize: result.fileSize || 0
    });
  }

  /**
   * Create child logger with additional context
   */
  child(context = {}) {
    const childLogger = Object.create(this);
    childLogger.defaultMeta = { ...this.defaultMeta, ...context };

    // Override logging methods to include default meta
    ['debug', 'info', 'warn', 'error', 'audit', 'performance'].forEach(method => {
      const originalMethod = this[method].bind(this);
      childLogger[method] = (message, meta = {}) => {
        return originalMethod(message, { ...childLogger.defaultMeta, ...meta });
      };
    });

    return childLogger;
  }

  /**
   * Get log statistics
   */
  async getLogStats() {
    if (!this.enableFileLogging) {
      return { fileLogging: false };
    }

    try {
      const stats = {};
      const logFiles = [
        'app.log',
        'audit/audit.log',
        'performance/performance.log',
        'errors/error.log'
      ];

      for (const file of logFiles) {
        const filePath = path.join(this.logDirectory, file);
        try {
          const fileStat = await fs.stat(filePath);
          stats[file] = {
            size: fileStat.size,
            modified: fileStat.mtime,
            lines: await this.countLines(filePath)
          };
        } catch {
          stats[file] = { exists: false };
        }
      }

      return stats;
    } catch (error) {
      await this.error('Failed to get log statistics', { error: error.message });
      return { error: error.message };
    }
  }

  /**
   * Count lines in log file
   */
  async countLines(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return content.split('\n').length - 1;
    } catch {
      return 0;
    }
  }

  /**
   * Clean old log files
   */
  async cleanOldLogs(daysToKeep = 30) {
    if (!this.enableFileLogging) {
      return;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    try {
      const files = await fs.readdir(this.logDirectory, { recursive: true });

      for (const file of files) {
        const filePath = path.join(this.logDirectory, file);
        const stats = await fs.stat(filePath);

        if (stats.isFile() && stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          await this.info(`Cleaned old log file: ${file}`, {
            category: LogCategory.SYSTEM,
            operation: 'log_cleanup'
          });
        }
      }
    } catch (error) {
      await this.error('Failed to clean old logs', { error: error.message });
    }
  }
}

// Create default logger instance
export const logger = new Logger();

// Export logger class for custom instances
export { Logger };
