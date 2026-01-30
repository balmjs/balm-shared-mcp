/**
 * Service management command implementation
 * Handles service lifecycle operations
 */

import { existsSync, readFileSync, unlinkSync, createReadStream } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import { logger } from '../../utils/logger.js';

/**
 * Service manager command handler
 * @param {string} action - Service action (status, stop, restart, logs)
 * @param {Object} options - Command options
 * @param {Object} parentOptions - Parent command options
 */
export async function serviceManager(action, options, parentOptions) {
  try {
    switch (action) {
      case 'status':
        await showServiceStatus(parentOptions);
        break;
      case 'stop':
        await stopService(parentOptions);
        break;
      case 'restart':
        await restartService(parentOptions);
        break;
      case 'logs':
        await showServiceLogs(options, parentOptions);
        break;
      default:
        throw new Error(`Unknown service action: ${action}`);
    }
  } catch (error) {
    logger.error(`Service ${action} failed`, { error: error.message });
    process.exit(1);
  }
}

/**
 * Show service status
 */
async function showServiceStatus(options) {
  console.log('=== BalmSharedMCP Service Status ===\n');

  const pidFile = join(process.cwd(), '.balm-shared-mcp.pid');
  const logFile = join(process.cwd(), 'balm-shared-mcp.log');

  if (!existsSync(pidFile)) {
    console.log('Status: ❌ Not running (no PID file found)');
    console.log('PID File: Not found');
    console.log('Log File:', existsSync(logFile) ? '✅ Available' : '❌ Not found');
    return;
  }

  try {
    const pid = parseInt(readFileSync(pidFile, 'utf8'));
    console.log(`PID: ${pid}`);
    console.log(`PID File: ${pidFile}`);

    // Check if process is actually running
    try {
      process.kill(pid, 0);
      console.log('Status: ✅ Running');

      // Get process information
      await getProcessInfo(pid);
    } catch (error) {
      console.log('Status: ❌ Not running (stale PID file)');
      console.log('Note: PID file exists but process is not running');
    }
  } catch (error) {
    console.log('Status: ❌ Error reading PID file');
    console.log(`Error: ${error.message}`);
  }

  // Log file information
  if (existsSync(logFile)) {
    const stats = await import('fs').then(fs => fs.promises.stat(logFile));
    console.log(`Log File: ✅ ${logFile}`);
    console.log(`Log Size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`Last Modified: ${stats.mtime.toISOString()}`);
  } else {
    console.log('Log File: ❌ Not found');
  }
}

/**
 * Get detailed process information
 */
async function getProcessInfo(pid) {
  try {
    // Get process info using ps command (Unix-like systems)
    const { execSync } = await import('child_process');

    try {
      const psOutput = execSync(`ps -p ${pid} -o pid,ppid,cpu,pmem,time,command`, {
        encoding: 'utf8'
      });

      const lines = psOutput.trim().split('\n');
      if (lines.length > 1) {
        console.log('\nProcess Information:');
        console.log(lines[0]); // Header
        console.log(lines[1]); // Process info
      }
    } catch (psError) {
      // ps command failed, try alternative approach
      console.log(`Uptime: Process running (PID ${pid})`);
    }

    // Memory usage
    const memUsage = process.memoryUsage();
    console.log('\nMemory Usage:');
    console.log(`  RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  } catch (error) {
    console.log('Process info: Unable to retrieve detailed information');
  }
}

/**
 * Stop the service
 */
async function stopService(options) {
  console.log('Stopping BalmSharedMCP service...');

  const pidFile = join(process.cwd(), '.balm-shared-mcp.pid');

  if (!existsSync(pidFile)) {
    console.log('❌ Service is not running (no PID file found)');
    return;
  }

  try {
    const pid = parseInt(readFileSync(pidFile, 'utf8'));
    console.log(`Found service running with PID: ${pid}`);

    // Try graceful shutdown first
    try {
      process.kill(pid, 'SIGTERM');
      console.log('Sent SIGTERM signal, waiting for graceful shutdown...');

      // Wait for process to exit
      await waitForProcessExit(pid, 10000); // 10 second timeout

      console.log('✅ Service stopped gracefully');
    } catch (error) {
      if (error.code === 'ESRCH') {
        console.log('⚠️  Process was already stopped');
      } else {
        console.log('⚠️  Graceful shutdown failed, forcing termination...');

        try {
          process.kill(pid, 'SIGKILL');
          console.log('✅ Service force stopped');
        } catch (killError) {
          if (killError.code === 'ESRCH') {
            console.log('✅ Process was already terminated');
          } else {
            throw killError;
          }
        }
      }
    }

    // Clean up PID file
    if (existsSync(pidFile)) {
      unlinkSync(pidFile);
      console.log('Cleaned up PID file');
    }
  } catch (error) {
    console.log(`❌ Failed to stop service: ${error.message}`);
    throw error;
  }
}

/**
 * Restart the service
 */
async function restartService(options) {
  console.log('Restarting BalmSharedMCP service...');

  // Stop the service first
  await stopService(options);

  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Start the service
  console.log('Starting service...');

  const { startServer } = await import('./start.js');
  await startServer({
    ...options,
    daemon: true
  });

  console.log('✅ Service restarted successfully');
}

/**
 * Show service logs
 */
async function showServiceLogs(options, parentOptions) {
  const logFile = join(process.cwd(), 'balm-shared-mcp.log');

  if (!existsSync(logFile)) {
    console.log('❌ Log file not found');
    console.log('Note: Service may not be running or logging to file');
    return;
  }

  const lines = parseInt(options.lines) || 100;
  const { follow } = options;

  console.log(`=== BalmSharedMCP Service Logs (last ${lines} lines) ===\n`);

  if (follow) {
    // Follow mode - tail the log file
    await followLogFile(logFile);
  } else {
    // Show last N lines
    await showLastLines(logFile, lines);
  }
}

/**
 * Show last N lines of log file
 */
async function showLastLines(logFile, lines) {
  try {
    const { execSync } = await import('child_process');
    const output = execSync(`tail -n ${lines} "${logFile}"`, { encoding: 'utf8' });
    console.log(output);
  } catch (error) {
    // Fallback to reading entire file if tail command fails
    try {
      const content = readFileSync(logFile, 'utf8');
      const allLines = content.split('\n');
      const lastLines = allLines.slice(-lines);
      console.log(lastLines.join('\n'));
    } catch (readError) {
      console.log(`❌ Failed to read log file: ${readError.message}`);
    }
  }
}

/**
 * Follow log file (like tail -f)
 */
async function followLogFile(logFile) {
  console.log('Following log file... (Press Ctrl+C to stop)\n');

  try {
    const { spawn } = await import('child_process');
    const tail = spawn('tail', ['-f', logFile]);

    tail.stdout.on('data', data => {
      process.stdout.write(data);
    });

    tail.stderr.on('data', data => {
      process.stderr.write(data);
    });

    tail.on('error', error => {
      console.log(`❌ Failed to follow log file: ${error.message}`);
    });

    // Handle Ctrl+C
    process.on('SIGINT', () => {
      console.log('\nStopping log follow...');
      tail.kill();
      process.exit(0);
    });
  } catch (error) {
    console.log(`❌ Failed to follow log file: ${error.message}`);
  }
}

/**
 * Wait for process to exit
 */
function waitForProcessExit(pid, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkProcess = () => {
      try {
        process.kill(pid, 0);

        // Process still exists
        if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for process to exit'));
        } else {
          setTimeout(checkProcess, 100);
        }
      } catch (error) {
        if (error.code === 'ESRCH') {
          // Process doesn't exist anymore
          resolve();
        } else {
          reject(error);
        }
      }
    };

    checkProcess();
  });
}
