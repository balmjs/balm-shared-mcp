/**
 * Project Structure Analyzer
 *
 * Analyzes project structure and validates BalmJS project compliance
 * and shared-project integration.
 */

import path from 'path';
import { FileSystemHandler } from '../handlers/file-system-handler.js';
import { logger } from '../utils/logger.js';
import { BalmSharedMCPError, ErrorCodes } from '../utils/errors.js';

export class ProjectStructureAnalyzer {
  constructor(fileSystemHandler, config = {}) {
    this.fileHandler = fileSystemHandler || new FileSystemHandler();
    // Configurable shared library name (allows company customization)
    this.sharedLibraryName = config.sharedLibraryName || 'my-shared';
    this.requiredBalmJSFiles = [
      'balm.config.js',
      'package.json',
      'app/index.html',
      'app/scripts/main.js'
    ];
    this.requiredBalmJSDirectories = ['app', 'app/scripts', 'app/styles'];
    // Dynamic indicators based on configured library name
    this.sharedProjectIndicators = [
      this.sharedLibraryName,
      `@${this.sharedLibraryName.split('-')[0]}/shared`,
      'includeJsResource'
    ];
  }

  /**
   * Get the configured shared library name
   */
  getSharedLibraryName() {
    return this.sharedLibraryName;
  }

  /**
   * Analyze project structure and return comprehensive analysis
   */
  async analyzeProject(projectPath) {
    try {
      if (!this.fileHandler.exists(projectPath)) {
        throw new BalmSharedMCPError(
          ErrorCodes.PROJECT_NOT_FOUND,
          `Project directory not found: ${projectPath}`
        );
      }

      if (!this.fileHandler.isDirectory(projectPath)) {
        throw new BalmSharedMCPError(
          ErrorCodes.INVALID_PROJECT_PATH,
          `Path is not a directory: ${projectPath}`
        );
      }

      const analysis = {
        projectPath,
        isValid: true,
        structure: {},
        issues: [],
        recommendations: [],
        packageInfo: null,
        projectType: 'unknown',
        hasBalmShared: false
      };

      // Analyze directory structure
      analysis.structure = await this._analyzeDirectoryStructure(projectPath);

      // Load and analyze package.json
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (this.fileHandler.exists(packageJsonPath)) {
        try {
          const packageContent = await this.fileHandler.readFile(packageJsonPath);
          analysis.packageInfo = JSON.parse(packageContent);
          analysis.projectType = this._detectProjectType(analysis.packageInfo);

          // Check for balm-shared integration
          const integration = await this._checkBalmSharedIntegration(
            projectPath,
            analysis.packageInfo
          );
          analysis.hasBalmShared = integration.hasDependency || integration.hasAlias;
        } catch (error) {
          analysis.issues.push('Invalid package.json format');
        }
      }

      // Validate project structure
      const structureIssues = this._validateProjectStructure(analysis);
      analysis.issues.push(...structureIssues);

      // Generate recommendations
      analysis.recommendations = this._generateRecommendations(analysis);

      return analysis;
    } catch (error) {
      if (error instanceof BalmSharedMCPError) {
        throw error;
      }
      throw new BalmSharedMCPError(
        ErrorCodes.PROJECT_CREATION_FAILED,
        `Failed to analyze project: ${projectPath}`,
        { originalError: error.message }
      );
    }
  }

  /**
   * Scan and map project directory structure
   */
  async scanProjectStructure(projectPath, maxDepth = 3, currentDepth = 0) {
    if (currentDepth >= maxDepth) {
      return { type: 'directory', truncated: true };
    }

    try {
      const items = await this.fileHandler.listDirectory(projectPath);
      const structure = { type: 'directory', children: {} };

      for (const item of items) {
        // Skip common ignored directories
        if (this.shouldSkipItem(item.name)) {
          continue;
        }

        if (item.isDirectory) {
          structure.children[item.name] = await this.scanProjectStructure(
            item.path,
            maxDepth,
            currentDepth + 1
          );
        } else {
          structure.children[item.name] = {
            type: 'file',
            size: await this.getFileSize(item.path)
          };
        }
      }

      return structure;
    } catch (error) {
      logger.warn(`Failed to scan directory: ${projectPath}`, { error: error.message });
      return { type: 'directory', error: error.message };
    }
  }

