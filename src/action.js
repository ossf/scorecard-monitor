const core = require('@actions/core')
const github = require('@actions/github')
const exec = require('@actions/exec')
const { normalizeBoolean } = require('normalize-boolean')

const { readFile, writeFile, stat } = require('fs').promises

const { isDifferent } = require('@ulisesgascon/is-different')
const { generateScores } = require('./')

async function run () {
  let octokit
  // Context
  const context = github.context
  // Inputs
  const scopePath = core.getInput('scope', { required: true })
  const databasePath = core.getInput('database', { required: true })
  const reportPath = core.getInput('report', { required: true })
  // Options
  const maxRequestInParallel = parseInt(core.getInput('max-request-in-parallel') || 10)
  const generateIssue = normalizeBoolean(core.getInput('generate-issue'))
  const autoPush = normalizeBoolean(core.getInput('auto-push'))
  const autoCommit = normalizeBoolean(core.getInput('auto-commit'))
  const issueTitle = core.getInput('issue-title') || 'OpenSSF Scorecard Report Updated!'
  const githubToken = core.getInput('github-token')

  // Error Handling
  // @TODO: Validate Schemas
  if (!githubToken && [autoPush, autoCommit, generateIssue].some(value => value)) {
    throw new Error('Github token is required for push, commit, and create issue operations!')
  }

  if (githubToken) {
    octokit = github.getOctokit(githubToken)
  }

  core.info('Checking Scope...')
  const scope = await readFile(scopePath, 'utf8').then(content => JSON.parse(content))
  let database = {}

  // Check if database exists
  try {
    core.info('Checking if database exists...')
    await stat(databasePath)
    database = await readFile(databasePath, 'utf8').then(content => JSON.parse(content))
  } catch (error) {
    core.info('Database does not exist, creating new database')
  }

  // PROCESS
  core.info('Generating scores...')
  const { reportContent, issueContent, database: newDatabaseState } = await generateScores({ scope, database, maxRequestInParallel })

  core.info('Checking database changes...')
  const hasChanges = isDifferent(database, newDatabaseState)

  if (!hasChanges) {
    core.info('No changes to database, skipping the rest of the process')
    return
  }

  // Save changes
  core.info('Saving changes to database and report')
  await writeFile(databasePath, JSON.stringify(newDatabaseState, null, 2))
  await writeFile(reportPath, reportContent)

  // Commit changes
  // @see: https://github.com/actions/checkout#push-a-commit-using-the-built-in-token
  if (autoCommit) {
    core.info('Committing changes to database and report')
    await exec.exec('git config user.name github-actions')
    await exec.exec('git config user.email github-actions@github.com')
    await exec.exec(`git add ${databasePath}`)
    await exec.exec(`git add ${reportPath}`)
    await exec.exec('git commit -m "Updated Scorecard Report"')
  }

  // Push changes
  if (autoPush) {
    // @see: https://github.com/actions-js/push/blob/master/start.sh#L43
    core.info('Pushing changes to database and report')
    const remoteRepo = `https://${process.env.INPUT_GITHUB_ACTOR}:${githubToken}@github.com/${process.env.INPUT_REPOSITORY}.git`
    await exec.exec(`git push origin ${process.env.GITHUB_HEAD_REF} --force --no-verify --repo ${remoteRepo}`)
  }

  // Issue creation
  if (generateIssue && issueContent) {
    core.info('Creating issue...')
    await octokit.rest.issues.create({
      ...context.repo,
      title: issueTitle,
      body: issueContent
    })
  }
}

run()
