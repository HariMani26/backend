const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.spec.ts', '<rootDir>/src/**/*.test.ts'],
  moduleNameMapper: {
    ...pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/src/' }),
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
    '^@routes/(.*)$': '<rootDir>/src/routes/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@repositories/(.*)$': '<rootDir>/src/repositories/$1',
    '^@middlewares/(.*)$': '<rootDir>/src/middlewares/$1',
    '^@validators/(.*)$': '<rootDir>/src/validators/$1',
    '^@models/(.*)$': '<rootDir>/src/models/$1',
    '^@dto/(.*)$': '<rootDir>/src/dto/$1',
    '^@interfaces/(.*)$': '<rootDir>/src/interfaces/$1',
    '^@helpers/(.*)$': '<rootDir>/src/helpers/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@swagger/(.*)$': '<rootDir>/src/swagger/$1',
  },
};
