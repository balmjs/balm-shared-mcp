/**
 * Configuration Management System
 *
 * Handles loading, validation, hot reloading, and runtime management of configuration files.
 */

import { readFile } from 'fs/promises';
import { existsSync, watchFile, unwatchFile } from 'fs';
import path from 'path';
import { z } from 'zod';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { BalmSharedMCPError } from '../utils/errors.js';

// Configuration schema
const ConfigSchema = z.object({
  sharedLibraryPath: z.string().default('./'),
  sharedLibraryName: z.string().default('my-shared'),
  templatesPath: z.string().default('./templates'),
  defaultProjectConfig: z
    .object({
      apiEndpoint: z.string().default('/api'),
      mockEnabled: z.boolean().default(true),
      authEnabled: z.boolean().default(true)
    })
    .default({}),
  logging: z
    .object({
      level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
      file: z.string().optional()
    })
    .default({}),
  hotReload: z.boolean().default(true),
  backup: z
    .object({
      enabled: z.boolean().default(true),
      maxBackups: z.number().default(5)
    })
    .default({})
});

/**
 * Configuration Manager Class
 * Handles configuration loading, validation, hot reloading, and runtime updates
 */
class ConfigurationManager extends EventEmitter {
  constructor() {
    super();
    this.currentConfig = null;
    this.configPath = null;
    this.watchers = new Set();
    this.backups = [];
  }

  /**
   * Load configuration from file or environment
   */
  async loadConfig() {
    const configPaths = [
      process.env.BALM_SHARED_MCP_CONFIG,
      './config.json',
      './balm-shared-mcp.config.json',
      path.join(process.cwd(), 'config.json')
    ].filter(Boolean);

    let fileConfig = {};
    let loadedPath = null;

    // Try to load from config file
    for (const configPath of configPaths) {
      if (existsSync(configPath)) {
        try {
          const configContent = await readFile(configPath, 'utf-8');
          fileConfig = JSON.parse(configContent);
          loadedPath = configPath;
          logger.info(`Loaded configuration from: ${configPath}`);
          break;
        } catch (error) {
          logger.warn(`Failed to load config from ${configPath}:`, error.message);
        }
      }
    }

    // Merge with environment variables
    const envConfig = this._loadEnvironmentConfig();
    const mergedConfig = this._mergeConfigs(defaultConfig, fileConfig, envConfig);

    // Validate configuration
    const validatedConfig = await this._validateConfig(mergedConfig);

    // Store current configuration
    this.currentConfig = validatedConfig;
    this.configPath = loadedPath;

    // Setup hot reloading if enabled
    if (validatedConfig.hotReload && loadedPath) {
      this._setupHotReload(loadedPath);
    }

    // Create backup
    if (validatedConfig.backup.enabled) {
      this._createBackup(validatedConfig);
    }

    logger.info('Configuration loaded successfully', {
      sharedLibraryPath: validatedConfig.sharedLibraryPath,
      templatesPath: validatedConfig.templatesPath,
      logLevel: validatedConfig.logging.level,
      hotReload: validatedConfig.hotReload
    });

    this.emit('config:loaded', validatedConfig);
    return validatedConfig;
  }

  /**
   * Load environment variables into configuration
   */
  _loadEnvironmentConfig() {
    const envConfig = {};

    if (process.env.SHARED_LIBRARY_PATH) {
      envConfig.sharedLibraryPath = process.env.SHARED_LIBRARY_PATH;
    }

    if (process.env.SHARED_LIBRARY_NAME) {
      envConfig.sharedLibraryName = process.env.SHARED_LIBRARY_NAME;
    }

    if (process.env.TEMPLATES_PATH) {
      envConfig.templatesPath = process.env.TEMPLATES_PATH;
    }

    if (process.env.LOG_LEVEL) {
      envConfig.logging = { level: process.env.LOG_LEVEL };
    }

    if (process.env.HOT_RELOAD) {
      envConfig.hotReload = process.env.HOT_RELOAD === 'true';
    }

    return envConfig;
  }

