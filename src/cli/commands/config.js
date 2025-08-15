/**
 * Configuration wizard implementation
 * Interactive setup for BalmSharedMCP server
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { createInterface } from 'readline';
import { logger } from '../../utils/logger.js';

/**
 * Run configuration wizard
 * @param {Object} options - Command options
 */
export async function configWizard(options) {
  try {
    logger.info('Starting configuration wizard...');

    const configPath = resolve(options.output);
    
    // Check if config already exists
    if (existsSync(configPath) && !options.force) {
      const overwrite = await askQuestion(
        `Configuration file already exists at ${configPath}. Overwrite? (y/N): `
      );
      if (!overwrite.toLowerCase().startsWith('y')) {
        logger.info('Configuration wizard cancelled');
        return;
      }
    }

    const config = await collectConfiguration();
    
    // Validate configuration
    const validation = validateConfiguration(config);
    if (!validation.valid) {
      logger.error('Configuration validation failed', { errors: validation.errors });
      return;
    }

    // Write configuration file
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    logger.info('Configuration saved successfully', { path: configPath });

    // Offer to test configuration
    const testConfig = await askQuestion('Test configuration now? (Y/n): ');
    if (!testConfig.toLowerCase().startsWith('n')) {
      await testConfiguration(config);
    }

  } catch (error) {
    logger.error('Configuration wizard failed', { error: error.message });
    process.exit(1);
  }
}

/**
 * Collect configuration through interactive prompts
 */
async function collectConfiguration() {
  console.log('\n=== BalmSharedMCP Configuration Wizard ===\n');

  const config = {
    server: {},
    sharedProject: {},
    logging: {},
    features: {}
  };

  // Server configuration
  console.log('📡 Server Configuration:');
  config.server.mode = await askQuestion('Server mode (stdio/http) [stdio]: ') || 'stdio';
  
  if (config.server.mode === 'http') {
    config.server.port = parseInt(await askQuestion('HTTP port [3000]: ')) || 3000;
    config.server.host = await askQuestion('Host [localhost]: ') || 'localhost';
  }

  // BalmShared library configuration
  console.log('\n📚 BalmShared Library Configuration:');
  config.sharedProject.path = await askQuestion('BalmShared library path: ');
  
  if (!config.sharedProject.path) {
    throw new Error('BalmShared library path is required');
  }

  config.sharedProject.version = await askQuestion('BalmShared version [latest]: ') || 'latest';
  config.sharedProject.components = await askMultipleChoice(
    'Select components to enable:',
    ['ui', 'utils', 'directives', 'plugins'],
    ['ui', 'utils']
  );

  // Project configuration
  console.log('\n🏗️ Project Configuration:');
  config.project = {
    framework: await askChoice('Frontend framework:', ['vue2', 'vue3'], 'vue3'),
    uiLibrary: await askChoice('UI library:', ['balm-ui', 'element-ui', 'ant-design-vue'], 'balm-ui'),
    buildTool: await askChoice('Build tool:', ['webpack', 'vite', 'rollup'], 'vite'),
    typescript: await askYesNo('Enable TypeScript support? [Y/n]: ', true)
  };

  // Logging configuration
  console.log('\n📝 Logging Configuration:');
  config.logging.level = await askChoice('Log level:', ['error', 'warn', 'info', 'debug'], 'info');
  config.logging.format = await askChoice('Log format:', ['json', 'text'], 'text');
  config.logging.file = await askQuestion('Log file path (optional): ');

  // Feature configuration
  console.log('\n🚀 Feature Configuration:');
  config.features.codeGeneration = await askYesNo('Enable code generation? [Y/n]: ', true);
  config.features.projectAnalysis = await askYesNo('Enable project analysis? [Y/n]: ', true);
  config.features.resourceQuery = await askYesNo('Enable resource querying? [Y/n]: ', true);
  config.features.templateGeneration = await askYesNo('Enable template generation? [Y/n]: ', true);

  // Advanced configuration
  const advancedConfig = await askYesNo('Configure advanced settings? [y/N]: ', false);
  if (advancedConfig) {
    config.advanced = await collectAdvancedConfiguration();
  }

  return config;
}

/**
 * Collect advanced configuration options
 */
