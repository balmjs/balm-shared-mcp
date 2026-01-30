#!/usr/bin/env node

/**
 * Dependency Update Checker
 *
 * Checks for available updates to project dependencies.
 * Usage: npm run check-updates
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = '') {
  console.log(`${color}${message}${colors.reset}`);
}

function checkNpmAvailable() {
  try {
    execSync('npm --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function getInstalledVersion(packageName) {
  try {
    const result = execSync(`npm list ${packageName} --depth=0 --json`, {
      stdio: 'pipe',
      encoding: 'utf-8'
    });
    const data = JSON.parse(result);
    return data.dependencies?.[packageName]?.version || null;
  } catch {
    return null;
  }
}

function getLatestVersion(packageName) {
  try {
    const result = execSync(`npm view ${packageName} version`, {
      stdio: 'pipe',
      encoding: 'utf-8'
    });
    return result.trim();
  } catch {
    return null;
  }
}

function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    return null;
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10)
  };
}

function compareVersions(current, latest) {
  const curr = parseVersion(current);
  const lat = parseVersion(latest);

  if (!curr || !lat) {
    return 'unknown';
  }

  if (lat.major > curr.major) {
    return 'major';
  }
  if (lat.minor > curr.minor) {
    return 'minor';
  }
  if (lat.patch > curr.patch) {
    return 'patch';
  }
  return 'up-to-date';
}

function checkUpdates() {
  log('\n📦 Checking for dependency updates...\n', colors.bold);

  if (!checkNpmAvailable()) {
    log('❌ npm is not available', colors.red);
    process.exit(1);
  }

  // Read package.json
  const packageJsonPath = join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };

  const updates = {
    major: [],
    minor: [],
    patch: [],
    upToDate: [],
    errors: []
  };

  const packages = Object.keys(allDeps);
  let processed = 0;

  for (const pkg of packages) {
    processed++;
    process.stdout.write(`\rChecking ${processed}/${packages.length}: ${pkg.padEnd(40)}`);

    const installed = getInstalledVersion(pkg);
    const latest = getLatestVersion(pkg);

    if (!installed || !latest) {
      updates.errors.push({ name: pkg, installed, latest });
      continue;
    }

    const updateType = compareVersions(installed, latest);

    const info = {
      name: pkg,
      installed,
      latest,
      wanted: allDeps[pkg]
    };

    switch (updateType) {
      case 'major':
        updates.major.push(info);
        break;
      case 'minor':
        updates.minor.push(info);
        break;
      case 'patch':
        updates.patch.push(info);
        break;
      default:
        updates.upToDate.push(info);
    }
  }

  // Clear the progress line
  process.stdout.write(`\r${' '.repeat(60)}\r`);

  // Print results
  log('\n📊 Update Summary\n', colors.bold);

  if (updates.major.length > 0) {
    log(`🔴 Major Updates (${updates.major.length}):`, colors.red);
    for (const pkg of updates.major) {
      log(`   ${pkg.name}: ${pkg.installed} → ${pkg.latest}`, colors.red);
    }
    log('');
  }

  if (updates.minor.length > 0) {
    log(`🟡 Minor Updates (${updates.minor.length}):`, colors.yellow);
    for (const pkg of updates.minor) {
      log(`   ${pkg.name}: ${pkg.installed} → ${pkg.latest}`, colors.yellow);
    }
    log('');
  }

  if (updates.patch.length > 0) {
    log(`🟢 Patch Updates (${updates.patch.length}):`, colors.green);
    for (const pkg of updates.patch) {
      log(`   ${pkg.name}: ${pkg.installed} → ${pkg.latest}`, colors.green);
    }
    log('');
  }

  if (updates.errors.length > 0) {
    log(`⚠️  Errors (${updates.errors.length}):`, colors.cyan);
    for (const pkg of updates.errors) {
      log(`   ${pkg.name}: Could not check version`, colors.cyan);
    }
    log('');
  }

  // Summary
  const totalUpdates = updates.major.length + updates.minor.length + updates.patch.length;
  log('─'.repeat(50));

  if (totalUpdates === 0) {
    log('✅ All dependencies are up to date!', colors.green);
  } else {
    log(`📈 ${totalUpdates} updates available`, colors.bold);
    log(`   ${updates.upToDate.length} packages up to date`);

    if (updates.major.length > 0) {
      log('\n💡 To update major versions, run:', colors.cyan);
      log('   npm install <package>@latest');
    }

    if (updates.minor.length + updates.patch.length > 0) {
      log('\n💡 To update minor/patch versions, run:', colors.cyan);
      log('   npm update');
    }
  }

  log('');
}

// Run the check
checkUpdates();
