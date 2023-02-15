const debug = require('debug')('openssf-scorecard-monitor')
const { commitChanges, generateReport, getProjectScore, updateDatabase, saveScore, getScore, spliceIntoChunks } = require('./utils')
const scope = require('../config/scope.json')
const { maxRequestInParallel, reporting } = require('../config/settings.json')

;(async () => {
  const platform = 'github.com'
  const projects = scope[platform]
  console.log('projects', projects)
  debug('Total projects in scope', projects.length)

  const chunks = spliceIntoChunks(projects, maxRequestInParallel)
  debug('Total chunks', chunks.length)

  const scores = []
  for (let index = 0; index < chunks.length; index++) {
    const chunk = chunks[index]
    debug('Processing chunk %s/%s', index + 1, chunks.length)

    const chunkScores = await Promise.all(chunk.map(async ({ org, repo }) => {
      // -- EACH REPO --
      const { score, date } = await getProjectScore({ platform, org, repo })
      console.log('Got project score for %s/%s/%s: %s (%s)', platform, org, repo, score, date)

      const storedScore = getScore({ platform, org, repo })

      const scoreData = { platform, org, repo, score, date }
      // If no stored score then record if score is different then:
      if (!storedScore || storedScore.score !== score) {
        saveScore({ platform, org, repo, score, date })
      }

      // Add previous score and date if available to the report
      if (storedScore) {
        scoreData.prevScore = storedScore.score
        scoreData.prevDate = storedScore.date

        if (storedScore.score !== score) {
          scoreData.currentDiff = parseFloat((score - storedScore.score).toFixed(1))
        }
      }

      return scoreData
    }))

    scores.push(...chunkScores)
  }

  console.log('scores', scores)
  // Generate the report
  const { createOutputReport, outputReportFormats, outputFileName} = reporting
  if(createOutputReport) {
    await generateReport({outputReportFormats, outputFileName, scores})
  }

  // Save database state
  await updateDatabase()

  // Commit the changes
  await commitChanges({outputFileName, outputReportFormats})
})()
