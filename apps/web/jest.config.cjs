module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/test/setupTests.ts'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/test/__mocks__/fileMock.js',
    '^bootstrap$': '<rootDir>/test/__mocks__/bootstrap.js',
    '^.*/supabase$': '<rootDir>/test/__mocks__/supabase.js',
    '^.*/trpc$': '<rootDir>/test/__mocks__/trpc.js',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: '<rootDir>/tsconfig.json',
      diagnostics: {
        ignoreCodes: [151001],
      },
    }],
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
};
