/**
 * Pseudo-AST Handler
 *
 * Provides safe, structured injection of imports and array elements
 * without the full overhead of Babel/jscodeshift.
 */

import { logger } from '../utils/logger.js';
import { BalmSharedMCPError, ErrorCodes } from '../utils/errors.js';

export class ASTHandler {
  constructor(fileSystemHandler) {
    this.fileSystemHandler = fileSystemHandler;
  }

  /**
   * Safe import insertion
   * Inserts an import statement after the last existing import, or at the top of the file.
   */
  async insertImport(filePath, importStatement) {
    try {
      const content = await this.fileSystemHandler.readFile(filePath);

      // If already imported, do nothing
      const importSource = importStatement.match(/from\s+['"]([^'"]+)['"]/);
      if (importSource && content.includes(importSource[1])) {
        logger.debug(`Import from ${importSource[1]} already exists in ${filePath}`);
        return true;
      }

      const lines = content.split('\n');
      let lastImportIndex = -1;

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('import ')) {
          lastImportIndex = i;
        }
      }

      lines.splice(lastImportIndex + 1, 0, importStatement);
      await this.fileSystemHandler.writeFile(filePath, lines.join('\n'));

      logger.info(`Successfully inserted import into ${filePath}`);
      return true;
    } catch (error) {
      throw new BalmSharedMCPError(
        ErrorCodes.FILE_OPERATION_FAILED,
        `AST injection failed: ${error.message}`
      );
    }
  }

  /**
   * Expands a named array (e.g. `apis: []` or `export const routes = []`)
   */
  async expandArray(filePath, arrayName, newElement) {
    try {
      let content = await this.fileSystemHandler.readFile(filePath);

      // Try to find array assignment: arrayName: [...] or arrayName = [...]
      const regex = new RegExp(`(?:${arrayName}\\s*[:=]\\s*\\[)([^]*?)(?=\\])`);
      const match = content.match(regex);

      if (match) {
        // Check if element already exists
        if (match[1].includes(newElement)) {
          return true;
        }

        const innerContent = match[1].trim();
        const separator = innerContent && !innerContent.endsWith(',') ? ',\n    ' : '\n    ';
        const newInnerContent = innerContent
          ? `${innerContent}${separator}${newElement}`
          : `\n    ${newElement}`;

        content = content.replace(
          regex,
          `${arrayName}${content.match(new RegExp(`${arrayName}\\s*[:=]`))[0].replace(arrayName, '')}[${newInnerContent}\n  `
        );
        await this.fileSystemHandler.writeFile(filePath, content);
        return true;
      }

      logger.warn(`Could not find array ${arrayName} in ${filePath}`);
      return false;
    } catch (error) {
      throw new BalmSharedMCPError(
        ErrorCodes.FILE_OPERATION_FAILED,
        `AST array expansion failed: ${error.message}`
      );
    }
  }
}