  /**
   * Validate BalmJS project structure
   */
  async validateBalmJSStructure(projectPath) {
    const validation = {
      isValid: true,
      issues: [],
      recommendations: []
    };

    // Check required files
    for (const requiredFile of this.requiredBalmJSFiles) {
      const filePath = path.join(projectPath, requiredFile);
      if (!this.fileHandler.exists(filePath)) {
        validation.isValid = false;
        validation.issues.push({
          type: 'error',
          category: 'structure',
          message: `Missing required BalmJS file: ${requiredFile}`,
          file: requiredFile
        });
      }
    }

    // Check required directories
    for (const requiredDir of this.requiredBalmJSDirectories) {
      const dirPath = path.join(projectPath, requiredDir);
      if (!this.fileHandler.exists(dirPath) || !this.fileHandler.isDirectory(dirPath)) {
        validation.isValid = false;
        validation.issues.push({
          type: 'error',
          category: 'structure',
          message: `Missing required BalmJS directory: ${requiredDir}`,
          file: requiredDir
        });
      }
    }

    // Validate package.json for BalmJS dependencies
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (this.fileHandler.exists(packageJsonPath)) {
      try {
        const packageContent = await this.fileHandler.readFile(packageJsonPath);
        const packageJson = JSON.parse(packageContent);

        if (!this.hasBalmJSDependencies(packageJson)) {
          validation.issues.push({
            type: 'warning',
            category: 'dependencies',
            message: 'BalmJS dependencies not found in package.json',
            file: 'package.json'
          });
        }
      } catch (error) {
        validation.issues.push({
          type: 'error',
          category: 'package',
          message: 'Failed to validate package.json',
          file: 'package.json'
        });
      }
    }

    // Add recommendations for missing structure
    if (!validation.isValid) {
      validation.recommendations.push({
        type: 'structure',
        message: 'Initialize BalmJS project structure',
        action: 'create_balm_structure'
      });
    }

    return validation;
  }

  /**
   * Check shared-project integration
   */
  async checkBalmSharedIntegration(projectPath) {
    const check = {
      isIntegrated: false,
      issues: [],
      recommendations: []
    };

    // Check package.json for shared-project references
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (this.fileHandler.exists(packageJsonPath)) {
      try {
        const packageContent = await this.fileHandler.readFile(packageJsonPath);
        const packageJson = JSON.parse(packageContent);

        if (this.hasBalmSharedReferences(packageJson)) {
          check.isIntegrated = true;
        }
      } catch (error) {
        check.issues.push({
          type: 'error',
          category: 'package',
          message: 'Failed to check package.json for shared-project',
          file: 'package.json'
        });
      }
    }

    // Check balm.config.js for shared-project configuration
    const balmConfigPath = path.join(projectPath, 'balm.config.js');
    if (this.fileHandler.exists(balmConfigPath)) {
      try {
        const balmConfigContent = await this.fileHandler.readFile(balmConfigPath);

        if (this.hasBalmSharedConfig(balmConfigContent)) {
          check.isIntegrated = true;
        }
      } catch (error) {
        check.issues.push({
          type: 'error',
          category: 'config',
          message: 'Failed to check balm.config.js for shared-project',
          file: 'balm.config.js'
        });
      }
    }

    // Check for shared-library directory or symlink
    const sharedLibraryPath = path.join(projectPath, this.sharedLibraryName);
    if (this.fileHandler.exists(sharedLibraryPath)) {
      check.isIntegrated = true;
    }

    // Add recommendations if not integrated
    if (!check.isIntegrated) {
      check.recommendations.push({
        type: 'integration',
        message: 'Configure shared-project integration',
        action: 'setup_shared_project'
      });
    }

    return check;
  }

  /**
   * Check if package.json has BalmJS dependencies
   */
  hasBalmJSDependencies(packageJson) {
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    return Object.keys(dependencies).some(
      dep => dep.includes('balm') || dep.includes('@balm') || dep === 'gulp'
    );
  }

  /**
   * Check if package.json has shared-project references
   */
  hasBalmSharedReferences(packageJson) {
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
      ...packageJson.peerDependencies
    };

