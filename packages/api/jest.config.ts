import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    rootDir: 'src',
    testMatch: ['**/__tests__/**/*.test.ts'],
    moduleNameMapper: {
        '^@safepal/shared$': '<rootDir>/../../../packages/shared/src/index',
    },
    transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: { strict: false } }],
    },
    collectCoverageFrom: [
        'services/payout.ts',
        'services/providers/**/*.ts',
        'constants/payouts.ts',
    ],
    coverageThreshold: {
        global: { branches: 80, functions: 80, lines: 80 },
    },
};

export default config;
