/**
 * Monitor command implementation
 * Real-time monitoring of server performance and status
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../../utils/logger.js';

/**
 * Monitor server performance and status
 * @param {Object} options - Command options
 */
export async function monitor(options) {
  try {
    const interval = parseInt(options.interval) * 1000;
    const outputFormat = options.output || 'console';

    logger.info('Starting server monitoring...', { interval, outputFormat });

    console.log('=== BalmSharedMCP Server Monitor ===\n');
    console.log(`Monitoring interval: ${options.interval}s`);
    console.log(`Output format: ${outputFormat}`);
    console.log('Press Ctrl+C to stop monitoring\n');

    // Initialize monitoring
    const monitor = new ServerMonitor(options);
    await monitor.start(interval, outputFormat);
  } catch (error) {
    logger.error('Monitoring failed', { error: error.message });
    process.exit(1);
  }
}

/**
 * Server monitoring class
 */
class ServerMonitor {
  constructor(options) {
    this.options = options;
    this.pidFile = join(process.cwd(), '.balm-shared-mcp.pid');
    this.logFile = join(process.cwd(), 'balm-shared-mcp.log');
    this.startTime = Date.now();
    this.previousStats = null;
    this.running = false;
  }

  /**
   * Start monitoring
   */
  async start(interval, outputFormat) {
    this.running = true;

    // Handle Ctrl+C
    process.on('SIGINT', () => {
      console.log('\nStopping monitor...');
      this.running = false;
      process.exit(0);
    });

    // Initial header for console output
    if (outputFormat === 'console') {
      this.printConsoleHeader();
    }

    // Monitoring loop
    while (this.running) {
      try {
        const stats = await this.collectStats();
        this.outputStats(stats, outputFormat);
        this.previousStats = stats;

        await this.sleep(interval);
      } catch (error) {
        logger.error('Error collecting stats', { error: error.message });
        await this.sleep(interval);
      }
    }
  }

  /**
   * Collect server statistics
   */
  async collectStats() {
    const timestamp = new Date();
    const stats = {
      timestamp: timestamp.toISOString(),
      uptime: Date.now() - this.startTime,
      server: await this.getServerStats(),
      system: await this.getSystemStats(),
      logs: await this.getLogStats()
    };

    return stats;
  }

  /**
   * Get server-specific statistics
   */
  async getServerStats() {
    const serverStats = {
      status: 'unknown',
      pid: null,
      memory: null,
      cpu: null
    };

    try {
      if (existsSync(this.pidFile)) {
        const pid = parseInt(readFileSync(this.pidFile, 'utf8'));
        serverStats.pid = pid;

        // Check if process is running
        try {
          process.kill(pid, 0);
          serverStats.status = 'running';

          // Get process stats
          const processStats = await this.getProcessStats(pid);
          serverStats.memory = processStats.memory;
          serverStats.cpu = processStats.cpu;
        } catch (error) {
          serverStats.status = 'stopped';
        }
      } else {
        serverStats.status = 'stopped';
      }
    } catch (error) {
      serverStats.status = 'error';
    }

    return serverStats;
  }

  /**
   * Get system statistics
   */
  async getSystemStats() {
    const systemStats = {
      memory: process.memoryUsage(),
      loadAverage: null,
      diskUsage: null
    };

    try {
      // Load average (Unix-like systems)
      const os = await import('os');
      systemStats.loadAverage = os.loadavg();
    } catch (error) {
      // Load average not available
    }

    try {
      // Disk usage
      const { execSync } = await import('child_process');
      const dfOutput = execSync('df -h .', { encoding: 'utf8' });
      const lines = dfOutput.split('\n');
      if (lines.length > 1) {
        const parts = lines[1].split(/\s+/);
        systemStats.diskUsage = {
          total: parts[1],
          used: parts[2],
          available: parts[3],
          percentage: parts[4]
        };
      }
    } catch (error) {
      // Disk usage not available
    }

    return systemStats;
  }

  /**
   * Get log file statistics
   */
  async getLogStats() {
    const logStats = {
      exists: false,
      size: 0,
      lastModified: null,
      recentErrors: 0
    };

    try {
      if (existsSync(this.logFile)) {
        logStats.exists = true;

        const fs = await import('fs');
        const stats = await fs.promises.stat(this.logFile);
        logStats.size = stats.size;
        logStats.lastModified = stats.mtime;

        // Count recent errors (last 1 minute)
        logStats.recentErrors = await this.countRecentErrors();
      }
    } catch (error) {
      // Log stats not available
    }

    return logStats;
  }

