/// <reference types="vitest" />
import { defineWorkspace } from 'vitest/config';
import { config } from "dotenv";

config();

export default defineWorkspace([
  {
    test: {
      include: ['./**/*.unit.test.ts'],
      exclude: ['**/node_modules/**', "**/cdk.out/**", "**/dist/**", "**/.turbo/**", "**/.sst/**"],
      name: 'Unit tests',
      environment: 'node',
      globals: true,
      ...(process.env.CI && {
        minThreads: 4,
        maxThreads: 4
      }),
      hookTimeout: 60000,
      testTimeout: 20000,
      // @ts-ignore
      env:process.env
    }
  },
  {
    test: {
      include: ['./**/*.bench.ts'],
      exclude: ['**/node_modules/**', "**/cdk.out/**", "**/dist/**", "**/.turbo/**", "**/.sst/**"],
      name: 'Benchmarks',
      mode: "benchmark",
      environment: 'node',
      globals: true,
      hookTimeout: 240000,
      testTimeout: 240000,
      // @ts-ignore
      env: {
        ...process.env,
        LOG_LEVEL: "4",
      }
    },
    mode: "benchmark"
  },
  {
    test: {
      include: ['./**/*.integration.test.ts'],
      exclude: ['**/node_modules/**', "**/cdk.out/**", "**/dist/**", "**/.turbo/**", "**/.sst/**"],
      name: 'Integration tests',
      environment: 'node',
      globals: true,
      ...(process.env.CI && {
        minThreads: 4,
        maxThreads: 4
      }),
      hookTimeout: 180000,
      testTimeout: 180000,
      // @ts-ignore
      env:process.env
    }
  },
  {
    test: {
      include: ['./**/*.e2e.test.ts'],
      exclude: ['**/node_modules/**', "**/cdk.out/**", "**/dist/**", "**/.turbo/**", "**/.sst/**"],
      name: 'E2E tests',
      environment: 'node',
      globals: true,
      ...(process.env.CI && {
        minThreads: 4,
        maxThreads: 4
      }),
      hookTimeout: 180000,
      testTimeout: 180000,
      // @ts-ignore
      env:process.env
    }
  }
])