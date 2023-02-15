const debug = require('debug')('openssf-scorecard-monitor')
const { spliceIntoChunks, getProjectScore, generateIssueContent, generateReportContent, getScore, saveScore } = require('./utils')
const generateScores = async ({ scope, database: currentDatabase, maxRequestInParallel }) => {
  // @TODO: Improve deep clone logic
  const database = JSON.parse(JSON.stringify(currentDatabase))
  const platform = 'github.com'
  const projects = scope[platform]
  debug('Total projects in scope', projects.length)

  const chunks = spliceIntoChunks(projects, maxRequestInParallel)
  debug('Total chunks', chunks.length)

  const scores = []

  for (let index = 0; index < chunks.length; index++) {
    const chunk = chunks[index]
    debug('Processing chunk %s/%s', index + 1, chunks.length)

    const chunkScores = await Promise.all(chunk.map(async ({ org, repo }) => {
      const { score, date } = await getProjectScore({ platform, org, repo })
      debug('Got project score for %s/%s/%s: %s (%s)', platform, org, repo, score, date)

      const storedScore = getScore({ database, platform, org, repo })

      const scoreData = { platform, org, repo, score, date }
      // If no stored score then record if score is different then:
      if (!storedScore || storedScore.score !== score) {
        saveScore({ database, platform, org, repo, score, date })
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

  const reportContent = await generateReportContent(scores)
  const issueContent = await generateIssueContent(scores)

  return { reportContent, issueContent, database }
}

module.exports = {
  generateScores
}
