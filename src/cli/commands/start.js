/**
 * Start command implementation
 * Handles server startup with various options
 */

import { spawn } from 'child_process';
import { existsSync, writeFileSync, readFileSync, unlinkSync, createWriteStream } from 'fs';
import { join, resolve } from 'path';
import { loadConfig } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Start the MCP server
 * @param {Object} options - Command options
 */
export async function startServer(options) {
  try {
    logger.info('Starting BalmSharedMCP server...', { options });

    // Load configuration (for future use)
    const _config = options.config ? await loadConfig(resolve(options.config)) : await loadConfig();

    // Set up environment variables
    const env = { ...process.env };

    if (options.verbose) {
      env.LOG_LEVEL = 'debug';
    }

    if (options.port) {
      env.MCP_PORT = options.port;
    }

    if (options.mode) {
      env.MCP_MODE = options.mode;
    }

    // Determine the server entry point
    // Try to find the server from the package installation
    const { fileURLToPath } = await import('url');
    const { dirname } = await import('path');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const serverPath = join(__dirname, '../../index.js');

    if (!existsSync(serverPath)) {
      throw new Error(`Server entry point not found: ${serverPath}`);
    }

    if (options.daemon) {
      // Run as daemon process
      await startDaemon(serverPath, env, options);
    } else {
      // Run in foreground
      await startForeground(serverPath, env, options);
    }
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

/**
 * Start server in foreground mode
 */
async function startForeground(serverPath, env, _options) {
  logger.info('Starting server in foreground mode');

  const child = spawn('node', [serverPath], {
    env,
    stdio: 'inherit'
  });

  child.on('error', error => {
    logger.error('Server process error', { error: error.message });
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      logger.info(`Server process terminated by signal ${signal}`);
    } else {
      logger.info(`Server process exited with code ${code}`);
    }
    process.exit(code || 0);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, stopping server...');
    child.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, stopping server...');
    child.kill('SIGTERM');
  });
}

/**
 * Start server as daemon process
 */
async function startDaemon(serverPath, env, _options) {
  logger.info('Starting server in daemon mode');

  const pidFile = join(process.cwd(), '.balm-shared-mcp.pid');
  const logFile = join(process.cwd(), 'balm-shared-mcp.log');

  // Check if already running
  if (existsSync(pidFile)) {
    const pid = parseInt(readFileSync(pidFile, 'utf8'));
    try {
      process.kill(pid, 0); // Check if process exists
      logger.error('Server is already running', { pid });
      process.exit(1);
    } catch (_error) {
      // Process doesn't exist, remove stale pid file
      unlinkSync(pidFile);
    }
  }

  const child = spawn('node', [serverPath], {
    env,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  // Write PID file
  writeFileSync(pidFile, child.pid.toString());

  // Set up log file
  const logStream = createWriteStream(logFile, { flags: 'a' });
  child.stdout.pipe(logStream);
  child.stderr.pipe(logStream);

  child.unref(); // Allow parent to exit

  child.on('error', error => {
    logger.error('Daemon process error', { error: error.message });
    if (existsSync(pidFile)) {
      unlinkSync(pidFile);
    }
  });

  child.on('exit', (_code, _signal) => {
    if (existsSync(pidFile)) {
      unlinkSync(pidFile);
    }
  });

  logger.info('Server started as daemon', {
    pid: child.pid,
    pidFile,
    logFile
  });
}
