#!/usr/bin/env node

/**
 * Safe Dependency Upgrade Script
 *
 * Upgrades dependencies in a safe, controlled manner with testing.
 * Usage: npm run upgrade:safe
 */

import { execSync } from 'child_process';
import { copyFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = '') {
  console.log(`${color}${message}${colors.reset}`);
}

function run(cmd, options = {}) {
  try {
    const result = execSync(cmd, { encoding: 'utf-8', ...options });
    return result !== null ? result : true; // Return true for stdio: inherit
  } catch {
    return false;
  }
}

// Packages grouped by risk level
const upgradeGroups = {
  // Low risk - dev tools only
  safe: ['commander', '@types/node', 'globals', 'lint-staged', 'eslint-config-prettier'],

  // Medium risk - testing only
  testing: ['vitest', '@vitest/coverage-v8'],

  // High risk - core functionality
  risky: ['zod', '@modelcontextprotocol/sdk']
};

async function main() {
  const args = process.argv.slice(2);
  const group = args[0] || 'safe';
  const dryRun = args.includes('--dry-run');

  log('\n🔄 Safe Dependency Upgrade Script\n', colors.bold);

  if (!['safe', 'testing', 'risky', 'all'].includes(group)) {
    log('Usage: node scripts/safe-upgrade.js [safe|testing|risky|all] [--dry-run]', colors.yellow);
    log('\nGroups:', colors.cyan);
    log('  safe     - Low risk dev dependencies (recommended first)');
    log('  testing  - Vitest & coverage (medium risk)');
    log('  risky    - Core deps like zod & MCP SDK (high risk)');
    log('  all      - All packages (not recommended)');
    process.exit(1);
  }

  // Backup package.json and package-lock.json
  const packageJsonPath = join(__dirname, '..', 'package.json');
  const lockfilePath = join(__dirname, '..', 'package-lock.json');
  const backupDir = join(__dirname, '..', '.upgrade-backup');

  if (!dryRun) {
    log('📦 Creating backup...', colors.cyan);
    run(`mkdir -p ${backupDir}`);
    copyFileSync(packageJsonPath, join(backupDir, 'package.json'));
    if (run(`test -f ${lockfilePath}`)) {
      copyFileSync(lockfilePath, join(backupDir, 'package-lock.json'));
    }
  }

  // Get packages to upgrade
  let packages = [];
  if (group === 'all') {
    packages = [...upgradeGroups.safe, ...upgradeGroups.testing, ...upgradeGroups.risky];
  } else {
    packages = upgradeGroups[group];
  }

  log(`\n📋 Packages to upgrade (${group}):`, colors.bold);
  packages.forEach(pkg => log(`   - ${pkg}`));

  if (dryRun) {
    log('\n🔍 Dry run mode - no changes will be made\n', colors.yellow);
    return;
  }

  // Upgrade packages
  log('\n⬆️  Upgrading packages...', colors.cyan);
  const upgradeCmd = `npm install ${packages.map(p => `${p}@latest`).join(' ')}`;
  log(`   Running: ${upgradeCmd}`, colors.cyan);

  const upgradeResult = run(upgradeCmd, { cwd: join(__dirname, '..'), stdio: 'inherit' });

  if (upgradeResult === false) {
    log('\n❌ Upgrade failed!', colors.red);
    log('📦 Restoring backup...', colors.yellow);
    copyFileSync(join(backupDir, 'package.json'), packageJsonPath);
    process.exit(1);
  }

  // Run tests
  log('\n🧪 Running tests...', colors.cyan);
  const testResult = run('npm test -- --run', { cwd: join(__dirname, '..'), stdio: 'inherit' });

  if (testResult === false) {
    log('\n❌ Tests failed after upgrade!', colors.red);
    log('\nOptions:', colors.yellow);
    log('  1. Fix the failing tests');
    log('  2. Rollback with: npm run upgrade:rollback');
    process.exit(1);
  }

  // Run lint
  log('\n🔍 Running lint...', colors.cyan);
  const lintResult = run('npm run lint', { cwd: join(__dirname, '..'), stdio: 'inherit' });

  if (lintResult === false) {
    log('\n⚠️  Lint failed, but upgrade was successful', colors.yellow);
  }

  log('\n✅ Upgrade successful!', colors.green);
  log('\n💡 Next steps:', colors.cyan);
  log('  1. Review the changes: git diff package.json');
  log('  2. Test your application manually');
  log('  3. Commit the changes if everything works');
  log('\n📦 Backup stored in: .upgrade-backup/', colors.cyan);
}

main().catch(err => {
  log(`\n❌ Error: ${err.message}`, colors.red);
  process.exit(1);
});
