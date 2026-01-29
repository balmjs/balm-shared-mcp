/**
 * Error Handling Utilities
 *
 * Defines custom error types, error codes, and internationalization for the MCP server.
 */

export const ErrorCodes = {
  // General errors
  TOOL_NOT_FOUND: 'TOOL_NOT_FOUND',
  TOOL_EXECUTION_FAILED: 'TOOL_EXECUTION_FAILED',
  INVALID_CONFIGURATION: 'INVALID_CONFIGURATION',
  INVALID_REQUEST: 'INVALID_REQUEST',
  VALIDATION_FAILED: 'VALIDATION_FAILED',

  // Project errors
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  INVALID_PROJECT_STRUCTURE: 'INVALID_PROJECT_STRUCTURE',
  PROJECT_CREATION_FAILED: 'PROJECT_CREATION_FAILED',
  PROJECT_ANALYSIS_FAILED: 'PROJECT_ANALYSIS_FAILED',

  // File system errors
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_OPERATION_FAILED: 'FILE_OPERATION_FAILED',
  DIRECTORY_NOT_FOUND: 'DIRECTORY_NOT_FOUND',
  INVALID_DIRECTORY: 'INVALID_DIRECTORY',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INVALID_PATH: 'INVALID_PATH',
  RESTRICTED_PATH: 'RESTRICTED_PATH',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',

  // Template errors
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
  TEMPLATE_RENDER_FAILED: 'TEMPLATE_RENDER_FAILED',
  TEMPLATE_RENDER_ERROR: 'TEMPLATE_RENDER_ERROR',
  INVALID_TEMPLATE_CONTEXT: 'INVALID_TEMPLATE_CONTEXT',

  // Component errors
  COMPONENT_NOT_FOUND: 'COMPONENT_NOT_FOUND',
  INVALID_COMPONENT_CONFIG: 'INVALID_COMPONENT_CONFIG',

  // Code generation errors
  CODE_GENERATION_FAILED: 'CODE_GENERATION_FAILED',
  INVALID_GENERATOR_CONFIG: 'INVALID_GENERATOR_CONFIG',

  // Tool interface errors
  INVALID_TOOL_DEFINITION: 'INVALID_TOOL_DEFINITION',
  TOOL_ALREADY_EXISTS: 'TOOL_ALREADY_EXISTS',
  TOOL_REGISTRATION_FAILED: 'TOOL_REGISTRATION_FAILED',

  // Recovery errors
  RECOVERY_FAILED: 'RECOVERY_FAILED',
  RECOVERY_NOT_AVAILABLE: 'RECOVERY_NOT_AVAILABLE'
};

/**
 * Error severity levels
 */
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Error categories for better organization
 */
export const ErrorCategory = {
  SYSTEM: 'system',
  USER_INPUT: 'user_input',
  CONFIGURATION: 'configuration',
  EXTERNAL: 'external',
  INTERNAL: 'internal'
};

/**
 * Default error messages in multiple languages
 */
