/**
 * FileSystemHandler Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { promises as fs, existsSync, statSync } from 'fs';
import path from 'path';
import { FileSystemHandler } from '../../src/handlers/file-system-handler.js';
import { BalmSharedMCPError } from '../../src/utils/errors.js';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    readdir: vi.fn(),
    copyFile: vi.fn(),
    unlink: vi.fn(),
    stat: vi.fn()
  },
  existsSync: vi.fn(),
  statSync: vi.fn()
}));

describe('FileSystemHandler', () => {
  let handler;

  beforeEach(() => {
    handler = new FileSystemHandler();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      expect(handler.encoding).toBe('utf-8');
      expect(handler.allowedExtensions).toContain('.js');
      expect(handler.allowedExtensions).toContain('.vue');
      expect(handler.restrictedPaths).toContain('node_modules');
    });

    it('should accept custom options', () => {
      const customHandler = new FileSystemHandler({
        encoding: 'utf-16',
        allowedExtensions: ['.txt'],
        restrictedPaths: ['custom']
      });

      expect(customHandler.encoding).toBe('utf-16');
      expect(customHandler.allowedExtensions).toEqual(['.txt']);
      expect(customHandler.restrictedPaths).toEqual(['custom']);
    });
  });

  describe('validatePath', () => {
    it('should validate valid paths', () => {
      const validPath = '/valid/path/file.js';
      const result = handler.validatePath(validPath);
      expect(result).toBe(path.resolve(validPath));
    });

    it('should throw error for invalid path types', () => {
      expect(() => handler.validatePath(null)).toThrow(BalmSharedMCPError);
      expect(() => handler.validatePath(123)).toThrow(BalmSharedMCPError);
    });

    it('should throw error for restricted paths', () => {
      expect(() => handler.validatePath('/path/node_modules/file.js')).toThrow(BalmSharedMCPError);
      expect(() => handler.validatePath('/path/.git/config')).toThrow(BalmSharedMCPError);
    });
  });

  describe('isAllowedExtension', () => {
    it('should allow valid extensions', () => {
      expect(handler.isAllowedExtension('file.js')).toBe(true);
      expect(handler.isAllowedExtension('component.vue')).toBe(true);
      expect(handler.isAllowedExtension('config.json')).toBe(true);
    });

    it('should allow files without extension', () => {
      expect(handler.isAllowedExtension('README')).toBe(true);
    });

    it('should reject invalid extensions', () => {
      expect(handler.isAllowedExtension('file.exe')).toBe(false);
      expect(handler.isAllowedExtension('file.bin')).toBe(false);
    });
  });

  describe('processTemplate', () => {
    it('should process template with {{}} variables', () => {
      const template = 'Hello {{name}}, welcome to {{project}}!';
      const variables = { name: 'John', project: 'MyApp' };
      const result = handler.processTemplate(template, variables);
      expect(result).toBe('Hello John, welcome to MyApp!');
    });

    it('should process template with ${} variables', () => {
      const template = 'Hello ${name}, welcome to ${project}!';
      const variables = { name: 'John', project: 'MyApp' };
      const result = handler.processTemplate(template, variables);
      expect(result).toBe('Hello John, welcome to MyApp!');
    });

    it('should handle mixed variable formats', () => {
      const template = 'Hello {{name}}, welcome to ${project}!';
      const variables = { name: 'John', project: 'MyApp' };
      const result = handler.processTemplate(template, variables);
      expect(result).toBe('Hello John, welcome to MyApp!');
    });

    it('should handle empty variables', () => {
      const template = 'Hello {{name}}!';
      const result = handler.processTemplate(template, {});
      expect(result).toBe('Hello {{name}}!');
    });
  });

  describe('resolvePath', () => {
    it('should resolve single path', () => {
      const result = handler.resolvePath('/test/file.txt');
      expect(result).toBe(path.resolve('/test/file.txt'));
    });

    it('should resolve multiple path segments', () => {
      const result = handler.resolvePath('/test', 'dir', 'file.txt');
      expect(result).toBe(path.resolve('/test', 'dir', 'file.txt'));
    });
  });

  describe('joinPath', () => {
    it('should join single path', () => {
      const result = handler.joinPath('/test/file.txt');
      expect(result).toBe(path.join('/test/file.txt'));
    });

    it('should join multiple path segments', () => {
      const result = handler.joinPath('/test', 'dir', 'file.txt');
      expect(result).toBe(path.join('/test', 'dir', 'file.txt'));
    });
  });

  describe('updateJsonFile', () => {
    it('should update existing JSON file', async () => {
      const filePath = '/test/config.json';
      const existingData = { name: 'old', version: '1.0.0' };
      const updates = { name: 'new', description: 'test' };
      
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(existingData));
      vi.mocked(fs.writeFile).mockResolvedValue();

      const result = await handler.updateJsonFile(filePath, updates);
      
      expect(result).toEqual({
        name: 'new',
        version: '1.0.0',
        description: 'test'
      });
    });

    it('should create new JSON file if not exists', async () => {
      const filePath = '/test/new-config.json';
      const updates = { name: 'test', version: '1.0.0' };
      
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdir).mockResolvedValue();
      vi.mocked(fs.writeFile).mockResolvedValue();

      const result = await handler.updateJsonFile(filePath, updates);
      
      expect(result).toEqual(updates);
    });
  });
});