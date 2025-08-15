/**
 * Tests for ProjectManager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectManager } from '../../src/managers/project-manager.js';
import { BalmSharedMCPError, ErrorCodes } from '../../src/utils/errors.js';

describe('ProjectManager', () => {
  let projectManager;
  let mockFileSystemHandler;
  let mockConfig;

  beforeEach(() => {
    mockFileSystemHandler = {
      exists: vi.fn(),
      copyDirectory: vi.fn(),
      updateJsonFile: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn()
    };

    mockConfig = {
      templatesPath: '/test/templates'
    };

    projectManager = new ProjectManager(mockFileSystemHandler, mockConfig);
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

  describe('validateProjectOptions', () => {
    it('should validate valid options', () => {
      const options = {
        name: 'test-project',
        type: 'frontend',
        path: '/test/path'
      };

      mockFileSystemHandler.exists.mockReturnValue(false);
      
      expect(() => projectManager.validateProjectOptions(options)).not.toThrow();
    });

    it('should throw error for missing name', () => {
      const options = {
        type: 'frontend',
        path: '/test/path'
      };

      expect(() => projectManager.validateProjectOptions(options))
        .toThrow(BalmSharedMCPError);
    });

    it('should throw error for invalid type', () => {
      const options = {
        name: 'test-project',
        type: 'invalid',
        path: '/test/path'
      };

      expect(() => projectManager.validateProjectOptions(options))
        .toThrow(BalmSharedMCPError);
    });

    it('should throw error if target directory exists', () => {
      const options = {
        name: 'test-project',
        type: 'frontend',
        path: '/test/path'
      };

      mockFileSystemHandler.exists.mockReturnValue(true);

      expect(() => projectManager.validateProjectOptions(options))
        .toThrow(BalmSharedMCPError);
    });
  });

  describe('getTemplatePath', () => {
    it('should return template path for valid type', () => {
      mockFileSystemHandler.exists.mockReturnValue(true);
      
      const templatePath = projectManager.getTemplatePath('frontend');
      expect(templatePath).toContain('frontend-project');
    });

    it('should throw error for invalid type', () => {
      expect(() => projectManager.getTemplatePath('invalid'))
        .toThrow(BalmSharedMCPError);
    });

    it('should throw error if template directory does not exist', () => {
      mockFileSystemHandler.exists.mockReturnValue(false);
      
      expect(() => projectManager.getTemplatePath('frontend'))
        .toThrow(BalmSharedMCPError);
    });
  });

  describe('prepareTemplateVariables', () => {
    it('should prepare template variables with defaults', () => {
      const options = {
        name: 'test-project',
        type: 'frontend'
      };

      const variables = projectManager.prepareTemplateVariables(options);
      
      expect(variables.projectName).toBe('test-project');
      expect(variables.projectType).toBe('frontend');
      expect(variables.apiEndpoint).toBe('/api');
      expect(variables.sharedProjectPath).toBe('../yiban-shared');
      expect(variables.projectAuthor).toBe('Developer');
    });

    it('should use provided values over defaults', () => {
      const options = {
        name: 'test-project',
        type: 'backend',
        apiEndpoint: '/custom-api',
        sharedProjectPath: '../../shared',
        author: 'John Doe',
        description: 'Custom description'
      };

      const variables = projectManager.prepareTemplateVariables(options);
      
      expect(variables.apiEndpoint).toBe('/custom-api');
      expect(variables.sharedProjectPath).toBe('../../shared');
      expect(variables.projectAuthor).toBe('John Doe');
      expect(variables.projectDescription).toBe('Custom description');
    });
  });

  describe('createProject', () => {
    it('should create project successfully', async () => {
      const options = {
        name: 'test-project',
        type: 'frontend',
        path: '/test/project'
      };

      mockFileSystemHandler.exists
        .mockReturnValueOnce(false) // Target directory doesn't exist
        .mockReturnValueOnce(true)  // Template directory exists
        .mockReturnValueOnce(true)  // env.js exists
        .mockReturnValueOnce(true); // balm.alias.js exists

      mockFileSystemHandler.copyDirectory.mockResolvedValue();
      mockFileSystemHandler.updateJsonFile.mockResolvedValue();
      mockFileSystemHandler.readFile.mockResolvedValue(
        "const globalWorkspace = path.join(localWorkspace, '..');"
      );
      mockFileSystemHandler.writeFile.mockResolvedValue();

      const result = await projectManager.createProject(options);

      expect(result.success).toBe(true);
      expect(result.projectPath).toBe('/test/project');
      expect(result.type).toBe('frontend');
      expect(mockFileSystemHandler.copyDirectory).toHaveBeenCalled();
      expect(mockFileSystemHandler.updateJsonFile).toHaveBeenCalled();
    });

    it('should handle project creation errors', async () => {
      const options = {
        name: 'test-project',
        type: 'frontend',
        path: '/test/project'
      };

      mockFileSystemHandler.exists.mockReturnValue(true); // Target exists

      await expect(projectManager.createProject(options))
        .rejects.toThrow(BalmSharedMCPError);
    });
  });

  describe('getProjectFeatures', () => {
    it('should return frontend features', () => {
      const features = projectManager.getProjectFeatures('frontend');
      
      expect(features).toContain('Vue.js 2.7');
      expect(features).toContain('Basic routing structure');
      expect(features).not.toContain('Authentication system');
    });

    it('should return backend features', () => {
      const features = projectManager.getProjectFeatures('backend');
      
      expect(features).toContain('Vue.js 2.7');
      expect(features).toContain('Authentication system');
      expect(features).toContain('CRUD functionality');
    });
  });

  describe('getNextSteps', () => {
    it('should return next steps for project setup', () => {
      const steps = projectManager.getNextSteps('/test/project');
      
      expect(steps).toContain('cd /test/project');
      expect(steps).toContain('npm install');
      expect(steps).toContain('npm run dev');
    });
  });

  describe('configureApiSettings', () => {
    it('should configure API settings in balmrc.js', async () => {
      const projectPath = '/test/project';
      const options = {
        apiEndpoint: '/custom-api',
        proxyTarget: 'http://custom.dev',
        proxyChangeOrigin: false
      };

      const mockBalmrcContent = `module.exports = {
  server: {
    proxyConfig: {
      context: '/api',
      options: {
        target: 'http://your.project.dev',
        changeOrigin: true
      }
    }
  }
};`;

      mockFileSystemHandler.exists.mockReturnValue(true);
      mockFileSystemHandler.readFile.mockResolvedValue(mockBalmrcContent);
      mockFileSystemHandler.writeFile.mockResolvedValue();

      await projectManager.configureApiSettings(projectPath, options);

      expect(mockFileSystemHandler.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('balmrc.js'),
        expect.stringContaining('/custom-api')
      );
      expect(mockFileSystemHandler.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('balmrc.js'),
        expect.stringContaining('http://custom.dev')
      );
    });
  });

  describe('updatePackageDependencies', () => {
    it('should update package.json with new dependencies', async () => {
      const projectPath = '/test/project';
      const options = {
        dependencies: { 'new-dep': '^1.0.0' },
        devDependencies: { 'new-dev-dep': '^2.0.0' },
        scripts: { 'custom-script': 'echo test' }
      };

      const mockPackageContent = JSON.stringify({
        name: 'test-project',
        dependencies: { 'existing-dep': '^1.0.0' },
        devDependencies: { 'existing-dev-dep': '^1.0.0' },
        scripts: { 'existing-script': 'echo existing' }
      });

      mockFileSystemHandler.exists.mockReturnValue(true);
      mockFileSystemHandler.readFile.mockResolvedValue(mockPackageContent);
      mockFileSystemHandler.writeFile.mockResolvedValue();

      await projectManager.updatePackageDependencies(projectPath, options);

      expect(mockFileSystemHandler.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('package.json'),
        expect.stringContaining('new-dep')
      );
    });
  });

  describe('configureBalmSharedAlias', () => {
    it('should configure custom aliases in balm.alias.js', async () => {
      const projectPath = '/test/project';
      const options = {
        customAliases: {
          '@custom': './custom/path',
          '@utils': './utils'
        }
      };

      const mockAliasContent = `module.exports = {
  ...globalAlias,
  '@': localResolve('app/scripts')
};`;

      mockFileSystemHandler.exists.mockReturnValue(true);
      mockFileSystemHandler.readFile
        .mockResolvedValueOnce(mockAliasContent)
        .mockResolvedValueOnce('module.exports = { alias };');
      mockFileSystemHandler.writeFile.mockResolvedValue();

      await projectManager.configureBalmSharedAlias(projectPath, options);

      expect(mockFileSystemHandler.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('balm.alias.js'),
        expect.stringContaining('@custom')
      );
    });
  });

  describe('generateProjectConfiguration', () => {
    it('should generate complete project configuration', async () => {
      const projectPath = '/test/project';
      const options = {
        apiEndpoint: '/api/v1',
        proxyTarget: 'http://api.example.com',
        dependencies: { 'lodash': '^4.17.21' },
        customAliases: { '@components': './components' }
      };

      mockFileSystemHandler.exists.mockReturnValue(true);
      mockFileSystemHandler.readFile
        .mockResolvedValueOnce('balmrc content')
        .mockResolvedValueOnce('{"name": "test"}')
        .mockResolvedValueOnce('alias content')
        .mockResolvedValueOnce('balmrc content');
      mockFileSystemHandler.writeFile.mockResolvedValue();

      await projectManager.generateProjectConfiguration(projectPath, options);

      expect(mockFileSystemHandler.writeFile).toHaveBeenCalledTimes(4);
    });
  });
});