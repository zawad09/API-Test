/**
 * Jest configuration.
 * - testEnvironment "node" because this is a backend project.
 * - setupFilesAfterEnv loads tests/setup.js (starts an isolated in-memory
 *   MongoDB and wipes collections between tests).
 * - runInBand (in package.json script) runs test files one by one so each
 *   file gets its own database instance without port conflicts.
 * - transformIgnorePatterns: ignore (do not transpile) every node_modules
 *   package EXCEPT @scalar/*, which is ESM-only and must be converted to
 *   CommonJS by babel-jest (see babel.config.js).
 */
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 120000,
  clearMocks: true,
  verbose: true,
  transform: {
    '^.+\\.[jt]s$': ['babel-jest', { configFile: './babel.config.js' }],
  },
  transformIgnorePatterns: ['/node_modules/(?!@scalar/)'],
};
