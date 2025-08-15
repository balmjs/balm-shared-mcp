#!/usr/bin/env node

/**
 * BalmSharedMCP CLI Tool
 * 
 * Command line interface for managing the BalmSharedMCP server
 * Provides configuration wizard, health checks, and service management
 */

import { program } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { startServer } from './commands/start.js';
import { configWizard } from './commands/config.js';
import { healthCheck } from './commands/health.js';
import { serviceManager } from './commands/service.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version info
const packagePath = join(__dirname, '../../package.json');
const packageInfo = JSON.parse(readFileSync(packagePath, 'utf8'));

program
  .name('balm-shared-mcp')
  .description('CLI tool for BalmSharedMCP server management')
  .version(packageInfo.version);

// Start command
program
  .command('start')
  .description('Start the MCP server')
  .option('-c, --config <path>', 'Configuration file path')
  .option('-p, --port <number>', 'Server port (for HTTP mode)')
  .option('-m, --mode <mode>', 'Server mode (stdio|http)', 'stdio')
  .option('-d, --daemon', 'Run as daemon process')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(startServer);

// Configuration wizard
program
  .command('config')
  .description('Run configuration wizard')
  .option('-o, --output <path>', 'Output configuration file path', './balm-shared-mcp.config.json')
  .option('-f, --force', 'Overwrite existing configuration')
  .action(configWizard);

// Health check
program
  .command('health')
  .description('Perform health check on the server')
  .option('-c, --config <path>', 'Configuration file path')
  .option('-t, --timeout <seconds>', 'Health check timeout', '30')
  .option('-v, --verbose', 'Show detailed health information')
  .action(healthCheck);

// Service management
program
  .command('service')
  .description('Manage MCP server service')
  .option('-c, --config <path>', 'Configuration file path')
  .addCommand(
    program
      .createCommand('status')
      .description('Show service status')
      .action((options, command) => serviceManager('status', options, command.parent.opts()))
  )
  .addCommand(
    program
      .createCommand('stop')
      .description('Stop the service')
      .action((options, command) => serviceManager('stop', options, command.parent.opts()))
  )
  .addCommand(
    program
      .createCommand('restart')
      .description('Restart the service')
      .action((options, command) => serviceManager('restart', options, command.parent.opts()))
  )
  .addCommand(
    program
      .createCommand('logs')
      .description('Show service logs')
      .option('-f, --follow', 'Follow log output')
      .option('-n, --lines <number>', 'Number of lines to show', '100')
      .action((options, command) => serviceManager('logs', options, command.parent.opts()))
  );

// Monitor command
program
  .command('monitor')
  .description('Monitor server performance and status')
  .option('-c, --config <path>', 'Configuration file path')
  .option('-i, --interval <seconds>', 'Monitoring interval', '5')
  .option('-o, --output <format>', 'Output format (console|json|csv)', 'console')
  .action(async (options) => {
    const { monitor } = await import('./commands/monitor.js');
    await monitor(options);
  });

// Version command (already handled by commander)

// Error handling
program.exitOverride();

try {
  program.parse();
} catch (error) {
  if (error.code === 'commander.help') {
    process.exit(0);
  } else if (error.code === 'commander.version') {
    process.exit(0);
  } else {
    logger.error('CLI error', { error: error.message });
    process.exit(1);
  }
}