async function collectAdvancedConfiguration() {
  console.log('\n⚙️ Advanced Configuration:');
  
  const advanced = {};

  // Cache configuration
  advanced.cache = {
    enabled: await askYesNo('Enable caching? [Y/n]: ', true),
    ttl: parseInt(await askQuestion('Cache TTL in seconds [3600]: ')) || 3600,
    maxSize: parseInt(await askQuestion('Max cache size in MB [100]: ')) || 100
  };

  // Performance configuration
  advanced.performance = {
    maxConcurrentRequests: parseInt(await askQuestion('Max concurrent requests [10]: ')) || 10,
    requestTimeout: parseInt(await askQuestion('Request timeout in seconds [30]: ')) || 30,
    memoryLimit: parseInt(await askQuestion('Memory limit in MB [512]: ')) || 512
  };

  // Security configuration
  advanced.security = {
    enableCors: await askYesNo('Enable CORS? [y/N]: ', false),
    allowedOrigins: []
  };

  if (advanced.security.enableCors) {
    let origin;
    while ((origin = await askQuestion('Allowed origin (empty to finish): '))) {
      advanced.security.allowedOrigins.push(origin);
    }
  }

  return advanced;
}

/**
 * Validate configuration object
 */
function validateConfiguration(config) {
  const errors = [];

  // Validate required fields
  if (!config.sharedProject?.path) {
    errors.push('BalmShared library path is required');
  }

  // Validate paths exist
  if (config.sharedProject?.path && !existsSync(config.sharedProject.path)) {
    errors.push(`BalmShared library path does not exist: ${config.sharedProject.path}`);
  }

  // Validate server configuration
  if (config.server?.mode === 'http') {
    if (!config.server.port || config.server.port < 1 || config.server.port > 65535) {
      errors.push('Invalid HTTP port number');
    }
  }

  // Validate logging configuration
  const validLogLevels = ['error', 'warn', 'info', 'debug'];
  if (config.logging?.level && !validLogLevels.includes(config.logging.level)) {
    errors.push('Invalid log level');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Test configuration by attempting to load and validate
 */
async function testConfiguration(config) {
  try {
    console.log('\n🧪 Testing configuration...');

    // Test BalmShared library access
    if (config.sharedProject?.path) {
      const packagePath = join(config.sharedProject.path, 'package.json');
      if (existsSync(packagePath)) {
        const packageInfo = JSON.parse(readFileSync(packagePath, 'utf8'));
        console.log(`✅ BalmShared library found: ${packageInfo.name}@${packageInfo.version}`);
      } else {
        console.log('⚠️  BalmShared package.json not found, but path exists');
      }
    }

    // Test server configuration
    if (config.server?.mode === 'http' && config.server?.port) {
      // Simple port availability check
      const net = await import('net');
      const server = net.createServer();
      
      await new Promise((resolve, reject) => {
        server.listen(config.server.port, config.server.host || 'localhost', () => {
          console.log(`✅ Port ${config.server.port} is available`);
          server.close(resolve);
        });
        
        server.on('error', (error) => {
          if (error.code === 'EADDRINUSE') {
            console.log(`⚠️  Port ${config.server.port} is already in use`);
          } else {
            console.log(`❌ Port test failed: ${error.message}`);
          }
          reject(error);
        });
      });
    }

    console.log('✅ Configuration test completed successfully');

  } catch (error) {
    console.log(`❌ Configuration test failed: ${error.message}`);
  }
}

/**
 * Helper functions for user input
 */
function askQuestion(question) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function askYesNo(question, defaultValue = false) {
  const answer = await askQuestion(question);
  if (!answer) return defaultValue;
  return answer.toLowerCase().startsWith('y');
}

async function askChoice(question, choices, defaultChoice) {
  console.log(`${question}`);
  choices.forEach((choice, index) => {
    const marker = choice === defaultChoice ? '●' : '○';
    console.log(`  ${marker} ${index + 1}. ${choice}`);
  });

  const answer = await askQuestion(`Select (1-${choices.length}) [${choices.indexOf(defaultChoice) + 1}]: `);
  const index = parseInt(answer) - 1;
  
  if (isNaN(index) || index < 0 || index >= choices.length) {
    return defaultChoice;
  }
  
  return choices[index];
}

async function askMultipleChoice(question, choices, defaultChoices = []) {
  console.log(`${question}`);
  choices.forEach((choice, index) => {
    const marker = defaultChoices.includes(choice) ? '●' : '○';
    console.log(`  ${marker} ${index + 1}. ${choice}`);
  });

  const answer = await askQuestion(`Select multiple (comma-separated, e.g., 1,3,4): `);
  if (!answer) return defaultChoices;

  const indices = answer.split(',').map(s => parseInt(s.trim()) - 1);
  const selected = indices
    .filter(i => !isNaN(i) && i >= 0 && i < choices.length)
    .map(i => choices[i]);

  return selected.length > 0 ? selected : defaultChoices;
}