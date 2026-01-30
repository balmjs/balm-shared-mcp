#!/usr/bin/env node

/**
 * Manual test script for create_project tool
 *
 * Usage:
 *   node scripts/test-create-project.js <project-name> <project-type> [target-dir]
 *
 * Examples:
 *   node scripts/test-create-project.js my-frontend-app frontend
 *   node scripts/test-create-project.js my-backend-app backend /tmp/test-projects
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { ProjectManager } from '../src/managers/project-manager.js';
import { FileSystemHandler } from '../src/handlers/file-system-handler.js';

const __filename = fileURLToPath(import.meta.url);

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error(
    'Usage: node scripts/test-create-project.js <project-name> <project-type> [target-dir]'
  );
  console.error('');
  console.error('Arguments:');
  console.error(
    '  project-name   Name of the project (lowercase, numbers, hyphens, underscores only)'
  );
  console.error('  project-type   Type of project: "frontend" or "backend"');
  console.error('  target-dir     Optional target directory (defaults to ./test-projects)');
  console.error('');
  console.error('Examples:');
  console.error('  node scripts/test-create-project.js my-frontend-app frontend');
  console.error('  node scripts/test-create-project.js my-backend-app backend /tmp/test-projects');
  process.exit(1);
}

const [projectName, projectType] = args;
const targetDir = args[2] || path.join(process.cwd(), 'test-projects');

// Validate project type
if (!['frontend', 'backend'].includes(projectType)) {
  console.error(`Error: Invalid project type "${projectType}". Must be "frontend" or "backend".`);
  process.exit(1);
}

// Validate project name format
if (!/^[a-z0-9-_]+$/.test(projectName)) {
  console.error(`Error: Invalid project name "${projectName}".`);
  console.error(
    'Project name must contain only lowercase letters, numbers, hyphens, and underscores.'
  );
  process.exit(1);
}

const projectPath = path.join(targetDir, projectName);

console.log('='.repeat(60));
console.log('Testing create_project Tool');
console.log('='.repeat(60));
console.log('');
console.log('Configuration:');
console.log(`  Project Name: ${projectName}`);
console.log(`  Project Type: ${projectType}`);
console.log(`  Target Directory: ${targetDir}`);
console.log(`  Full Project Path: ${projectPath}`);
console.log('');

// Initialize components
const fileSystemHandler = new FileSystemHandler();
const config = {
  workspaceRoot: process.cwd(),
  sharedLibraryName: 'yiban-shared'
};

const projectManager = new ProjectManager(fileSystemHandler, config);

// Test project creation
async function testCreateProject() {
  try {
    console.log('Starting project creation...');
    console.log('');

    const options = {
      name: projectName,
      type: projectType,
      path: projectPath
    };

    const result = await projectManager.createProject(options);

    console.log('✅ Project created successfully!');
    console.log('');
    console.log('Result:');
    console.log(JSON.stringify(result, null, 2));
    console.log('');
    console.log('Next Steps:');
    result.nextSteps.forEach((step, index) => {
      console.log(`  ${index + 1}. ${step}`);
    });
    console.log('');
    console.log('Features:');
    result.features.forEach(feature => {
      console.log(`  • ${feature}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Project creation failed!');
    console.error('');
    console.error('Error Details:');
    console.error(`  Message: ${error.message}`);

    if (error.details) {
      console.error('  Details:', JSON.stringify(error.details, null, 2));
    }

    if (error.stack) {
      console.error('');
      console.error('Stack Trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

// Run the test
testCreateProject();
