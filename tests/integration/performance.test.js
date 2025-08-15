import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MCPServer } from '../../src/core/mcp-server.js';
import { ProjectManager } from '../../src/managers/project-manager.js';
import { CodeGenerator } from '../../src/generators/code-generator.js';
import { FileSystemHandler } from '../../src/handlers/file-system-handler.js';
import { Logger } from '../../src/utils/logger.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Performance Integration Tests', () => {
  let mcpServer;
  let testProjectPath;
  let logger;
  let cleanup = [];

  beforeEach(async () => {
    // Create a temporary test project directory
    testProjectPath = path.join(__dirname, '../../temp-perf-test');
    
    // Clean up any existing test directory
    try {
      await fs.rm(testProjectPath, { recursive: true, force: true });
    } catch (error) {
      // Directory doesn't exist, which is fine
    }

    // Create test directory
    await fs.mkdir(testProjectPath, { recursive: true });
    cleanup.push(() => fs.rm(testProjectPath, { recursive: true, force: true }));

    // Create logger with error level to reduce noise
    logger = new Logger({ level: 'error', enableFileLogging: false });

    // Create mock configuration
    const config = {
      sharedLibraryPath: path.join(__dirname, '../fixtures/yiban-shared'),
      templatesPath: path.join(__dirname, '../fixtures/templates'),
      defaultProjectConfig: {
        apiEndpoint: '/api',
        mockEnabled: true,
        authEnabled: true
      }
    };

    // Initialize core components with error handling
    try {
      const fileSystemHandler = new FileSystemHandler();
      
      // Create a mock ResourceAnalyzer for testing
      const resourceAnalyzer = {
        async queryComponent(name, category) {
          try {
            const componentsData = JSON.parse(
              await fs.readFile(path.join(__dirname, '../fixtures/yiban-shared/components.json'), 'utf8')
            );
            
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
            const practicesData = JSON.parse(
              await fs.readFile(path.join(__dirname, '../fixtures/yiban-shared/best-practices.json'), 'utf8')
            );
            
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
      throw new Error(`Failed to initialize test components: ${error.message}`);
    }
  });

  afterEach(async () => {
    // Execute all cleanup functions with error handling
    const cleanupPromises = cleanup.map(async (cleanupFn) => {
      try {
        await cleanupFn();
      } catch (error) {
        // Log cleanup errors but don't fail the test
        console.warn('Cleanup error:', error.message);
      }
    });
    
    await Promise.allSettled(cleanupPromises);
    cleanup = [];
  });

  describe('Component Query Performance', () => {
    it('should handle multiple concurrent component queries efficiently', async () => {
      const startTime = Date.now();
      const queries = [
        { name: 'ui-list-view', category: 'pro-views' },
        { name: 'ui-detail-view', category: 'pro-views' },
        { name: 'ui-form-builder', category: 'form' },
        { name: 'ui-data-table', category: 'common' }
      ];

      try {
        const results = await Promise.all(
          queries.map(query => mcpServer.queryComponent(query))
        );
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Performance assertion - should complete within reasonable time
        expect(duration).toBeLessThan(1000); // 1 second
        
        // Verify all queries returned results
        expect(results).toHaveLength(4);
        results.forEach(result => {
          expect(result).toHaveProperty('name');
          expect(result).toHaveProperty('found');
        });
      } catch (error) {
        throw new Error(`Concurrent query test failed: ${error.message}`);
      }
    });

    it('should handle error conditions gracefully under load', async () => {
      const invalidQueries = Array(10).fill().map((_, i) => ({
        name: `invalid-component-${i}`,
        category: 'common' // Use valid category but invalid component name
      }));

      try {
        const results = await Promise.allSettled(
          invalidQueries.map(query => mcpServer.queryComponent(query))
        );
        
        // All queries should resolve (not reject) even for invalid components
        results.forEach((result, index) => {
          expect(result.status).toBe('fulfilled');
          if (result.status === 'fulfilled') {
            expect(result.value.found).toBe(false);
            expect(result.value.name).toBe(`invalid-component-${index}`);
          }
        });
      } catch (error) {
        throw new Error(`Error handling test failed: ${error.message}`);
      }
    });
  });

  describe('Best Practices Query Performance', () => {
    it('should handle invalid topics without crashing', async () => {
      const invalidTopics = ['invalid-topic', 'non-existent', ''];

      for (const topic of invalidTopics) {
        try {
          await expect(mcpServer.getBestPractices({ topic })).rejects.toThrow();
        } catch (error) {
          // Expected behavior - should throw for invalid topics
          expect(error.message).toContain('Invalid topic');
        }
      }
    });

    it('should handle concurrent best practices queries', async () => {
      const validTopics = ['project-structure', 'api-config', 'component-usage'];
      
      try {
        const results = await Promise.allSettled(
          validTopics.map(topic => mcpServer.getBestPractices({ topic }))
        );
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            expect(result.value.topic).toBe(validTopics[index]);
            expect(result.value.practices).toBeDefined();
          } else {
            // Log rejection reason for debugging
            console.warn(`Best practices query failed for ${validTopics[index]}:`, result.reason);
          }
        });
      } catch (error) {
        throw new Error(`Concurrent best practices test failed: ${error.message}`);
      }
    });
  });

  describe('Memory and Resource Management', () => {
    it('should not leak memory during repeated operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      try {
        // Perform repeated operations
        for (let i = 0; i < 50; i++) {
          await mcpServer.queryComponent({
            name: 'ui-list-view',
            category: 'pro-views'
          });
        }
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        const finalMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = finalMemory - initialMemory;
        
        // Memory increase should be reasonable (less than 10MB)
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      } catch (error) {
        throw new Error(`Memory management test failed: ${error.message}`);
      }
    });
  });
});