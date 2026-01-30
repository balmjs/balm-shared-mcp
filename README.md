# BalmSharedMCP

Model Context Protocol (MCP) server for intelligent interaction with the shared-project frontend resource library.

## Overview

BalmSharedMCP provides AI-powered assistance for developers working with the shared-project library, offering:

- **Project Scaffolding**: Automated project creation with shared-project integration
- **Code Generation**: Intelligent generation of components, pages, and configurations
- **Resource Analysis**: Deep understanding of shared-project components and utilities
- **Best Practices**: Contextual guidance and recommendations

## Installation

```bash
# Install dependencies
npm install

# Set up Git hooks
npm run prepare
```

## Development

```bash
# Start development server with file watching
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format
```

## Usage

### As MCP Server

The server can be used with any MCP-compatible client:

```bash
# Start the server
npm start
```

### Configuration

Create a `config.json` file in the project root:

```json
{
  "sharedLibraryPath": "./path/to/shared-library",
  "templatesPath": "./templates",
  "defaultProjectConfig": {
    "apiEndpoint": "/api",
    "mockEnabled": true,
    "authEnabled": true
  },
  "logging": {
    "level": "info"
  }
}
```

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `WORKSPACE_ROOT` | ✅ | Root directory of your workspace | `./` |
| `SHARED_LIBRARY_NAME` | ❌ | Name of the shared library | `my-shared` |
| `SHARED_LIBRARY_PATH` | ❌ | Override full path (takes priority) | - |
| `TEMPLATES_PATH` | ❌ | Path to code templates | `./templates` |
| `LOG_LEVEL` | ❌ | Logging level | `info` |

**Path Resolution**: `SHARED_LIBRARY_PATH || (WORKSPACE_ROOT + SHARED_LIBRARY_NAME)`

## Available Tools

### Project Management
- `create_project`: Create new projects with balm-shared integration
- `analyze_project`: Analyze existing project structure

### Code Generation
- `generate_crud_module`: Generate complete CRUD business modules
- `generate_page_component`: Generate page components

### Resource Query
- `query_component`: Query balm-shared component information
- `get_best_practices`: Get best practices and examples

## Architecture

```
src/
├── core/           # MCP server core implementation
├── managers/       # Project and resource managers
├── generators/     # Code generation engines
├── analyzers/      # Resource analysis tools
├── handlers/       # File system and template handlers
├── utils/          # Utilities and helpers
└── config/         # Configuration management
```

## Testing

The project uses Vitest for testing with comprehensive coverage requirements:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see LICENSE file for details.