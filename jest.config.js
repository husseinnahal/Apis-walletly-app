// Jest configuration for ES modules
export default {
     testEnvironment: 'node',
     coveragePathIgnorePatterns: ['/node_modules/'],
     testMatch: ['**/tests/**/*.test.js'],
     collectCoverageFrom: ['src/**/*.js', '!src/tests/**'],
     transform: {},
     moduleNameMapper: {
          '^(\\.{1,2}/.*)\\.js$': '$1',
     },
};
