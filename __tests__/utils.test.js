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
      const reportTool = 'scorecard-visualizer'
      const report = await generateReportContent({ scores, renderBadge: reportTagsEnabled, reportTool })
      expect(report).toMatchSnapshot()
    })
    it('Should render template with scores only', async () => {
      const reportTagsEnabled = true
      const reportTool = 'scorecard-visualizer'
      const report = await generateReportContent({ scores, renderBadge: reportTagsEnabled, reportTool })
      expect(report).toMatchSnapshot()
    })
    it('Should render template with title only', async () => {
      const emptyScores = []
      const reportTagsEnabled = false
      const reportTool = 'scorecard-visualizer'
      const report = await generateReportContent({ scores: emptyScores, renderBadge: reportTagsEnabled, reportTool })
      expect(report).toMatchSnapshot()
    })
    it('Should render template with deps.dev as renderTool', async () => {
      const reportTagsEnabled = true
      const reportTool = 'deps.dev'
      const report = await generateReportContent({ scores, renderBadge: reportTagsEnabled, reportTool })
      expect(report).toMatchSnapshot()
    })
    it('Should render template with scorecard-visualizer as renderTool', async () => {
      const reportTagsEnabled = true
      const reportTool = 'scorecard-visualizer'
      const report = await generateReportContent({ scores, renderBadge: reportTagsEnabled, reportTool })
      expect(report).toMatchSnapshot()
    })
  })
})