export const ErrorMessages = {
  zh: {
    // General errors
    TOOL_NOT_FOUND: '工具 "{toolName}" 未找到',
    TOOL_EXECUTION_FAILED: '工具执行失败: {error}',
    INVALID_CONFIGURATION: '配置无效: {details}',
    INVALID_REQUEST: '请求格式无效: {details}',
    VALIDATION_FAILED: '验证失败: {details}',

    // Project errors
    PROJECT_NOT_FOUND: '项目未找到: {path}',
    INVALID_PROJECT_STRUCTURE: '项目结构无效: {details}',
    PROJECT_CREATION_FAILED: '项目创建失败: {error}',
    PROJECT_ANALYSIS_FAILED: '项目分析失败: {error}',

    // File system errors
    FILE_NOT_FOUND: '文件未找到: {path}',
    FILE_OPERATION_FAILED: '文件操作失败: {operation} - {error}',
    DIRECTORY_NOT_FOUND: '目录未找到: {path}',
    INVALID_DIRECTORY: '无效目录: {path}',
    PERMISSION_DENIED: '权限被拒绝: {path}',
    INVALID_PATH: '路径无效: {path}',
    RESTRICTED_PATH: '受限路径: {path}',
    INVALID_FILE_TYPE: '文件类型无效: {type}',

    // Template errors
    TEMPLATE_NOT_FOUND: '模板未找到: {template}',
    TEMPLATE_RENDER_FAILED: '模板渲染失败: {error}',
    TEMPLATE_RENDER_ERROR: '模板渲染错误: {details}',
    INVALID_TEMPLATE_CONTEXT: '模板上下文无效: {details}',

    // Component errors
    COMPONENT_NOT_FOUND: '组件未找到: {component}',
    INVALID_COMPONENT_CONFIG: '组件配置无效: {details}',

    // Code generation errors
    CODE_GENERATION_FAILED: '代码生成失败: {error}',
    INVALID_GENERATOR_CONFIG: '生成器配置无效: {details}',

    // Tool interface errors
    INVALID_TOOL_DEFINITION: '工具定义无效: {details}',
    TOOL_ALREADY_EXISTS: '工具已存在: {toolName}',
    TOOL_REGISTRATION_FAILED: '工具注册失败: {error}',

    // Recovery errors
    RECOVERY_FAILED: '错误恢复失败: {error}',
    RECOVERY_NOT_AVAILABLE: '此错误无法自动恢复'
  },
  en: {
    // General errors
    TOOL_NOT_FOUND: 'Tool "{toolName}" not found',
    TOOL_EXECUTION_FAILED: 'Tool execution failed: {error}',
    INVALID_CONFIGURATION: 'Invalid configuration: {details}',
    INVALID_REQUEST: 'Invalid request format: {details}',
    VALIDATION_FAILED: 'Validation failed: {details}',

    // Project errors
    PROJECT_NOT_FOUND: 'Project not found: {path}',
    INVALID_PROJECT_STRUCTURE: 'Invalid project structure: {details}',
    PROJECT_CREATION_FAILED: 'Project creation failed: {error}',
    PROJECT_ANALYSIS_FAILED: 'Project analysis failed: {error}',

    // File system errors
    FILE_NOT_FOUND: 'File not found: {path}',
    FILE_OPERATION_FAILED: 'File operation failed: {operation} - {error}',
    DIRECTORY_NOT_FOUND: 'Directory not found: {path}',
    INVALID_DIRECTORY: 'Invalid directory: {path}',
    PERMISSION_DENIED: 'Permission denied: {path}',
    INVALID_PATH: 'Invalid path: {path}',
    RESTRICTED_PATH: 'Restricted path: {path}',
    INVALID_FILE_TYPE: 'Invalid file type: {type}',

    // Template errors
    TEMPLATE_NOT_FOUND: 'Template not found: {template}',
    TEMPLATE_RENDER_FAILED: 'Template render failed: {error}',
    TEMPLATE_RENDER_ERROR: 'Template render error: {details}',
    INVALID_TEMPLATE_CONTEXT: 'Invalid template context: {details}',

    // Component errors
    COMPONENT_NOT_FOUND: 'Component not found: {component}',
    INVALID_COMPONENT_CONFIG: 'Invalid component configuration: {details}',

    // Code generation errors
    CODE_GENERATION_FAILED: 'Code generation failed: {error}',
    INVALID_GENERATOR_CONFIG: 'Invalid generator configuration: {details}',

    // Tool interface errors
    INVALID_TOOL_DEFINITION: 'Invalid tool definition: {details}',
    TOOL_ALREADY_EXISTS: 'Tool already exists: {toolName}',
    TOOL_REGISTRATION_FAILED: 'Tool registration failed: {error}',

    // Recovery errors
    RECOVERY_FAILED: 'Error recovery failed: {error}',
    RECOVERY_NOT_AVAILABLE: 'This error cannot be automatically recovered'
  }
};

/**
 * User-friendly error suggestions and recovery actions
 */
export const ErrorSuggestions = {
  zh: {
    TOOL_NOT_FOUND: ['检查工具名称是否正确', '确认工具已正确注册', '查看可用工具列表'],
    PROJECT_NOT_FOUND: ['检查项目路径是否正确', '确认项目目录存在', '检查文件权限'],
    FILE_NOT_FOUND: ['检查文件路径是否正确', '确认文件存在', '检查文件权限'],
    PERMISSION_DENIED: ['检查文件/目录权限', '使用管理员权限运行', '更改文件所有者'],
    TEMPLATE_NOT_FOUND: ['检查模板名称是否正确', '确认模板文件存在', '检查模板路径配置'],
    INVALID_PROJECT_STRUCTURE: [
      '检查项目是否为有效的BalmJS项目',
      '确认package.json文件存在',
      '检查项目依赖是否完整'
    ]
  },
  en: {
    TOOL_NOT_FOUND: [
      'Check if the tool name is correct',
      'Ensure the tool is properly registered',
      'View the list of available tools'
    ],
    PROJECT_NOT_FOUND: [
      'Check if the project path is correct',
      'Ensure the project directory exists',
      'Check file permissions'
    ],
    FILE_NOT_FOUND: [
      'Check if the file path is correct',
      'Ensure the file exists',
      'Check file permissions'
    ],
    PERMISSION_DENIED: [
      'Check file/directory permissions',
      'Run with administrator privileges',
      'Change file ownership'
    ],
    TEMPLATE_NOT_FOUND: [
      'Check if the template name is correct',
      'Ensure the template file exists',
      'Check template path configuration'
    ],
    INVALID_PROJECT_STRUCTURE: [
      'Check if the project is a valid BalmJS project',
      'Ensure package.json file exists',
      'Check if project dependencies are complete'
    ]
  }
};