    return this.sharedProjectIndicators.some(
      indicator =>
        Object.keys(allDeps).some(dep => dep.includes(indicator)) ||
        JSON.stringify(packageJson).includes(indicator)
    );
  }

  /**
   * Check if balm.config.js has shared-project configuration
   */
  hasBalmSharedConfig(configContent) {
    return this.sharedProjectIndicators.some(indicator => configContent.includes(indicator));
  }

  /**
   * Check if item should be skipped during scanning
   */
  shouldSkipItem(itemName) {
    const skipPatterns = [
      'node_modules',
      '.git',
      '.DS_Store',
      'dist',
      'build',
      '.cache',
      'coverage',
      '.nyc_output'
    ];

    return skipPatterns.some(pattern => itemName.includes(pattern));
  }

  /**
   * Get file size safely
   */
  async getFileSize(filePath) {
    try {
      const stats = await this.fileHandler.getStats(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  /**
   * Analyze directory structure
   */
  async _analyzeDirectoryStructure(projectPath) {
    try {
      const items = await this.fileHandler.readDirectory(projectPath);
      const structure = {
        hasPackageJson: false,
        hasSrc: false,
        hasPages: false,
        hasComponents: false,
        hasUtils: false,
        hasApis: false,
        hasTests: false,
        hasReadme: false
      };

      for (const item of items) {
        const itemName = item.toLowerCase();
        if (itemName === 'package.json') {
          structure.hasPackageJson = true;
        }
        if (itemName === 'src' && this.fileHandler.isDirectory(path.join(projectPath, item))) {
          structure.hasSrc = true;
        }
        if (itemName === 'pages' && this.fileHandler.isDirectory(path.join(projectPath, item))) {
          structure.hasPages = true;
        }
        if (
          itemName === 'components' &&
          this.fileHandler.isDirectory(path.join(projectPath, item))
        ) {
          structure.hasComponents = true;
        }
        if (itemName === 'utils' && this.fileHandler.isDirectory(path.join(projectPath, item))) {
          structure.hasUtils = true;
        }
        if (itemName === 'apis' && this.fileHandler.isDirectory(path.join(projectPath, item))) {
          structure.hasApis = true;
        }
        if (
          itemName.includes('test') &&
          this.fileHandler.isDirectory(path.join(projectPath, item))
        ) {
          structure.hasTests = true;
        }
        if (itemName === 'readme.md') {
          structure.hasReadme = true;
        }
      }

      return structure;
    } catch (error) {
      return {
        hasPackageJson: false,
        hasSrc: false,
        hasPages: false,
        hasComponents: false,
        hasUtils: false,
        hasApis: false,
        hasTests: false,
        hasReadme: false
      };
    }
  }

  /**
   * Detect project type from package.json
   */
  _detectProjectType(packageJson) {
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    // Check for backend indicators
    if (dependencies['balm-ui-pro']) {
      return 'backend';
    }

    // Check for frontend indicators
    if (dependencies.vue && dependencies['vue-router']) {
      return 'frontend';
    }

    if (dependencies.vue) {
      return 'frontend';
    }

    return 'unknown';
  }

  /**
   * Check balm-shared integration
   */
  async _checkBalmSharedIntegration(projectPath, packageJson) {
    const integration = {
      hasDependency: false,
      hasAlias: false
    };

    // Check package.json dependencies
    if (packageJson) {
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };
      integration.hasDependency = Object.keys(allDeps).some(dep =>
        dep.includes(this.sharedLibraryName)
      );
    }

    // Check balm.alias.js
    const aliasPath = path.join(projectPath, 'balm.alias.js');
    if (this.fileHandler.exists(aliasPath)) {
      try {
        const aliasContent = await this.fileHandler.readFile(aliasPath);
        integration.hasAlias = aliasContent.includes(this.sharedLibraryName);
      } catch (error) {
        // Ignore read errors
      }
    }

    return integration;
  }

  /**
   * Generate recommendations
   */
  _generateRecommendations(analysis) {
    const recommendations = [];

    if (!analysis.hasBalmShared && analysis.projectType === 'frontend') {
      recommendations.push({
        type: 'integration',
        message: `Consider adding ${this.sharedLibraryName} integration for component reuse`
      });
    }

    if (analysis.structure && !analysis.structure.hasTests) {
      recommendations.push({
        type: 'testing',
        message: 'Add testing setup to improve code quality'
      });
    }

    if (analysis.structure && !analysis.structure.hasReadme) {
      recommendations.push({
        type: 'documentation',
        message: 'Add README documentation for better project understanding'
      });
    }

    return recommendations;
  }

  /**
   * Validate project structure
   */
  _validateProjectStructure(analysis) {
    const issues = [];

    if (!analysis.structure.hasPackageJson) {
      issues.push('Missing package.json file');
    }

    if (!analysis.structure.hasSrc) {
      issues.push('Missing src directory');
    }

    return issues;
  }

  /**
   * Analyze configuration files
   */
  async _analyzeConfiguration(projectPath) {
    const config = {
      hasBalmConfig: false,
      hasVueConfig: false
    };

    const balmConfigPath = path.join(projectPath, 'balm.config.js');
    if (this.fileHandler.exists(balmConfigPath)) {
      config.hasBalmConfig = true;
    }

    const vueConfigPath = path.join(projectPath, 'vue.config.js');
    if (this.fileHandler.exists(vueConfigPath)) {
      config.hasVueConfig = true;
    }

    return config;
  }

  /**
   * Analyze dependencies
   */
  _analyzeDependencies(packageJson) {
    const deps = {
      hasBalmShared: false
    };

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    // Check for balm-shared
    deps.hasBalmShared = Object.keys(allDeps).some(dep => dep.includes(this.sharedLibraryName));

    // Add individual dependency info
    Object.keys(allDeps).forEach(depName => {
      deps[depName] = {
        version: allDeps[depName],
        type:
          packageJson.dependencies && packageJson.dependencies[depName]
            ? 'production'
            : 'development'
      };
    });

    return deps;
  }

  /**
   * Generate optimization recommendations
   */
  generateOptimizationRecommendations(analysis) {
    const recommendations = [];

    // Structure recommendations
    if (!analysis.isBalmJSProject) {
      recommendations.push({
        type: 'structure',
        priority: 'high',
        message: 'Convert to BalmJS project structure',
        description: 'Initialize proper BalmJS directory structure and configuration',
        action: 'init_balm_project'
      });
    }

    // shared-project integration recommendations
    if (!analysis.hasBalmSharedIntegration) {
      recommendations.push({
        type: 'integration',
        priority: 'medium',
        message: 'Add shared-project integration',
        description: 'Configure shared-project library for component reuse',
        action: 'setup_shared_project'
      });
    }

    // Package.json recommendations
    if (analysis.packageInfo) {
      if (!analysis.packageInfo.scripts || !analysis.packageInfo.scripts.dev) {
        recommendations.push({
          type: 'scripts',
          priority: 'low',
          message: 'Add development scripts',
          description: 'Add npm scripts for development workflow',
          action: 'add_dev_scripts'
        });
      }
    }

    return recommendations;
  }

  /**
   * Check if package.json has yiban-shared references (alias for hasBalmSharedReferences)
   */
  hasYibanSharedReferences(packageJson) {
    return this.hasBalmSharedReferences(packageJson);
  }

  /**
   * Check yiban-shared integration
   */
  async checkYibanSharedIntegration(projectPath) {
    const integration = {
      isIntegrated: false,
      methods: [],
      recommendations: []
    };

    try {
      // Check package.json
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (this.fileHandler.exists(packageJsonPath)) {
        const packageContent = await this.fileHandler.readFile(packageJsonPath);
        const packageJson = JSON.parse(packageContent);

        if (this.hasYibanSharedReferences(packageJson)) {
          integration.isIntegrated = true;
          integration.methods.push('package.json dependencies');
        }
      }

      // Check balm.config.js
      const balmConfigPath = path.join(projectPath, 'balm.config.js');
      if (this.fileHandler.exists(balmConfigPath)) {
        const configContent = await this.fileHandler.readFile(balmConfigPath);
        if (this.hasBalmSharedConfig(configContent)) {
          integration.isIntegrated = true;
          integration.methods.push('balm.config.js configuration');
        }
      }

      // Check shared library directory
      const sharedLibPath = path.join(projectPath, this.sharedLibraryName);
      if (this.fileHandler.exists(sharedLibPath) && this.fileHandler.isDirectory(sharedLibPath)) {
        integration.isIntegrated = true;
        integration.methods.push(`${this.sharedLibraryName} directory`);
      }

      if (!integration.isIntegrated) {
        integration.recommendations.push(
          `Consider integrating ${this.sharedLibraryName} for better development experience`
        );
      }

      return integration;
    } catch (error) {
      return {
        isIntegrated: false,
        methods: [],
        recommendations: ['Failed to check integration'],
        error: error.message
      };
    }
  }
}
