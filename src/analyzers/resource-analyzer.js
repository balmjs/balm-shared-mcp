/**
 * Resource Analyzer
 *
 * Analyzes and queries shared-project resources and provides usage information.
 */

import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';
// import { BalmSharedMCPError, ErrorCodes } from '../utils/errors.js';

export class ResourceAnalyzer {
  constructor(sharedLibraryPath) {
    this.sharedLibraryPath = sharedLibraryPath;
    this.componentsIndex = new Map();
    this.utilsIndex = new Map();
    this.configIndex = new Map();
    this.pluginsIndex = new Map();
    this.examplesIndex = new Map();
    this.isIndexed = false;
  }

  /**
   * Build comprehensive resource index for shared-project
   */
  async buildResourceIndex() {
    logger.info('Building shared-project resource index...');

    try {
      // Index components - continue on individual failures
      try {
        await this._indexComponents();
      } catch (error) {
        logger.warn('Failed to index components:', error.message);
      }

      // Index utilities
      try {
        await this._indexUtils();
      } catch (error) {
        logger.warn('Failed to index utilities:', error.message);
      }

      // Index configurations
      try {
        await this._indexConfigurations();
      } catch (error) {
        logger.warn('Failed to index configurations:', error.message);
      }

      // Index plugins
      try {
        await this._indexPlugins();
      } catch (error) {
        logger.warn('Failed to index plugins:', error.message);
      }

      // Index examples
      try {
        await this._indexExamples();
      } catch (error) {
        logger.warn('Failed to index examples:', error.message);
      }

      this.isIndexed = true;
      logger.info('Resource index built successfully');
    } catch (error) {
      logger.error('Failed to build resource index:', error);
      this.isIndexed = false;
      throw error;
    }
  }

  /**
   * Index Vue components from components and form-components directories
   */
  async _indexComponents() {
    const componentDirs = [
      'src/scripts/components',
      'src/scripts/form-components',
      'src/scripts/chart-components'
    ];

    for (const dir of componentDirs) {
      const fullPath = path.join(this.sharedLibraryPath, dir);

      try {
        await this._scanComponentDirectory(fullPath, dir);
      } catch (error) {
        logger.warn(`Failed to scan component directory ${dir}:`, error.message);
      }
    }
  }

