/// <reference types="vitest" />
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      include: ['./**/*.node.test.ts'],
      exclude: ['**/node_modules/**', "**/cdk.out/**", "**/dist/**"],
      name: 'node',
      environment: 'node',
      globals: true,
      ...(process.env.CI && {
        minThreads: 4,
        maxThreads: 4
      }),
      threads:false,
      hookTimeout: 600000,
      testTimeout: 600000
    }
  }
])