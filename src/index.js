const core = require('@actions/core')
const { getProjectScore, generateIssueContent, generateReportContent, getScore, saveScore } = require('./utils')
const { chunkArray } = require('@ulisesgascon/array-to-chunks')

const generateScope = async ({ octokit, orgs, scope, maxRequestInParallel }) => {
  const platform = 'github.com'
  const newScope = {}
  newScope[platform] = { }
  const organizationRepos = {}

  // Collect all the repos for each org
  for (let index = 0; index < orgs.length; index++) {
    const org = orgs[index]
    core.debug(`Processing org ${index + 1}/${orgs.length}: ${org}`)

    // Check for Org or User and collect the first 100 repos
    let entityType = 'org'
    const repoList = []
    try {
      const { data: repos } = await octokit.rest.repos.listForOrg({ org, type: 'public', per_page: 100 })
      core.debug(`Got ${repos.length} repos for org: ${org}`)
      repoList.push(...repos.map(entity => entity.name))
    } catch (error) {
      entityType = 'user'
      const { data: repos } = await octokit.rest.repos.listForUser({ username: org, type: 'public', per_page: 100 })
      core.debug(`Got ${repos.length} repos for user: ${org}`)
      repoList.push(...repos.map(entity => entity.name))
    }

    // Check if the org or user has more than 100 repos and requires pagination management
    if (repoList.length === 100) {
      let page = 2
      let hasMore = true
      const entityInApi = {}
      entityInApi[entityType === 'org' ? 'org' : 'username'] = org
      while (hasMore) {
        core.debug(`Getting page ${page} for ${entityType}: ${org}`)
        const { data: repos, headers } = await octokit.rest.repos[entityType === 'org' ? 'listForOrg' : 'listForUser']({ ...entityInApi, type: 'public', per_page: 100, page })
        core.debug(`Got ${repos.length} repos for ${entityType}: ${org}`)
        repoList.push(...repos.map(entity => entity.name))
        hasMore = headers.link.includes('rel="next"')
        page += 1
      }
    }

    organizationRepos[org] = repoList.map(({ name }) => name)

    // Filter the repos that will be part of the scope
    let newReposInScope = organizationRepos[org]

    // Check if the org is already in scope and then filter the new repos
    if (scope[platform][org]) {
      // @TODO: Ensure that the included and excluded are covered by JSON Schemas
      newReposInScope = organizationRepos[org].filter(repo => !scope[platform][org].includes(repo) && !scope[platform][org].excluded.includes(repo))
    }

    // Try the new repos against the API and filter the ones that have a score (and respect the http request limits)
    core.debug(`Total new projects to check against the score API: ${newReposInScope.length}`)

    const chunks = chunkArray(newReposInScope, maxRequestInParallel)
    core.debug(`Total chunks: ${chunks.length}`)

    const newReposInScopeWithScore = []
    for (let index = 0; index < chunks.length; index++) {
      const chunk = chunks[index]
      core.debug(`Processing chunk ${index + 1}/${chunks.length}`)

      await Promise.all(chunk.map(async (repo) => {
        try {
          // The Scorecard API will return 404 if the repo is not available
          await getProjectScore({ platform, org, repo })
          core.debug(`Scorecard is eligible for ${platform}/${org}/${repo})`)
          newReposInScopeWithScore.push(repo)
        } catch (error) {
          core.debug(`No Scorecard for ${platform}/${org}/${repo})`)
        }
        return Promise.resolve()
      }))
    }

    core.debug(`Total new projects to add to the scope: ${newReposInScopeWithScore.length}`)

    // Add just the new repos to the scope
    if (scope[platform][org]) {
      newScope[platform][org] = {
        included: [...scope[platform][org].included, ...newReposInScopeWithScore],
        excluded: [...scope[platform][org].excluded]
      }
    } else {
      newScope[platform][org] = {
        included: newReposInScopeWithScore,
        excluded: []
      }
    }
  }

  return newScope
}

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
  generateScope,
  generateScores
}
