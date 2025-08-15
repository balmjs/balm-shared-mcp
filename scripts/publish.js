#!/usr/bin/env node

/**
 * Publish script for BalmSharedMCP
 * Handles npm package publishing with version management
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('📦 BalmSharedMCP Publishing Tool\n');

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
 * Check if working directory is clean
 */
function checkWorkingDirectory() {
  try {
    const status = execSync('git status --porcelain', { 
      cwd: rootDir, 
      encoding: 'utf8' 
    });
    return status.trim() === '';
  } catch (error) {
    console.log('⚠️  Git not available, skipping working directory check');
    return true;
  }
}

/**
 * Create git tag
 */
function createGitTag(version) {
  try {
    execSync(`git add .`, { cwd: rootDir });
    execSync(`git commit -m "Release v${version}"`, { cwd: rootDir });
    execSync(`git tag -a v${version} -m "Release v${version}"`, { cwd: rootDir });
    console.log(`✅ Created git tag: v${version}`);
  } catch (error) {
    console.log('⚠️  Failed to create git tag:', error.message);
  }
}

/**
 * Main publishing workflow
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run');
    const skipBuild = args.includes('--skip-build');
    const skipTests = args.includes('--skip-tests');

    console.log('Current directory:', rootDir);
    console.log('Dry run mode:', isDryRun ? 'ON' : 'OFF');
    console.log();

    // Check working directory
    if (!checkWorkingDirectory()) {
      console.log('❌ Working directory is not clean. Please commit or stash changes.');
      process.exit(1);
    }

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

    // Run tests
    if (!skipTests) {
      console.log('\n2. Running tests...');
      try {
        execSync('npm run test:publish', { cwd: rootDir, stdio: 'inherit' });
        console.log('✅ Tests passed');
      } catch (error) {
        console.log('⚠️  Tests failed, but continuing with publish...');
        console.log('   Use --skip-tests to skip tests entirely');
        const continueAnyway = await askQuestion('Continue publishing despite test failures? (y/N): ');
        if (!continueAnyway.toLowerCase().startsWith('y')) {
          console.log('Publishing cancelled due to test failures');
          process.exit(1);
        }
      }
    } else {
      console.log('\n2. Skipping tests...');
    }

    // Build package
    if (!skipBuild) {
      console.log('\n3. Building package...');
      execSync('node scripts/build.js', { cwd: rootDir, stdio: 'inherit' });
      console.log('✅ Package built');
    } else {
      console.log('\n3. Skipping build...');
    }

    // Create git tag
    console.log('\n4. Creating git tag...');
    if (!isDryRun) {
      createGitTag(newVersion);
    } else {
      console.log('🔍 Dry run: Would create git tag v' + newVersion);
    }

    // Publish to npm
    console.log('\n5. Publishing to npm...');
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

    // Push git changes
    if (!isDryRun) {
      console.log('\n6. Pushing git changes...');
      try {
        execSync('git push origin main', { cwd: rootDir });
        execSync('git push origin --tags', { cwd: rootDir });
        console.log('✅ Git changes pushed');
      } catch (error) {
        console.log('⚠️  Failed to push git changes:', error.message);
      }
    }

    console.log('\n🎉 Publishing workflow completed!');
    console.log(`📦 Package: balm-shared-mcp@${newVersion}`);
    
    if (!isDryRun) {
      console.log('🔗 Install with: npm install balm-shared-mcp');
    }

  } catch (error) {
    console.error('\n❌ Publishing failed:', error.message);
    process.exit(1);
  }
}

// Show help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: node scripts/publish.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --dry-run      Perform a dry run without actual publishing');
  console.log('  --skip-build   Skip the build step');
  console.log('  --skip-tests   Skip running tests');
  console.log('  --help, -h     Show this help message');
  process.exit(0);
}

main().catch(console.error);