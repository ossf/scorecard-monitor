const core = require('@actions/core')
const { getProjectScore, generateIssueContent, generateReportContent, getScore, saveScore } = require('./utils')
const { chunkArray } = require('@ulisesgascon/array-to-chunks')

const generateScores = async ({ scope, database: currentDatabase, maxRequestInParallel }) => {
  // @TODO: Improve deep clone logic
  const database = JSON.parse(JSON.stringify(currentDatabase))
  const platform = 'github.com'

  // @TODO: End the action if there are no projects in scope?
 
  const orgs = Object.keys(scope[platform].included)
  core.debug(`Total Orgs/Users in scope: ${orgs.length}`)

  // Structure Projects
  const projects = []

  orgs.forEach((org) => {
    const repos = scope[platform].included[org]
    repos.forEach((repo) => projects.push({ org, repo }))
  })

  core.debug(`Total Projects in scope: ${projects.length}`)
  
  const chunks = chunkArray(projects, maxRequestInParallel)
  core.debug(`Total chunks: ${chunks.length}`)

  const scores = []

  for (let index = 0; index < chunks.length; index++) {
    const chunk = chunks[index]
    core.debug(`Processing chunk ${index + 1}/${chunks.length}`)

    const chunkScores = await Promise.all(chunk.map(async ({ org, repo }) => {
      const { score, date, commit } = await getProjectScore({ platform, org, repo })
      core.debug(`Got project score for ${platform}/${org}/${repo}: ${score} (${date})`)

      const storedScore = getScore({ database, platform, org, repo })

      const scoreData = { platform, org, repo, score, date, commit }
      // If no stored score then record if score is different then:
      if (!storedScore || storedScore.score !== score) {
        saveScore({ database, platform, org, repo, score, date, commit })
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

  core.debug('All the scores are already collected')

  const reportContent = await generateReportContent(scores)
  const issueContent = await generateIssueContent(scores)

  // SET OUTPUTS
  core.setOutput('scores', scores)

  return { reportContent, issueContent, database }
}

module.exports = {
  generateScores
}
