import path from 'path';
import { MCPServer } from './src/core/mcp-server.js';
import { FileSystemHandler } from './src/handlers/file-system-handler.js';
import { CodeGenerator } from './src/generators/code-generator.js';

async function test() {
  const fsHandler = new FileSystemHandler();

  // Dummy dependencies just to initialize the server
  const mockComponents = {
    fileSystemHandler: fsHandler,
    projectManager: {},
    codeGenerator: new CodeGenerator(fsHandler, {}),
    resourceAnalyzer: {},
    config: {}
  };

  const mcpServer = new MCPServer(mockComponents);

  const testDir = path.join(process.cwd(), 'temp-e2e-ast');
  const indexFilePath = path.join(testDir, 'apis/index.js');

  console.log('Starting AST Injection E2E Test...');
  try {
    await fsHandler.ensureDirectory(path.join(testDir, 'apis'));

    // Create a dummy index file
    const initialContent =
      "import existingApi from './existing.js';\n\nexport default {\n  apis: [\n    existingApi\n  ]\n};\n";
    await fsHandler.writeFile(indexFilePath, initialContent);

    console.log('Initial file created.');

    // Test import injection
    await mcpServer.astInsertImport({
      filePath: indexFilePath,
      importStatement: "import newApi from './new.js';"
    });

    console.log('Import inserted.');

    // Test array expansion
    await mcpServer.astInsertImport({
      filePath: indexFilePath,
      arrayName: 'apis',
      arrayElement: 'newApi'
    });

    console.log('Array expanded.');

    const finalContent = await fsHandler.readFile(indexFilePath);
    console.log('--- Final Content ---');
    console.log(finalContent);
    console.log('---------------------');

    if (
      finalContent.includes("import newApi from './new.js';") &&
      finalContent.includes('newApi\n  ]')
    ) {
      console.log('✅ AST Injection Test Passed!');
    } else {
      console.error('❌ AST Injection Test Failed!');
    }
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Cleanup
    const fs = await import('fs/promises');
    await fs.rm(testDir, { recursive: true, force: true });
  }
}

test();