  /**
   * Scan component directory and extract component information
   */
  async _scanComponentDirectory(dirPath, category) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          await this._scanComponentDirectory(fullPath, `${category}/${entry.name}`);
        } else if (entry.name.endsWith('.vue')) {
          // Parse Vue component
          await this._parseVueComponent(fullPath, entry.name, category);
        } else if (entry.name === 'README.md') {
          // Parse component documentation
          await this._parseComponentDocumentation(fullPath, category);
        }
      }
    } catch (error) {
      logger.warn(`Cannot access directory ${dirPath}:`, error.message);
    }
  }

  /**
   * Parse Vue component file to extract props, events, and structure
   */
  async _parseVueComponent(filePath, fileName, category) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const componentName = fileName.replace('.vue', '');

      const componentInfo = {
        name: componentName,
        category,
        filePath,
        props: this._extractProps(content),
        events: this._extractEvents(content),
        mixins: this._extractMixins(content),
        imports: this._extractImports(content),
        template: this._extractTemplate(content),
        documentation: ''
      };

      this.componentsIndex.set(componentName, componentInfo);
      logger.debug(`Indexed component: ${componentName}`);
    } catch (error) {
      logger.warn(`Failed to parse component ${fileName}:`, error.message);
    }
  }

  /**
   * Parse component documentation from README.md files
   */
  async _parseComponentDocumentation(filePath, category) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Extract component documentation sections
      const sections = this._parseMarkdownSections(content);

      // Associate documentation with components
      for (const [componentName, componentInfo] of this.componentsIndex) {
        if (componentInfo.category === category) {
          // Find matching documentation section
          const docSection = sections.find(
            section =>
              section.title.toLowerCase().includes(componentName.toLowerCase()) ||
              section.content.includes(componentName)
          );

          if (docSection) {
            componentInfo.documentation = docSection.content;
            componentInfo.examples = this._extractCodeExamples(docSection.content);
            componentInfo.propsDoc = this._extractPropsDocumentation(docSection.content);
            componentInfo.eventsDoc = this._extractEventsDocumentation(docSection.content);
          }
        }
      }
    } catch (error) {
      logger.warn(`Failed to parse documentation ${filePath}:`, error.message);
    }
  }

  /**
   * Index utility functions
   */
  async _indexUtils() {
    const utilsPath = path.join(this.sharedLibraryPath, 'src/scripts/utils');

    try {
      const entries = await fs.readdir(utilsPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name.endsWith('.js') && entry.name !== 'index.js') {
          const fullPath = path.join(utilsPath, entry.name);
          await this._parseUtilityFile(fullPath, entry.name);
        } else if (entry.name === 'README.md') {
          await this._parseUtilsDocumentation(path.join(utilsPath, entry.name));
        }
      }
    } catch (error) {
      logger.warn('Failed to index utilities:', error.message);
    }
  }

  /**
   * Parse utility JavaScript file
   */
  async _parseUtilityFile(filePath, fileName) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const utilName = fileName.replace('.js', '');

      const utilInfo = {
        name: utilName,
        filePath,
        functions: this._extractFunctions(content),
        exports: this._extractExports(content),
        imports: this._extractImports(content),
        documentation: ''
      };

      this.utilsIndex.set(utilName, utilInfo);
      logger.debug(`Indexed utility: ${utilName}`);
    } catch (error) {
      logger.warn(`Failed to parse utility ${fileName}:`, error.message);
    }
  }

  /**
   * Parse utilities documentation
   */
  async _parseUtilsDocumentation(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Store general utilities documentation
      this.utilsIndex.set('_documentation', {
        name: 'utilities',
        documentation: content,
        examples: this._extractCodeExamples(content)
      });
    } catch (error) {
      logger.warn('Failed to parse utils documentation:', error.message);
    }
  }

  /**
   * Index configuration files
   */
  async _indexConfigurations() {
    const configPath = path.join(this.sharedLibraryPath, 'src/scripts/config');

    try {
      const entries = await fs.readdir(configPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name.endsWith('.js')) {
          const fullPath = path.join(configPath, entry.name);
          await this._parseConfigFile(fullPath, entry.name);
        } else if (entry.name === 'README.md') {
          await this._parseConfigDocumentation(path.join(configPath, entry.name));
        }
      }
    } catch (error) {
      logger.warn('Failed to index configurations:', error.message);
    }
  }

  /**
   * Parse configuration file
   */
  async _parseConfigFile(filePath, fileName) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const configName = fileName.replace('.js', '');

      const configInfo = {
        name: configName,
        filePath,
        exports: this._extractExports(content),
        constants: this._extractConstants(content),
        documentation: ''
      };

      this.configIndex.set(configName, configInfo);
      logger.debug(`Indexed config: ${configName}`);
    } catch (error) {
      logger.warn(`Failed to parse config ${fileName}:`, error.message);
    }
  }

  /**
   * Parse configuration documentation
   */
  async _parseConfigDocumentation(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');

      this.configIndex.set('_documentation', {
        name: 'configurations',
        documentation: content,
        examples: this._extractCodeExamples(content)
      });
    } catch (error) {
      logger.warn('Failed to parse config documentation:', error.message);
    }
  }

  /**
   * Index plugins
   */
  async _indexPlugins() {
    const pluginsPath = path.join(this.sharedLibraryPath, 'src/scripts/plugins');

    try {
      const entries = await fs.readdir(pluginsPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(pluginsPath, entry.name);

        if (entry.isDirectory()) {
          await this._scanPluginDirectory(fullPath, entry.name);
        } else if (entry.name === 'README.md') {
          await this._parsePluginsDocumentation(fullPath);
        }
      }
    } catch (error) {
      logger.warn('Failed to index plugins:', error.message);
    }
  }

  /**
   * Scan plugin directory
   */
  async _scanPluginDirectory(dirPath, pluginName) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      const pluginInfo = {
        name: pluginName,
        dirPath,
        files: [],
        documentation: '',
        examples: []
      };

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.name.endsWith('.js')) {
          const content = await fs.readFile(fullPath, 'utf-8');
          pluginInfo.files.push({
            name: entry.name,
            path: fullPath,
            exports: this._extractExports(content),
            functions: this._extractFunctions(content)
          });
        } else if (entry.name === 'README.md') {
          const content = await fs.readFile(fullPath, 'utf-8');
          pluginInfo.documentation = content;
          pluginInfo.examples = this._extractCodeExamples(content);
        }
      }

      this.pluginsIndex.set(pluginName, pluginInfo);
      logger.debug(`Indexed plugin: ${pluginName}`);
    } catch (error) {
      logger.warn(`Failed to scan plugin directory ${pluginName}:`, error.message);
    }
  }

  /**
   * Parse plugins documentation
   */
  async _parsePluginsDocumentation(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');

      this.pluginsIndex.set('_documentation', {
        name: 'plugins',
        documentation: content,
        examples: this._extractCodeExamples(content)
      });
    } catch (error) {
      logger.warn('Failed to parse plugins documentation:', error.message);
    }
  }

  /**
   * Index example projects
   */
  async _indexExamples() {
    const examplesPath = path.join(this.sharedLibraryPath, 'examples');

    try {
      const entries = await fs.readdir(examplesPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const fullPath = path.join(examplesPath, entry.name);
          await this._scanExampleProject(fullPath, entry.name);
        }
      }
    } catch (error) {
      logger.warn('Failed to index examples:', error.message);
    }
  }

  /**
   * Scan example project
   */
  async _scanExampleProject(dirPath, projectName) {
    try {
      const packageJsonPath = path.join(dirPath, 'package.json');
      let packageInfo = {};

      try {
        const packageContent = await fs.readFile(packageJsonPath, 'utf-8');
        packageInfo = JSON.parse(packageContent);
      } catch (_error) {
        logger.warn(`No package.json found for example ${projectName}`);
      }

      const exampleInfo = {
        name: projectName,
        dirPath,
        packageInfo,
        structure: await this._getDirectoryStructure(dirPath),
        documentation: ''
      };

      this.examplesIndex.set(projectName, exampleInfo);
      logger.debug(`Indexed example: ${projectName}`);
    } catch (error) {
      logger.warn(`Failed to scan example project ${projectName}:`, error.message);
    }
  }

  /**
   * Get directory structure recursively
   */
  async _getDirectoryStructure(dirPath, maxDepth = 3, currentDepth = 0) {
    if (currentDepth >= maxDepth) {
      return [];
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const structure = [];

      for (const entry of entries) {
        if (entry.name.startsWith('.')) {
          continue;
        }

        const item = {
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : 'file',
          path: path.join(dirPath, entry.name)
        };

        if (entry.isDirectory()) {
          item.children = await this._getDirectoryStructure(
            path.join(dirPath, entry.name),
            maxDepth,
            currentDepth + 1
          );
        }

        structure.push(item);
      }

      return structure;
    } catch (_error) {
      return [];
    }
  }

  /**
   * Extract Vue component props from script section
   */
  _extractProps(content) {
    const props = [];

    // Find the props object with better regex
    const propsMatch = content.match(/props:\s*\{([\s\S]*?)\n\s*\}/);

    if (propsMatch) {
      const [, propsContent] = propsMatch;

      // Split by lines and process each prop
      const lines = propsContent.split('\n');
      let currentProp = null;
      let propDefinition = '';

      for (const line of lines) {
        const trimmedLine = line.trim();

        // Check if this line starts a new prop
        const propStartMatch = trimmedLine.match(/^(\w+):\s*\{/);
        if (propStartMatch) {
          // Save previous prop if exists
          if (currentProp) {
            this._parsePropDefinition(currentProp, propDefinition, props);
          }

          currentProp = propStartMatch[1];
          propDefinition = trimmedLine.substring(propStartMatch[0].length);
        } else if (currentProp) {
          propDefinition += ` ${trimmedLine}`;
        }

        // Check if prop definition ends
        if (trimmedLine.includes('}') && currentProp) {
          this._parsePropDefinition(currentProp, propDefinition, props);
          currentProp = null;
          propDefinition = '';
        }
      }
    }

    return props;
  }

  /**
   * Parse individual prop definition
   */
  _parsePropDefinition(propName, definition, props) {
    const typeMatch = definition.match(/type:\s*(\w+)/);
    const defaultMatch = definition.match(/default:\s*([^,}]+)/);

    props.push({
      name: propName,
      type: typeMatch ? typeMatch[1] : 'unknown',
      default: defaultMatch ? defaultMatch[1].trim() : undefined
    });
  }

  /**
   * Extract Vue component events from template and script
   */
  _extractEvents(content) {
    const events = [];
    const eventMatches = content.match(/\$emit\(['"`]([^'"`]+)['"`]/g);

    if (eventMatches) {
      eventMatches.forEach(match => {
        const eventMatch = match.match(/\$emit\(['"`]([^'"`]+)['"`]/);
        if (eventMatch) {
          events.push({
            name: eventMatch[1],
            source: 'emit'
          });
        }
      });
    }

    return [...new Set(events.map(e => e.name))].map(name => ({ name, source: 'emit' }));
  }

  /**
   * Extract mixins from Vue component
   */
  _extractMixins(content) {
    const mixins = [];
    const mixinsMatch = content.match(/mixins:\s*\[([^\]]+)\]/);

    if (mixinsMatch) {
      const mixinsContent = mixinsMatch[1];
      const mixinMatches = mixinsContent.match(/\w+/g);

      if (mixinMatches) {
        mixins.push(...mixinMatches);
      }
    }

    return mixins;
  }

  /**
   * Extract imports from JavaScript/Vue files
   */
  _extractImports(content) {
    const imports = [];
    const importMatches = content.match(/import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g);

    if (importMatches) {
      importMatches.forEach(match => {
        const pathMatch = match.match(/from\s+['"`]([^'"`]+)['"`]/);
        if (pathMatch) {
          imports.push(pathMatch[1]);
        }
      });
    }

    return imports;
  }

  /**
   * Extract template section from Vue component
   */
  _extractTemplate(content) {
    const templateMatch = content.match(/<template>(.*?)<\/template>/s);
    return templateMatch ? templateMatch[1].trim() : '';
  }

  /**
   * Extract JavaScript functions
   */
  _extractFunctions(content) {
    const functions = [];

    // Extract function declarations
    const functionMatches = content.match(/(?:export\s+)?function\s+(\w+)\s*\([^)]*\)/g);
    if (functionMatches) {
      functionMatches.forEach(match => {
        const nameMatch = match.match(/function\s+(\w+)/);
        if (nameMatch) {
          functions.push({
            name: nameMatch[1],
            type: 'function',
            exported: match.includes('export')
          });
        }
      });
    }

    // Extract arrow functions
    const arrowMatches = content.match(
      /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*\([^)]*\)\s*=>/g
    );
    if (arrowMatches) {
      arrowMatches.forEach(match => {
        const nameMatch = match.match(/(?:const|let|var)\s+(\w+)/);
        if (nameMatch) {
          functions.push({
            name: nameMatch[1],
            type: 'arrow',
            exported: match.includes('export')
          });
        }
      });
    }

    return functions;
  }

  /**
   * Extract exports from JavaScript files
   */
  _extractExports(content) {
    const exports = [];

    // Named exports
    const namedExports = content.match(/export\s*{\s*([^}]+)\s*}/g);
    if (namedExports) {
      namedExports.forEach(match => {
        const exportsMatch = match.match(/{\s*([^}]+)\s*}/);
        if (exportsMatch) {
          const exportNames = exportsMatch[1].split(',').map(name => name.trim());
          exports.push(...exportNames);
        }
      });
    }

    // Default exports
    const defaultExport = content.match(/export\s+default\s+(\w+)/);
    if (defaultExport) {
      exports.push(`default: ${defaultExport[1]}`);
    }

    // Direct exports
    const directExports = content.match(/export\s+(?:const|let|var|function|class)\s+(\w+)/g);
    if (directExports) {
      directExports.forEach(match => {
        const nameMatch = match.match(/export\s+(?:const|let|var|function|class)\s+(\w+)/);
        if (nameMatch) {
          exports.push(nameMatch[1]);
        }
      });
    }

    return exports;
  }

  /**
   * Extract constants from JavaScript files
   */
  _extractConstants(content) {
    const constants = [];
    const constMatches = content.match(/(?:export\s+)?const\s+(\w+)\s*=\s*([^;]+)/g);

    if (constMatches) {
      constMatches.forEach(match => {
        const nameMatch = match.match(/const\s+(\w+)/);
        const valueMatch = match.match(/=\s*([^;]+)/);

        if (nameMatch) {
          constants.push({
            name: nameMatch[1],
            value: valueMatch ? valueMatch[1].trim() : undefined,
            exported: match.includes('export')
          });
        }
      });
    }

    return constants;
  }

  /**
   * Parse markdown sections
   */
  _parseMarkdownSections(content) {
    const sections = [];
    const sectionMatches = content.split(/^#{1,6}\s+/m);

    for (let i = 1; i < sectionMatches.length; i++) {
      const section = sectionMatches[i];
      const titleMatch = section.match(/^([^\n]+)/);

      if (titleMatch) {
        sections.push({
          title: titleMatch[1].trim(),
          content: section.substring(titleMatch[0].length).trim()
        });
      }
    }

    return sections;
  }

  /**
   * Extract code examples from markdown content
   */
  _extractCodeExamples(content) {
    const examples = [];
    const codeBlocks = content.match(/```[\s\S]*?```/g);

    if (codeBlocks) {
      codeBlocks.forEach(block => {
        const langMatch = block.match(/```(\w+)?\n([\s\S]*?)```/);
        if (langMatch) {
          examples.push({
            language: langMatch[1] || 'text',
            code: langMatch[2].trim()
          });
        }
      });
    }

    return examples;
  }

  /**
   * Extract props documentation from markdown
   */
  _extractPropsDocumentation(content) {
    const propsSection = content.match(/#### Props([\s\S]*?)(?=####|$)/);
    if (!propsSection) {
      return [];
    }

    const tableMatch = propsSection[1].match(/\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|/g);
    if (!tableMatch) {
      return [];
    }

    const props = [];
    for (let i = 1; i < tableMatch.length; i++) {
      // Skip header row
      const row = tableMatch[i];
      const columns = row
        .split('|')
        .map(col => col.trim())
        .filter(col => col);

      if (columns.length >= 4) {
        props.push({
          name: columns[0],
          type: columns[1],
          default: columns[2],
          description: columns[3]
        });
      }
    }

    return props;
  }

  /**
   * Extract events documentation from markdown
   */
  _extractEventsDocumentation(content) {
    const eventsSection = content.match(/#### Events([\s\S]*?)(?=####|$)/);
    if (!eventsSection) {
      return [];
    }

    const tableMatch = eventsSection[1].match(/\|([^|]+)\|([^|]+)\|([^|]+)\|/g);
    if (!tableMatch) {
      return [];
    }

    const events = [];
    for (let i = 1; i < tableMatch.length; i++) {
      // Skip header row
      const row = tableMatch[i];
      const columns = row
        .split('|')
        .map(col => col.trim())
        .filter(col => col);

      if (columns.length >= 3) {
        events.push({
          name: columns[0],
          type: columns[1],
          description: columns[2]
        });
      }
    }

    return events;
  }

  /**
   * Query component information by name and optional category
   */
  async queryComponent(name, category = null) {
    logger.info(`Querying component: ${name} in category: ${category}`);

    if (!this.isIndexed) {
      await this.buildResourceIndex();
    }

    // Search for exact match first
    let component = this.componentsIndex.get(name);

    // If not found and category is specified, search within category
    if (!component && category) {
      for (const [componentName, componentInfo] of this.componentsIndex) {
        if (
          componentInfo.category.includes(category) &&
          (componentName.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(componentName.toLowerCase()))
        ) {
          component = componentInfo;
          break;
        }
      }
    }

    // If still not found, do fuzzy search
    if (!component) {
      component = this._fuzzySearchComponent(name);
    }

    if (!component) {
      return {
        name,
        category: category || 'unknown',
        found: false,
        props: [],
        events: [],
        examples: [],
        documentation: '',
        suggestions: this._getSimilarComponents(name)
      };
    }

    return {
      name: component.name,
      category: component.category,
      found: true,
      filePath: component.filePath,
      props: this._mergePropsWithDocumentation(component.props, component.propsDoc),
      events: this._mergeEventsWithDocumentation(component.events, component.eventsDoc),
      mixins: component.mixins || [],
      imports: component.imports || [],
      template: component.template || '',
      examples: component.examples || [],
      documentation: component.documentation || '',
      usage: this._generateUsageExamples(component)
    };
  }

  /**
   * Query utility function information
   */
  async queryUtility(name) {
    logger.info(`Querying utility: ${name}`);

    if (!this.isIndexed) {
      await this.buildResourceIndex();
    }

    // Search for exact match first
    const utility = this.utilsIndex.get(name);

    // If not found, search within utility files
    if (!utility) {
      for (const [utilName, utilInfo] of this.utilsIndex) {
        if (utilName === '_documentation') {
          continue;
        }

        const matchingFunction = utilInfo.functions.find(
          func => func.name === name || func.name.toLowerCase().includes(name.toLowerCase())
        );

        if (matchingFunction) {
          return {
            name: matchingFunction.name,
            type: 'function',
            found: true,
            filePath: utilInfo.filePath,
            parentModule: utilName,
            exported: matchingFunction.exported,
            functionType: matchingFunction.type,
            documentation: utilInfo.documentation || '',
            examples: this._getUtilityExamples(name)
          };
        }
      }
    }

    if (!utility) {
      return {
        name,
        type: 'utility',
        found: false,
        suggestions: this._getSimilarUtilities(name)
      };
    }

    return {
      name: utility.name,
      type: 'utility',
      found: true,
      filePath: utility.filePath,
      functions: utility.functions || [],
      exports: utility.exports || [],
      imports: utility.imports || [],
      documentation: utility.documentation || '',
      examples: this._getUtilityExamples(name)
    };
  }

  /**
   * Query plugin information
   */
  async queryPlugin(name) {
    logger.info(`Querying plugin: ${name}`);

    if (!this.isIndexed) {
      await this.buildResourceIndex();
    }

    const plugin = this.pluginsIndex.get(name);

    if (!plugin) {
      return {
        name,
        type: 'plugin',
        found: false,
        suggestions: this._getSimilarPlugins(name)
      };
    }

    return {
      name: plugin.name,
      type: 'plugin',
      found: true,
      dirPath: plugin.dirPath,
      files: plugin.files || [],
      documentation: plugin.documentation || '',
      examples: plugin.examples || [],
      usage: this._generatePluginUsage(plugin)
    };
  }

  /**
   * Get best practices for a specific topic
   */
  async getBestPractices(topic) {
    logger.info(`Getting best practices for: ${topic}`);

    if (!this.isIndexed) {
      await this.buildResourceIndex();
    }

    const practices = [];
    const examples = [];
    const references = [];

    // Search in component documentation
    for (const [componentName, componentInfo] of this.componentsIndex) {
      if (
        componentInfo.documentation &&
        componentInfo.documentation.toLowerCase().includes(topic.toLowerCase())
      ) {
        practices.push({
          type: 'component',
          name: componentName,
          category: componentInfo.category,
          practice: this._extractBestPracticeFromDoc(componentInfo.documentation, topic),
          examples: componentInfo.examples || []
        });
      }
    }

    // Search in utility documentation
    const utilsDoc = this.utilsIndex.get('_documentation');
    if (utilsDoc && utilsDoc.documentation.toLowerCase().includes(topic.toLowerCase())) {
      practices.push({
        type: 'utilities',
        practice: this._extractBestPracticeFromDoc(utilsDoc.documentation, topic),
        examples: utilsDoc.examples || []
      });
    }

    // Search in plugin documentation
    for (const [pluginName, pluginInfo] of this.pluginsIndex) {
      if (pluginName === '_documentation') {
        continue;
      }

      if (
        pluginInfo.documentation &&
        pluginInfo.documentation.toLowerCase().includes(topic.toLowerCase())
      ) {
        practices.push({
          type: 'plugin',
          name: pluginName,
          practice: this._extractBestPracticeFromDoc(pluginInfo.documentation, topic),
          examples: pluginInfo.examples || []
        });
      }
    }

    // Add general best practices based on topic
    const generalPractices = this._getGeneralBestPractices(topic);
    practices.push(...generalPractices);

    return {
      topic,
      practices,
      examples,
      references
    };
  }

  /**
   * Get all available components
   */
  async getAllComponents() {
    if (!this.isIndexed) {
      await this.buildResourceIndex();
    }

    const components = [];
    for (const [name, info] of this.componentsIndex) {
      components.push({
        name,
        category: info.category,
        description: this._extractDescriptionFromDoc(info.documentation)
      });
    }

    return components.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get all available utilities
   */
  async getAllUtilities() {
    if (!this.isIndexed) {
      await this.buildResourceIndex();
    }

    const utilities = [];
    for (const [name, info] of this.utilsIndex) {
      if (name === '_documentation') {
        continue;
      }

      utilities.push({
        name,
        functions: info.functions.map(f => f.name),
        description: this._extractDescriptionFromDoc(info.documentation)
      });
    }

    return utilities.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get all available plugins
   */
  async getAllPlugins() {
    if (!this.isIndexed) {
      await this.buildResourceIndex();
    }

    const plugins = [];
    for (const [name, info] of this.pluginsIndex) {
      if (name === '_documentation') {
        continue;
      }

      plugins.push({
        name,
        description: this._extractDescriptionFromDoc(info.documentation)
      });
    }

    return plugins.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Fuzzy search for components
   */
  _fuzzySearchComponent(name) {
    const searchTerm = name.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;

    for (const [componentName, componentInfo] of this.componentsIndex) {
      const score = this._calculateSimilarity(searchTerm, componentName.toLowerCase());
      if (score > bestScore && score > 0.5) {
        bestScore = score;
        bestMatch = componentInfo;
      }
    }

    return bestMatch;
  }

  /**
   * Get similar components for suggestions
   */
  _getSimilarComponents(name) {
    const suggestions = [];
    const searchTerm = name.toLowerCase();

    for (const [componentName, componentInfo] of this.componentsIndex) {
      const score = this._calculateSimilarity(searchTerm, componentName.toLowerCase());
      if (score > 0.3) {
        suggestions.push({
          name: componentName,
          category: componentInfo.category,
          score
        });
      }
    }

    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => ({ name: s.name, category: s.category }));
  }

  /**
   * Get similar utilities for suggestions
   */
  _getSimilarUtilities(name) {
    const suggestions = [];
    const searchTerm = name.toLowerCase();

    for (const [utilName, utilInfo] of this.utilsIndex) {
      if (utilName === '_documentation') {
        continue;
      }

      // Check utility name
      const utilScore = this._calculateSimilarity(searchTerm, utilName.toLowerCase());
      if (utilScore > 0.3) {
        suggestions.push({ name: utilName, score: utilScore });
      }

      // Check function names
      utilInfo.functions.forEach(func => {
        const funcScore = this._calculateSimilarity(searchTerm, func.name.toLowerCase());
        if (funcScore > 0.3) {
          suggestions.push({ name: func.name, score: funcScore, parent: utilName });
        }
      });
    }

    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => ({ name: s.name, parent: s.parent }));
  }

  /**
   * Get similar plugins for suggestions
   */
  _getSimilarPlugins(name) {
    const suggestions = [];
    const searchTerm = name.toLowerCase();

    for (const [pluginName, pluginInfo] of this.pluginsIndex) {
      if (pluginName === '_documentation') {
        continue;
      }

      const score = this._calculateSimilarity(searchTerm, pluginName.toLowerCase());
      if (score > 0.3) {
        suggestions.push({ name: pluginName, score });
      }
    }

    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => ({ name: s.name }));
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  _calculateSimilarity(str1, str2) {
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    const distance = matrix[len2][len1];
    const maxLen = Math.max(len1, len2);
    return maxLen === 0 ? 1 : (maxLen - distance) / maxLen;
  }

  /**
   * Merge props with documentation
   */
  _mergePropsWithDocumentation(props, propsDoc) {
    if (!propsDoc || propsDoc.length === 0) {
      return props;
    }

    return props.map(prop => {
      const docProp = propsDoc.find(doc => doc.name === prop.name);
      return {
        ...prop,
        description: docProp ? docProp.description : '',
        documented: !!docProp
      };
    });
  }

  /**
   * Merge events with documentation
   */
  _mergeEventsWithDocumentation(events, eventsDoc) {
    if (!eventsDoc || eventsDoc.length === 0) {
      return events;
    }

    return events.map(event => {
      const docEvent = eventsDoc.find(doc => doc.name === event.name);
      return {
        ...event,
        description: docEvent ? docEvent.description : '',
        type: docEvent ? docEvent.type : event.type || 'unknown',
        documented: !!docEvent
      };
    });
  }

  /**
   * Generate usage examples for components
   */
  _generateUsageExamples(component) {
    const examples = [];

    // Basic usage example
    const basicProps = component.props
      .filter(prop => prop.default !== undefined)
      .map(prop => `${prop.name}="${prop.default}"`)
      .join(' ');

    examples.push({
      title: 'Basic Usage',
      code: `<${component.name}${basicProps ? ` ${basicProps}` : ''}></${component.name}>`,
      language: 'vue'
    });

    // Props example if available
    if (component.props && component.props.length > 0) {
      const propsExample = component.props
        .map(prop => `  ${prop.name}: ${prop.type === 'String' ? "'value'" : 'value'}`)
        .join(',\n');

      examples.push({
        title: 'With Props',
        code: `<${component.name}\n${propsExample}\n></${component.name}>`,
        language: 'vue'
      });
    }

    // Events example if available
    if (component.events && component.events.length > 0) {
      const eventsExample = component.events
        .map(
          event =>
            `@${event.name}="handle${event.name.charAt(0).toUpperCase() + event.name.slice(1)}"`
        )
        .join('\n  ');

      examples.push({
        title: 'With Events',
        code: `<${component.name}\n  ${eventsExample}\n></${component.name}>`,
        language: 'vue'
      });
    }

    return examples;
  }

  /**
   * Generate plugin usage examples
   */
  _generatePluginUsage(plugin) {
    const examples = [];

    // Import example
    examples.push({
      title: 'Import',
      code: `import ${plugin.name} from '@yiban-shared/plugins/${plugin.name}';`,
      language: 'javascript'
    });

    // Vue.use example
    examples.push({
      title: 'Vue Plugin Usage',
      code: `import Vue from 'vue';\nimport ${plugin.name} from '@yiban-shared/plugins/${plugin.name}';\n\nVue.use(${plugin.name}, {\n  // configuration options\n});`,
      language: 'javascript'
    });

    return examples;
  }

  /**
   * Get utility examples from documentation
   */
  _getUtilityExamples(utilityName) {
    const utilsDoc = this.utilsIndex.get('_documentation');
    if (!utilsDoc) {
      return [];
    }

    const examples = utilsDoc.examples || [];
    return examples.filter(
      example => example.code.includes(utilityName) || example.code.includes(`utils.${utilityName}`)
    );
  }

  /**
   * Extract best practice information from documentation
   */
  _extractBestPracticeFromDoc(documentation, topic) {
    const lines = documentation.split('\n');
    const relevantLines = lines.filter(line => line.toLowerCase().includes(topic.toLowerCase()));

    if (relevantLines.length === 0) {
      return '';
    }

    // Find the section containing the topic
    let sectionStart = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(topic.toLowerCase())) {
        sectionStart = i;
        break;
      }
    }

    if (sectionStart === -1) {
      return relevantLines.join('\n');
    }

    // Extract the relevant section (next few lines)
    const sectionLines = lines.slice(sectionStart, sectionStart + 5);
    return sectionLines.join('\n').trim();
  }

  /**
   * Get general best practices based on topic
   */
  _getGeneralBestPractices(topic) {
    const practices = [];
    const topicLower = topic.toLowerCase();

    if (topicLower.includes('component') || topicLower.includes('vue')) {
      practices.push({
        type: 'general',
        practice: 'Always use kebab-case for component names in templates',
        examples: [{ code: '<yb-avatar></yb-avatar>', language: 'vue' }]
      });

      practices.push({
        type: 'general',
        practice: 'Import components from @yiban-shared path for consistency',
        examples: [
          {
            code: "import YbAvatar from '@yiban-shared/components/yb-avatar';",
            language: 'javascript'
          }
        ]
      });
    }

    if (topicLower.includes('util') || topicLower.includes('function')) {
      practices.push({
        type: 'general',
        practice: 'Import utilities from the main utils index for tree-shaking',
        examples: [
          { code: "import { encrypted } from '@yiban-shared/utils';", language: 'javascript' }
        ]
      });
    }

    if (topicLower.includes('plugin')) {
      practices.push({
        type: 'general',
        practice: 'Configure plugins in the main plugins index file',
        examples: [{ code: 'Vue.use(plugin, { /* config */ });', language: 'javascript' }]
      });
    }

    return practices;
  }

  /**
   * Extract description from documentation
   */
  _extractDescriptionFromDoc(documentation) {
    if (!documentation) {
      return '';
    }

    const lines = documentation.split('\n');
    const firstNonEmptyLine = lines.find(line => line.trim().length > 0);

    if (!firstNonEmptyLine) {
      return '';
    }

    // Remove markdown headers and get the first sentence
    const cleaned = firstNonEmptyLine.replace(/^#+\s*/, '').trim();
    const firstSentence = cleaned.split('.')[0];

    return firstSentence.length > 100 ? `${firstSentence.substring(0, 100)}...` : firstSentence;
  }
}