/**
 * Recovery strategies for different error types
 */
export const RecoveryStrategies = {
  TOOL_NOT_FOUND: {
    canRecover: false,
    strategy: null
  },
  PROJECT_NOT_FOUND: {
    canRecover: true,
    strategy: 'suggest_create_project'
  },
  FILE_NOT_FOUND: {
    canRecover: true,
    strategy: 'suggest_create_file'
  },
  DIRECTORY_NOT_FOUND: {
    canRecover: true,
    strategy: 'create_directory'
  },
  TEMPLATE_NOT_FOUND: {
    canRecover: true,
    strategy: 'use_default_template'
  },
  INVALID_PROJECT_STRUCTURE: {
    canRecover: true,
    strategy: 'suggest_project_fix'
  },
  PERMISSION_DENIED: {
    canRecover: false,
    strategy: null
  }
};

export class BalmSharedMCPError extends Error {
  constructor(code, message, details = {}, options = {}) {
    super(message);
    this.name = 'BalmSharedMCPError';
    this.code = code;
    this.details = details;
    this.severity = options.severity || ErrorSeverity.MEDIUM;
    this.category = options.category || ErrorCategory.INTERNAL;
    this.timestamp = new Date().toISOString();
    this.locale = options.locale || 'zh';
    this.originalError = options.originalError || null;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BalmSharedMCPError);
    }
  }

  /**
   * Get localized error message
   */
  getLocalizedMessage(locale = this.locale) {
    const messages = ErrorMessages[locale] || ErrorMessages.zh;
    const template = messages[this.code];

    if (!template) {
      return this.message;
    }

    // Replace placeholders in the template
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return this.details[key] || match;
    });
  }

  /**
   * Get user-friendly suggestions for fixing the error
   */
  getSuggestions(locale = this.locale) {
    const suggestions = ErrorSuggestions[locale] || ErrorSuggestions.zh;
    return suggestions[this.code] || [];
  }

  /**
   * Check if this error can be automatically recovered
   */
  canRecover() {
    const strategy = RecoveryStrategies[this.code];
    return strategy ? strategy.canRecover : false;
  }

  /**
   * Get recovery strategy for this error
   */
  getRecoveryStrategy() {
    const strategy = RecoveryStrategies[this.code];
    return strategy ? strategy.strategy : null;
  }

  /**
   * Get user-friendly error information
   */
  getUserFriendlyInfo(locale = this.locale) {
    return {
      message: this.getLocalizedMessage(locale),
      suggestions: this.getSuggestions(locale),
      canRecover: this.canRecover(),
      recoveryStrategy: this.getRecoveryStrategy(),
      severity: this.severity,
      category: this.category,
      timestamp: this.timestamp
    };
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      localizedMessage: this.getLocalizedMessage(),
      details: this.details,
      severity: this.severity,
      category: this.category,
      timestamp: this.timestamp,
      suggestions: this.getSuggestions(),
      canRecover: this.canRecover(),
      recoveryStrategy: this.getRecoveryStrategy(),
      stack: this.stack,
      originalError: this.originalError
        ? {
            name: this.originalError.name,
            message: this.originalError.message,
            stack: this.originalError.stack
          }
        : null
    };
  }
}

/**
 * Create error with specific code and context
 */
export function createError(code, message, details = {}, options = {}) {
  return new BalmSharedMCPError(code, message, details, options);
}

/**
 * Create localized error with template interpolation
 */
export function createLocalizedError(code, details = {}, options = {}) {
  const locale = options.locale || 'zh';
  const messages = ErrorMessages[locale] || ErrorMessages.zh;
  const template = messages[code] || code;

  // Replace placeholders in the template
  const message = template.replace(/\{(\w+)\}/g, (match, key) => {
    return details[key] || match;
  });

  return new BalmSharedMCPError(code, message, details, options);
}

/**
 * Wrap and re-throw errors with additional context
 */
export function wrapError(originalError, code, message, details = {}, options = {}) {
  const wrappedOptions = {
    ...options,
    originalError
  };

  return new BalmSharedMCPError(code, message, details, wrappedOptions);
}

/**
 * Error handler middleware for async functions
 */
export function withErrorHandling(fn, context = {}) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof BalmSharedMCPError) {
        throw error;
      }

      // Wrap unknown errors
      throw wrapError(
        error,
        ErrorCodes.TOOL_EXECUTION_FAILED,
        `Unexpected error in ${context.operation || 'operation'}`,
        { context },
        {
          severity: ErrorSeverity.HIGH,
          category: ErrorCategory.INTERNAL
        }
      );
    }
  };
}

