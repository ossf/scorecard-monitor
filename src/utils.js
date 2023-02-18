const got = require('got')
const core = require('@actions/core')
const ejs = require('ejs')
const { readFile } = require('fs').promises
const { join } = require('path')

const isDifferentContent = (oldContent, newContent) => {
  return JSON.stringify(oldContent) !== JSON.stringify(newContent)
}

function spliceIntoChunks (arr, chunkSize) {
  // @see: https://stackabuse.com/how-to-split-an-array-into-even-chunks-in-javascript/
  const res = []
  while (arr.length > 0) {
    const chunk = arr.splice(0, chunkSize)
    res.push(chunk)
  }
  return res
}

const softAssign = (obj, keyPath, value) => {
  // @see: https://stackoverflow.com/a/5484764
  const lastKeyIndex = keyPath.length - 1
  for (let i = 0; i < lastKeyIndex; ++i) {
    const key = keyPath[i]
    if (!(key in obj)) {
      obj[key] = {}
    }
    obj = obj[key]
  }
  obj[keyPath[lastKeyIndex]] = obj[keyPath[lastKeyIndex]] || value
}

const getProjectScore = async ({ platform, org, repo }) => {
  core.debug(`Getting project score for ${platform}/${org}/${repo}`)
  const response = await got(`https://api.securityscorecards.dev/projects/${platform}/${org}/${repo}`)
  const { score, date } = JSON.parse(response.body)
  core.debug(`Got project score for ${platform}/${org}/${repo}: ${score} (${date})`)
  return { platform, org, repo, score, date }
}

const getScore = ({ database, platform, org, repo }) => {
  const { current } = database?.[platform]?.[org]?.[repo] || {}
  return current || null
}

const saveScore = ({ database, platform, org, repo, score, date }) => {
  softAssign(database, [platform, org, repo, 'previous'], [])
  const repoRef = database[platform][org][repo]

  if (repoRef.current) {
    repoRef.previous.push(repoRef.current)
  }
  repoRef.current = { score, date }
}

const generateReportContent = async (scores) => {
  core.debug('Generating report content')
  const template = await readFile(join(process.cwd(), 'templates/report.ejs'), 'utf8')
  return ejs.render(template, { scores })
}

const generateIssueContent = async (scores) => {
  core.debug('Generating issue content')
  const scoresInScope = scores.filter(({ currentDiff }) => currentDiff)
  if (!scoresInScope.length) {
    return null
  }
  const template = await readFile(join(process.cwd(), 'templates/issue.ejs'), 'utf8')
  return ejs.render(template, { scores: scoresInScope })
}

const normalizeBoolean = (value) => {
  // Ignore non-primitive values
  if (!['boolean', 'string', 'number'].includes(typeof value)) {
    return false
  }

  const normalizedValue = !isNaN(parseInt(value)) ? parseInt(value) : value

  // Add support for string values
  if (typeof normalizedValue === 'string') {
    return ['true', 'on', 'yes', 'y'].includes(normalizedValue.toLowerCase().trim())
  }

  // Add support for number values
  if (typeof normalizedValue === 'number') {
    return normalizedValue === 1
  }

  return Boolean(value)
}

module.exports = {
  getProjectScore,
  isDifferentContent,
  saveScore,
  getScore,
  spliceIntoChunks,
  generateReportContent,
  generateIssueContent,
  normalizeBoolean
}
