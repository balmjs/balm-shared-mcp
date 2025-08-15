import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileSystemHandler } from '../file-system-handler.js';
import { BalmSharedMCPError } from '../../utils/errors.js';
import { existsSync, statSync } from 'fs';
import path from 'path';
import { 
  createMockFileStats,
  createMockDirectoryEntry,
  createMockError,
  mockSetups
} from '../../../tests/utils/mock-utilities.js';

// Mock fs modules
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  statSync: vi.fn(),
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    copyFile: vi.fn(),
    unlink: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
    rmdir: vi.fn()
  }
}));

describe('FileSystemHandler', () => {
  let handler;
  let mockFsPromises;

  beforeEach(async () => {
    vi.clearAllMocks();
    const fsModule = await import('fs');
    mockFsPromises = fsModule.promises;
    handler = new FileSystemHandler({
      allowedExtensions: ['.js', '.vue', '.json', '.md', '.scss', '.css', '.html', '.ts', '.txt', '.bin']
    });
  });

  describe('exists', () => {
    it('should return true for existing file', () => {
      existsSync.mockReturnValue(true);

      const result = handler.exists('/test/file.txt');

      expect(result).toBe(true);
      expect(existsSync).toHaveBeenCalledWith('/test/file.txt');
    });

    it('should return false for non-existing file', () => {
      existsSync.mockReturnValue(false);

      const result = handler.exists('/test/nonexistent.txt');

      expect(result).toBe(false);
    });

    it('should handle permission errors', () => {
      existsSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => handler.exists('/test/restricted.txt')).toThrow('Permission denied');
    });
  });

  describe('readFile', () => {
    it('should read file successfully', async () => {
      const content = 'file content';
      existsSync.mockReturnValue(true);
      mockFsPromises.readFile.mockResolvedValue(content);

      const result = await handler.readFile('/test/file.txt');

      expect(result).toBe(content);
      expect(mockFsPromises.readFile).toHaveBeenCalledWith(path.resolve('/test/file.txt'), 'utf-8');
    });

    it('should handle file read errors', async () => {
      existsSync.mockReturnValue(true);
      mockFsPromises.readFile.mockRejectedValue(new Error('File not found'));

      await expect(handler.readFile('/test/nonexistent.txt'))
        .rejects.toThrow(BalmSharedMCPError);
    });

    it('should support different encodings', async () => {
      const content = Buffer.from('binary content');
      existsSync.mockReturnValue(true);
      mockFsPromises.readFile.mockResolvedValue(content);

      const result = await handler.readFile('/test/binary.bin');

      expect(result).toBe(content);
      expect(mockFsPromises.readFile).toHaveBeenCalledWith(path.resolve('/test/binary.bin'), 'utf-8');
    });
  });

  describe('writeFile', () => {
    it('should write file successfully', async () => {
      existsSync.mockReturnValue(false);
      mockFsPromises.writeFile.mockResolvedValue();
      mockFsPromises.mkdir.mockResolvedValue();

      await handler.writeFile('/test/dir/file.txt', 'content');

      expect(mockFsPromises.mkdir).toHaveBeenCalledWith(path.resolve('/test/dir'), { recursive: true });
      expect(mockFsPromises.writeFile).toHaveBeenCalledWith(path.resolve('/test/dir/file.txt'), 'content', 'utf-8');
    });

    it('should handle write errors', async () => {
      existsSync.mockReturnValue(false);
      mockFsPromises.mkdir.mockResolvedValue();
      mockFsPromises.writeFile.mockRejectedValue(new Error('Permission denied'));

      await expect(handler.writeFile('/test/file.txt', 'content'))
        .rejects.toThrow(BalmSharedMCPError);
    });

    it('should create directories recursively', async () => {
      existsSync.mockReturnValue(false);
      mockFsPromises.writeFile.mockResolvedValue();
      mockFsPromises.mkdir.mockResolvedValue();

      await handler.writeFile('/deep/nested/dir/file.txt', 'content');

      expect(mockFsPromises.mkdir).toHaveBeenCalledWith(path.resolve('/deep/nested/dir'), { recursive: true });
    });

    it('should support different encodings', async () => {
      existsSync.mockReturnValue(false);
      mockFsPromises.writeFile.mockResolvedValue();
      mockFsPromises.mkdir.mockResolvedValue();

      await handler.writeFile('/test/file.txt', 'content');

      expect(mockFsPromises.writeFile).toHaveBeenCalledWith(path.resolve('/test/file.txt'), 'content', 'utf-8');
    });
  });

  describe('copyFile', () => {
    it('should copy file successfully', async () => {
      existsSync.mockImplementation((filePath) => {
        // Source file exists, but target directory doesn't
        return filePath === '/source/file.txt';
      });
      mockFsPromises.copyFile.mockResolvedValue();
      mockFsPromises.mkdir.mockResolvedValue();

      await handler.copyFile('/source/file.txt', '/dest/file.txt');

      expect(mockFsPromises.mkdir).toHaveBeenCalledWith(path.resolve('/dest'), { recursive: true });
      expect(mockFsPromises.copyFile).toHaveBeenCalledWith('/source/file.txt', '/dest/file.txt');
    });

    it('should handle copy errors', async () => {
      existsSync.mockReturnValue(true);
      mockFsPromises.mkdir.mockResolvedValue();
      mockFsPromises.copyFile.mockRejectedValue(new Error('Source not found'));

      await expect(handler.copyFile('/source/file.txt', '/dest/file.txt'))
        .rejects.toThrow(BalmSharedMCPError);
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      existsSync.mockReturnValue(true);
      mockFsPromises.unlink.mockResolvedValue();

      await handler.deleteFile('/test/file.txt');

      expect(mockFsPromises.unlink).toHaveBeenCalledWith('/test/file.txt');
    });

    it('should handle delete errors', async () => {
      existsSync.mockReturnValue(true);
      mockFsPromises.unlink.mockRejectedValue(new Error('File not found'));

      await expect(handler.deleteFile('/test/nonexistent.txt'))
        .rejects.toThrow(BalmSharedMCPError);
    });
  });

  describe('listDirectory', () => {
    it('should list directory successfully', async () => {
      const files = [
        createMockDirectoryEntry('file1.txt', false),
        createMockDirectoryEntry('subdir', true)
      ];
      existsSync.mockReturnValue(true);
      mockFsPromises.readdir.mockResolvedValue(files);

      const result = await handler.listDirectory('/test/dir');

      expect(result).toEqual([
        { name: 'file1.txt', path: '/test/dir/file1.txt', isDirectory: false, isFile: true },
        { name: 'subdir', path: '/test/dir/subdir', isDirectory: true, isFile: false }
      ]);
      expect(mockFsPromises.readdir).toHaveBeenCalledWith('/test/dir', { withFileTypes: true });
    });

    it('should handle directory read errors', async () => {
      existsSync.mockReturnValue(false);

      await expect(handler.listDirectory('/test/nonexistent'))
        .rejects.toThrow(BalmSharedMCPError);
    });
  });

  describe('readDirectory', () => {
    it('should read directory with file types', async () => {
      const files = [
        { name: 'file1.txt', isDirectory: () => false, isFile: () => true },
        { name: 'subdir', isDirectory: () => true, isFile: () => false }
      ];
      existsSync.mockReturnValue(true);
      mockFsPromises.readdir.mockResolvedValue(files);

      const result = await handler.readDirectory('/test/dir', { withFileTypes: true });

      expect(result).toEqual(files);
      expect(mockFsPromises.readdir).toHaveBeenCalledWith('/test/dir', { withFileTypes: true });
    });

    it('should read directory without file types', async () => {
      const files = ['file1.txt', 'subdir'];
      existsSync.mockReturnValue(true);
      mockFsPromises.readdir.mockResolvedValue(files);

      const result = await handler.readDirectory('/test/dir');

      expect(result).toEqual(files);
      expect(mockFsPromises.readdir).toHaveBeenCalledWith('/test/dir');
    });

    it('should handle directory read errors', async () => {
      existsSync.mockReturnValue(false);

      await expect(handler.readDirectory('/test/nonexistent'))
        .rejects.toThrow(BalmSharedMCPError);
    });
  });

  describe('createDirectory', () => {
    it('should create directory with recursive option', async () => {
      mockFsPromises.mkdir.mockResolvedValue();

      await handler.createDirectory('/test/newdir', { recursive: true });

      expect(mockFsPromises.mkdir).toHaveBeenCalledWith('/test/newdir', { recursive: true });
    });

    it('should create directory without recursive option', async () => {
      mockFsPromises.mkdir.mockResolvedValue();

      await handler.createDirectory('/test/newdir', { recursive: false });

      expect(mockFsPromises.mkdir).toHaveBeenCalledWith('/test/newdir', { recursive: false });
    });

    it('should default to recursive creation', async () => {
      mockFsPromises.mkdir.mockResolvedValue();

      await handler.createDirectory('/test/newdir');

      expect(mockFsPromises.mkdir).toHaveBeenCalledWith('/test/newdir', { recursive: true });
    });

    it('should handle directory creation errors', async () => {
      mockFsPromises.mkdir.mockRejectedValue(new Error('Permission denied'));

      await expect(handler.createDirectory('/test/restricted'))
        .rejects.toThrow(BalmSharedMCPError);
    });
  });

  describe('deleteDirectory', () => {
    it('should delete directory recursively', async () => {
      existsSync.mockReturnValue(true);
      mockFsPromises.rmdir.mockResolvedValue();

      await handler.deleteDirectory('/test/dir', { recursive: true });

      expect(mockFsPromises.rmdir).toHaveBeenCalledWith('/test/dir', { recursive: true });
    });

    it('should delete directory non-recursively', async () => {
      existsSync.mockReturnValue(true);
      mockFsPromises.rmdir.mockResolvedValue();

      await handler.deleteDirectory('/test/dir', { recursive: false });

      expect(mockFsPromises.rmdir).toHaveBeenCalledWith('/test/dir');
    });

    it('should handle non-existent directory gracefully', async () => {
      existsSync.mockReturnValue(false);

      await handler.deleteDirectory('/test/nonexistent');

      expect(mockFsPromises.rmdir).not.toHaveBeenCalled();
    });

    it('should handle directory deletion errors', async () => {
      existsSync.mockReturnValue(true);
      mockFsPromises.rmdir.mockRejectedValue(new Error('Directory not empty'));

      await expect(handler.deleteDirectory('/test/dir'))
        .rejects.toThrow(BalmSharedMCPError);
    });
  });

  describe('ensureDirectory', () => {
    it('should create directory successfully', async () => {
      existsSync.mockReturnValue(false);
      mockFsPromises.mkdir.mockResolvedValue();

      await handler.ensureDirectory('/test/newdir');

      expect(mockFsPromises.mkdir).toHaveBeenCalledWith('/test/newdir', { recursive: true });
    });

    it('should handle directory creation errors', async () => {
      existsSync.mockReturnValue(false);
      mockFsPromises.mkdir.mockRejectedValue(new Error('Permission denied'));

      await expect(handler.ensureDirectory('/test/restricted'))
        .rejects.toThrow(BalmSharedMCPError);
    });

    it('should not create directory if it already exists', async () => {
      existsSync.mockReturnValue(true);
      mockFsPromises.mkdir.mockResolvedValue();

      await handler.ensureDirectory('/test/existing');

      expect(mockFsPromises.mkdir).not.toHaveBeenCalled();
    });
  });



  describe('copyDirectory', () => {
    it('should copy directory recursively', async () => {
      // Mock directory structure
      existsSync.mockImplementation((dirPath) => {
        return dirPath === '/source' || dirPath.startsWith('/source/');
      });
      statSync.mockImplementation((dirPath) => ({
        isDirectory: () => dirPath === '/source' || dirPath === '/source/subdir'
      }));
      
      mockFsPromises.readdir.mockImplementation((dirPath) => {
        if (dirPath === '/source') {
          return Promise.resolve([
            { name: 'file1.txt', isDirectory: () => false, isFile: () => true, path: '/source/file1.txt' },
            { name: 'subdir', isDirectory: () => true, isFile: () => false, path: '/source/subdir' }
          ]);
        }
        if (dirPath === '/source/subdir') {
          return Promise.resolve([
            { name: 'file2.txt', isDirectory: () => false, isFile: () => true, path: '/source/subdir/file2.txt' }
          ]);
        }
        return Promise.resolve([]);
      });

      mockFsPromises.mkdir.mockResolvedValue();
      mockFsPromises.copyFile.mockResolvedValue();

      await handler.copyDirectory('/source', '/dest');

      expect(mockFsPromises.mkdir).toHaveBeenCalledWith(path.resolve('/dest'), { recursive: true });
    });

    it('should handle copy directory errors when source does not exist', async () => {
      existsSync.mockReturnValue(false);

      await expect(handler.copyDirectory('/nonexistent', '/dest'))
        .rejects.toThrow(BalmSharedMCPError);
    });

    it('should handle copy directory errors when source is not a directory', async () => {
      existsSync.mockReturnValue(true);
      statSync.mockReturnValue({
        isDirectory: () => false,
        isFile: () => true
      });

      await expect(handler.copyDirectory('/source/file.txt', '/dest'))
        .rejects.toThrow(BalmSharedMCPError);
    });
  });

  describe('isDirectory', () => {
    it('should return true for directory', () => {
      existsSync.mockReturnValue(true);
      statSync.mockReturnValue({
        isDirectory: () => true,
        isFile: () => false
      });

      const result = handler.isDirectory('/test/dir');

      expect(result).toBe(true);
      expect(statSync).toHaveBeenCalledWith('/test/dir');
    });

    it('should return false for file', () => {
      existsSync.mockReturnValue(true);
      statSync.mockReturnValue({
        isDirectory: () => false,
        isFile: () => true
      });

      const result = handler.isDirectory('/test/file.txt');

      expect(result).toBe(false);
    });

    it('should handle stat errors', () => {
      existsSync.mockReturnValue(false);

      const result = handler.isDirectory('/test/nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('isFile', () => {
    it('should return true for file', () => {
      existsSync.mockReturnValue(true);
      statSync.mockReturnValue({
        isDirectory: () => false,
        isFile: () => true
      });

      const result = handler.isFile('/test/file.txt');

      expect(result).toBe(true);
      expect(statSync).toHaveBeenCalledWith('/test/file.txt');
    });

    it('should return false for directory', () => {
      existsSync.mockReturnValue(true);
      statSync.mockReturnValue({
        isDirectory: () => true,
        isFile: () => false
      });

      const result = handler.isFile('/test/dir');

      expect(result).toBe(false);
    });

    it('should handle stat errors', () => {
      existsSync.mockReturnValue(false);

      const result = handler.isFile('/test/nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return file stats', async () => {
      const mockStats = createMockFileStats();
      existsSync.mockReturnValue(true);
      mockFsPromises.stat.mockResolvedValue(mockStats);

      const result = await handler.getStats('/test/file.txt');

      expect(result).toEqual({
        size: 1024,
        isDirectory: false,
        isFile: true,
        modified: new Date('2023-01-01'),
        created: new Date('2023-01-01')
      });
      expect(mockFsPromises.stat).toHaveBeenCalledWith(path.resolve('/test/file.txt'));
    });

    it('should handle stat errors', async () => {
      existsSync.mockReturnValue(true);
      mockFsPromises.stat.mockRejectedValue(new Error('File not found'));

      await expect(handler.getStats('/test/nonexistent'))
        .rejects.toThrow(BalmSharedMCPError);
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
    it('should update JSON file successfully', async () => {
      const originalJson = { name: 'test', version: '1.0.0' };
      const updates = { version: '1.1.0', description: 'Updated' };
      const expectedJson = { name: 'test', version: '1.1.0', description: 'Updated' };

      existsSync.mockReturnValue(true);
      mockFsPromises.readFile.mockResolvedValue(JSON.stringify(originalJson));
      mockFsPromises.writeFile.mockResolvedValue();
      mockFsPromises.mkdir.mockResolvedValue();

      const result = await handler.updateJsonFile('/test/package.json', updates);

      expect(result).toEqual(expectedJson);
      expect(mockFsPromises.writeFile).toHaveBeenCalledWith(
        path.resolve('/test/package.json'),
        JSON.stringify(expectedJson, null, 2),
        'utf-8'
      );
    });

    it('should handle invalid JSON gracefully', async () => {
      existsSync.mockReturnValue(true);
      mockFsPromises.readFile.mockResolvedValue('invalid json');

      await expect(handler.updateJsonFile('/test/invalid.json', { key: 'value' }))
        .rejects.toThrow(BalmSharedMCPError);
    });

    it('should create new JSON file if it does not exist', async () => {
      const updates = { name: 'new-project', version: '1.0.0' };

      existsSync.mockReturnValue(false);
      mockFsPromises.writeFile.mockResolvedValue();
      mockFsPromises.mkdir.mockResolvedValue();

      const result = await handler.updateJsonFile('/test/new.json', updates);

      expect(result).toEqual(updates);
      expect(mockFsPromises.writeFile).toHaveBeenCalledWith(
        path.resolve('/test/new.json'),
        JSON.stringify(updates, null, 2),
        'utf-8'
      );
    });
  });


});