/**
 * Configuration Management Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { ConfigurationManager, defaultConfig, configManager } from '../index.js';
import { createMockProjectConfig } from '../../../tests/utils/mock-utilities.js';

// Mock file system operations
vi.mock('fs/promises');
vi.mock('fs');

describe('ConfigurationManager', () => {
  let manager;
  let mockReadFile;
  let mockExistsSync;

  beforeEach(() => {
    manager = new ConfigurationManager();
    mockReadFile = vi.mocked(readFile);
    mockExistsSync = vi.mocked(existsSync);

    // Reset environment variables
    delete process.env.SHARED_LIBRARY_PATH;
    delete process.env.LOG_LEVEL;
    delete process.env.HOT_RELOAD;
  });

  afterEach(() => {
    manager.destroy();
    vi.clearAllMocks();
  });

  describe('loadConfig', () => {
    it('should load default configuration when no config file exists', async () => {
      mockExistsSync.mockReturnValue(false);

      const config = await manager.loadConfig();

      expect(config).toEqual(expect.objectContaining(defaultConfig));
    });

    it('should load configuration from file', async () => {
      const mockConfig = createMockProjectConfig({
        sharedLibraryPath: './custom',
        workspaceRoot: './custom-workspace'
      });

      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(mockConfig));

      const config = await manager.loadConfig();

      expect(config.sharedLibraryPath).toBe('./custom');
      expect(config.workspaceRoot).toBe('./custom-workspace');
    });

    it('should override file config with environment variables', async () => {
      const mockConfig = createMockProjectConfig({
        sharedLibraryPath: './file-path'
      });

      process.env.SHARED_LIBRARY_PATH = './env-path';
      process.env.LOG_LEVEL = 'debug';

      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(mockConfig));

      const config = await manager.loadConfig();

      expect(config.sharedLibraryPath).toBe('./env-path');
      expect(config.logging.level).toBe('debug');
    });

    it('should validate configuration schema', async () => {
      const invalidConfig = {
        logging: {
          level: 'invalid-level'
        }
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(invalidConfig));

      await expect(manager.loadConfig()).rejects.toThrow('CONFIG_VALIDATION_ERROR');
    });

    it('should emit config:loaded event', async () => {
      mockExistsSync.mockReturnValue(false);

      const loadedSpy = vi.fn();
      manager.on('config:loaded', loadedSpy);

      const config = await manager.loadConfig();

      expect(loadedSpy).toHaveBeenCalledWith(config);
    });
  });

  describe('_mergeConfigs', () => {
    it('should merge multiple configuration objects', () => {
      const config1 = {
        a: 1,
        nested: { x: 1, y: 2 }
      };

      const config2 = {
        b: 2,
        nested: { y: 3, z: 4 }
      };

      const merged = manager._mergeConfigs(config1, config2);

      expect(merged).toEqual({
        a: 1,
        b: 2,
        nested: { x: 1, y: 3, z: 4 }
      });
    });

    it('should handle null and undefined configs', () => {
      const config = { a: 1 };
      const merged = manager._mergeConfigs(config, null, undefined);

      expect(merged).toEqual(config);
    });
  });

  describe('updateConfig', () => {
    beforeEach(async () => {
      mockExistsSync.mockReturnValue(false);
      await manager.loadConfig();
    });

    it('should update configuration at runtime', async () => {
      const updates = {
        sharedLibraryPath: './updated-path'
      };

      const updatedSpy = vi.fn();
      manager.on('config:updated', updatedSpy);

      const config = await manager.updateConfig(updates);

      expect(config.sharedLibraryPath).toBe('./updated-path');
      expect(updatedSpy).toHaveBeenCalled();
    });

    it('should validate updated configuration', async () => {
      const invalidUpdates = {
        logging: { level: 'invalid' }
      };

      await expect(manager.updateConfig(invalidUpdates)).rejects.toThrow();
    });

    it('should create backup before update', async () => {
      const initialBackupCount = manager.getBackups().length;
      const updates = { sharedLibraryPath: './new-path' };

      await manager.updateConfig(updates);

      const backups = manager.getBackups();
      expect(backups.length).toBeGreaterThan(initialBackupCount);
    });
  });

  describe('backup and restore', () => {
    beforeEach(async () => {
      mockExistsSync.mockReturnValue(false);
      await manager.loadConfig();
    });

    it('should create configuration backups', async () => {
      const initialBackupCount = manager.getBackups().length;
      const updates1 = { sharedLibraryPath: './path1' };
      const updates2 = { sharedLibraryPath: './path2' };

      await manager.updateConfig(updates1);
      await manager.updateConfig(updates2);

      const backups = manager.getBackups();
      expect(backups.length).toBeGreaterThanOrEqual(initialBackupCount + 2);
      expect(backups[0].hasConfig).toBe(true);
    });

    it('should limit number of backups', async () => {
      // Update config to set maxBackups to 2
      await manager.updateConfig({
        backup: { enabled: true, maxBackups: 2 }
      });

      // Create more backups than the limit
      for (let i = 0; i < 5; i++) {
        await manager.updateConfig({ sharedLibraryPath: `./path${i}` });
      }

      const backups = manager.getBackups();
      expect(backups.length).toBeLessThanOrEqual(2);
    });

    it('should restore configuration from backup', async () => {
      const originalPath = manager.getConfig().sharedProjectPath;

      await manager.updateConfig({ sharedProjectPath: './updated-path' });

      const restoredConfig = await manager.restoreFromBackup(0);

      expect(restoredConfig.sharedProjectPath).toBe(originalPath);
    });

    it('should emit config:restored event', async () => {
      await manager.updateConfig({ sharedProjectPath: './updated-path' });

      const restoredSpy = vi.fn();
      manager.on('config:restored', restoredSpy);

      await manager.restoreFromBackup(0);

      expect(restoredSpy).toHaveBeenCalled();
    });

    it('should throw error for invalid backup index', async () => {
      await expect(manager.restoreFromBackup(99)).rejects.toThrow('BACKUP_NOT_FOUND');
    });
  });

  describe('hot reload', () => {
    it('should setup hot reload when enabled', async () => {
      const mockConfig = { hotReload: true };

      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(mockConfig));

      // Spy on the _setupHotReload method
      const setupHotReloadSpy = vi.spyOn(manager, '_setupHotReload');

      await manager.loadConfig();

      expect(setupHotReloadSpy).toHaveBeenCalled();
    });

    it('should not setup hot reload when disabled', async () => {
      const mockConfig = { hotReload: false };

      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(mockConfig));

      // Spy on the _setupHotReload method
      const setupHotReloadSpy = vi.spyOn(manager, '_setupHotReload');

      await manager.loadConfig();

      expect(setupHotReloadSpy).not.toHaveBeenCalled();
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', async () => {
      mockExistsSync.mockReturnValue(false);

      const loadedConfig = await manager.loadConfig();
      const currentConfig = manager.getConfig();

      expect(currentConfig).toEqual(loadedConfig);
    });
  });

  describe('destroy', () => {
    it('should cleanup resources', async () => {
      mockExistsSync.mockReturnValue(false);
      await manager.loadConfig();

      const stopWatchingSpy = vi.spyOn(manager, 'stopWatching');

      manager.destroy();

      expect(stopWatchingSpy).toHaveBeenCalled();
      expect(manager.getConfig()).toBeNull();
    });
  });
});

describe('Global config manager', () => {
  afterEach(() => {
    configManager.destroy();
  });

  it('should provide global configuration manager instance', () => {
    expect(configManager).toBeInstanceOf(ConfigurationManager);
  });
});

describe('Legacy loadConfig function', () => {
  afterEach(() => {
    configManager.destroy();
  });

  it('should use global config manager', async () => {
    const loadConfigSpy = vi.spyOn(configManager, 'loadConfig');

    vi.mocked(existsSync).mockReturnValue(false);

    const { loadConfig } = await import('../index.js');
    await loadConfig();

    expect(loadConfigSpy).toHaveBeenCalled();
  });
});

describe('RuntimeConfigManager', () => {
  let runtimeManager;
  let mockExistsSync;

  beforeEach(async () => {
    const { RuntimeConfigManager } = await import('../index.js');
    runtimeManager = new RuntimeConfigManager();
    mockExistsSync = vi.mocked(existsSync);

    // Load initial config
    mockExistsSync.mockReturnValue(false);
    await runtimeManager.loadConfig();
  });

  afterEach(() => {
    runtimeManager.destroy();
    vi.clearAllMocks();
  });

  describe('subscribe and unsubscribe', () => {
    it('should subscribe to configuration changes', () => {
      const callback = vi.fn();
      const subscriptionId = runtimeManager.subscribe('test', callback);

      expect(subscriptionId).toBeDefined();
      expect(typeof subscriptionId).toBe('string');
    });

    it('should call immediate callback when requested', () => {
      const callback = vi.fn();
      runtimeManager.subscribe('test', callback, { immediate: true });

      expect(callback).toHaveBeenCalledWith(runtimeManager.getConfig(), null);
    });

    it('should unsubscribe from configuration changes', () => {
      const callback = vi.fn();
      const subscriptionId = runtimeManager.subscribe('test', callback);

      const result = runtimeManager.unsubscribe('test', subscriptionId);
      expect(result).toBe(true);

      const falseResult = runtimeManager.unsubscribe('test', 'non-existent');
      expect(falseResult).toBe(false);
    });
  });

  describe('applyConfigChanges', () => {
    it('should apply immediate configuration changes', async () => {
      const callback = vi.fn();
      runtimeManager.subscribe('test', callback);

      const changes = { sharedLibraryPath: './immediate-path' };
      await runtimeManager.applyConfigChanges(changes, { immediate: true });

      expect(callback).toHaveBeenCalled();
      expect(runtimeManager.getConfig().sharedLibraryPath).toBe('./immediate-path');
    });

    it('should queue non-immediate configuration changes', async () => {
      const callback = vi.fn();
      runtimeManager.subscribe('test', callback);

      const changes = { sharedLibraryPath: './queued-path' };
      runtimeManager.applyConfigChanges(changes); // Not immediate

      // Wait for queue processing
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(callback).toHaveBeenCalled();
      expect(runtimeManager.getConfig().sharedLibraryPath).toBe('./queued-path');
    });

    it('should merge multiple queued changes', async () => {
      const callback = vi.fn();
      runtimeManager.subscribe('test', callback);

      runtimeManager.applyConfigChanges({ sharedLibraryPath: './path1' });
      runtimeManager.applyConfigChanges({ workspaceRoot: './workspace1' });

      // Wait for queue processing
      await new Promise(resolve => setTimeout(resolve, 150));

      const config = runtimeManager.getConfig();
      expect(config.sharedLibraryPath).toBe('./path1');
      expect(config.workspaceRoot).toBe('./workspace1');
    });
  });

  describe('getConfigValue and setConfigValue', () => {
    it('should get configuration value by path', () => {
      const value = runtimeManager.getConfigValue('logging.level');
      expect(value).toBe('info');
    });

    it('should return default value for non-existent path', () => {
      const value = runtimeManager.getConfigValue('non.existent.path', 'default');
      expect(value).toBe('default');
    });

    it('should set configuration value by path', async () => {
      await runtimeManager.setConfigValue('logging.level', 'debug', { immediate: true });

      const value = runtimeManager.getConfigValue('logging.level');
      expect(value).toBe('debug');
    });
  });

  describe('watchConfigPath', () => {
    it('should watch specific configuration paths', async () => {
      const callback = vi.fn();
      runtimeManager.watchConfigPath('logging.level', callback);

      await runtimeManager.setConfigValue('logging.level', 'debug', { immediate: true });

      expect(callback).toHaveBeenCalledWith('debug', 'info', 'runtime');
    });

    it('should not trigger callback for unchanged values', async () => {
      const callback = vi.fn();
      runtimeManager.watchConfigPath('logging.level', callback);

      // Set to same value
      await runtimeManager.setConfigValue('logging.level', 'info', { immediate: true });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('notification system', () => {
    it('should notify subscribers with filter', async () => {
      const callback = vi.fn();
      const filter = (newConfig, previousConfig) => {
        return newConfig.logging.level !== previousConfig.logging.level;
      };

      runtimeManager.subscribe('filtered', callback, { filter });

      // This should trigger the callback
      await runtimeManager.setConfigValue('logging.level', 'debug', { immediate: true });
      expect(callback).toHaveBeenCalled();

      callback.mockClear();

      // This should not trigger the callback
      await runtimeManager.setConfigValue('sharedProjectPath', './new-path', { immediate: true });
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle async callbacks', async () => {
      const asyncCallback = vi.fn().mockResolvedValue('done');
      runtimeManager.subscribe('async', asyncCallback);

      await runtimeManager.setConfigValue('logging.level', 'debug', { immediate: true });

      expect(asyncCallback).toHaveBeenCalled();
    });

    it('should handle callback errors gracefully', async () => {
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });

      runtimeManager.subscribe('error', errorCallback);

      // Should not throw
      await expect(
        runtimeManager.setConfigValue('logging.level', 'debug', { immediate: true })
      ).resolves.toBeDefined();

      expect(errorCallback).toHaveBeenCalled();
    });
  });

  describe('getRuntimeStats', () => {
    it('should return runtime statistics', async () => {
      runtimeManager.subscribe('test1', vi.fn());
      runtimeManager.subscribe('test2', vi.fn());

      const stats = runtimeManager.getRuntimeStats();

      expect(stats).toEqual({
        subscriberCount: 2,
        queuedChanges: 0,
        isProcessingQueue: false,
        backupCount: expect.any(Number),
        configLoaded: true,
        hotReloadEnabled: true
      });
    });
  });

  describe('destroy', () => {
    it('should cleanup runtime resources', () => {
      runtimeManager.subscribe('test', vi.fn());

      const stats = runtimeManager.getRuntimeStats();
      expect(stats.subscriberCount).toBe(1);

      runtimeManager.destroy();

      const statsAfter = runtimeManager.getRuntimeStats();
      expect(statsAfter.subscriberCount).toBe(0);
      expect(runtimeManager.getConfig()).toBeNull();
    });
  });
});

describe('Global runtime config manager', () => {
  afterEach(async () => {
    const { runtimeConfigManager } = await import('../index.js');
    runtimeConfigManager.destroy();
  });

  it('should provide global runtime configuration manager instance', async () => {
    const { runtimeConfigManager, RuntimeConfigManager } = await import('../index.js');
    expect(runtimeConfigManager).toBeInstanceOf(RuntimeConfigManager);
  });

  it('should use runtime manager as default config manager', async () => {
    const { configManager, runtimeConfigManager } = await import('../index.js');
    expect(configManager).toBe(runtimeConfigManager);
  });
});
