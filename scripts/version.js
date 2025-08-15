#!/usr/bin/env node

/**
 * Version management script for BalmSharedMCP
 * Handles semantic versioning and changelog generation
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

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
  console.log(`✅ Updated version to ${newVersion}`);
}

/**
 * Generate changelog entry
 */
function generateChangelogEntry(version, type) {
  const date = new Date().toISOString().split('T')[0];
  const changelogPath = join(rootDir, 'CHANGELOG.md');
  
  let changelog = '';
  if (existsSync(changelogPath)) {
    changelog = readFileSync(changelogPath, 'utf8');
  } else {
    changelog = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';
  }

  // Get git commits since last tag
  let commits = [];
  try {
    const gitLog = execSync('git log --oneline --since="1 month ago"', { 
      cwd: rootDir, 
      encoding: 'utf8' 
    });
    commits = gitLog.trim().split('\n').filter(line => line.trim());
  } catch (error) {
    console.log('⚠️  Could not retrieve git commits');
  }

  // Generate entry
  const entry = `## [${version}] - ${date}

### ${getChangeTypeTitle(type)}

${commits.length > 0 ? 
  commits.map(commit => `- ${commit.substring(8)}`).join('\n') : 
  '- Version bump'
}

`;

  // Insert at the beginning (after header)
  const lines = changelog.split('\n');
  const headerEndIndex = lines.findIndex(line => line.startsWith('## '));
  
  if (headerEndIndex === -1) {
    // No previous entries
    changelog += '\n' + entry;
  } else {
    // Insert before first entry
    lines.splice(headerEndIndex, 0, entry);
    changelog = lines.join('\n');
  }

  writeFileSync(changelogPath, changelog);
  console.log(`✅ Updated CHANGELOG.md`);
}

/**
 * Get change type title
 */
function getChangeTypeTitle(type) {
  switch (type) {
    case 'major':
      return 'Breaking Changes';
    case 'minor':
      return 'Added';
    case 'patch':
      return 'Fixed';
    default:
      return 'Changed';
  }
}

/**
 * Increment version
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
 * Create version update mechanism
 */
function createVersionUpdateMechanism() {
  const updateScript = `#!/usr/bin/env node

/**
 * Auto-update mechanism for BalmSharedMCP
 * Checks for updates and provides update notifications
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

const packagePath = join(process.cwd(), 'package.json');
const packageInfo = JSON.parse(readFileSync(packagePath, 'utf8'));
const currentVersion = packageInfo.version;

console.log('🔍 Checking for updates...');

try {
  // Check npm registry for latest version
  const latestVersion = execSync('npm view balm-shared-mcp version', { 
    encoding: 'utf8' 
  }).trim();

  if (currentVersion !== latestVersion) {
    console.log(\`📦 Update available: \${currentVersion} → \${latestVersion}\`);
    console.log('Run: npm update balm-shared-mcp');
  } else {
    console.log('✅ You are using the latest version');
  }

} catch (error) {
  console.log('⚠️  Could not check for updates:', error.message);
}
`;

  const updateScriptPath = join(rootDir, 'scripts', 'check-updates.js');
  writeFileSync(updateScriptPath, updateScript);
  console.log('✅ Created update mechanism');
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'bump': {
      const type = args[1] || 'patch';
      const currentVersion = getCurrentVersion();
      const newVersion = incrementVersion(currentVersion, type);
      
      console.log(`Current version: ${currentVersion}`);
      console.log(`New version: ${newVersion}`);
      
      updateVersion(newVersion);
      generateChangelogEntry(newVersion, type);
      break;
    }
    
    case 'current': {
      const version = getCurrentVersion();
      console.log(version);
      break;
    }
    
    case 'changelog': {
      const version = args[1] || getCurrentVersion();
      const type = args[2] || 'patch';
      generateChangelogEntry(version, type);
      break;
    }
    
    case 'setup-updates': {
      createVersionUpdateMechanism();
      break;
    }
    
    default: {
      console.log('BalmSharedMCP Version Management');
      console.log('');
      console.log('Usage:');
      console.log('  node scripts/version.js bump [patch|minor|major]');
      console.log('  node scripts/version.js current');
      console.log('  node scripts/version.js changelog [version] [type]');
      console.log('  node scripts/version.js setup-updates');
      console.log('');
      console.log('Examples:');
      console.log('  node scripts/version.js bump patch');
      console.log('  node scripts/version.js bump minor');
      console.log('  node scripts/version.js current');
      break;
    }
  }
}

main();