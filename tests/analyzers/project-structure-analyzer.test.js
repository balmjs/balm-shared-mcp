/**
 * ProjectStructureAnalyzer Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectStructureAnalyzer } from '../../src/analyzers/project-structure-analyzer.js';
import { BalmSharedMCPError } from '../../src/utils/errors.js';

// Create mock file handler methods
const mockFileHandler = {
  validatePath: vi.fn(),
  exists: vi.fn(),
  isDirectory: vi.fn(),
  readFile: vi.fn(),
  listDirectory: vi.fn(),
  getStats: vi.fn()
};

// Mock FileSystemHandler with class syntax for Vitest 4.0
vi.mock('../../src/handlers/file-system-handler.js', () => ({
  FileSystemHandler: class MockFileSystemHandler {
    constructor() {
      Object.assign(this, mockFileHandler);
    }
  }
}));

describe('ProjectStructureAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    analyzer = new ProjectStructureAnalyzer(undefined, { sharedLibraryName: 'yiban-shared' });
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      expect(analyzer.requiredBalmJSFiles).toContain('balm.config.js');
      expect(analyzer.requiredBalmJSFiles).toContain('package.json');
      expect(analyzer.requiredBalmJSDirectories).toContain('app');
      expect(analyzer.sharedProjectIndicators).toContain(analyzer.sharedLibraryName);
    });
  });

  describe('analyzeProject', () => {
    it('should analyze valid BalmJS project', async () => {
      const projectPath = '/test/project';

      mockFileHandler.validatePath.mockReturnValue(projectPath);
      mockFileHandler.exists.mockReturnValue(true);
      mockFileHandler.isDirectory.mockReturnValue(true);
      mockFileHandler.listDirectory.mockResolvedValue([
        { name: 'app', isDirectory: true, isFile: false, path: '/test/project/app' },
        {
          name: 'package.json',
          isDirectory: false,
          isFile: true,
          path: '/test/project/package.json'
        }
      ]);
      mockFileHandler.readFile.mockResolvedValue(
        '{"name": "test-project", "dependencies": {"balm": "^1.0.0"}}'
      );
      mockFileHandler.getStats.mockResolvedValue({ size: 1024 });

      const result = await analyzer.analyzeProject(projectPath);

      expect(result.projectPath).toBe(projectPath);
      expect(result.structure).toBeDefined();
      expect(result.issues).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('should throw error for non-existent project', async () => {
      const projectPath = '/nonexistent/project';

      mockFileHandler.validatePath.mockReturnValue(projectPath);
      mockFileHandler.exists.mockReturnValue(false);

      await expect(analyzer.analyzeProject(projectPath)).rejects.toThrow(BalmSharedMCPError);
    });

    it('should throw error for non-directory path', async () => {
      const projectPath = '/test/file.txt';

      mockFileHandler.validatePath.mockReturnValue(projectPath);
      mockFileHandler.exists.mockReturnValue(true);
      mockFileHandler.isDirectory.mockReturnValue(false);

      await expect(analyzer.analyzeProject(projectPath)).rejects.toThrow(BalmSharedMCPError);
    });
  });

  describe('validateBalmJSStructure', () => {
    it('should validate complete BalmJS structure', async () => {
      const projectPath = '/test/project';

      // Mock all required files exist
      mockFileHandler.exists.mockImplementation(filePath => {
        return (
          analyzer.requiredBalmJSFiles.some(file => filePath.endsWith(file)) ||
          analyzer.requiredBalmJSDirectories.some(dir => filePath.endsWith(dir))
        );
      });

      mockFileHandler.isDirectory.mockImplementation(filePath => {
        return analyzer.requiredBalmJSDirectories.some(dir => filePath.endsWith(dir));
      });

      mockFileHandler.readFile.mockResolvedValue('{"dependencies": {"balm": "^1.0.0"}}');

      const result = await analyzer.validateBalmJSStructure(projectPath);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect missing BalmJS files', async () => {
      const projectPath = '/test/project';

      mockFileHandler.exists.mockReturnValue(false);
      mockFileHandler.isDirectory.mockReturnValue(false);

      const result = await analyzer.validateBalmJSStructure(projectPath);

      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(
        result.issues.some(issue => issue.message.includes('Missing required BalmJS file'))
      ).toBe(true);
    });
  });

  describe('checkYibanSharedIntegration', () => {
    it('should detect yiban-shared in package.json', async () => {
      const projectPath = '/test/project';

      mockFileHandler.exists.mockImplementation(filePath => filePath.endsWith('package.json'));

      mockFileHandler.readFile.mockResolvedValue('{"dependencies": {"yiban-shared": "^1.0.0"}}');

      const result = await analyzer.checkYibanSharedIntegration(projectPath);

      expect(result.isIntegrated).toBe(true);
    });

    it('should detect yiban-shared in balm.config.js', async () => {
      const projectPath = '/test/project';

      mockFileHandler.exists.mockImplementation(filePath => filePath.endsWith('balm.config.js'));

      mockFileHandler.readFile.mockResolvedValue('includeJsResource: ["yiban-shared"]');

      const result = await analyzer.checkYibanSharedIntegration(projectPath);

      expect(result.isIntegrated).toBe(true);
    });

    it('should detect shared library directory', async () => {
      const projectPath = '/test/project';

      mockFileHandler.exists.mockImplementation(filePath =>
        filePath.endsWith(analyzer.sharedLibraryName)
      );
      mockFileHandler.isDirectory.mockReturnValue(true);

      const result = await analyzer.checkYibanSharedIntegration(projectPath);

      expect(result.isIntegrated).toBe(true);
    });

    it('should recommend integration when not found', async () => {
      const projectPath = '/test/project';

      mockFileHandler.exists.mockReturnValue(false);

      const result = await analyzer.checkYibanSharedIntegration(projectPath);

      expect(result.isIntegrated).toBe(false);
      expect(
        result.recommendations.some(rec => rec.includes && rec.includes(analyzer.sharedLibraryName))
      ).toBe(true);
    });
  });

  describe('hasBalmJSDependencies', () => {
    it('should detect balm dependencies', () => {
      const packageJson = {
        dependencies: { balm: '^1.0.0' },
        devDependencies: { gulp: '^4.0.0' }
      };

      const result = analyzer.hasBalmJSDependencies(packageJson);
      expect(result).toBe(true);
    });

    it('should return false for no balm dependencies', () => {
      const packageJson = {
        dependencies: { react: '^17.0.0' },
        devDependencies: { webpack: '^5.0.0' }
      };

      const result = analyzer.hasBalmJSDependencies(packageJson);
      expect(result).toBe(false);
    });
  });

  describe('hasYibanSharedReferences', () => {
    it('should detect yiban-shared in dependencies', () => {
      const packageJson = {
        dependencies: { 'yiban-shared': '^1.0.0' }
      };

      const result = analyzer.hasYibanSharedReferences(packageJson);
      expect(result).toBe(true);
    });

    it('should detect @yiban/shared in dependencies', () => {
      const packageJson = {
        dependencies: { '@yiban/shared': '^1.0.0' }
      };

      const result = analyzer.hasYibanSharedReferences(packageJson);
      expect(result).toBe(true);
    });

    it('should return false for no yiban-shared references', () => {
      const packageJson = {
        dependencies: { react: '^17.0.0' }
      };

      const result = analyzer.hasYibanSharedReferences(packageJson);
      expect(result).toBe(false);
    });
  });

  describe('shouldSkipItem', () => {
    it('should skip common ignored items', () => {
      expect(analyzer.shouldSkipItem('node_modules')).toBe(true);
      expect(analyzer.shouldSkipItem('.git')).toBe(true);
      expect(analyzer.shouldSkipItem('dist')).toBe(true);
      expect(analyzer.shouldSkipItem('.DS_Store')).toBe(true);
    });

    it('should not skip regular files', () => {
      expect(analyzer.shouldSkipItem('package.json')).toBe(false);
      expect(analyzer.shouldSkipItem('src')).toBe(false);
      expect(analyzer.shouldSkipItem('README.md')).toBe(false);
    });
  });

  describe('generateOptimizationRecommendations', () => {
    it('should recommend BalmJS structure for non-BalmJS project', () => {
      const analysis = {
        isBalmJSProject: false,
        hasYibanSharedIntegration: true,
        packageInfo: { scripts: { dev: 'npm start' } }
      };

      const recommendations = analyzer.generateOptimizationRecommendations(analysis);

      expect(recommendations.some(rec => rec.action === 'init_balm_project')).toBe(true);
    });

    it('should recommend yiban-shared integration', () => {
      const analysis = {
        isBalmJSProject: true,
        hasYibanSharedIntegration: false,
        packageInfo: { scripts: { dev: 'npm start' } }
      };

      const recommendations = analyzer.generateOptimizationRecommendations(analysis);

      expect(recommendations.some(rec => rec.action === 'setup_shared_project')).toBe(true);
    });

    it('should recommend dev scripts when missing', () => {
      const analysis = {
        isBalmJSProject: true,
        hasYibanSharedIntegration: true,
        packageInfo: { scripts: {} }
      };

      const recommendations = analyzer.generateOptimizationRecommendations(analysis);

      expect(recommendations.some(rec => rec.action === 'add_dev_scripts')).toBe(true);
    });
  });
});
