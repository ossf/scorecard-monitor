const { validateDatabaseIntegrity, validateScopeIntegrity, generateReportContent } = require('../src/utils')
const { database, scope, scores } = require('../__fixtures__')

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

  describe('generateReportContent', () => {
    it('Should render template with scores and title', async () => {
      const reportTagsEnabled = false
      const report = await generateReportContent(scores, reportTagsEnabled)
      expect(report).toMatchSnapshot()
    })
    it('Should render template with scores only', async () => {
      const reportTagsEnabled = true
      const report = await generateReportContent(scores, reportTagsEnabled)
      expect(report).toMatchSnapshot()
    })
    it('Should render template with title only', async () => {
      const emptyScores = []
      const reportTagsEnabled = false
      const report = await generateReportContent(emptyScores, reportTagsEnabled)
      expect(report).toMatchSnapshot()
    })
  })
})
