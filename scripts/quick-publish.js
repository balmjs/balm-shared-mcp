#!/usr/bin/env node

/**
 * Quick publish script for BalmSharedMCP
 * Skips problematic tests and builds for quick testing
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🚀 BalmSharedMCP Quick Publishing Tool\n');

/**
 * Ask user a question
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

/**
 * Get current version from package.json
 */
function getCurrentVersion() {
  const packagePath = join(rootDir, 'package.json');
  const packageInfo = JSON.parse(readFileSync(packagePath, 'utf8'));
  return packageInfo.version;
}

/**
 * Update version in package.json
 */
function updateVersion(newVersion) {
  const packagePath = join(rootDir, 'package.json');
  const packageInfo = JSON.parse(readFileSync(packagePath, 'utf8'));
  packageInfo.version = newVersion;
  writeFileSync(packagePath, JSON.stringify(packageInfo, null, 2) + '\n');
  return newVersion;
}

/**
 * Increment version based on type
 */
function incrementVersion(currentVersion, type) {
  const parts = currentVersion.split('.').map(Number);
  
  switch (type) {
    case 'patch':
      parts[2]++;
      break;
    case 'minor':
      parts[1]++;
      parts[2] = 0;
      break;
    case 'major':
      parts[0]++;
      parts[1] = 0;
      parts[2] = 0;
      break;
    default:
      throw new Error(`Invalid version type: ${type}`);
  }
  
  return parts.join('.');
}

/**
 * Main publishing workflow
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run');

    console.log('Current directory:', rootDir);
    console.log('Dry run mode:', isDryRun ? 'ON' : 'OFF');
    console.log();

    // Get current version
    const currentVersion = getCurrentVersion();
    console.log(`Current version: ${currentVersion}`);

    // Ask for version increment type
    console.log('\nVersion increment options:');
    console.log('1. patch (x.x.X) - Bug fixes');
    console.log('2. minor (x.X.x) - New features');
    console.log('3. major (X.x.x) - Breaking changes');
    console.log('4. custom - Enter custom version');

    const versionChoice = await askQuestion('Select version increment (1-4): ');
    let newVersion;

    switch (versionChoice) {
      case '1':
        newVersion = incrementVersion(currentVersion, 'patch');
        break;
      case '2':
        newVersion = incrementVersion(currentVersion, 'minor');
        break;
      case '3':
        newVersion = incrementVersion(currentVersion, 'major');
        break;
      case '4':
        newVersion = await askQuestion('Enter custom version: ');
        break;
      default:
        console.log('❌ Invalid choice');
        process.exit(1);
    }

    console.log(`\nNew version will be: ${newVersion}`);
    const confirm = await askQuestion('Continue with publishing? (y/N): ');
    
    if (!confirm.toLowerCase().startsWith('y')) {
      console.log('Publishing cancelled');
      process.exit(0);
    }

    // Update version
    console.log('\n1. Updating version...');
    updateVersion(newVersion);
    console.log(`✅ Version updated to ${newVersion}`);

    // Skip tests for quick publish
    console.log('\n2. Skipping tests for quick publish...');
    console.log('⚠️  Tests skipped - use full publish for production');

    // Skip build for quick publish
    console.log('\n3. Skipping build for quick publish...');
    console.log('⚠️  Build skipped - publishing source directly');

    // Publish to npm
    console.log('\n4. Publishing to npm...');
    const publishCommand = isDryRun ? 
      'npm publish --dry-run' : 
      'npm publish';

    if (!isDryRun) {
      const npmConfirm = await askQuestion('Publish to npm registry? (y/N): ');
      if (!npmConfirm.toLowerCase().startsWith('y')) {
        console.log('npm publishing cancelled');
        process.exit(0);
      }
    }

    execSync(publishCommand, { cwd: rootDir, stdio: 'inherit' });
    
    if (isDryRun) {
      console.log('🔍 Dry run completed - no actual publishing performed');
    } else {
      console.log('✅ Package published successfully!');
    }

    console.log('\n🎉 Quick publishing workflow completed!');
    console.log(`📦 Package: balm-shared-mcp@${newVersion}`);
    
    if (!isDryRun) {
      console.log('🔗 Install with: npm install balm-shared-mcp');
      console.log('⚠️  This was a quick publish - consider running full tests later');
    }

  } catch (error) {
    console.error('\n❌ Publishing failed:', error.message);
    process.exit(1);
  }
}

// Show help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: node scripts/quick-publish.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --dry-run      Perform a dry run without actual publishing');
  console.log('  --help, -h     Show this help message');
  console.log('');
  console.log('This script skips tests and builds for quick testing purposes.');
  console.log('Use the regular publish script for production releases.');
  process.exit(0);
}

main().catch(console.error);