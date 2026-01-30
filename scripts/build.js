#!/usr/bin/env node

/**
 * Build script for BalmSharedMCP
 * Prepares the package for distribution
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, copyFileSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🏗️  Building BalmSharedMCP package...\n');

try {
  // Clean previous build
  console.log('1. Cleaning previous build...');
  if (existsSync(join(rootDir, 'dist'))) {
    execSync('rm -rf dist', { cwd: rootDir });
  }
  mkdirSync(join(rootDir, 'dist'), { recursive: true });

  // Run tests
  console.log('2. Running tests...');
  try {
    execSync('npm run test:publish', { cwd: rootDir, stdio: 'inherit' });
  } catch {
    console.log('⚠️  Some tests failed, but continuing build...');
  }

  // Run linting
  console.log('3. Running linter...');
  execSync('npm run lint', { cwd: rootDir, stdio: 'inherit' });

  // Format code
  console.log('4. Formatting code...');
  execSync('npm run format', { cwd: rootDir, stdio: 'inherit' });

  // Copy source files
  console.log('5. Copying source files...');
  execSync('cp -r src dist/', { cwd: rootDir });

  // Copy essential files
  console.log('6. Copying essential files...');
  const essentialFiles = ['package.json', 'README.md', 'LICENSE'];
  essentialFiles.forEach(file => {
    if (existsSync(join(rootDir, file))) {
      copyFileSync(join(rootDir, file), join(rootDir, 'dist', file));
    }
  });

  // Update package.json for distribution
  console.log('7. Updating package.json for distribution...');
  const packagePath = join(rootDir, 'dist', 'package.json');
  const packageInfo = JSON.parse(readFileSync(packagePath, 'utf8'));

  // Remove dev dependencies and scripts not needed in production
  delete packageInfo.devDependencies;
  delete packageInfo.scripts.dev;
  delete packageInfo.scripts.test;
  delete packageInfo.scripts['test:coverage'];
  delete packageInfo.scripts.lint;
  delete packageInfo.scripts['lint:fix'];
  delete packageInfo.scripts.format;
  delete packageInfo.scripts['format:check'];
  delete packageInfo.scripts.prepare;
  delete packageInfo['lint-staged'];

  // Update main entry point
  packageInfo.main = 'src/index.js';
  packageInfo.bin = {
    'balm-shared-mcp': './src/cli/index.js'
  };

  writeFileSync(packagePath, JSON.stringify(packageInfo, null, 2));

  // Generate build info
  console.log('8. Generating build info...');
  const buildInfo = {
    version: packageInfo.version,
    buildTime: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch
  };

  writeFileSync(join(rootDir, 'dist', 'build-info.json'), JSON.stringify(buildInfo, null, 2));

  console.log('\n✅ Build completed successfully!');
  console.log(`📦 Package ready in: ${join(rootDir, 'dist')}`);
  console.log(`🏷️  Version: ${packageInfo.version}`);
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}