  /**
   * Deep merge multiple configuration objects
   */
  _mergeConfigs(...configs) {
    return configs.reduce((merged, config) => {
      if (!config) {
        return merged;
      }

      for (const [key, value] of Object.entries(config)) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          merged[key] = this._mergeConfigs(merged[key] || {}, value);
        } else {
          merged[key] = value;
        }
      }

      return merged;
    }, {});
  }

  /**
   * Validate configuration against schema
   */
  async _validateConfig(config) {
    try {
      return ConfigSchema.parse(config);
    } catch (error) {
      throw new BalmSharedMCPError(
        `Configuration validation failed: ${error.message}`,
        'CONFIG_VALIDATION_ERROR',
        { validationErrors: error.errors }
      );
    }
  }

  /**
   * Setup hot reloading for configuration file
   */
  _setupHotReload(configPath) {
    if (this.watchers.has(configPath)) {
      return; // Already watching this file
    }

    const watcher = watchFile(configPath, { interval: 1000 }, async () => {
      try {
        logger.info(`Configuration file changed: ${configPath}`);
        await this.reloadConfig();
      } catch (error) {
        logger.error('Failed to reload configuration:', error);
        this.emit('config:error', error);
      }
    });

    this.watchers.add(configPath);
    logger.debug(`Hot reload enabled for: ${configPath}`);
  }

  /**
   * Reload configuration from file
   */
  async reloadConfig() {
    const previousConfig = { ...this.currentConfig };

    try {
      const newConfig = await this.loadConfig();

      // Check if configuration actually changed
      if (JSON.stringify(previousConfig) !== JSON.stringify(newConfig)) {
        logger.info('Configuration reloaded successfully');
        this.emit('config:changed', newConfig, previousConfig);
      }

      return newConfig;
    } catch (error) {
      logger.error('Failed to reload configuration, keeping previous config:', error);
      this.currentConfig = previousConfig;
      throw error;
    }
  }

  /**
   * Update configuration at runtime
   */
  async updateConfig(updates) {
    if (!this.currentConfig) {
      throw new BalmSharedMCPError('No configuration loaded', 'CONFIG_NOT_LOADED');
    }

    const previousConfig = { ...this.currentConfig };
    const updatedConfig = this._mergeConfigs(this.currentConfig, updates);

    try {
      const validatedConfig = await this._validateConfig(updatedConfig);

      // Create backup before update
      if (validatedConfig.backup.enabled) {
        this._createBackup(this.currentConfig);
      }

      this.currentConfig = validatedConfig;

      logger.info('Configuration updated at runtime', { updates });
      this.emit('config:updated', validatedConfig, previousConfig);

      return validatedConfig;
    } catch (error) {
      logger.error('Failed to update configuration:', error);
      throw error;
    }
  }

  /**
   * Create configuration backup
   */
  _createBackup(config) {
    const backup = {
      timestamp: new Date().toISOString(),
      config: { ...config }
    };

    this.backups.unshift(backup);

    // Limit number of backups
    const maxBackups = config.backup?.maxBackups || 5;
    if (this.backups.length > maxBackups) {
      this.backups = this.backups.slice(0, maxBackups);
    }

    logger.debug(`Configuration backup created (${this.backups.length}/${maxBackups})`);
  }

  /**
   * Restore configuration from backup
   */
  async restoreFromBackup(index = 0) {
    if (index >= this.backups.length) {
      throw new BalmSharedMCPError(`Backup index ${index} not found`, 'BACKUP_NOT_FOUND');
    }

    const backup = this.backups[index];
    const previousConfig = { ...this.currentConfig };

    try {
      const validatedConfig = await this._validateConfig(backup.config);
      this.currentConfig = validatedConfig;

      logger.info(`Configuration restored from backup (${backup.timestamp})`);
      this.emit('config:restored', validatedConfig, previousConfig);

      return validatedConfig;
    } catch (error) {
      logger.error('Failed to restore configuration from backup:', error);
      throw error;
    }
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return this.currentConfig;
  }

  /**
   * Get configuration backups
   */
  getBackups() {
    return this.backups.map(backup => ({
      timestamp: backup.timestamp,
      // Don't expose full config in list
      hasConfig: true
    }));
  }

  /**
   * Stop watching configuration files
   */
  stopWatching() {
    for (const configPath of this.watchers) {
      unwatchFile(configPath);
    }
    this.watchers.clear();
    logger.debug('Stopped watching configuration files');
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopWatching();
    this.removeAllListeners();
    this.currentConfig = null;
    this.configPath = null;
    this.backups = [];
  }
}

