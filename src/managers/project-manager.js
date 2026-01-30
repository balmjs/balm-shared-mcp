/**
 * Project Manager
 *
 * Handles project scaffolding creation and project structure analysis.
 */

import path from 'path';
import { logger } from '../utils/logger.js';
import { BalmSharedMCPError, ErrorCodes } from '../utils/errors.js';

export class ProjectManager {
  constructor(fileSystemHandler, config) {
    this.fileSystemHandler = fileSystemHandler;
    this.config = config;
    // Workspace root for resolving reference projects
    this.workspaceRoot = config.workspaceRoot || './';
    // Built-in scaffolding templates (fallback)
    this.builtInTemplatesPath = path.join(process.cwd(), 'examples');
    // Configurable shared library name (allows company customization)
    this.sharedLibraryName = config.sharedLibraryName || 'my-shared';
  }

  /**
   * Get the configured shared library name
   */
  getSharedLibraryName() {
    return this.sharedLibraryName;
  }

  /**
   * Get built-in project templates (maps to balm init template names)
   */
  getBuiltInTemplates() {
    return {
      frontend: {
        name: 'vue-ui-front',
        description: 'Vue.js frontend project with router and basic components',
        command: 'vue-ui-front',
        type: 'frontend'
      },
      backend: {
        name: 'vue-ui-back',
        description: 'Vue.js backend project with authentication, menu, and CRUD functionality',
        command: 'vue-ui-back',
        type: 'backend'
      }
    };
  }

  /**
   * Get available project templates (legacy compatibility)
   */
  getAvailableTemplates() {
    const templates = this.getBuiltInTemplates();
    return {
      'frontend-project': templates.frontend,
      'backend-project': templates.backend
    };
  }

  /**
   * Validate project creation options
   */
  validateProjectOptions(options) {
    const { name, type, path: projectPath } = options;

    if (!name || typeof name !== 'string') {
      throw new BalmSharedMCPError(
        ErrorCodes.VALIDATION_FAILED,
        'Project name is required and must be a string'
      );
    }

    if (!type || !['frontend', 'backend'].includes(type)) {
      throw new BalmSharedMCPError(
        ErrorCodes.VALIDATION_FAILED,
        'Project type must be either "frontend" or "backend"'
      );
    }

    if (!projectPath || typeof projectPath !== 'string') {
      throw new BalmSharedMCPError(
        ErrorCodes.VALIDATION_FAILED,
        'Project path is required and must be a string'
      );
    }

    // Check if target directory already exists
    if (this.fileSystemHandler.exists(projectPath)) {
      throw new BalmSharedMCPError(
        ErrorCodes.PROJECT_CREATION_FAILED,
        `Target directory already exists: ${projectPath}`
      );
    }

    return true;
  }

  /**
   * Resolve template info for project creation
   * Priority:
   * 1. referenceProject (absolute path or relative to workspaceRoot) - copy mode
   * 2. Built-in template for the specified type - balm init mode
   *
   * @returns {Object} Template info with either 'path' (copy mode) or 'command' (balm init mode)
   */
  resolveTemplateInfo(type, referenceProject) {
    // If referenceProject is specified, use copy mode
    if (referenceProject) {
      let refPath = referenceProject;

      // If not absolute path, resolve relative to workspaceRoot
      if (!path.isAbsolute(referenceProject)) {
        refPath = path.join(this.workspaceRoot, referenceProject);
      }

      if (!this.fileSystemHandler.exists(refPath)) {
        throw new BalmSharedMCPError(
          ErrorCodes.TEMPLATE_NOT_FOUND,
          `Reference project not found: ${refPath}`
        );
      }

      logger.info(`Using reference project (copy mode): ${refPath}`);
      return {
        mode: 'copy',
        path: refPath,
        name: path.basename(refPath)
      };
    }

    // Use built-in template via balm init
    const templates = this.getBuiltInTemplates();
    const template = templates[type];

    if (!template) {
      throw new BalmSharedMCPError(
        ErrorCodes.TEMPLATE_NOT_FOUND,
        `Template not found for project type: ${type}. Available types: frontend, backend`
      );
    }

    logger.info(`Using balm init template: ${template.command}`);
    return {
      mode: 'balm-init',
      command: template.command,
      name: template.name,
      description: template.description
    };
  }

