const { validateDatabaseIntegrity, validateScopeIntegrity, generateReportContent, scoreChangeThreshold } = require('../src/utils')
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

  describe('scoreChangeThreshold', () => {
    it('returns null for exact equal scores (diff == 0)', () => {
      expect(scoreChangeThreshold(9, 9, 0.5, 0.5)).toBe(null)
    })

    it('returns numeric positive diff when diff >= positiveThreshold', () => {
      expect(scoreChangeThreshold(9, 8, 0.5, 0.5)).toBe(1)
    })

    it('returns numeric negative diff when diff <= -negativeThreshold', () => {
      expect(scoreChangeThreshold(4, 6, 1, 1)).toBe(-2)
    })

    it('returns null (neutral) when diff is within thresholds', () => {
      expect(scoreChangeThreshold(7.2, 7, 1, 1)).toBe(null)
    })

    it('rounds diff to one decimal place before comparing', () => {
      expect(scoreChangeThreshold(7.15, 6.5, 0.7, 0.7)).toBe(0.7)
      expect(scoreChangeThreshold(7.149, 6.5, 0.7, 0.7)).toBe(null)
    })

    it('returns numeric diff equal to threshold when diff equals threshold', () => {
      expect(scoreChangeThreshold(7.1, 7.0, 0.1, 0.1)).toBe(0.1)
      expect(scoreChangeThreshold(6.9, 7.0, 0.1, 0.1)).toBe(-0.1)
    })

    it('returns diff when positiveThreshold is null (disabled)', () => {
      expect(scoreChangeThreshold(9, 8, null, 0.5)).toBe(1)
    })

    it('returns diff when negativeThreshold is null (disabled)', () => {
      expect(scoreChangeThreshold(4, 6, 0.5, null)).toBe(-2)
    })

    it('returns diff when both thresholds are null (disabled)', () => {
      expect(scoreChangeThreshold(5, 3, null, null)).toBe(2)
      expect(scoreChangeThreshold(3, 5, null, null)).toBe(-2)
    })
  })
})
