/**
 * Health check command implementation
 * Performs comprehensive health checks on the MCP server
 */

import { existsSync, readFileSync } from 'fs';
import { resolve, join } from 'path';
import { spawn } from 'child_process';
import { loadConfig } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Perform health check on the server
 * @param {Object} options - Command options
 */
export async function healthCheck(options) {
  try {
    logger.info('Starting health check...');

    const timeout = parseInt(options.timeout) * 1000;
    const { verbose } = options;

    const results = {
      overall: 'healthy',
      checks: [],
      timestamp: new Date().toISOString(),
      duration: 0
    };

    const startTime = Date.now();

    // Run all health checks
    await Promise.all([
      checkConfiguration(options, results, verbose),
      checkDependencies(results, verbose),
      checkBalmSharedLibrary(options, results, verbose),
      checkServerProcess(results, verbose),
      checkFileSystem(results, verbose),
      checkMemoryUsage(results, verbose),
      checkNetworkConnectivity(results, verbose)
    ]);

    results.duration = Date.now() - startTime;

    // Determine overall health status
    const failedChecks = results.checks.filter(check => check.status === 'failed');
    const warningChecks = results.checks.filter(check => check.status === 'warning');

    if (failedChecks.length > 0) {
      results.overall = 'unhealthy';
    } else if (warningChecks.length > 0) {
      results.overall = 'degraded';
    }

    // Display results
    displayHealthResults(results, verbose);

    // Exit with appropriate code
    if (results.overall === 'unhealthy') {
      process.exit(1);
    } else if (results.overall === 'degraded') {
      process.exit(2);
    }
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    process.exit(1);
  }
}

/**
 * Check configuration validity
 */
async function checkConfiguration(options, results, verbose) {
  const check = {
    name: 'Configuration',
    status: 'passed',
    message: 'Configuration is valid',
    details: {}
  };

  try {
    const config = options.config ? await loadConfig(resolve(options.config)) : await loadConfig();

    check.details.configPath = config._configPath || 'default';
    check.details.sharedProjectPath = config.sharedProjectPath;

    // Validate required configuration
    if (!config.sharedProjectPath) {
      check.status = 'failed';
      check.message = 'BalmShared library path not configured';
    } else if (!existsSync(config.sharedProjectPath)) {
      check.status = 'failed';
      check.message = 'BalmShared library path does not exist';
    }
  } catch (error) {
    check.status = 'failed';
    check.message = `Configuration error: ${error.message}`;
  }

  results.checks.push(check);
}

/**
 * Check Node.js dependencies
 */
async function checkDependencies(results, verbose) {
  const check = {
    name: 'Dependencies',
    status: 'passed',
    message: 'All dependencies are available',
    details: {}
  };

  try {
    // Check Node.js version
    const nodeVersion = process.version;
    check.details.nodeVersion = nodeVersion;

    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (majorVersion < 18) {
      check.status = 'warning';
      check.message = `Node.js version ${nodeVersion} is below recommended 18.x`;
    }

    // Check package.json and dependencies
    const packagePath = join(process.cwd(), 'package.json');
    if (existsSync(packagePath)) {
      const packageInfo = JSON.parse(readFileSync(packagePath, 'utf8'));
      check.details.packageVersion = packageInfo.version;

      // Check critical dependencies
      const criticalDeps = ['@modelcontextprotocol/sdk', 'handlebars', 'zod'];
      const missingDeps = [];

      for (const dep of criticalDeps) {
        try {
          await import(dep);
        } catch (error) {
          missingDeps.push(dep);
        }
      }

      if (missingDeps.length > 0) {
        check.status = 'failed';
        check.message = `Missing dependencies: ${missingDeps.join(', ')}`;
        check.details.missingDependencies = missingDeps;
      }
    } else {
      check.status = 'warning';
      check.message = 'package.json not found';
    }
  } catch (error) {
    check.status = 'failed';
    check.message = `Dependency check error: ${error.message}`;
  }

  results.checks.push(check);
}

/**
 * Check BalmShared library accessibility
 */
async function checkBalmSharedLibrary(options, results, verbose) {
  const check = {
    name: 'BalmShared Library',
    status: 'passed',
    message: 'BalmShared library is accessible',
    details: {}
  };

  try {
    const config = options.config ? await loadConfig(resolve(options.config)) : await loadConfig();

    if (!config.sharedProjectPath) {
      check.status = 'failed';
      check.message = 'BalmShared library path not configured';
      results.checks.push(check);
      return;
    }

    const libraryPath = config.sharedProjectPath;
    check.details.libraryPath = libraryPath;

    if (!existsSync(libraryPath)) {
      check.status = 'failed';
      check.message = 'BalmShared library path does not exist';
      results.checks.push(check);
      return;
    }

    // Check package.json
    const packagePath = join(libraryPath, 'package.json');
    if (existsSync(packagePath)) {
      const packageInfo = JSON.parse(readFileSync(packagePath, 'utf8'));
      check.details.libraryVersion = packageInfo.version;
      check.details.libraryName = packageInfo.name;
    }

    // Check for essential directories
    const essentialDirs = ['src', 'lib', 'dist'];
    const existingDirs = essentialDirs.filter(dir => existsSync(join(libraryPath, dir)));

    check.details.availableDirectories = existingDirs;

    if (existingDirs.length === 0) {
      check.status = 'warning';
      check.message = 'No standard directories found in BalmShared library';
    }
  } catch (error) {
    check.status = 'failed';
    check.message = `BalmShared library check error: ${error.message}`;
  }

  results.checks.push(check);
}

