jest.mock('../src/core-loader', () => ({
  loadCore: jest.fn().mockResolvedValue({
    debug: jest.fn(),
    info: jest.fn()
  })
}))

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
    it('Should reject a database with a corrupted entry', () => {
      const corrupted = {
        'github.com': {
          UlisesGascon: {
            'security-wg': {
              previous: 42,
              current: { score: 4.3, date: '2023-02-20', commit: '846b3ddb5f75d95235e94d9eb52e920f4a067338' }
            }
          }
        }
      }
      expect(() => validateDatabaseIntegrity(corrupted)).toThrow(/corrupted/)
    })
    it('Should reject a score outside the 0 to 10 range', () => {
      const outOfRange = {
        'github.com': {
          UlisesGascon: {
            'security-wg': {
              previous: [],
              current: { score: 9999, date: '2023-02-20', commit: '846b3ddb5f75d95235e94d9eb52e920f4a067338' }
            }
          }
        }
      }
      expect(() => validateDatabaseIntegrity(outOfRange)).toThrow(/corrupted/)
    })
    it('Should accept both date and date-time values, as the Scorecard API has used both', () => {
      const mixedDates = {
        'github.com': {
          nodejs: {
            node: {
              previous: [{ score: 6.7, date: '2022-08-21', commit: 'a'.repeat(40) }],
              current: { score: 7.1, date: '2025-09-10T20:47:01Z', commit: 'b'.repeat(40) }
            }
          }
        }
      }
      expect(() => validateDatabaseIntegrity(mixedDates)).not.toThrow()
    })
  })

  describe('validateScopeIntegrity', () => {
    it('Should manage a big Scope', () => {
      expect(() => validateScopeIntegrity(scope.fullScope)).not.toThrow()
    })
    it('Should manage a empty Scope', () => {
      expect(() => validateScopeIntegrity(scope.emptyScope)).not.toThrow()
    })
    it('Should reject a scope whose included is not a list', () => {
      const corrupted = { 'github.com': { UlisesGascon: { included: 7, excluded: [] } } }
      expect(() => validateScopeIntegrity(corrupted)).toThrow(/corrupted/)
    })
    it('Should reject a scope entry that is missing excluded', () => {
      const corrupted = { 'github.com': { UlisesGascon: { included: [] } } }
      expect(() => validateScopeIntegrity(corrupted)).toThrow(/corrupted/)
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
