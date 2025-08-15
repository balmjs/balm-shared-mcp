import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',
    
    // Global test setup
    globals: true,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'coverage/',
        '**/*.config.js',
        '**/*.test.js',
        '**/*.spec.js'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    
    // Test file patterns
    include: [
      'src/**/*.{test,spec}.js',
      'tests/**/*.{test,spec}.js'
    ],
    
    // Test timeout
    testTimeout: 10000,
    
    // Setup files
    setupFiles: ['./tests/setup.js']
  }
});