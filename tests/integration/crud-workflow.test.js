import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MCPServer } from '../../src/core/mcp-server.js';
import { ProjectManager } from '../../src/managers/project-manager.js';
import { CodeGenerator } from '../../src/generators/code-generator.js';
import { FileSystemHandler } from '../../src/handlers/file-system-handler.js';
import { Logger } from '../../src/utils/logger.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  createMockProjectConfig,
  testDataFactories
} from '../utils/mock-utilities.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('CRUD Workflow Integration Tests', () => {
  let mcpServer;
  let testProjectPath;
  let logger;
  let cleanup = [];

  beforeEach(async () => {
    // Create a temporary test project directory
    testProjectPath = path.join(__dirname, '../../temp-test-project');
    
    // Clean up any existing test directory with proper error handling
    try {
      await fs.rm(testProjectPath, { recursive: true, force: true });
    } catch (error) {
      // Directory doesn't exist, which is fine
    }

    // Create test directory with error handling
    try {
      await fs.mkdir(testProjectPath, { recursive: true });
      cleanup.push(() => fs.rm(testProjectPath, { recursive: true, force: true }));
    } catch (error) {
      throw new Error(`Failed to create test directory: ${error.message}`);
    }

    // Create logger with error handling
    try {
      logger = new Logger({ level: 'error', enableFileLogging: false });
    } catch (error) {
      throw new Error(`Failed to create logger: ${error.message}`);
    }

    // Create mock configuration
    const config = createMockProjectConfig({
      sharedLibraryPath: path.join(__dirname, '../fixtures/yiban-shared'),
      templatesPath: path.join(__dirname, '../fixtures/templates')
    });

    // Initialize core components
    const fileSystemHandler = new FileSystemHandler();
    
    // Create a mock ResourceAnalyzer for testing with comprehensive error handling
    const resourceAnalyzer = {
      async queryComponent(name, category) {
        try {
          const componentsData = testDataFactories.createComponentQueryData();
          
          // Search in all categories
          for (const [categoryName, components] of Object.entries(componentsData)) {
            if (components[name]) {
              return {
                ...components[name],
                found: true,
                usage: components[name].usage || []
              };
            }
          }
          
          // Return not found with suggestions
          const allComponents = Object.values(componentsData).flatMap(cat => Object.keys(cat));
          const suggestions = allComponents.filter(comp => 
            comp.toLowerCase().includes(name.toLowerCase()) || 
            name.toLowerCase().includes(comp.toLowerCase())
          );
          
          return {
            name,
            category: category || 'unknown',
            found: false,
            suggestions
          };
        } catch (error) {
          throw new Error(`Failed to query component ${name}: ${error.message}`);
        }
      },
      
      async getBestPractices(topic) {
        try {
          const practicesData = testDataFactories.createBestPracticesData();
          
          if (practicesData[topic]) {
            return practicesData[topic];
          }
          
          throw new Error(`Invalid topic: ${topic}`);
        } catch (error) {
          if (error.message.includes('Invalid topic')) {
            throw error;
          }
          throw new Error(`Failed to get best practices for ${topic}: ${error.message}`);
        }
      }
    };
    
    try {
      const projectManager = new ProjectManager(fileSystemHandler, config);
      const codeGenerator = new CodeGenerator(fileSystemHandler, config);

      // Initialize MCP Server with proper components
      mcpServer = new MCPServer({
        projectManager,
        codeGenerator,
        resourceAnalyzer,
        fileSystemHandler,
        config
      });
    } catch (error) {
      throw new Error(`Failed to initialize MCP server: ${error.message}`);
    }
  });

  afterEach(async () => {
    // Execute all cleanup functions with proper error handling
    const cleanupResults = await Promise.allSettled(
      cleanup.map(async (cleanupFn) => {
        try {
          await cleanupFn();
        } catch (error) {
          console.warn('Cleanup error:', error.message);
        }
      })
    );
    
    // Log any cleanup failures for debugging
    cleanupResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.warn(`Cleanup function ${index} failed:`, result.reason);
      }
    });
    
    cleanup = [];
  });

  describe('Basic Setup', () => {
    it('should initialize MCP server successfully', () => {
      expect(mcpServer).toBeDefined();
    });

    it('should create test directory', async () => {
      const exists = await fs.access(testProjectPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
  });

  describe('Resource Query Tests', () => {
    it('should query component information with error handling', async () => {
      const componentQuery = {
        name: 'ui-list-view',
        category: 'pro-views'
      };

      try {
        const queryResult = await mcpServer.queryComponent(componentQuery);
        
        expect(queryResult.found).toBe(true);
        expect(queryResult.name).toBe('ui-list-view');
        expect(queryResult.category).toBe('pro-views');
        expect(queryResult.usage).toBeDefined();
        expect(Array.isArray(queryResult.usage)).toBe(true);
      } catch (error) {
        throw new Error(`Component query failed: ${error.message}`);
      }
    });

    it('should handle non-existent component queries gracefully', async () => {
      const invalidQuery = {
        name: 'non-existent-component',
        category: 'common' // Use valid category but invalid component name
      };

      try {
        const queryResult = await mcpServer.queryComponent(invalidQuery);
        
        expect(queryResult.found).toBe(false);
        expect(queryResult.name).toBe('non-existent-component');
        expect(queryResult.suggestions).toBeDefined();
        expect(Array.isArray(queryResult.suggestions)).toBe(true);
      } catch (error) {
        throw new Error(`Invalid component query handling failed: ${error.message}`);
      }
    });

    it('should provide best practices for different topics with error handling', async () => {
      const topics = ['project-structure', 'api-config', 'component-usage', 'routing'];

      for (const topic of topics) {
        try {
          const practicesResult = await mcpServer.getBestPractices({ topic });
          
          expect(practicesResult.topic).toBe(topic);
          expect(practicesResult.practices).toBeDefined();
          expect(Array.isArray(practicesResult.practices)).toBe(true);
          expect(practicesResult.practices.length).toBeGreaterThan(0);
        } catch (error) {
          throw new Error(`Best practices query failed for ${topic}: ${error.message}`);
        }
      }
    });

    it('should handle invalid best practices topics appropriately', async () => {
      const invalidTopics = ['invalid-topic', 'non-existent', ''];

      for (const topic of invalidTopics) {
        try {
          await expect(mcpServer.getBestPractices({ topic })).rejects.toThrow();
        } catch (error) {
          expect(error.message).toContain('Invalid topic');
        }
      }
    });

    it('should handle concurrent queries without interference', async () => {
      const queries = [
        { name: 'ui-list-view', category: 'pro-views' },
        { name: 'ui-detail-view', category: 'pro-views' },
        { name: 'non-existent', category: 'common' } // Use valid category but invalid component name
      ];

      try {
        const results = await Promise.allSettled(
          queries.map(query => mcpServer.queryComponent(query))
        );

        expect(results).toHaveLength(3);
        
        // First two should succeed
        expect(results[0].status).toBe('fulfilled');
        expect(results[1].status).toBe('fulfilled');
        
        // Third should also succeed but with found: false
        expect(results[2].status).toBe('fulfilled');
        if (results[2].status === 'fulfilled') {
          expect(results[2].value.found).toBe(false);
        }
      } catch (error) {
        throw new Error(`Concurrent query test failed: ${error.message}`);
      }
    });
  });
});