  /**
   * Get process statistics for given PID
   */
  async getProcessStats(pid) {
    const processStats = {
      memory: null,
      cpu: null
    };

    try {
      const { execSync } = await import('child_process');
      const psOutput = execSync(`ps -p ${pid} -o pid,pcpu,pmem,rss,vsz`, { encoding: 'utf8' });

      const lines = psOutput.trim().split('\n');
      if (lines.length > 1) {
        const parts = lines[1].trim().split(/\s+/);
        processStats.cpu = parseFloat(parts[1]);
        processStats.memory = {
          percent: parseFloat(parts[2]),
          rss: parseInt(parts[3]) * 1024, // Convert KB to bytes
          vsz: parseInt(parts[4]) * 1024
        };
      }
    } catch (error) {
      // Process stats not available
    }

    return processStats;
  }

  /**
   * Count recent errors in log file
   */
  async countRecentErrors() {
    try {
      const oneMinuteAgo = Date.now() - 60000;
      const { execSync } = await import('child_process');

      // Use grep to find recent error lines
      const grepOutput = execSync(
        `grep -i "error\\|failed\\|exception" "${this.logFile}" | tail -100`,
        { encoding: 'utf8' }
      );

      const errorLines = grepOutput.split('\n').filter(line => line.trim());

      // Simple heuristic: count errors in recent lines
      return Math.min(errorLines.length, 10);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Output statistics in specified format
   */
  outputStats(stats, format) {
    switch (format) {
      case 'json':
        console.log(JSON.stringify(stats));
        break;
      case 'csv':
        this.outputCSV(stats);
        break;
      case 'console':
      default:
        this.outputConsole(stats);
        break;
    }
  }

  /**
   * Print console header
   */
  printConsoleHeader() {
    console.log(
      `${
        'Time'.padEnd(12) +
        'Status'.padEnd(10) +
        'PID'.padEnd(8) +
        'CPU%'.padEnd(8) +
        'Memory'.padEnd(12) +
        'Errors'.padEnd(8)
      }Load Avg`
    );
    console.log('-'.repeat(70));
  }

  /**
   * Output statistics to console
   */
  outputConsole(stats) {
    const time = new Date(stats.timestamp).toLocaleTimeString();
    const status = this.getStatusEmoji(stats.server.status);
    const pid = stats.server.pid || 'N/A';
    const cpu = stats.server.cpu ? `${stats.server.cpu.toFixed(1)}%` : 'N/A';
    const memory = stats.server.memory
      ? `${(stats.server.memory.rss / 1024 / 1024).toFixed(0)}MB`
      : 'N/A';
    const errors = stats.logs.recentErrors || 0;
    const loadAvg = stats.system.loadAverage
      ? stats.system.loadAverage.map(l => l.toFixed(2)).join(',')
      : 'N/A';

    console.log(
      time.padEnd(12) +
        status.padEnd(10) +
        pid.toString().padEnd(8) +
        cpu.padEnd(8) +
        memory.padEnd(12) +
        errors.toString().padEnd(8) +
        loadAvg
    );
  }

  /**
   * Output statistics as CSV
   */
  outputCSV(stats) {
    if (!this.csvHeaderPrinted) {
      console.log('timestamp,status,pid,cpu_percent,memory_mb,recent_errors,load_avg_1m');
      this.csvHeaderPrinted = true;
    }

    const values = [
      stats.timestamp,
      stats.server.status,
      stats.server.pid || '',
      stats.server.cpu || '',
      stats.server.memory ? (stats.server.memory.rss / 1024 / 1024).toFixed(0) : '',
      stats.logs.recentErrors || 0,
      stats.system.loadAverage ? stats.system.loadAverage[0].toFixed(2) : ''
    ];

    console.log(values.join(','));
  }

  /**
   * Get status emoji
   */
  getStatusEmoji(status) {
    switch (status) {
      case 'running':
        return '✅ Running';
      case 'stopped':
        return '❌ Stopped';
      case 'error':
        return '⚠️  Error';
      default:
        return '❓ Unknown';
    }
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
