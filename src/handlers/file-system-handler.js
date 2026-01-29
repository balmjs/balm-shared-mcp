/**
 * File System Handler
 *
 * Handles file system operations with proper error handling and validation.
 * Includes template processing and secure path handling.
 */

import { promises as fs, existsSync, statSync } from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';
import { BalmSharedMCPError, ErrorCodes } from '../utils/errors.js';

export class FileSystemHandler {
  constructor(options = {}) {
    this.encoding = options.encoding || 'utf-8';
    this.allowedExtensions = options.allowedExtensions || [
      '.js',
      '.vue',
      '.json',
      '.md',
      '.scss',
      '.css',
      '.html',
      '.ts'
    ];
    this.restrictedPaths = options.restrictedPaths || ['node_modules', '.git', '.env'];
  }

  /**
   * Validate and sanitize file path for security
   */
  validatePath(filePath) {
    if (!filePath || typeof filePath !== 'string') {
      throw new BalmSharedMCPError(ErrorCodes.INVALID_PATH, 'Invalid file path provided');
    }

    // Resolve path to prevent directory traversal
    const resolvedPath = path.resolve(filePath);

    // Check for restricted paths
    const normalizedPath = path.normalize(resolvedPath);
    for (const restricted of this.restrictedPaths) {
      if (normalizedPath.includes(restricted)) {
        throw new BalmSharedMCPError(
          ErrorCodes.RESTRICTED_PATH,
          `Access to restricted path not allowed: ${restricted}`
        );
      }
    }

    return resolvedPath;
  }

  /**
   * Check if file extension is allowed
   */
  isAllowedExtension(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return this.allowedExtensions.includes(ext) || ext === '';
  }

  /**
   * Resolve path utility method
   */
  resolvePath(...paths) {
    return path.resolve(...paths);
  }

  /**
   * Join path utility method
   */
  joinPath(...paths) {
    return path.join(...paths);
  }

  /**
   * Check if a path exists
   */
  exists(filePath) {
    return existsSync(filePath);
  }

