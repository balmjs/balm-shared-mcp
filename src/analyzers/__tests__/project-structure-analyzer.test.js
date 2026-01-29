import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectStructureAnalyzer } from '../project-structure-analyzer.js';
import { BalmSharedMCPError } from '../../utils/errors.js';

describe('ProjectStructureAnalyzer', () => {
  let analyzer;
  const mockFileSystemHandler = {
    exists: vi.fn(),
    readFile: vi.fn(),
    readDirectory: vi.fn(),
    isDirectory: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    analyzer = new ProjectStructureAnalyzer(mockFileSystemHandler, {
      sharedLibraryName: 'yiban-shared'
    });
  });

  describe('analyzeProject', () => {
    const projectPath = '/test/project';

    beforeEach(() => {
      // Default successful setup
      mockFileSystemHandler.exists.mockImplementation(path => {
        if (path === projectPath) return true;
        if (path.includes('package.json')) return true;
        if (path.includes('src')) return true;
        return false;
      });

      mockFileSystemHandler.readFile.mockImplementation(path => {
        if (path.includes('package.json')) {
          return JSON.stringify({
            name: 'test-project',
            version: '1.0.0',
            dependencies: { vue: '^2.7.0' }
          });
        }
        return '';
      });

      mockFileSystemHandler.readDirectory.mockResolvedValue(['src', 'package.json', 'README.md']);

      mockFileSystemHandler.isDirectory.mockImplementation(path => {
        return path === projectPath || path.includes('src');
      });
    });

    it('should analyze project structure successfully', async () => {
      const result = await analyzer.analyzeProject(projectPath);

      expect(result.projectPath).toBe(projectPath);
      expect(result.isValid).toBe(true);
      expect(result.structure.hasPackageJson).toBe(true);
      expect(result.structure.hasSrc).toBe(true);
    });

    it('should detect project type from dependencies', async () => {
      mockFileSystemHandler.readFile.mockImplementation(path => {
        if (path.includes('package.json')) {
          return JSON.stringify({
            name: 'test-project',
            dependencies: {
              vue: '^2.7.0',
              'balm-ui-pro': '^1.0.0'
            }
          });
        }
        return '';
      });

      const result = await analyzer.analyzeProject(projectPath);
      expect(result.projectType).toBe('backend');
    });

    it('should detect yiban-shared integration', async () => {
      mockFileSystemHandler.exists.mockImplementation(path => {
        if (path === projectPath) return true;
        if (path.includes('package.json')) return true;
        if (path.includes('balm.alias.js')) return true;
        return false;
      });

      mockFileSystemHandler.readFile.mockImplementation(path => {
        if (path.includes('package.json')) {
          return JSON.stringify({
            name: 'test-project',
            dependencies: { 'yiban-shared': '^1.0.0' }
          });
        }
        if (path.includes('balm.alias.js')) {
          return "module.exports = { 'yiban-shared': '../yiban-shared' };";
        }
        return '';
      });

      const result = await analyzer.analyzeProject(projectPath);
      expect(result.hasBalmShared).toBe(true);
    });

    it('should throw error for non-existent project', async () => {
      mockFileSystemHandler.exists.mockReturnValue(false);

      await expect(analyzer.analyzeProject(projectPath)).rejects.toThrow(BalmSharedMCPError);
    });

    it('should handle invalid package.json gracefully', async () => {
      mockFileSystemHandler.readFile.mockImplementation(path => {
        if (path.includes('package.json')) {
          return 'invalid json';
        }
        return '';
      });

      const result = await analyzer.analyzeProject(projectPath);
      expect(result.issues).toContain('Invalid package.json format');
    });
  });

  describe('_analyzeDirectoryStructure', () => {
    it('should analyze directory structure correctly', async () => {
      mockFileSystemHandler.readDirectory.mockResolvedValue([
        'src',
        'pages',
        'components',
        'utils',
        'apis'
      ]);
      mockFileSystemHandler.isDirectory.mockReturnValue(true);

      const structure = await analyzer._analyzeDirectoryStructure('/test/project');

      expect(structure.hasSrc).toBe(true);
      expect(structure.hasPages).toBe(true);
      expect(structure.hasComponents).toBe(true);
      expect(structure.hasUtils).toBe(true);
      expect(structure.hasApis).toBe(true);
    });

    it('should handle directory read errors', async () => {
      mockFileSystemHandler.readDirectory.mockRejectedValue(new Error('Permission denied'));

      const structure = await analyzer._analyzeDirectoryStructure('/test/project');

      expect(structure.hasSrc).toBe(false);
      expect(structure.hasPages).toBe(false);
    });
  });

  describe('_detectProjectType', () => {
    it('should detect frontend project', () => {
      const packageJson = {
        dependencies: { vue: '^2.7.0', 'vue-router': '^3.0.0' }
      };

      const type = analyzer._detectProjectType(packageJson);
      expect(type).toBe('frontend');
    });

    it('should detect backend project', () => {
      const packageJson = {
        dependencies: {
          vue: '^2.7.0',
          'balm-ui-pro': '^1.0.0'
        }
      };

      const type = analyzer._detectProjectType(packageJson);
      expect(type).toBe('backend');
    });

    it('should default to unknown for unclear projects', () => {
      const packageJson = {
        dependencies: { express: '^4.0.0' }
      };

      const type = analyzer._detectProjectType(packageJson);
      expect(type).toBe('unknown');
    });
  });

  describe('_checkBalmSharedIntegration', () => {
    it('should detect yiban-shared dependency', async () => {
      const packageJson = {
        dependencies: { 'yiban-shared': '^1.0.0' }
      };

      mockFileSystemHandler.exists.mockReturnValue(false);

      const integration = await analyzer._checkBalmSharedIntegration('/test/project', packageJson);

      expect(integration.hasDependency).toBe(true);
      expect(integration.hasAlias).toBe(false);
    });

    it('should detect balm.alias.js configuration', async () => {
      const packageJson = { dependencies: {} };

      mockFileSystemHandler.exists.mockImplementation(path => {
        return path.includes('balm.alias.js');
      });

      mockFileSystemHandler.readFile.mockResolvedValue(
        "module.exports = { 'yiban-shared': '../yiban-shared' };"
      );

      const integration = await analyzer._checkBalmSharedIntegration('/test/project', packageJson);

      expect(integration.hasAlias).toBe(true);
    });
  });

  describe('_generateRecommendations', () => {
    it('should recommend yiban-shared integration', () => {
      const analysis = {
        hasBalmShared: false,
        projectType: 'frontend'
      };

      const recommendations = analyzer._generateRecommendations(analysis);

      expect(recommendations.some(r => r.message.includes(analyzer.sharedLibraryName))).toBe(true);
    });

    it('should recommend testing setup', () => {
      const analysis = {
        structure: { hasTests: false },
        projectType: 'frontend'
      };

      const recommendations = analyzer._generateRecommendations(analysis);

      expect(recommendations.some(r => r.message.includes('testing'))).toBe(true);
    });

    it('should recommend documentation', () => {
      const analysis = {
        structure: { hasReadme: false },
        projectType: 'frontend'
      };

      const recommendations = analyzer._generateRecommendations(analysis);

      expect(recommendations.some(r => r.message.includes('README'))).toBe(true);
    });
  });

  describe('_validateProjectStructure', () => {
    it('should validate correct project structure', () => {
      const analysis = {
        structure: {
          hasPackageJson: true,
          hasSrc: true
        },
        projectType: 'frontend'
      };

      const issues = analyzer._validateProjectStructure(analysis);
      expect(issues).toHaveLength(0);
    });

    it('should identify missing package.json', () => {
      const analysis = {
        structure: {
          hasPackageJson: false,
          hasSrc: true
        },
        projectType: 'frontend'
      };

      const issues = analyzer._validateProjectStructure(analysis);
      expect(issues.some(issue => issue.includes('package.json'))).toBe(true);
    });

    it('should identify missing src directory', () => {
      const analysis = {
        structure: {
          hasPackageJson: true,
          hasSrc: false
        },
        projectType: 'frontend'
      };

      const issues = analyzer._validateProjectStructure(analysis);
      expect(issues.some(issue => issue.includes('src'))).toBe(true);
    });
  });

  describe('_analyzeConfiguration', () => {
    it('should analyze project configuration files', async () => {
      mockFileSystemHandler.exists.mockImplementation(path => {
        return path.includes('balm.config.js') || path.includes('vue.config.js');
      });

      mockFileSystemHandler.readFile.mockImplementation(path => {
        if (path.includes('balm.config.js')) {
          return 'module.exports = { server: { port: 3000 } };';
        }
        if (path.includes('vue.config.js')) {
          return 'module.exports = { devServer: { port: 8080 } };';
        }
        return '';
      });

      const config = await analyzer._analyzeConfiguration('/test/project');

      expect(config.hasBalmConfig).toBe(true);
      expect(config.hasVueConfig).toBe(true);
    });

    it('should handle missing configuration files', async () => {
      mockFileSystemHandler.exists.mockReturnValue(false);

      const config = await analyzer._analyzeConfiguration('/test/project');

      expect(config.hasBalmConfig).toBe(false);
      expect(config.hasVueConfig).toBe(false);
    });
  });

  describe('_analyzeDependencies', () => {
    it('should categorize dependencies correctly', () => {
      const packageJson = {
        dependencies: {
          vue: '^2.7.0',
          'vue-router': '^3.0.0',
          'yiban-shared': '^1.0.0'
        },
        devDependencies: {
          jest: '^29.0.0',
          eslint: '^8.0.0'
        }
      };

      const deps = analyzer._analyzeDependencies(packageJson);

      expect(deps.vue.version).toBe('^2.7.0');
      expect(deps.vue.type).toBe('production');
      expect(deps.jest.type).toBe('development');
      expect(deps.hasBalmShared).toBe(true);
    });

    it('should handle missing dependencies', () => {
      const packageJson = {};

      const deps = analyzer._analyzeDependencies(packageJson);

      expect(deps.hasBalmShared).toBe(false);
      expect(Object.keys(deps).length).toBeGreaterThan(0);
    });
  });
});