/**
 * Validate input and throw localized error if invalid
 */
export function validateInput(input, schema, context = {}) {
  // Basic validation - can be enhanced with a proper schema validator
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in input) || input[field] === undefined || input[field] === null) {
        throw createLocalizedError(
          ErrorCodes.VALIDATION_FAILED,
          {
            details: `Required field '${field}' is missing`,
            field,
            context: context.operation || 'validation'
          },
          {
            severity: ErrorSeverity.MEDIUM,
            category: ErrorCategory.USER_INPUT
          }
        );
      }
    }
  }

  if (schema.properties) {
    for (const [field, fieldSchema] of Object.entries(schema.properties)) {
      if (field in input) {
        const value = input[field];

        // Type validation
        if (fieldSchema.type && typeof value !== fieldSchema.type) {
          throw createLocalizedError(
            ErrorCodes.VALIDATION_FAILED,
            {
              details: `Field '${field}' must be of type ${fieldSchema.type}`,
              field,
              expectedType: fieldSchema.type,
              actualType: typeof value
            },
            {
              severity: ErrorSeverity.MEDIUM,
              category: ErrorCategory.USER_INPUT
            }
          );
        }

        // Enum validation
        if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
          throw createLocalizedError(
            ErrorCodes.VALIDATION_FAILED,
            {
              details: `Field '${field}' must be one of: ${fieldSchema.enum.join(', ')}`,
              field,
              allowedValues: fieldSchema.enum,
              actualValue: value
            },
            {
              severity: ErrorSeverity.MEDIUM,
              category: ErrorCategory.USER_INPUT
            }
          );
        }
      }
    }
  }
}

/**
 * Error recovery manager
 */
export class ErrorRecoveryManager {
  constructor(logger = null) {
    this.logger = logger;
    this.recoveryHandlers = new Map();
    this.setupDefaultHandlers();
  }

  setupDefaultHandlers() {
    // Directory creation recovery
    this.recoveryHandlers.set('create_directory', async error => {
      const { path } = error.details;
      if (path) {
        const fs = await import('fs/promises');
        await fs.mkdir(path, { recursive: true });
        return { success: true, message: `Created directory: ${path}` };
      }
      return { success: false, message: 'Cannot create directory: path not specified' };
    });

    // Default template recovery
    this.recoveryHandlers.set('use_default_template', async _error => {
      return {
        success: true,
        message: 'Using default template instead',
        data: { useDefault: true }
      };
    });

    // Project creation suggestion
    this.recoveryHandlers.set('suggest_create_project', async error => {
      const { path } = error.details;
      return {
        success: true,
        message: `Consider creating a new project at: ${path}`,
        data: {
          suggestion: 'create_project',
          path,
          templates: ['frontend-project', 'backend-project']
        }
      };
    });

    // File creation suggestion
    this.recoveryHandlers.set('suggest_create_file', async error => {
      const { path } = error.details;
      return {
        success: true,
        message: `Consider creating the missing file: ${path}`,
        data: {
          suggestion: 'create_file',
          path
        }
      };
    });

    // Project structure fix suggestion
    this.recoveryHandlers.set('suggest_project_fix', async error => {
      return {
        success: true,
        message: 'Consider running project structure validation and fix',
        data: {
          suggestion: 'fix_project_structure',
          details: error.details
        }
      };
    });
  }

  /**
   * Attempt to recover from an error
   */
  async attemptRecovery(error) {
    if (!(error instanceof BalmSharedMCPError)) {
      return { success: false, message: 'Cannot recover from non-MCP errors' };
    }

    if (!error.canRecover()) {
      return { success: false, message: 'Error cannot be automatically recovered' };
    }

    const strategy = error.getRecoveryStrategy();
    const handler = this.recoveryHandlers.get(strategy);

    if (!handler) {
      return { success: false, message: `No recovery handler for strategy: ${strategy}` };
    }

    try {
      const result = await handler(error);

      if (this.logger && result.success) {
        this.logger.info('Error recovery successful', {
          errorCode: error.code,
          strategy,
          result
        });
      }

      return result;
    } catch (recoveryError) {
      const failureError = createLocalizedError(
        ErrorCodes.RECOVERY_FAILED,
        { error: recoveryError.message },
        {
          severity: ErrorSeverity.HIGH,
          category: ErrorCategory.INTERNAL,
          originalError: recoveryError
        }
      );

      if (this.logger) {
        this.logger.error('Error recovery failed', {
          originalError: error.code,
          strategy,
          recoveryError: failureError.toJSON()
        });
      }

      return { success: false, message: failureError.getLocalizedMessage() };
    }
  }

  /**
   * Register a custom recovery handler
   */
  registerRecoveryHandler(strategy, handler) {
    this.recoveryHandlers.set(strategy, handler);
  }
}