/**
 * Default configuration
 */
export const defaultConfig = {
  sharedLibraryPath: './',
  sharedLibraryName: 'my-shared',
  templatesPath: './templates',
  defaultProjectConfig: {
    apiEndpoint: '/api',
    mockEnabled: true,
    authEnabled: true
  },
  logging: {
    level: 'info'
  },
  hotReload: true,
  backup: {
    enabled: true,
    maxBackups: 5
  }
};

/**
 * Runtime Configuration Manager
 * Handles dynamic configuration updates, notifications, and application
 */
class RuntimeConfigManager extends ConfigurationManager {
  constructor() {
    super();
    this.subscribers = new Map();
    this.configChangeQueue = [];
    this.isProcessingQueue = false;
    this.changeNotificationDelay = 100; // ms
  }

  /**
   * Subscribe to configuration changes
   */
  subscribe(key, callback, options = {}) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, []);
    }

    const subscription = {
      callback,
      immediate: options.immediate || false,
      filter: options.filter || null,
      id: `${key}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.subscribers.get(key).push(subscription);

    // Call immediately if requested and config is loaded
    if (subscription.immediate && this.currentConfig) {
      try {
        callback(this.currentConfig, null);
      } catch (error) {
        logger.error(`Error in immediate config callback for ${key}:`, error);
      }
    }

    logger.debug(`Subscribed to config changes: ${key} (${subscription.id})`);
    return subscription.id;
  }

  /**
   * Unsubscribe from configuration changes
   */
  unsubscribe(key, subscriptionId) {
    if (!this.subscribers.has(key)) {
      return false;
    }

    const subscriptions = this.subscribers.get(key);
    const index = subscriptions.findIndex(sub => sub.id === subscriptionId);

    if (index !== -1) {
      subscriptions.splice(index, 1);

      // Clean up empty subscription arrays
      if (subscriptions.length === 0) {
        this.subscribers.delete(key);
      }

      logger.debug(`Unsubscribed from config changes: ${key} (${subscriptionId})`);
      return true;
    }

    return false;
  }

  /**
   * Apply configuration changes with notification
   */
  async applyConfigChanges(changes, options = {}) {
    const { immediate = false, source = 'runtime' } = options;

    if (immediate) {
      return await this._processConfigChange(changes, source);
    } else {
      // Queue the change for batch processing
      this.configChangeQueue.push({ changes, source, timestamp: Date.now() });
      this._scheduleQueueProcessing();
    }
  }

  /**
   * Schedule queue processing with debouncing
   */
  _scheduleQueueProcessing() {
    if (this.isProcessingQueue) {
      return;
    }

    setTimeout(async () => {
      await this._processConfigQueue();
    }, this.changeNotificationDelay);
  }

  /**
   * Process queued configuration changes
   */
  async _processConfigQueue() {
    if (this.isProcessingQueue || this.configChangeQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      // Merge all queued changes
      const mergedChanges = this.configChangeQueue.reduce((merged, item) => {
        return this._mergeConfigs(merged, item.changes);
      }, {});

      const sources = [...new Set(this.configChangeQueue.map(item => item.source))];

      // Clear the queue
      this.configChangeQueue = [];

      // Process the merged changes
      await this._processConfigChange(mergedChanges, sources.join(', '));
    } catch (error) {
      logger.error('Error processing config change queue:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Process a single configuration change
   */
  async _processConfigChange(changes, source) {
    const previousConfig = { ...this.currentConfig };

    try {
      const updatedConfig = await this.updateConfig(changes);

      // Notify subscribers
      await this._notifySubscribers(updatedConfig, previousConfig, source);

      logger.info(`Configuration applied from ${source}`, { changes });
      return updatedConfig;
    } catch (error) {
      logger.error(`Failed to apply config changes from ${source}:`, error);
      throw error;
    }
  }

  /**
   * Notify all subscribers of configuration changes
   */
  async _notifySubscribers(newConfig, previousConfig, source) {
    const notifications = [];

    for (const [key, subscriptions] of this.subscribers.entries()) {
      for (const subscription of subscriptions) {
        try {
          // Apply filter if specified
          if (subscription.filter && !subscription.filter(newConfig, previousConfig)) {
            continue;
          }

          const notification = this._createNotification(
            subscription.callback,
            newConfig,
            previousConfig,
            source
          );
          notifications.push(notification);
        } catch (error) {
          logger.error(`Error preparing notification for ${key}:`, error);
        }
      }
    }

    // Execute all notifications
    await Promise.allSettled(notifications);
  }

  /**
   * Create a notification promise
   */
  _createNotification(callback, newConfig, previousConfig, source) {
    return new Promise(resolve => {
      try {
        const result = callback(newConfig, previousConfig, source);

        // Handle async callbacks
        if (result && typeof result.then === 'function') {
          result.then(resolve).catch(error => {
            logger.error('Error in async config callback:', error);
            resolve();
          });
        } else {
          resolve();
        }
      } catch (error) {
        logger.error('Error in config callback:', error);
        resolve();
      }
    });
  }

  /**
   * Get configuration value with path support
   */
  getConfigValue(path, defaultValue = undefined) {
    if (!this.currentConfig) {
      return defaultValue;
    }

    const keys = path.split('.');
    let value = this.currentConfig;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value;
  }

  /**
   * Set configuration value with path support
   */
  async setConfigValue(path, value, options = {}) {
    const keys = path.split('.');
    const changes = {};
    let current = changes;

    // Build nested object structure
    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = {};
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;

    return await this.applyConfigChanges(changes, options);
  }

  /**
   * Watch specific configuration paths
   */
  watchConfigPath(path, callback, options = {}) {
    const filter = (newConfig, previousConfig) => {
      const newValue = this._getValueByPath(newConfig, path);
      const previousValue = this._getValueByPath(previousConfig, path);
      return JSON.stringify(newValue) !== JSON.stringify(previousValue);
    };

    return this.subscribe(
      `path:${path}`,
      (newConfig, previousConfig, source) => {
        const newValue = this._getValueByPath(newConfig, path);
        const previousValue = this._getValueByPath(previousConfig, path);
        callback(newValue, previousValue, source);
      },
      { ...options, filter }
    );
  }

  /**
   * Get value by path helper
   */
  _getValueByPath(obj, path) {
    if (!obj) {
      return undefined;
    }

    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Get runtime statistics
   */
  getRuntimeStats() {
    return {
      subscriberCount: Array.from(this.subscribers.values()).reduce(
        (total, subs) => total + subs.length,
        0
      ),
      queuedChanges: this.configChangeQueue.length,
      isProcessingQueue: this.isProcessingQueue,
      backupCount: this.backups.length,
      configLoaded: !!this.currentConfig,
      hotReloadEnabled: this.currentConfig?.hotReload || false
    };
  }

  /**
   * Enhanced destroy method
   */
  destroy() {
    // Clear subscribers
    this.subscribers.clear();

    // Clear queue
    this.configChangeQueue = [];
    this.isProcessingQueue = false;

    // Call parent destroy
    super.destroy();
  }
}

// Global runtime configuration manager instance
export const runtimeConfigManager = new RuntimeConfigManager();

// Global configuration manager instance (for backward compatibility)
export const configManager = runtimeConfigManager;

// Legacy function for backward compatibility
export async function loadConfig() {
  return await runtimeConfigManager.loadConfig();
}

// Export configuration manager classes for testing
export { ConfigurationManager, RuntimeConfigManager };
