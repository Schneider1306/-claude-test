// Тесты расчётного движка — чистый TypeScript без нативных зависимостей,
// поэтому используем лёгкое окружение node с babel-преобразованием.
module.exports = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': [
      'babel-jest',
      { presets: ['babel-preset-expo'], caller: { name: 'metro', platform: 'ios' } },
    ],
  },
  testMatch: ['**/src/__tests__/**/*.test.ts'],
};
