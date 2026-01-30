/**
 * Project Manager Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectManager } from '../project-manager.js';
import { BalmSharedMCPError } from '../../utils/errors.js';

// Mock dependencies
const mockFileSystemHandler = {
  exists: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  copyDirectory: vi.fn(),
  updateJsonFile: vi.fn()
};

const mockConfig = {
  workspaceRoot: '/mock/workspace',
  sharedProjectPath: '../my-shared',
  sharedLibraryName: 'my-shared'
};

describe('ProjectManager', () => {
  let projectManager;

  beforeEach(() => {
    vi.clearAllMocks();
    projectManager = new ProjectManager(mockFileSystemHandler, mockConfig);
  });

  describe('createProject', () => {
    const validOptions = {
      name: 'test-project',
      type: 'frontend',
      path: '/test/path'
    };

    beforeEach(() => {
      // Setup default mocks for successful project creation
      mockFileSystemHandler.exists.mockImplementation(path => {
        if (path === '/test/path') {
          return false;
        } // Target doesn't exist
        // Built-in templates in examples directory
        if (path.includes('examples/frontend-project')) {
          return true;
        }
        if (path.includes('examples/backend-project')) {
          return true;
        }
        return true;
      });
      mockFileSystemHandler.copyDirectory.mockResolvedValue();
      mockFileSystemHandler.updateJsonFile.mockResolvedValue();
      mockFileSystemHandler.readFile.mockResolvedValue(JSON.stringify({ mockFile: true }));
      mockFileSystemHandler.writeFile.mockResolvedValue();
    });

    it('should create a frontend project successfully with balm init', async () => {
      // Mock runBalmInit for balm-init mode
      projectManager.runBalmInit = vi.fn().mockResolvedValue({ success: true, output: 'done' });
      mockFileSystemHandler.exists.mockReturnValue(false); // Target doesn't exist

      const result = await projectManager.createProject(validOptions);

      expect(result.success).toBe(true);
      expect(result.projectPath).toBe('/test/path');
      expect(result.type).toBe('frontend');
      expect(result.mode).toBe('balm-init');
      expect(result.template).toBe('vue-ui-front');
      expect(result.message).toContain('test-project created successfully');
      expect(projectManager.runBalmInit).toHaveBeenCalledWith(
        'vue-ui-front',
        'test-project',
        '/test'
      );
    });

    it('should create a backend project successfully with balm init', async () => {
      projectManager.runBalmInit = vi.fn().mockResolvedValue({ success: true, output: 'done' });
      mockFileSystemHandler.exists.mockReturnValue(false);

      const backendOptions = { ...validOptions, type: 'backend' };
      const result = await projectManager.createProject(backendOptions);

      expect(result.success).toBe(true);
      expect(result.type).toBe('backend');
      expect(result.mode).toBe('balm-init');
      expect(result.template).toBe('vue-ui-back');
    });

    it('should throw error for invalid project name', async () => {
      const invalidOptions = { ...validOptions, name: '' };

      await expect(projectManager.createProject(invalidOptions)).rejects.toThrow(
        BalmSharedMCPError
      );
    });

    it('should throw error for invalid project type', async () => {
      const invalidOptions = { ...validOptions, type: 'invalid' };

      await expect(projectManager.createProject(invalidOptions)).rejects.toThrow(
        BalmSharedMCPError
      );
    });

    it('should throw error if target directory exists', async () => {
      mockFileSystemHandler.exists.mockImplementation(path => {
        if (path === '/test/path') {
          return true;
        } // Target exists
        return true;
      });

      await expect(projectManager.createProject(validOptions)).rejects.toThrow(BalmSharedMCPError);
    });

    it('should throw error if balm init fails', async () => {
      mockFileSystemHandler.exists.mockReturnValue(false);
      projectManager.runBalmInit = vi.fn().mockRejectedValue(new Error('balm init failed'));

      await expect(projectManager.createProject(validOptions)).rejects.toThrow();
    });

    it('should use referenceProject when specified (copy mode)', async () => {
      const optionsWithRef = {
        ...validOptions,
        referenceProject: 'company-admin'
      };

      mockFileSystemHandler.exists.mockImplementation(path => {
        if (path === '/test/path') {
          return false;
        } // Target doesn't exist
        if (path === '/mock/workspace/company-admin') {
          return true;
        } // Reference project exists
        return true;
      });

      const result = await projectManager.createProject(optionsWithRef);

      expect(result.success).toBe(true);
      expect(result.referenceProject).toBe('company-admin');
      expect(result.mode).toBe('copy');
      expect(mockFileSystemHandler.copyDirectory).toHaveBeenCalled();
    });
  });

  describe('analyzeProject', () => {
    const projectPath = '/test/project';

    beforeEach(() => {
      // Setup default mocks for successful project analysis
      mockFileSystemHandler.exists.mockImplementation(path => {
        if (path === projectPath) {
          return true;
        } // Project exists
        if (path.includes('package.json')) {
          return true;
        }
        if (path.includes('src')) {
          return true;
        }
        return false;
      });

      mockFileSystemHandler.readFile.mockImplementation(path => {
        if (path.includes('package.json')) {
          return JSON.stringify({
            name: 'test-project',
            version: '1.0.0',
            dependencies: { vue: '^2.7.0' },
            devDependencies: { jest: '^29.0.0' }
          });
        }
        return JSON.stringify({ mockFile: true });
      });
    });

    it('should analyze project successfully', async () => {
      const result = await projectManager.analyzeProject(projectPath);

      expect(result.projectPath).toBe(projectPath);
      expect(result.isValid).toBe(true);
      expect(result.projectType).toBe('frontend');
      expect(result.structure.hasPackageJson).toBe(true);
      expect(result.structure.hasSrc).toBe(true);
    });

    it('should detect backend project type', async () => {
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
        return JSON.stringify({ mockFile: true });
      });

      const result = await projectManager.analyzeProject(projectPath);
      expect(result.projectType).toBe('backend');
    });

    it('should detect yiban-shared integration', async () => {
      mockFileSystemHandler.exists.mockImplementation(path => {
        if (path === projectPath) {
          return true;
        }
        if (path.includes('package.json')) {
          return true;
        }
        if (path.includes('balm.alias.js')) {
          return true;
        }
        return false;
      });

      mockFileSystemHandler.readFile.mockImplementation(path => {
        if (path.includes('package.json')) {
          return JSON.stringify({
            name: 'test-project',
            dependencies: { 'my-shared': '^1.0.0' }
          });
        }
        if (path.includes('balm.alias.js')) {
          return "module.exports = { 'my-shared': '../my-shared' };";
        }
        return JSON.stringify({ mockFile: true });
      });

      const result = await projectManager.analyzeProject(projectPath);
      expect(result.hasSharedProject).toBe(true);
      expect(result.configuration.sharedProjectIntegration.hasDependency).toBe(true);
      expect(result.configuration.sharedProjectIntegration.hasAlias).toBe(true);
    });

    it('should generate recommendations for missing features', async () => {
      mockFileSystemHandler.exists.mockImplementation(path => {
        if (path === projectPath) {
          return true;
        }
        if (path.includes('package.json')) {
          return true;
        }
        return false; // Everything else missing
      });

      const result = await projectManager.analyzeProject(projectPath);

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(r => r.message.includes('my-shared'))).toBe(true);
      expect(result.recommendations.some(r => r.message.includes('testing'))).toBe(true);
    });

    it('should throw error for non-existent project', async () => {
      mockFileSystemHandler.exists.mockReturnValue(false);

      await expect(projectManager.analyzeProject(projectPath)).rejects.toThrow(BalmSharedMCPError);
    });

    it('should handle invalid package.json gracefully', async () => {
      mockFileSystemHandler.readFile.mockImplementation(path => {
        if (path.includes('package.json')) {
          return 'invalid json';
        }
        return JSON.stringify({ mockFile: true });
      });

      const result = await projectManager.analyzeProject(projectPath);
      expect(result.issues).toContain('Invalid package.json format');
    });
  });

  describe('validateProjectOptions', () => {
    it('should validate correct options', () => {
      const options = {
        name: 'test-project',
        type: 'frontend',
        path: '/test/path'
      };

      expect(() => projectManager.validateProjectOptions(options)).not.toThrow();
    });

    it('should throw error for missing name', () => {
      const options = {
        type: 'frontend',
        path: '/test/path'
      };

      expect(() => projectManager.validateProjectOptions(options)).toThrow(BalmSharedMCPError);
    });

    it('should throw error for invalid type', () => {
      const options = {
        name: 'test-project',
        type: 'invalid',
        path: '/test/path'
      };

      expect(() => projectManager.validateProjectOptions(options)).toThrow(BalmSharedMCPError);
    });
  });

  describe('getAvailableTemplates', () => {
    it('should return available templates', () => {
      const templates = projectManager.getAvailableTemplates();

      expect(templates).toHaveProperty('frontend-project');
      expect(templates).toHaveProperty('backend-project');
      expect(templates['frontend-project'].type).toBe('frontend');
      expect(templates['backend-project'].type).toBe('backend');
    });
  });

  describe('getProjectFeatures', () => {
    it('should return frontend features', () => {
      const features = projectManager.getProjectFeatures('frontend');

      expect(features).toContain('Vue.js 2.7');
      expect(features).toContain('Vue Router');
      expect(features).toContain('shared-project integration');
    });

    it('should return backend features', () => {
      const features = projectManager.getProjectFeatures('backend');

      expect(features).toContain('Vue.js 2.7');
      expect(features).toContain('Authentication system');
      expect(features).toContain('CRUD functionality');
    });
  });
});
