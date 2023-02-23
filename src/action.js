const core = require('@actions/core')
const github = require('@actions/github')
const exec = require('@actions/exec')
const { normalizeBoolean } = require('normalize-boolean')
const { existsSync } = require('fs')
const { readFile, writeFile, stat } = require('fs').promises
const { isDifferent } = require('@ulisesgascon/is-different')
const { updateOrCreateSegment } = require('@ulisesgascon/text-tags-manager')
const { generateScores, generateScope } = require('./')

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
  const autoScopeEnabled = normalizeBoolean(core.getInput('auto-scope-enabled'))
  const autoScopeOrgs = core.getInput('auto-scope-orgs').split('\n').filter(x => x !== '').map(x => x.trim()) || []
  const reportTagsEnabled = normalizeBoolean(core.getInput('report-tags-enabled'))
  const startTag = core.getInput('report-start-tag') || '<!-- OPENSSF-SCORECARD-MONITOR:START -->'
  const endTag = core.getInput('report-end-tag') || '<!-- OPENSSF-SCORECARD-MONITOR:END -->'

  // Error Handling
  // @TODO: Validate Schemas
  if (!githubToken && [autoPush, autoCommit, generateIssue, autoScopeEnabled].some(value => value)) {
    throw new Error('Github token is required for push, commit, create an issue and auto scope operations!')
  }

  if (autoScopeEnabled && !autoScopeOrgs.length) {
    throw new Error('Auto scope is enabled but no organizations were provided!')
  }

  if (githubToken) {
    octokit = github.getOctokit(githubToken)
  }

  let database = {}
  let scope = null
  let originalReportContent = ''

  // check if scope exists
  core.info('Checking if scope file exists...')
  const existScopeFile = existsSync(scopePath)
  if (!existScopeFile && !autoScopeEnabled) {
    throw new Error('Scope file does not exist and auto scope is not enabled')
  }

  // Use scope file if it exists
  if (existScopeFile) {
    core.debug('Scope file exists, using it...')
    scope = await readFile(scopePath, 'utf8').then(content => JSON.parse(content))
  }

  if (autoScopeEnabled) {
    core.info(`Starting auto-scope for the organizations ${autoScopeOrgs}...`)
    scope = await generateScope({ octokit, orgs: autoScopeOrgs, scope, maxRequestInParallel })
  }

  // Check if database exists
  core.info('Checking if database exists...')
  const existDatabaseFile = existsSync(DatabasePath)
  if (existDatabaseFile) {
    database = await readFile(databasePath, 'utf8').then(content => JSON.parse(content))
  } else {
    core.info('Database does not exist, creating new database')
  }

  // Check if report exists as the content will be used to update the report with the tags
  if (reportTagsEnabled) {
    try {
      core.info('Checking if report exists...')
      await stat(reportPath)
      originalReportContent = await readFile(reportPath, 'utf8')
    } catch (error) {
      core.info('Previous Report does not exist, ignoring previous content for tags...')
    }
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
  await writeFile(reportPath, reportTagsEnabled
    ? reportContent
    : updateOrCreateSegment({
      original: originalReportContent,
      replacementSegment: reportContent,
      startTag,
      endTag
    }))

  if (autoScopeEnabled) {
    core.info('Saving changes to scope...')
    await writeFile(scopePath, JSON.stringify(scope, null, 2))
  }

  // Commit changes
  // @see: https://github.com/actions/checkout#push-a-commit-using-the-built-in-token
  if (autoCommit) {
    core.info('Committing changes to database and report')
    await exec.exec('git config user.name github-actions')
    await exec.exec('git config user.email github-actions@github.com')
    await exec.exec(`git add ${databasePath}`)
    await exec.exec(`git add ${reportPath}`)
    if (autoScopeEnabled) {
      core.info('Committing changes to scope...')
      await exec.exec(`git add ${scopePath}`)
    }
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
