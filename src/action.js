const { loadCore } = require('./core-loader')
const { loadGithub } = require('./github-loader')
const { loadExec } = require('./exec-loader')
const { normalizeBoolean } = require('@ulisesgascon/normalize-boolean')
const { existsSync } = require('fs')
const { readFile, writeFile, stat, mkdir } = require('fs').promises
const { dirname } = require('path')
const { isDifferent } = require('@ulisesgascon/is-different')
const { updateOrCreateSegment } = require('@ulisesgascon/text-tags-manager')
const { generateScores, generateScope } = require('./')
const { validateDatabaseIntegrity, validateScopeIntegrity } = require('./utils')

/**
 * Ensure parent directory exists before writing a file
 * @param {string} filePath - Path to the file
 */
async function ensureParentDir (filePath) {
  const parentDir = dirname(filePath)
  await mkdir(parentDir, { recursive: true })
}

/**
 * Load and validate database from file, with robust bootstrap for empty/malformed files
 * @param {string} databasePath - Path to the database file
 * @returns {object} - The database object
 */
async function loadDatabase (databasePath) {
  const core = await loadCore()
  core.info('Checking if database exists...')
  const existDatabaseFile = existsSync(databasePath)

  if (!existDatabaseFile) {
    core.info('Database does not exist, creating new database')
    return { 'github.com': {} }
  }

  // Read the file content
  const content = await readFile(databasePath, 'utf8')

  // Handle empty or whitespace-only files
  if (!content.trim()) {
    core.info('Database file is empty, bootstrapping with fresh database')
    return { 'github.com': {} }
  }

  // Parse JSON
  let parsed
  try {
    parsed = JSON.parse(content)
  } catch (error) {
    throw new Error(`Database file contains invalid JSON: ${error.message}`)
  }

  // Validate it's an object
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Database file must be a JSON object')
  }

  // If it's an empty object or missing github.com, bootstrap it
  if (!parsed['github.com']) {
    core.info('Database missing github.com property, bootstrapping with fresh database')
    return { 'github.com': {} }
  }

  // Validate the database structure
  validateDatabaseIntegrity(parsed)
  return parsed
}

async function run () {
  const core = await loadCore()
  const github = await loadGithub()
  const exec = await loadExec()
  let octokit
  // Context
  const context = github.context
  // Inputs
  const scopePath = core.getInput('scope')
  const databasePath = core.getInput('database', { required: true })
  const reportPath = core.getInput('report', { required: true })
  const resultsPath = core.getInput('results-path')
  // Options
  const maxRequestInParallel = parseInt(core.getInput('max-request-in-parallel') || 10)
  const generateIssue = normalizeBoolean(core.getInput('generate-issue'))
  const autoPush = normalizeBoolean(core.getInput('auto-push'))
  const autoCommit = normalizeBoolean(core.getInput('auto-commit'))
  const issueTitle = core.getInput('issue-title') || 'OpenSSF Scorecard Report Updated!'
  const issueAssignees = core.getInput('issue-assignees').split(',').filter(x => x !== '').map(x => x.trim()) || []
  const issueLabels = core.getInput('issue-labels').split(',').filter(x => x !== '').map(x => x.trim()) || []
  const githubToken = core.getInput('github-token')
  const discoveryEnabled = normalizeBoolean(core.getInput('discovery-enabled'))
  const discoveryOrgs = core.getInput('discovery-orgs').split(',').filter(x => x !== '').map(x => x.trim()) || []
  const reportTagsEnabled = normalizeBoolean(core.getInput('report-tags-enabled'))
  const startTag = core.getInput('report-start-tag') || '<!-- OPENSSF-SCORECARD-MONITOR:START -->'
  const endTag = core.getInput('report-end-tag') || '<!-- OPENSSF-SCORECARD-MONITOR:END -->'
  const renderBadge = normalizeBoolean(core.getInput('render-badge'))
  const reportTool = core.getInput('report-tool') || 'scorecard-visualizer'

  const availableReportTools = ['scorecard-visualizer', 'deps.dev']
  if (!availableReportTools.includes(reportTool)) {
    throw new Error(`The report-tool is not valid, please use: ${availableReportTools.join(', ')}`)
  }

  // Error Handling
  if (!githubToken && [autoPush, autoCommit, generateIssue, discoveryEnabled].some(value => value)) {
    throw new Error('Github token is required for push, commit, create an issue and discovery operations!')
  }

  if (discoveryEnabled && !discoveryOrgs.length) {
    throw new Error('Discovery is enabled but no organizations were provided!')
  }

  if (githubToken) {
    octokit = github.getOctokit(githubToken)
  }

  let database = {}
  let scope = { 'github.com': {} }
  let originalReportContent = ''

  // In local results mode, scope is discovered from the results file
  if (!resultsPath) {
    // check if scope exists
    core.info('Checking if scope file exists...')
    const existScopeFile = existsSync(scopePath)
    if (!existScopeFile && !discoveryEnabled) {
      throw new Error('Scope file does not exist and discovery is not enabled')
    }

    // Use scope file if it exists
    if (existScopeFile) {
      core.debug('Scope file exists, using it...')
      scope = await readFile(scopePath, 'utf8').then(content => JSON.parse(content))
      validateScopeIntegrity(scope)
    }

    if (discoveryEnabled) {
      core.info(`Starting discovery for the organizations ${discoveryOrgs}...`)
      scope = await generateScope({ octokit, orgs: discoveryOrgs, scope, maxRequestInParallel })
    }
  } else {
    core.info(`Using results from file: ${resultsPath}`)
  }

  // Check if database exists and load it
  database = await loadDatabase(databasePath)

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
  const { reportContent, issueContent, database: newDatabaseState } = await generateScores({ scope, database, maxRequestInParallel, reportTagsEnabled, renderBadge, reportTool, resultsPath })

  core.info('Checking database changes...')
  const hasChanges = isDifferent(database, newDatabaseState)

  if (!hasChanges) {
    core.info('No changes to database, skipping the rest of the process')
    return
  }

  // Save changes
  core.info('Saving changes to database and report')
  await ensureParentDir(databasePath)
  await writeFile(databasePath, JSON.stringify(newDatabaseState, null, 2))
  await ensureParentDir(reportPath)
  await writeFile(reportPath, reportTagsEnabled
    ? updateOrCreateSegment({
      original: originalReportContent,
      replacementSegment: reportContent,
      startTag,
      endTag
    })
    : reportContent)

  if (discoveryEnabled) {
    core.info('Saving changes to scope...')
    await ensureParentDir(scopePath)
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
    if (discoveryEnabled) {
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
      body: issueContent,
      labels: issueLabels,
      assignees: issueAssignees
    })
  }
}

run()
