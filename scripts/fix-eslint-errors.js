#!/usr/bin/env node

/**
 * Fix common ESLint errors automatically
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, '..', 'src');

async function getAllJsFiles(dir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getAllJsFiles(fullPath)));
    } else if (entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

async function fixFile(filePath) {
  let content = await fs.readFile(filePath, 'utf-8');
  let modified = false;

  // Fix unused error variables in catch blocks
  const errorPattern = /} catch \(error\) {/g;
  if (content.match(errorPattern)) {
    // Check if error is used in the catch block
    const matches = [...content.matchAll(/} catch \(error\) \{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g)];

    for (const [fullMatch, catchBlock] of matches) {
      // If error is not used in the catch block, replace with _error
      if (
        !catchBlock.includes('error.') &&
        !catchBlock.includes('error)') &&
        !catchBlock.includes('error,')
      ) {
        content = content.replace(fullMatch, fullMatch.replace('(error)', '(_error)'));
        modified = true;
      }
    }
  }

  // Fix unused variables with underscore prefix
  const unusedVarPatterns = [
    { pattern: /const (spawn|createReadStream|timeout|oneMinuteAgo|psError) =/g, prefix: '_' },
    { pattern: /\((verbose|options|parentOptions)\) =>/g, prefix: '_' }
  ];

  for (const { pattern, prefix } of unusedVarPatterns) {
    const newContent = content.replace(pattern, (match, varName) => {
      if (match.includes('const ')) {
        return `const ${prefix}${varName} =`;
      } else {
        return match.replace(varName, `${prefix}${varName}`);
      }
    });

    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  }

  // Fix missing imports for fs functions
  if (content.includes('writeFileSync') || content.includes('unlinkSync')) {
    if (!content.includes('import { writeFileSync') && !content.includes('import fs from')) {
      // Add fs import at the top
      const importMatch = content.match(/^(import .+;\n)+/);
      if (importMatch) {
        const [lastImport] = importMatch;
        const newImport = "import { writeFileSync, unlinkSync } from 'fs';\n";
        content = content.replace(lastImport, lastImport + newImport);
        modified = true;
      }
    }
  }

  if (modified) {
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`✅ Fixed: ${path.relative(srcDir, filePath)}`);
    return true;
  }

  return false;
}

async function main() {
  console.log('🔧 Fixing ESLint errors...\n');

  const files = await getAllJsFiles(srcDir);
  let fixedCount = 0;

  for (const file of files) {
    try {
      const fixed = await fixFile(file);
      if (fixed) {
        fixedCount++;
      }
    } catch (error) {
      console.error(`❌ Error fixing ${file}:`, error.message);
    }
  }

  console.log(`\n✅ Fixed ${fixedCount} files`);
  console.log('\n🔍 Running eslint --fix...\n');

  // Run eslint --fix
  const { execSync } = await import('child_process');
  try {
    execSync('npm run lint:fix', { stdio: 'inherit' });
  } catch (_error) {
    console.error('Some errors could not be auto-fixed');
  }
}

main().catch(console.error);
