const { validateDatabaseIntegrity, validateScopeIntegrity } = require('../src/utils')
const { database, scope } = require('../__fixtures__')

describe('Utils', () => {
  describe('validateDatabaseIntegrity', () => {
    it('Should manage a full database', () => {
      expect(() => validateDatabaseIntegrity(database.fullDatabase)).not.toThrow()
    })
    it('Should manage an empty database', () => {
      expect(() => validateDatabaseIntegrity(database.emptyDatabase)).not.toThrow()
    })
  })

  describe('validateScopeIntegrity', () => {
    it('Should manage a big Scope', () => {
      expect(() => validateScopeIntegrity(scope.fullScope)).not.toThrow()
    })
    it('Should manage a empty Scope', () => {
      expect(() => validateScopeIntegrity(scope.emptyScope)).not.toThrow()
    })
  })
})