  /**
   * Check if path is a directory
   */
  isDirectory(filePath) {
    try {
      return this.exists(filePath) && statSync(filePath).isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Check if path is a file
   */
  isFile(filePath) {
    try {
      return this.exists(filePath) && statSync(filePath).isFile();
    } catch {
      return false;
    }
  }

  /**
   * Read file content
   */
  async readFile(filePath) {
    try {
      const validatedPath = this.validatePath(filePath);

      if (!this.exists(validatedPath)) {
        throw new BalmSharedMCPError(ErrorCodes.FILE_NOT_FOUND, `File not found: ${filePath}`);
      }

      const content = await fs.readFile(validatedPath, this.encoding);
      logger.debug(`Read file: ${filePath}`, { size: content.length });
      return content;
    } catch (error) {
      if (error instanceof BalmSharedMCPError) {
        throw error;
      }
      throw new BalmSharedMCPError(
        ErrorCodes.FILE_OPERATION_FAILED,
        `Failed to read file: ${filePath}`,
        { originalError: error.message }
      );
    }
  }

  /**
   * Write file content
   */
  async writeFile(filePath, content) {
    try {
      const validatedPath = this.validatePath(filePath);

      if (!this.isAllowedExtension(validatedPath)) {
        throw new BalmSharedMCPError(
          ErrorCodes.INVALID_FILE_TYPE,
          `File extension not allowed: ${path.extname(validatedPath)}`
        );
      }

      // Ensure directory exists
      const dir = path.dirname(validatedPath);
      await this.ensureDirectory(dir);

      await fs.writeFile(validatedPath, content, this.encoding);
      logger.debug(`Wrote file: ${filePath}`, { size: content.length });
    } catch (error) {
      if (error instanceof BalmSharedMCPError) {
        throw error;
      }
      throw new BalmSharedMCPError(
        ErrorCodes.FILE_OPERATION_FAILED,
        `Failed to write file: ${filePath}`,
        { originalError: error.message }
      );
    }
  }

  /**
   * Ensure directory exists
   */
  async ensureDirectory(dirPath) {
    try {
      if (!this.exists(dirPath)) {
        await fs.mkdir(dirPath, { recursive: true });
        logger.debug(`Created directory: ${dirPath}`);
      }
    } catch (error) {
      throw new BalmSharedMCPError(
        ErrorCodes.FILE_OPERATION_FAILED,
        `Failed to create directory: ${dirPath}`,
        { originalError: error.message }
      );
    }
  }

  /**
   * List directory contents
   */
  async listDirectory(dirPath) {
    try {
      if (!this.exists(dirPath)) {
        throw new BalmSharedMCPError(
          ErrorCodes.DIRECTORY_NOT_FOUND,
          `Directory not found: ${dirPath}`
        );
      }

      const items = await fs.readdir(dirPath, { withFileTypes: true });
      return items.map(item => ({
        name: item.name,
        path: path.join(dirPath, item.name),
        isDirectory: item.isDirectory(),
        isFile: item.isFile()
      }));
    } catch (error) {
      if (error instanceof BalmSharedMCPError) {
        throw error;
      }
      throw new BalmSharedMCPError(
        ErrorCodes.FILE_OPERATION_FAILED,
        `Failed to list directory: ${dirPath}`,
        { originalError: error.message }
      );
    }
  }

  /**
   * Read directory contents (alias for listDirectory for test compatibility)
   */
  async readDirectory(dirPath, options = {}) {
    try {
      if (!this.exists(dirPath)) {
        throw new BalmSharedMCPError(
          ErrorCodes.DIRECTORY_NOT_FOUND,
          `Directory not found: ${dirPath}`
        );
      }

      if (options.withFileTypes) {
        const items = await fs.readdir(dirPath, { withFileTypes: true });
        return items;
      } else {
        return await fs.readdir(dirPath);
      }
    } catch (error) {
      if (error instanceof BalmSharedMCPError) {
        throw error;
      }
      throw new BalmSharedMCPError(
        ErrorCodes.FILE_OPERATION_FAILED,
        `Failed to read directory: ${dirPath}`,
        { originalError: error.message }
      );
    }
  }

  /**
   * Create directory (alias for ensureDirectory for test compatibility)
   */
  async createDirectory(dirPath, options = {}) {
    try {
      const recursive = options.recursive !== false; // Default to true
      await fs.mkdir(dirPath, { recursive });
      logger.debug(`Created directory: ${dirPath}`);
    } catch (error) {
      throw new BalmSharedMCPError(
        ErrorCodes.FILE_OPERATION_FAILED,
        `Failed to create directory: ${dirPath}`,
        { originalError: error.message }
      );
    }
  }

  /**
   * Delete directory
   */
  async deleteDirectory(dirPath, options = {}) {
    try {
      if (!this.exists(dirPath)) {
        logger.warn(`Directory not found for deletion: ${dirPath}`);
        return;
      }

      const recursive = options.recursive === true;
      if (recursive) {
        await fs.rmdir(dirPath, { recursive: true });
      } else {
        await fs.rmdir(dirPath);
      }
      logger.debug(`Deleted directory: ${dirPath}`);
    } catch (error) {
      throw new BalmSharedMCPError(
        ErrorCodes.FILE_OPERATION_FAILED,
        `Failed to delete directory: ${dirPath}`,
        { originalError: error.message }
      );
    }
  }

  /**
   * Copy file
   */
  async copyFile(sourcePath, targetPath) {
    try {
      if (!this.exists(sourcePath)) {
        throw new BalmSharedMCPError(
          ErrorCodes.FILE_NOT_FOUND,
          `Source file not found: ${sourcePath}`
        );
      }

      // Ensure target directory exists
      const targetDir = path.dirname(targetPath);
      await this.ensureDirectory(targetDir);

      await fs.copyFile(sourcePath, targetPath);
      logger.debug(`Copied file: ${sourcePath} -> ${targetPath}`);
    } catch (error) {
      if (error instanceof BalmSharedMCPError) {
        throw error;
      }
      throw new BalmSharedMCPError(
        ErrorCodes.FILE_OPERATION_FAILED,
        `Failed to copy file: ${sourcePath} -> ${targetPath}`,
        { originalError: error.message }
      );
    }
  }

  /**
   * Delete file
   */
  async deleteFile(filePath) {
    try {
      if (!this.exists(filePath)) {
        logger.warn(`File not found for deletion: ${filePath}`);
        return;
      }

      await fs.unlink(filePath);
      logger.debug(`Deleted file: ${filePath}`);
    } catch (error) {
      throw new BalmSharedMCPError(
        ErrorCodes.FILE_OPERATION_FAILED,
        `Failed to delete file: ${filePath}`,
        { originalError: error.message }
      );
    }
  }

  /**
   * Get file stats
   */
  async getStats(filePath) {
    try {
      const validatedPath = this.validatePath(filePath);

      if (!this.exists(validatedPath)) {
        throw new BalmSharedMCPError(ErrorCodes.FILE_NOT_FOUND, `File not found: ${filePath}`);
      }

      const stats = await fs.stat(validatedPath);
      return {
        size: stats.size,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        modified: stats.mtime,
        created: stats.birthtime
      };
    } catch (error) {
      if (error instanceof BalmSharedMCPError) {
        throw error;
      }
      throw new BalmSharedMCPError(
        ErrorCodes.FILE_OPERATION_FAILED,
        `Failed to get file stats: ${filePath}`,
        { originalError: error.message }
      );
    }
  }

  /**
   * Process template content with variable substitution
   */
  processTemplate(templateContent, variables = {}) {
    try {
      let processedContent = templateContent;

      // Replace template variables in format {{variableName}}
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        processedContent = processedContent.replace(regex, value);
      }

      // Replace template variables in format ${variableName}
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\$\\{\\s*${key}\\s*\\}`, 'g');
        processedContent = processedContent.replace(regex, value);
      }

      logger.debug('Processed template', {
        variableCount: Object.keys(variables).length,
        contentLength: processedContent.length
      });

      return processedContent;
    } catch (error) {
      throw new BalmSharedMCPError(
        ErrorCodes.TEMPLATE_RENDER_FAILED,
        'Failed to process template content',
        { originalError: error.message }
      );
    }
  }

  /**
   * Read and process template file
   */
  async readTemplate(templatePath, variables = {}) {
    try {
      const validatedPath = this.validatePath(templatePath);
      const templateContent = await this.readFile(validatedPath);
      return this.processTemplate(templateContent, variables);
    } catch (error) {
      if (error instanceof BalmSharedMCPError) {
        throw error;
      }
      throw new BalmSharedMCPError(
        ErrorCodes.TEMPLATE_RENDER_FAILED,
        `Failed to read and process template: ${templatePath}`,
        { originalError: error.message }
      );
    }
  }

  /**
   * Write processed template to file
   */
  async writeTemplate(templatePath, targetPath, variables = {}) {
    try {
      const processedContent = await this.readTemplate(templatePath, variables);
      const validatedTargetPath = this.validatePath(targetPath);

      if (!this.isAllowedExtension(validatedTargetPath)) {
        throw new BalmSharedMCPError(
          ErrorCodes.INVALID_FILE_TYPE,
          `File extension not allowed: ${path.extname(validatedTargetPath)}`
        );
      }

      await this.writeFile(validatedTargetPath, processedContent);
      logger.info(`Template processed and written: ${templatePath} -> ${targetPath}`);
    } catch (error) {
      if (error instanceof BalmSharedMCPError) {
        throw error;
      }
      throw new BalmSharedMCPError(
        ErrorCodes.TEMPLATE_RENDER_FAILED,
        `Failed to write template: ${templatePath} -> ${targetPath}`,
        { originalError: error.message }
      );
    }
  }

  /**
   * Copy directory recursively with template processing
   */
  async copyDirectory(sourcePath, targetPath, variables = {}, options = {}) {
    try {
      const validatedSourcePath = this.validatePath(sourcePath);
      const validatedTargetPath = this.validatePath(targetPath);

      if (!this.exists(validatedSourcePath)) {
        throw new BalmSharedMCPError(
          ErrorCodes.DIRECTORY_NOT_FOUND,
          `Source directory not found: ${sourcePath}`
        );
      }

      if (!this.isDirectory(validatedSourcePath)) {
        throw new BalmSharedMCPError(
          ErrorCodes.INVALID_DIRECTORY,
          `Source path is not a directory: ${sourcePath}`
        );
      }

      await this.ensureDirectory(validatedTargetPath);
      const items = await this.listDirectory(validatedSourcePath);

      for (const item of items) {
        const sourceItemPath = item.path;
        const targetItemPath = path.join(validatedTargetPath, item.name);

        if (item.isDirectory) {
          // Recursively copy subdirectories
          await this.copyDirectory(sourceItemPath, targetItemPath, variables, options);
        } else if (item.isFile) {
          // Process files based on options
          if (options.processTemplates && this.isAllowedExtension(sourceItemPath)) {
            await this.writeTemplate(sourceItemPath, targetItemPath, variables);
          } else {
            await this.copyFile(sourceItemPath, targetItemPath);
          }
        }
      }

      logger.info(`Directory copied: ${sourcePath} -> ${targetPath}`, {
        itemCount: items.length,
        processTemplates: options.processTemplates
      });
    } catch (error) {
      if (error instanceof BalmSharedMCPError) {
        throw error;
      }
      throw new BalmSharedMCPError(
        ErrorCodes.FILE_OPERATION_FAILED,
        `Failed to copy directory: ${sourcePath} -> ${targetPath}`,
        { originalError: error.message }
      );
    }
  }

  /**
   * Create project structure from template
   */
  async createProjectStructure(templatePath, targetPath, projectConfig) {
    try {
      const variables = {
        projectName: projectConfig.name,
        projectType: projectConfig.type,
        apiEndpoint: projectConfig.apiEndpoint || '/api',
        sharedLibraryPath:
          projectConfig.sharedLibraryPath || `../${projectConfig.sharedLibraryName || 'my-shared'}`,
        ...projectConfig.variables
      };

      await this.copyDirectory(templatePath, targetPath, variables, {
        processTemplates: true
      });

      logger.info(`Project structure created: ${targetPath}`, {
        template: templatePath,
        projectName: projectConfig.name,
        projectType: projectConfig.type
      });
    } catch (error) {
      if (error instanceof BalmSharedMCPError) {
        throw error;
      }
      throw new BalmSharedMCPError(
        ErrorCodes.PROJECT_CREATION_FAILED,
        `Failed to create project structure: ${targetPath}`,
        { originalError: error.message }
      );
    }
  }

  /**
   * Update JSON file with new data
   */
  async updateJsonFile(filePath, updates) {
    try {
      const validatedPath = this.validatePath(filePath);
      let existingData = {};

      if (this.exists(validatedPath)) {
        const content = await this.readFile(validatedPath);
        existingData = JSON.parse(content);
      }

      const updatedData = { ...existingData, ...updates };
      const jsonContent = JSON.stringify(updatedData, null, 2);

      await this.writeFile(validatedPath, jsonContent);
      logger.debug(`JSON file updated: ${filePath}`);

      return updatedData;
    } catch (error) {
      if (error instanceof BalmSharedMCPError) {
        throw error;
      }
      throw new BalmSharedMCPError(
        ErrorCodes.FILE_OPERATION_FAILED,
        `Failed to update JSON file: ${filePath}`,
        { originalError: error.message }
      );
    }
  }

  /**
   * Ensure module directory structure exists
   */
  async ensureModuleStructure(projectPath, moduleName) {
    try {
      const validatedProjectPath = this.validatePath(projectPath);

      const directories = [
        path.join(validatedProjectPath, 'app', 'scripts', 'pages', moduleName),
        path.join(validatedProjectPath, 'app', 'scripts', 'apis'),
        path.join(validatedProjectPath, 'app', 'scripts', 'routes'),
        path.join(validatedProjectPath, 'app', 'scripts', 'store', 'model'),
        path.join(validatedProjectPath, 'mock-server', 'modules')
      ];

      for (const dir of directories) {
        await this.ensureDirectory(dir);
      }

      logger.debug(`Module structure ensured for: ${moduleName}`, {
        directories: directories.length
      });
    } catch (error) {
      throw new BalmSharedMCPError(
        ErrorCodes.FILE_OPERATION_FAILED,
        `Failed to ensure module structure: ${moduleName}`,
        { originalError: error.message }
      );
    }
  }
}
