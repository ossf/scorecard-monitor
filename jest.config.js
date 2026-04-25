import { defaults } from 'jest-config'

export default {
  testPathIgnorePatterns: [
    ...defaults.testPathIgnorePatterns
  ],
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.js'
  ],
  moduleNameMapper: {
    '^@ulisesgascon/(.*)$': '<rootDir>/node_modules/@ulisesgascon/$1/dist/cjs/index.js'
  }
}