/**
 * Check if server process is running
 */
async function checkServerProcess(results, verbose) {
  const check = {
    name: 'Server Process',
    status: 'passed',
    message: 'Server process status checked',
    details: {}
  };

  try {
    const pidFile = join(process.cwd(), '.balm-shared-mcp.pid');

    if (existsSync(pidFile)) {
      const pid = parseInt(readFileSync(pidFile, 'utf8'));
      check.details.pid = pid;

      try {
        process.kill(pid, 0); // Check if process exists
        check.message = 'Server is running as daemon';
        check.details.status = 'running';
      } catch (error) {
        check.status = 'warning';
        check.message = 'PID file exists but process is not running';
        check.details.status = 'stale_pid';
      }
    } else {
      check.details.status = 'not_running';
      check.message = 'Server is not running as daemon';
    }
  } catch (error) {
    check.status = 'failed';
    check.message = `Process check error: ${error.message}`;
  }

  results.checks.push(check);
}

/**
 * Check file system permissions and disk space
 */
async function checkFileSystem(results, verbose) {
  const check = {
    name: 'File System',
    status: 'passed',
    message: 'File system is accessible',
    details: {}
  };

  try {
    const cwd = process.cwd();
    check.details.workingDirectory = cwd;

    // Check write permissions
    const testFile = join(cwd, '.health-check-test');
    try {
      writeFileSync(testFile, 'test');
      unlinkSync(testFile);
      check.details.writePermissions = true;
    } catch (error) {
      check.status = 'failed';
      check.message = 'No write permissions in working directory';
      check.details.writePermissions = false;
    }

    // Check disk space (if available)
    try {
      const { execSync } = await import('child_process');
      const dfOutput = execSync('df -h .', { encoding: 'utf8' });
      const lines = dfOutput.split('\n');
      if (lines.length > 1) {
        const parts = lines[1].split(/\s+/);
        check.details.diskUsage = {
          total: parts[1],
          used: parts[2],
          available: parts[3],
          percentage: parts[4]
        };

        const usagePercent = parseInt(parts[4]);
        if (usagePercent > 90) {
          check.status = 'warning';
          check.message = `Disk usage is high: ${parts[4]}`;
        }
      }
    } catch (error) {
      // Disk space check is optional
      check.details.diskSpaceCheck = 'unavailable';
    }
  } catch (error) {
    check.status = 'failed';
    check.message = `File system check error: ${error.message}`;
  }

  results.checks.push(check);
}

/**
 * Check memory usage
 */
async function checkMemoryUsage(results, verbose) {
  const check = {
    name: 'Memory Usage',
    status: 'passed',
    message: 'Memory usage is normal',
    details: {}
  };

  try {
    const memUsage = process.memoryUsage();
    const formatBytes = bytes => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

    check.details.memoryUsage = {
      rss: formatBytes(memUsage.rss),
      heapTotal: formatBytes(memUsage.heapTotal),
      heapUsed: formatBytes(memUsage.heapUsed),
      external: formatBytes(memUsage.external)
    };

    // Check if memory usage is concerning
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    if (heapUsedMB > 512) {
      check.status = 'warning';
      check.message = `High memory usage: ${formatBytes(memUsage.heapUsed)}`;
    }
  } catch (error) {
    check.status = 'failed';
    check.message = `Memory check error: ${error.message}`;
  }

  results.checks.push(check);
}

/**
 * Check network connectivity (if in HTTP mode)
 */
async function checkNetworkConnectivity(results, verbose) {
  const check = {
    name: 'Network Connectivity',
    status: 'passed',
    message: 'Network connectivity checked',
    details: {}
  };

  try {
    // This is a basic check - in a real implementation,
    // you might want to test actual HTTP endpoints
    check.details.mode = 'stdio';
    check.message = 'Running in STDIO mode, network check skipped';
  } catch (error) {
    check.status = 'failed';
    check.message = `Network check error: ${error.message}`;
  }

  results.checks.push(check);
}

/**
 * Display health check results
 */
function displayHealthResults(results, verbose) {
  console.log('\n=== BalmSharedMCP Health Check Results ===\n');

  // Overall status
  const statusEmoji = {
    healthy: '✅',
    degraded: '⚠️',
    unhealthy: '❌'
  };

  console.log(`Overall Status: ${statusEmoji[results.overall]} ${results.overall.toUpperCase()}`);
  console.log(`Duration: ${results.duration}ms`);
  console.log(`Timestamp: ${results.timestamp}\n`);

  // Individual checks
  results.checks.forEach(check => {
    const emoji = check.status === 'passed' ? '✅' : check.status === 'warning' ? '⚠️' : '❌';

    console.log(`${emoji} ${check.name}: ${check.message}`);

    if (verbose && check.details && Object.keys(check.details).length > 0) {
      Object.entries(check.details).forEach(([key, value]) => {
        console.log(`   ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
      });
    }
  });

  console.log();

  // Summary
  const passed = results.checks.filter(c => c.status === 'passed').length;
  const warnings = results.checks.filter(c => c.status === 'warning').length;
  const failed = results.checks.filter(c => c.status === 'failed').length;

  console.log(`Summary: ${passed} passed, ${warnings} warnings, ${failed} failed`);
}
