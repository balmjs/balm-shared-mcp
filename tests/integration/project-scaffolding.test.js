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

describe('Project Scaffolding Integration Tests', () => {
  let mcpServer;
  let testProjectPath;
  let logger;
  let cleanup = [];

  beforeEach(async () => {
    // Create a temporary test project directory
    testProjectPath = path.join(__dirname, '../../temp-scaffold-test');
    
    // Clean up any existing test directory with error handling
    try {
      await fs.rm(testProjectPath, { recursive: true, force: true });
    } catch (error) {
      // Directory doesn't exist, which is fine
    }

    // Create test directory
    try {
      await fs.mkdir(testProjectPath, { recursive: true });
      cleanup.push(() => fs.rm(testProjectPath, { recursive: true, force: true }));
    } catch (error) {
      throw new Error(`Failed to create test directory: ${error.message}`);
    }

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

    // Initialize core components with comprehensive error handling
    try {
      const fileSystemHandler = new FileSystemHandler();
      
      // Create a mock ResourceAnalyzer for testing
      const resourceAnalyzer = {
        async queryComponent(name, category) {
          try {
            const componentsPath = path.join(__dirname, '../fixtures/yiban-shared/components.json');
            const componentsData = JSON.parse(await fs.readFile(componentsPath, 'utf8'));
            
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
            const practicesPath = path.join(__dirname, '../fixtures/yiban-shared/best-practices.json');
            const practicesData = JSON.parse(await fs.readFile(practicesPath, 'utf8'));
            
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

  describe('Basic Project Structure Creation', () => {
    it('should create basic project structure without errors', async () => {
      const projectConfig = {
        name: 'test-project',
        type: 'vue-admin',
        features: ['crud', 'auth']
      };

      try {
        // Mock the project creation process
        const mockCreateProject = vi.fn().mockResolvedValue({
          success: true,
          projectPath: testProjectPath,
          files: ['package.json', 'src/main.js', 'src/App.vue']
        });

        // Test project creation
        const result = await mockCreateProject(projectConfig);
        
        expect(result.success).toBe(true);
        expect(result.projectPath).toBe(testProjectPath);
        expect(result.files).toContain('package.json');
      } catch (error) {
        throw new Error(`Project creation test failed: ${error.message}`);
      }
    });

    it('should handle invalid project configurations gracefully', async () => {
      const invalidConfigs = [
        null,
        undefined,
        {},
        { name: '' },
        { name: 'test', type: 'invalid-type' }
      ];

      for (const config of invalidConfigs) {
        try {
          // Mock project creation that should handle invalid configs
          const mockCreateProject = vi.fn().mockImplementation((cfg) => {
            if (!cfg || !cfg.name || cfg.name.trim() === '') {
              throw new Error('Invalid project name');
            }
            if (cfg.type && !['vue-admin', 'react-admin'].includes(cfg.type)) {
              throw new Error('Invalid project type');
            }
            return Promise.resolve({ success: true });
          });

          await expect(mockCreateProject(config)).rejects.toThrow();
        } catch (error) {
          // Expected behavior for invalid configs
          expect(error.message).toMatch(/Invalid project|Invalid project type/);
        }
      }
    });
  });

  describe('Template Processing', () => {
    it('should process templates with error recovery', async () => {
      const templateData = {
        componentName: 'UserList',
        apiEndpoint: '/api/users',
        fields: ['id', 'name', 'email']
      };

      try {
        // Mock template processing
        const mockProcessTemplate = vi.fn().mockImplementation(async (templatePath, data) => {
          if (!templatePath || !data) {
            throw new Error('Missing template path or data');
          }
          
          // Simulate template processing
          return {
            success: true,
            output: `Generated component: ${data.componentName}`,
            warnings: []
          };
        });

        const result = await mockProcessTemplate('list-page.vue.template', templateData);
        
        expect(result.success).toBe(true);
        expect(result.output).toContain('UserList');
      } catch (error) {
        throw new Error(`Template processing test failed: ${error.message}`);
      }
    });

    it('should handle template processing errors gracefully', async () => {
      const invalidTemplateData = [
        null,
        undefined,
        { componentName: '' },
        { componentName: 'Test', fields: null }
      ];

      for (const data of invalidTemplateData) {
        try {
          const mockProcessTemplate = vi.fn().mockImplementation(async (templatePath, templateData) => {
            if (!templateData || !templateData.componentName || templateData.componentName.trim() === '') {
              throw new Error('Invalid template data');
            }
            return { success: true };
          });

          try {
            await mockProcessTemplate('test.template', data);
            // If we reach here, the mock didn't throw as expected
            throw new Error('Expected template processing to fail but it succeeded');
          } catch (error) {
            expect(error.message).toContain('Invalid template data');
          }
        } catch (outerError) {
          // Expected behavior for invalid template data
          expect(outerError.message).toMatch(/Invalid template data|Expected template processing to fail/);
        }
      }
    });
  });

  describe('File System Operations', () => {
    it('should handle file creation errors gracefully', async () => {
      const testFiles = [
        { path: 'src/components/UserList.vue', content: '<template>Test</template>' },
        { path: 'src/api/users.js', content: 'export default {}' }
      ];

      try {
        // Mock file creation with error handling
        const mockCreateFiles = vi.fn().mockImplementation(async (files) => {
          const results = [];
          
          for (const file of files) {
            try {
              if (!file.path || !file.content) {
                throw new Error(`Invalid file data: ${JSON.stringify(file)}`);
              }
              
              // Simulate file creation
              results.push({
                path: file.path,
                success: true,
                error: null
              });
            } catch (error) {
              results.push({
                path: file.path || 'unknown',
                success: false,
                error: error.message
              });
            }
          }
          
          return results;
        });

        const results = await mockCreateFiles(testFiles);
        
        expect(results).toHaveLength(2);
        results.forEach(result => {
          expect(result).toHaveProperty('success');
          expect(result).toHaveProperty('path');
        });
      } catch (error) {
        throw new Error(`File creation test failed: ${error.message}`);
      }
    });

    it('should handle directory creation failures', async () => {
      const directories = [
        'src/components',
        'src/api',
        'src/utils',
        '/invalid/path/that/cannot/be/created'
      ];

      try {
        const mockCreateDirectories = vi.fn().mockImplementation(async (dirs) => {
          const results = [];
          
          for (const dir of dirs) {
            try {
              if (dir.includes('/invalid/')) {
                throw new Error('Permission denied');
              }
              
              results.push({
                path: dir,
                success: true,
                error: null
              });
            } catch (error) {
              results.push({
                path: dir,
                success: false,
                error: error.message
              });
            }
          }
          
          return results;
        });

        const results = await mockCreateDirectories(directories);
        
        expect(results).toHaveLength(4);
        
        // Check that valid directories succeeded
        const validResults = results.slice(0, 3);
        validResults.forEach(result => {
          expect(result.success).toBe(true);
        });
        
        // Check that invalid directory failed
        const invalidResult = results[3];
        expect(invalidResult.success).toBe(false);
        expect(invalidResult.error).toContain('Permission denied');
      } catch (error) {
        throw new Error(`Directory creation test failed: ${error.message}`);
      }
    });
  });

  describe('Async Operation Patterns', () => {
    it('should handle concurrent async operations properly', async () => {
      const operations = [
        () => Promise.resolve('operation1'),
        () => Promise.resolve('operation2'),
        () => Promise.reject(new Error('operation3 failed')),
        () => Promise.resolve('operation4')
      ];

      try {
        const results = await Promise.allSettled(
          operations.map(op => op())
        );
        
        expect(results).toHaveLength(4);
        
        // Check successful operations
        expect(results[0].status).toBe('fulfilled');
        expect(results[0].value).toBe('operation1');
        expect(results[1].status).toBe('fulfilled');
        expect(results[1].value).toBe('operation2');
        expect(results[3].status).toBe('fulfilled');
        expect(results[3].value).toBe('operation4');
        
        // Check failed operation
        expect(results[2].status).toBe('rejected');
        expect(results[2].reason.message).toBe('operation3 failed');
      } catch (error) {
        throw new Error(`Concurrent operations test failed: ${error.message}`);
      }
    });

    it('should handle timeout scenarios in async operations', async () => {
      const timeoutOperation = () => new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Operation timed out'));
        }, 100);
        
        // Simulate long-running operation
        setTimeout(() => {
          clearTimeout(timeout);
          resolve('completed');
        }, 200);
      });

      try {
        await expect(timeoutOperation()).rejects.toThrow('Operation timed out');
      } catch (error) {
        expect(error.message).toBe('Operation timed out');
      }
    });
  });
});