  /**
   * Get template path for project type (legacy compatibility)
   * @deprecated Use resolveTemplateInfo instead
   */
  getTemplatePath(type, referenceProject = null) {
    const info = this.resolveTemplateInfo(type, referenceProject);
    return info.path || info.command;
  }

  /**
   * Prepare template variables for project creation
   */
  prepareTemplateVariables(options) {
    const { name, type, apiEndpoint, sharedProjectPath, author, description } = options;

    return {
      projectName: name,
      projectType: type,
      projectDescription: description || `A Vue.js ${type} project`,
      projectAuthor: author || 'Developer',
      apiEndpoint: apiEndpoint || '/api',
      sharedProjectPath: sharedProjectPath || `../${this.sharedLibraryName}`,
      // Add timestamp for unique identifiers
      timestamp: Date.now(),
      // Add current date
      currentDate: new Date().toISOString().split('T')[0]
    };
  }

  /**
   * Copy template files with variable substitution
   */
  async copyTemplate(templatePath, targetPath, variables) {
    try {
      logger.info(`Copying template from ${templatePath} to ${targetPath}`);

      await this.fileSystemHandler.copyDirectory(templatePath, targetPath, variables, {
        processTemplates: true
      });

      logger.info(`Template copied successfully to ${targetPath}`);
    } catch (error) {
      throw new BalmSharedMCPError(
        ErrorCodes.PROJECT_CREATION_FAILED,
        `Failed to copy template: ${error.message}`,
        { templatePath, targetPath, originalError: error }
      );
    }
  }

  /**
   * Run balm init command to create project from official template
   * @param {string} templateName - Template name (e.g., 'vue-ui-front', 'vue-ui-back')
   * @param {string} projectName - Project name
   * @param {string} targetDir - Directory to create project in (parent directory)
   */
  async runBalmInit(templateName, projectName, targetDir) {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    // Check if balm-cli is installed
    try {
      await execAsync('balm --version');
    } catch (error) {
      throw new BalmSharedMCPError(
        ErrorCodes.PROJECT_CREATION_FAILED,
        'balm-cli is not installed. Please install it globally using: npm install -g balm-cli',
        { originalError: error }
      );
    }

    try {
      logger.info(`Running: balm init ${templateName} ${projectName} in ${targetDir}`);

      // Ensure target directory exists
      if (!this.fileSystemHandler.exists(targetDir)) {
        await this.fileSystemHandler.mkdir(targetDir, { recursive: true });
      }

      const { stdout, stderr } = await execAsync(`balm init ${templateName} ${projectName}`, {
        cwd: targetDir,
        timeout: 60000, // 60 second timeout
        // Use CI=true for non-interactive mode if supported, or ensure commands don't prompt
        env: { ...process.env, CI: 'true' }
      });

      if (stderr && !stderr.includes('npm WARN')) {
        logger.warn(`balm init stderr: ${stderr}`);
      }

      logger.info(`balm init completed: ${stdout}`);
      return { success: true, output: stdout };
    } catch (error) {
      // Enhance error message if it looks like a missing command issue (double check)
      if (error.message.includes('command not found') || error.code === 127) {
        throw new BalmSharedMCPError(
          ErrorCodes.PROJECT_CREATION_FAILED,
          'Failed to run "balm init". Please ensure balm-cli is installed globally: npm install -g balm-cli',
          { originalError: error }
        );
      }

      throw new BalmSharedMCPError(
        ErrorCodes.PROJECT_CREATION_FAILED,
        `Failed to run balm init: ${error.message}`,
        { templateName, projectName, targetDir, originalError: error }
      );
    }
  }

