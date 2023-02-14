const { defaults } = require('jest-config')

module.exports = {
  testPathIgnorePatterns: [
    ...defaults.testPathIgnorePatterns
  ],
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.js'
  ]
}