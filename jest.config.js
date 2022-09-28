module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '@clients/(.*)$': '<rootDir>/src/clients/$1',
    '@test/(.*)$': '<rootDir>/test/$1',
    '@models/(.*)$': '<rootDir>/src/models/$1',
    '@helpers/(.*)$': '<rootDir>/src/helpers/$1'
  },
  testPathIgnorePatterns: [
    '/node_modules/'
  ],
  testRegex: '(/tests/.*|(\\.|/)(test|spec))\\.[jt]sx?$',
  moduleFileExtensions: ['ts', 'js'],
  collectCoverage: true, // breaks debugging of unit tests, move to package.json if needed
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/models/**/*.ts'
  ],
  coverageReporters: [
    'lcov',
    'text'
  ],
  verbose: true
}
