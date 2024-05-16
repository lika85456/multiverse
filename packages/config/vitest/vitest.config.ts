export default [
  {
    test: {
      include: ['./**/*.unit.test.ts'],
      exclude: ['**/node_modules/**', "**/cdk.out/**", "**/dist/**"],
      name: 'unit',
      environment: 'node',
      globals: true,
      ...(process.env.CI && {
        minThreads: 4,
        maxThreads: 4
      }),
      hookTimeout: 60000,
      testTimeout: 20000,
    }
  },
  {
    test: {
      include: ['./**/*.integration.test.ts'],
      exclude: ['**/node_modules/**', "**/cdk.out/**", "**/dist/**"],
      name: 'integration',
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
      name: 'e2e',
      environment: 'node',
      globals: true,
      ...(process.env.CI && {
        minThreads: 4,
        maxThreads: 4
      }),
      hookTimeout: 180000,
      testTimeout: 180000
    }
  }
];