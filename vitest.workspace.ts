/// <reference types="vitest" />
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      include: ['./**/*.unit.test.ts'],
      exclude: ['**/node_modules/**', "**/cdk.out/**", "**/dist/**"],
      name: 'Unit tests',
      environment: 'node',
      globals: true,
      ...(process.env.CI && {
        minThreads: 4,
        maxThreads: 4
      }),
      hookTimeout: 10000,
      testTimeout: 10000,
    }
  },
  {
    test: {
      include: ['./**/*.bench.ts'],
      exclude: ['**/node_modules/**', "**/cdk.out/**", "**/dist/**"],
      name: 'Benchmarks',
      environment: 'node',
      globals: true,
      hookTimeout: 60000,
      testTimeout: 60000,
    }
  },
  {
    test: {
      include: ['./**/*.integration.test.ts'],
      exclude: ['**/node_modules/**', "**/cdk.out/**", "**/dist/**"],
      name: 'Integration tests',
      environment: 'node',
      globals: true,
      ...(process.env.CI && {
        minThreads: 4,
        maxThreads: 4
      }),
      hookTimeout: 180000,
      testTimeout: 180000
    }
  },
  {
    test: {
      include: ['./**/*.e2e.test.ts'],
      exclude: ['**/node_modules/**', "**/cdk.out/**", "**/dist/**"],
      name: 'Integration tests',
      environment: 'node',
      globals: true,
      ...(process.env.CI && {
        minThreads: 4,
        maxThreads: 4
      }),
      hookTimeout: 180000,
      testTimeout: 180000
    }
  },
  {
    test: {
      include: ['./**/*.single-thread.test.ts'],
      exclude: ['**/node_modules/**', "**/cdk.out/**", "**/dist/**"],
      name: 'Single threaded tests',
      environment: 'node',
      globals: true,
      ...(process.env.CI && {
        minThreads: 4,
        maxThreads: 4
      }),
      hookTimeout: 60000,
      testTimeout: 60000
    }
  },
])