  /**
   * Update package.json with project-specific information
   */
  async updatePackageJson(projectPath, options) {
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      const { name, description, author } = options;

      const updates = {
        name,
        description: description || `A Vue.js ${options.type} project`,
        author: author || 'Developer'
      };

      await this.fileSystemHandler.updateJsonFile(packageJsonPath, updates);
      logger.info(`Updated package.json for project: ${name}`);
    } catch (error) {
      throw new BalmSharedMCPError(
        ErrorCodes.PROJECT_CREATION_FAILED,
        `Failed to update package.json: ${error.message}`,
        { projectPath, originalError: error }
      );
    }
  }

  /**
   * Configure shared-project integration
   */
  async configureSharedProjectIntegration(projectPath, options) {
    try {
      const { sharedProjectPath = `../${this.sharedLibraryName}` } = options;

      // Update env.js to point to correct shared-project path
      const envPath = path.join(projectPath, 'config', 'env.js');
      if (this.fileSystemHandler.exists(envPath)) {
        const envContent = await this.fileSystemHandler.readFile(envPath);

        // Replace the globalWorkspace path if needed
        const updatedContent = envContent.replace(
          /const globalWorkspace = path\.join\(localWorkspace, '\.\.'\);/,
          `const globalWorkspace = path.join(localWorkspace, '${sharedProjectPath}');`
        );

        await this.fileSystemHandler.writeFile(envPath, updatedContent);
        logger.info(`Updated shared-project path in env.js: ${sharedProjectPath}`);
      }

      // Ensure balm.alias.js references the correct shared-project path
      const aliasPath = path.join(projectPath, 'config', 'balm.alias.js');
      if (this.fileSystemHandler.exists(aliasPath)) {
        logger.info('shared-project alias configuration already exists in balm.alias.js');
      }
    } catch (error) {
      throw new BalmSharedMCPError(
        ErrorCodes.PROJECT_CREATION_FAILED,
        `Failed to configure shared-project integration: ${error.message}`,
        { projectPath, originalError: error }
      );
    }
  }

  /**
   * Configure API endpoint and proxy settings
   */
  async configureApiSettings(projectPath, options) {
    try {
      const {
        apiEndpoint = '/api',
        proxyTarget = 'http://your.project.dev',
        proxyChangeOrigin = true
      } = options;

      const balmrcPath = path.join(projectPath, 'config', 'balmrc.js');

      if (this.fileSystemHandler.exists(balmrcPath)) {
        const balmrcContent = await this.fileSystemHandler.readFile(balmrcPath);

        // Update proxy configuration
        let updatedContent = balmrcContent.replace(/context: '\/api'/, `context: '${apiEndpoint}'`);

        updatedContent = updatedContent.replace(
          /target: 'http:\/\/your\.project\.dev'/,
          `target: '${proxyTarget}'`
        );

        updatedContent = updatedContent.replace(
          /changeOrigin: true/,
          `changeOrigin: ${proxyChangeOrigin}`
        );

        await this.fileSystemHandler.writeFile(balmrcPath, updatedContent);
        logger.info(`Updated API configuration in balmrc.js: ${apiEndpoint} -> ${proxyTarget}`);
      }
    } catch (error) {
      throw new BalmSharedMCPError(
        ErrorCodes.PROJECT_CREATION_FAILED,
        `Failed to configure API settings: ${error.message}`,
        { projectPath, originalError: error }
      );
    }
  }

  /**
   * Update package.json dependencies and scripts
   */
  async updatePackageDependencies(projectPath, options) {
    try {
      const { dependencies = {}, devDependencies = {}, scripts = {} } = options;

      const packageJsonPath = path.join(projectPath, 'package.json');

      if (this.fileSystemHandler.exists(packageJsonPath)) {
        const packageContent = await this.fileSystemHandler.readFile(packageJsonPath);
        const packageData = JSON.parse(packageContent);

        // Merge dependencies
        if (Object.keys(dependencies).length > 0) {
          packageData.dependencies = { ...packageData.dependencies, ...dependencies };
        }

        // Merge devDependencies
        if (Object.keys(devDependencies).length > 0) {
          packageData.devDependencies = { ...packageData.devDependencies, ...devDependencies };
        }

        // Merge scripts
        if (Object.keys(scripts).length > 0) {
          packageData.scripts = { ...packageData.scripts, ...scripts };
        }

        const updatedContent = JSON.stringify(packageData, null, 2);
        await this.fileSystemHandler.writeFile(packageJsonPath, updatedContent);

        logger.info('Updated package.json dependencies and scripts');
      }
    } catch (error) {
      throw new BalmSharedMCPError(
        ErrorCodes.PROJECT_CREATION_FAILED,
        `Failed to update package dependencies: ${error.message}`,
        { projectPath, originalError: error }
      );
    }
  }

  /**
   * Configure shared-project alias and includeJsResource
   */
  async configureSharedProjectAlias(projectPath, options) {
    try {
      const {
        sharedProjectPath: _sharedProjectPath = `../${this.sharedLibraryName}`,
        customAliases = {}
      } = options;

      // Update balm.alias.js
      const aliasPath = path.join(projectPath, 'config', 'balm.alias.js');
      if (this.fileSystemHandler.exists(aliasPath)) {
        const aliasContent = await this.fileSystemHandler.readFile(aliasPath);

        // Add custom aliases if provided
        if (Object.keys(customAliases).length > 0) {
          const aliasEntries = Object.entries(customAliases)
            .map(([key, value]) => `  '${key}': '${value}'`)
            .join(',\n');

          const updatedContent = aliasContent.replace(
            /module\.exports = {/,
            `module.exports = {\n${aliasEntries},`
          );

          await this.fileSystemHandler.writeFile(aliasPath, updatedContent);
          logger.info('Added custom aliases to balm.alias.js');
        }
      }

      // Ensure balmrc.js has correct includeJsResource configuration
      const balmrcPath = path.join(projectPath, 'config', 'balmrc.js');
      if (this.fileSystemHandler.exists(balmrcPath)) {
        const balmrcContent = await this.fileSystemHandler.readFile(balmrcPath);

        // Verify includeJsResource is correctly configured
        if (!balmrcContent.includes('includeJsResource')) {
          const updatedContent = balmrcContent.replace(
            /alias$/m,
            `alias,\n    includeJsResource: [globalResolve('${this.sharedLibraryName}/src/scripts')]`
          );

          await this.fileSystemHandler.writeFile(balmrcPath, updatedContent);
          logger.info('Added includeJsResource configuration to balmrc.js');
        }
      }
    } catch (error) {
      throw new BalmSharedMCPError(
        ErrorCodes.PROJECT_CREATION_FAILED,
        `Failed to configure shared-project alias: ${error.message}`,
        { projectPath, originalError: error }
      );
    }
  }

  /**
   * Configure Balm shared alias (standalone method for testing)
   */
  async configureBalmSharedAlias(projectPath, options) {
    return this.configureSharedProjectAlias(projectPath, options);
  }

  /**
   * Generate project configuration files
   */
  async generateProjectConfiguration(projectPath, options) {
    try {
      logger.info(`Generating project configuration for: ${projectPath}`);

      // Configure API settings
      await this.configureApiSettings(projectPath, options);

      // Update package.json dependencies
      await this.updatePackageDependencies(projectPath, options);

      // Configure shared-project alias
      await this.configureSharedProjectAlias(projectPath, options);

      logger.info('Project configuration generated successfully');
    } catch (error) {
      throw new BalmSharedMCPError(
        ErrorCodes.PROJECT_CREATION_FAILED,
        `Failed to generate project configuration: ${error.message}`,
        { projectPath, originalError: error }
      );
    }
  }

  /**
   * Create a new project based on template or reference project
   *
   * @param {Object} options - Project creation options
   * @param {string} options.name - Project name (required)
   * @param {string} options.type - Project type: 'frontend' or 'backend' (required)
   * @param {string} options.path - Project path (required)
   * @param {string} [options.referenceProject] - Reference project path (optional)
   *   Can be absolute path or relative to WORKSPACE_ROOT
   */
  async createProject(options) {
    try {
      const { name, type, path: projectPath, referenceProject } = options;

      logger.info(`Creating ${type} project: ${name} at ${projectPath}`);
      if (referenceProject) {
        logger.info(`Using reference project: ${referenceProject}`);
      }

      // Validate input options
      this.validateProjectOptions(options);

      // Resolve template info (determines mode: balm-init or copy)
      const templateInfo = this.resolveTemplateInfo(type, referenceProject);

      let templateName;

      if (templateInfo.mode === 'balm-init') {
        // Use balm init command to create project
        const targetDir = path.dirname(projectPath);
        await this.runBalmInit(templateInfo.command, name, targetDir);
        templateName = templateInfo.command;

        // After balm init, the project is created, but we may still need to configure it
        // Note: balm init already sets up the project, so some steps may be skipped
      } else {
        // Copy mode: use reference project as template
        const variables = this.prepareTemplateVariables(options);
        await this.copyTemplate(templateInfo.path, projectPath, variables);
        templateName = templateInfo.name;

        // Update package.json with project-specific information
        await this.updatePackageJson(projectPath, options);

        // Configure shared-project integration
        await this.configureSharedProjectIntegration(projectPath, options);

        // Generate additional project configuration
        await this.generateProjectConfiguration(projectPath, options);
      }

      const result = {
        success: true,
        message: `Project ${name} created successfully`,
        projectPath,
        type,
        template: templateName,
        mode: templateInfo.mode,
        referenceProject: referenceProject || null,
        features: this.getProjectFeatures(type),
        nextSteps: this.getNextSteps(projectPath)
      };

      logger.info(`Project creation completed: ${name}`, result);
      return result;
    } catch (error) {
      if (error instanceof BalmSharedMCPError) {
        throw error;
      }
      throw new BalmSharedMCPError(
        ErrorCodes.PROJECT_CREATION_FAILED,
        `Failed to create project: ${error.message}`,
        { options, originalError: error }
      );
    }
  }

  /**
   * Get project features based on type
   */
  getProjectFeatures(type) {
    const commonFeatures = [
      'Vue.js 2.7',
      'Vue Router',
      'BalmUI components',
      'BalmUI Pro',
      'shared-project integration',
      'ESLint configuration',
      'Jest testing setup',
      'Mock server with MirageJS'
    ];

    const frontendFeatures = [...commonFeatures, 'Basic routing structure', 'Component examples'];

    const backendFeatures = [
      ...commonFeatures,
      'Authentication system',
      'Menu management',
      'CRUD functionality',
      'User management',
      'Permission control'
    ];

    return type === 'frontend' ? frontendFeatures : backendFeatures;
  }

  /**
   * Get next steps for project setup
   */
  getNextSteps(projectPath) {
    return [
      `cd ${projectPath}`,
      'npm install',
      'npm run dev',
      'Open http://localhost:3000 in your browser'
    ];
  }

  /**
   * Analyze existing project structure
   */
  async analyzeProject(projectPath) {
    try {
      logger.info(`Analyzing project at: ${projectPath}`);

      // Validate project path exists
      if (!this.fileSystemHandler.exists(projectPath)) {
        throw new BalmSharedMCPError(
          ErrorCodes.PROJECT_NOT_FOUND,
          `Project path does not exist: ${projectPath}`
        );
      }

      const analysis = {
        projectPath,
        isValid: false,
        projectType: 'unknown',
        hasSharedProject: false,
        structure: {},
        configuration: {},
        dependencies: {},
        recommendations: [],
        issues: []
      };

      // Check for package.json
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (this.fileSystemHandler.exists(packageJsonPath)) {
        try {
          const packageContent = await this.fileSystemHandler.readFile(packageJsonPath);
          const packageData = JSON.parse(packageContent);

          analysis.dependencies = {
            dependencies: packageData.dependencies || {},
            devDependencies: packageData.devDependencies || {}
          };

          analysis.structure.hasPackageJson = true;
          analysis.structure.projectName = packageData.name;
          analysis.structure.version = packageData.version;
        } catch {
          analysis.issues.push('Invalid package.json format');
        }
      } else {
        analysis.issues.push('Missing package.json file');
      }

      // Analyze project structure
      await this.analyzeProjectStructure(projectPath, analysis);

      // Detect project type
      this.detectProjectType(analysis);

      // Check shared-project integration
      await this.checkSharedProjectIntegration(projectPath, analysis);

      // Analyze configuration files
      await this.analyzeConfiguration(projectPath, analysis);

      // Generate recommendations
      this.generateRecommendations(analysis);

      // Determine if project is valid
      analysis.isValid =
        analysis.issues.length === 0 ||
        analysis.issues.every(issue => !issue.includes('Missing package.json'));

      logger.info(`Project analysis completed for: ${projectPath}`, {
        isValid: analysis.isValid,
        projectType: analysis.projectType,
        hasSharedProject: analysis.hasSharedProject,
        issueCount: analysis.issues.length
      });

      return analysis;
    } catch (error) {
      if (error instanceof BalmSharedMCPError) {
        throw error;
      }
      throw new BalmSharedMCPError(
        ErrorCodes.PROJECT_ANALYSIS_FAILED,
        `Failed to analyze project: ${error.message}`,
        { projectPath, originalError: error }
      );
    }
  }

  /**
   * Analyze project directory structure
   */
  async analyzeProjectStructure(projectPath, analysis) {
    const { structure } = analysis;

    // Check for common directories
    const commonDirs = ['src', 'config', 'public', 'dist', 'build', 'node_modules'];
    for (const dir of commonDirs) {
      const dirPath = path.join(projectPath, dir);
      structure[`has${dir.charAt(0).toUpperCase() + dir.slice(1)}`] =
        this.fileSystemHandler.exists(dirPath);
    }

    // Check for Vue.js specific files
    structure.hasVueConfig = this.fileSystemHandler.exists(path.join(projectPath, 'vue.config.js'));
    structure.hasViteConfig = this.fileSystemHandler.exists(
      path.join(projectPath, 'vite.config.js')
    );

    // Check for build configuration
    structure.hasBalmConfig = this.fileSystemHandler.exists(
      path.join(projectPath, 'config', 'balmrc.js')
    );
    structure.hasWebpackConfig = this.fileSystemHandler.exists(
      path.join(projectPath, 'webpack.config.js')
    );

    // Check for testing setup
    structure.hasJestConfig = this.fileSystemHandler.exists(
      path.join(projectPath, 'jest.config.js')
    );
    structure.hasTestDir =
      this.fileSystemHandler.exists(path.join(projectPath, 'test')) ||
      this.fileSystemHandler.exists(path.join(projectPath, 'tests')) ||
      this.fileSystemHandler.exists(path.join(projectPath, '__tests__'));

    // Check for linting
    structure.hasEslintConfig =
      this.fileSystemHandler.exists(path.join(projectPath, '.eslintrc.js')) ||
      this.fileSystemHandler.exists(path.join(projectPath, '.eslintrc.json'));

    // Check for TypeScript
    structure.hasTsConfig = this.fileSystemHandler.exists(path.join(projectPath, 'tsconfig.json'));
  }

  /**
   * Detect project type based on structure and dependencies
   */
  detectProjectType(analysis) {
    const { dependencies, structure } = analysis;
    const allDeps = {
      ...(dependencies.dependencies || {}),
      ...(dependencies.devDependencies || {})
    };

    // Check for Vue.js
    const hasVue = 'vue' in allDeps || 'vue-router' in allDeps;

    // Check for backend-specific dependencies
    const hasBackendDeps =
      'balm-ui-pro' in allDeps || (structure.hasSrc && this.hasBackendStructure(structure));

    if (hasVue && hasBackendDeps) {
      analysis.projectType = 'backend';
    } else if (hasVue) {
      analysis.projectType = 'frontend';
    } else if ('react' in allDeps) {
      analysis.projectType = 'react';
    } else if ('angular' in allDeps || '@angular/core' in allDeps) {
      analysis.projectType = 'angular';
    } else if (structure.hasPackageJson) {
      analysis.projectType = 'javascript';
    }
  }

  /**
   * Check if project has backend-like structure
   */
  hasBackendStructure(structure) {
    // This is a simplified check - in a real implementation,
    // you might check for specific directories or files
    return structure.hasSrc && structure.hasConfig;
  }

  /**
   * Check shared-project integration
   */
  async checkSharedProjectIntegration(projectPath, analysis) {
    const { dependencies } = analysis;

    // Check if shared-project is in dependencies
    const hasSharedProjectDep =
      (dependencies.dependencies && this.sharedLibraryName in dependencies.dependencies) ||
      (dependencies.devDependencies && this.sharedLibraryName in dependencies.devDependencies);

    // Check for shared-project alias configuration
    const aliasPath = path.join(projectPath, 'config', 'balm.alias.js');
    let hasSharedProjectAlias = false;

    if (this.fileSystemHandler.exists(aliasPath)) {
      try {
        const aliasContent = await this.fileSystemHandler.readFile(aliasPath);
        hasSharedProjectAlias =
          aliasContent.includes(this.sharedLibraryName) ||
          aliasContent.includes('shared-project') ||
          aliasContent.includes(`../${this.sharedLibraryName}`);
      } catch {
        analysis.issues.push('Unable to read balm.alias.js configuration');
      }
    }

    // Check for shared-project imports in source files - improved logic
    let hasSharedProjectImports = false;
    const srcPath = path.join(projectPath, 'src');
    if (this.fileSystemHandler.exists(srcPath)) {
      // Check if there are any references to shared project in common locations
      const commonFiles = ['main.js', 'app.js', 'index.js'];
      for (const file of commonFiles) {
        const filePath = path.join(srcPath, file);
        if (this.fileSystemHandler.exists(filePath)) {
          try {
            const content = await this.fileSystemHandler.readFile(filePath);
            if (content.includes(this.sharedLibraryName) || content.includes('shared-project')) {
              hasSharedProjectImports = true;
              break;
            }
          } catch {
            // Continue checking other files
          }
        }
      }
    }

    analysis.hasSharedProject =
      hasSharedProjectDep || hasSharedProjectAlias || hasSharedProjectImports;

    analysis.configuration.sharedProjectIntegration = {
      hasDependency: hasSharedProjectDep,
      hasAlias: hasSharedProjectAlias,
      hasImports: hasSharedProjectImports
    };
  }

  /**
   * Analyze configuration files
   */
  async analyzeConfiguration(projectPath, analysis) {
    const config = analysis.configuration;

    // Analyze balm configuration
    const balmrcPath = path.join(projectPath, 'config', 'balmrc.js');
    if (this.fileSystemHandler.exists(balmrcPath)) {
      try {
        const balmrcContent = await this.fileSystemHandler.readFile(balmrcPath);
        config.hasBalmConfig = true;
        config.balmConfig = {
          hasProxy: balmrcContent.includes('proxy'),
          hasAlias: balmrcContent.includes('alias'),
          hasIncludeJsResource: balmrcContent.includes('includeJsResource')
        };
      } catch {
        analysis.issues.push('Unable to read balmrc.js configuration');
      }
    }

    // Analyze environment configuration
    const envPath = path.join(projectPath, 'config', 'env.js');
    if (this.fileSystemHandler.exists(envPath)) {
      config.hasEnvConfig = true;
    }

    // Check for mock server configuration
    const mockPath = path.join(projectPath, 'mock');
    config.hasMockServer = this.fileSystemHandler.exists(mockPath);
  }

  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations(analysis) {
    const { recommendations } = analysis;

    // Package.json recommendations
    if (!analysis.structure.hasPackageJson) {
      recommendations.push({
        type: 'critical',
        message: 'Initialize package.json with npm init',
        action: 'npm init -y'
      });
    }

    // shared-project integration recommendations
    if (!analysis.hasSharedProject && analysis.projectType === 'frontend') {
      recommendations.push({
        type: 'suggestion',
        message: `Consider integrating ${this.sharedLibraryName} for enhanced UI components`,
        action: `Add ${this.sharedLibraryName} dependency and configure aliases`
      });
    }

    // Build configuration recommendations
    if (analysis.projectType === 'frontend' && !analysis.configuration.hasBalmConfig) {
      recommendations.push({
        type: 'suggestion',
        message: 'Configure BalmJS for better build process',
        action: 'Add balmrc.js configuration file'
      });
    }

    // Testing recommendations
    if (!analysis.structure.hasTestDir && !analysis.structure.hasJestConfig) {
      recommendations.push({
        type: 'suggestion',
        message: 'Set up testing framework',
        action: 'Configure Jest and create test directory'
      });
    }

    // Linting recommendations
    if (!analysis.structure.hasEslintConfig) {
      recommendations.push({
        type: 'suggestion',
        message: 'Set up ESLint for code quality',
        action: 'Add .eslintrc.js configuration'
      });
    }

    // Project structure recommendations
    if (!analysis.structure.hasSrc) {
      recommendations.push({
        type: 'warning',
        message: 'Missing src directory - consider organizing source code',
        action: 'Create src directory and move source files'
      });
    }
  }
}
