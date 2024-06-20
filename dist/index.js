/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 613:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const core = __nccwpck_require__(481)
const { getProjectScore, generateIssueContent, generateReportContent, getScore, saveScore } = __nccwpck_require__(629)
const { chunkArray } = __nccwpck_require__(462)

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

    organizationRepos[org] = repoList

    // Filter the repos that will be part of the scope
    let newReposInScope = organizationRepos[org]

    // Check if the org is already in scope and then filter the new repos
    if (scope[platform][org]) {
      // @TODO: Ensure that the included and excluded are covered by JSON Schemas
      newReposInScope = organizationRepos[org].filter(repo => !scope[platform][org].included.includes(repo) && !scope[platform][org].excluded.includes(repo))
    }

    // Try the new repos against the API and filter the ones that have a score (and respect the http request limits)
    core.debug(`Total new projects to check against the score API: ${newReposInScope.length}`)

    const chunks = chunkArray(newReposInScope, maxRequestInParallel)
    core.debug(`Total chunks: ${chunks.length}`)

    const newReposInScopeWithScore = []
    for (let index = 0; index < chunks.length; index++) {
      const chunk = chunks[index]
      core.debug(`Processing chunk ${index + 1}/${chunks.length}`)
      core.debug(`Current projects: ${chunks}`)

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

const generateScores = async ({ scope, database: currentDatabase, maxRequestInParallel, reportTagsEnabled, renderBadge, reportTool }) => {
  // @TODO: Improve deep clone logic
  const database = JSON.parse(JSON.stringify(currentDatabase))
  const platform = 'github.com'

  // @TODO: End the action if there are no projects in scope?

  const orgs = Object.keys(scope[platform])
  core.debug(`Total Orgs/Users in scope: ${orgs.length}`)

  // Structure Projects
  const projects = []

  orgs.forEach((org) => {
    const repos = scope[platform][org].included
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
        scoreData.prevCommit = storedScore.commit

        if (storedScore.score !== score) {
          scoreData.currentDiff = parseFloat((score - storedScore.score).toFixed(1))
        }
      }

      return scoreData
    }))

    scores.push(...chunkScores)
  }

  core.debug('All the scores are already collected')

  const reportContent = await generateReportContent({ scores, reportTagsEnabled, renderBadge, reportTool })
  const issueContent = await generateIssueContent({ scores, renderBadge, reportTool })

  // SET OUTPUTS
  core.setOutput('scores', scores)

  return { reportContent, issueContent, database }
}

module.exports = {
  generateScope,
  generateScores
}


/***/ }),

/***/ 629:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const got = __nccwpck_require__(931)
const core = __nccwpck_require__(481)
const ejs = __nccwpck_require__(451)
const { readFile } = (__nccwpck_require__(147).promises)
const { join } = __nccwpck_require__(17)
const { softAssign } = __nccwpck_require__(595)
const databaseSchema = __nccwpck_require__(324)
const scopeSchema = __nccwpck_require__(746)

const Ajv = __nccwpck_require__(467)
const addFormats = (__nccwpck_require__(867)["default"])
const ajv = new Ajv()
addFormats(ajv)

const validateAgainstSchema = (schema, name) => (data) => {
  const valid = ajv.validate(schema, data)
  if (!valid) {
    throw new Error(`Check: ${name} file as the file is corrupted. Invalid data: ${ajv.errorsText()}`)
  }
}

const getProjectScore = async ({ platform, org, repo }) => {
  core.debug(`Getting project score for ${platform}/${org}/${repo}`)
  const response = await got(`https://api.securityscorecards.dev/projects/${platform}/${org}/${repo}`)
  const { score, date, repo: { commit } = {} } = JSON.parse(response.body)
  core.debug(`Got project score for ${platform}/${org}/${repo}: ${score} (${date})`)
  return { platform, org, repo, score, date, commit }
}

const getScore = ({ database, platform, org, repo }) => {
  const { current } = database?.[platform]?.[org]?.[repo] || {}
  return current || null
}

const saveScore = ({ database, platform, org, repo, score, date, commit }) => {
  softAssign(database, [platform, org, repo, 'previous'], [])
  const repoRef = database[platform][org][repo]

  if (repoRef.current) {
    repoRef.previous.push(repoRef.current)
  }
  repoRef.current = { score, date, commit }
}

const generateReportUrl = reportTool => (org, repo, commit, prevCommit) => {
  if (reportTool === 'scorecard-visualizer' && !prevCommit) {
    return `https://ossf.github.io/scorecard-visualizer/#/projects/github.com/${org}/${repo}/commit/${commit}`
  }
  if (reportTool === 'scorecard-visualizer' && prevCommit) {
    return `https://ossf.github.io/scorecard-visualizer/#/projects/github.com/${org}/${repo}/compare/${prevCommit}/${commit}`
  }
  return `https://deps.dev/project/github/${org.toLowerCase()}%2F${repo.toLowerCase()}`
}

const generateReportContent = async ({ scores, reportTagsEnabled, renderBadge, reportTool }) => {
  core.debug('Generating report content')
  const template = await readFile(__nccwpck_require__.ab + "report.ejs", 'utf8')
  const getReportUrl = generateReportUrl(reportTool)
  return ejs.render(template, { scores, reportTagsEnabled, renderBadge, getReportUrl })
}

const generateIssueContent = async ({ scores, renderBadge, reportTool }) => {
  core.debug('Generating issue content')
  const scoresInScope = scores.filter(({ currentDiff }) => currentDiff)
  if (!scoresInScope.length) {
    return null
  }
  const template = await readFile(__nccwpck_require__.ab + "issue.ejs", 'utf8')
  const getReportUrl = generateReportUrl(reportTool)
  return ejs.render(template, { scores: scoresInScope, renderBadge, getReportUrl })
}

module.exports = {
  validateDatabaseIntegrity: validateAgainstSchema(databaseSchema, 'database'),
  validateScopeIntegrity: validateAgainstSchema(scopeSchema, 'scope'),
  getProjectScore,
  saveScore,
  getScore,
  generateReportContent,
  generateIssueContent
}


/***/ }),

/***/ 481:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 474:
/***/ ((module) => {

module.exports = eval("require")("@actions/exec");


/***/ }),

/***/ 29:
/***/ ((module) => {

module.exports = eval("require")("@actions/github");


/***/ }),

/***/ 462:
/***/ ((module) => {

module.exports = eval("require")("@ulisesgascon/array-to-chunks");


/***/ }),

/***/ 577:
/***/ ((module) => {

module.exports = eval("require")("@ulisesgascon/is-different");


/***/ }),

/***/ 435:
/***/ ((module) => {

module.exports = eval("require")("@ulisesgascon/normalize-boolean");


/***/ }),

/***/ 595:
/***/ ((module) => {

module.exports = eval("require")("@ulisesgascon/soft-assign-deep-property");


/***/ }),

/***/ 92:
/***/ ((module) => {

module.exports = eval("require")("@ulisesgascon/text-tags-manager");


/***/ }),

/***/ 467:
/***/ ((module) => {

module.exports = eval("require")("ajv");


/***/ }),

/***/ 867:
/***/ ((module) => {

module.exports = eval("require")("ajv-formats");


/***/ }),

/***/ 451:
/***/ ((module) => {

module.exports = eval("require")("ejs");


/***/ }),

/***/ 931:
/***/ ((module) => {

module.exports = eval("require")("got");


/***/ }),

/***/ 147:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ 17:
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ 324:
/***/ ((module) => {

"use strict";
module.exports = JSON.parse('{"type":"object","properties":{"github.com":{"type":"object","patternProperties":{"^[a-zA-Z0-9-_.]+/[a-zA-Z0-9-_.]+$":{"type":"object","patternProperties":{"^[a-zA-Z0-9-_.]+/[a-zA-Z0-9-_.]+$":{"type":"object","properties":{"previous":{"type":"array","items":{"type":"object","properties":{"score":{"type":"number","minimum":0,"maximum":10},"date":{"type":"string","format":"date-time"},"commit":{"type":"string","pattern":"^[a-f0-9]{40}$"}},"additionalProperties":false,"required":["score","date","commit"]},"minItems":0,"default":[]},"current":{"type":"object","properties":{"score":{"type":"number","minimum":0,"maximum":10},"date":{"type":"string","format":"date-time"},"commit":{"type":"string","pattern":"^[a-f0-9]{40}$"}},"additionalProperties":false,"required":["score","date","commit"]}},"additionalProperties":false,"required":["previous","current"]}}}}}},"additionalProperties":false,"required":["github.com"]}');

/***/ }),

/***/ 746:
/***/ ((module) => {

"use strict";
module.exports = JSON.parse('{"type":"object","properties":{"github.com":{"type":"object","patternProperties":{"^[a-zA-Z0-9-_.]+/[a-zA-Z0-9-_.]+$":{"type":"object","properties":{"included":{"type":"array","items":{"type":"string"},"minItems":0,"default":[]},"excluded":{"type":"array","items":{"type":"string"},"minItems":0,"default":[]}},"additionalProperties":false,"required":["included","excluded"]}}}},"additionalProperties":false,"required":["github.com"]}');

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
const core = __nccwpck_require__(481)
const github = __nccwpck_require__(29)
const exec = __nccwpck_require__(474)
const { normalizeBoolean } = __nccwpck_require__(435)
const { existsSync } = __nccwpck_require__(147)
const { readFile, writeFile, stat } = (__nccwpck_require__(147).promises)
const { isDifferent } = __nccwpck_require__(577)
const { updateOrCreateSegment } = __nccwpck_require__(92)
const { generateScores, generateScope } = __nccwpck_require__(613)
const { validateDatabaseIntegrity, validateScopeIntegrity } = __nccwpck_require__(629)

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

  // Check if database exists
  core.info('Checking if database exists...')
  const existDatabaseFile = existsSync(databasePath)
  if (existDatabaseFile) {
    database = await readFile(databasePath, 'utf8').then(content => JSON.parse(content))
    validateDatabaseIntegrity(database)
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
  const { reportContent, issueContent, database: newDatabaseState } = await generateScores({ scope, database, maxRequestInParallel, reportTagsEnabled, renderBadge, reportTool })

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
    ? updateOrCreateSegment({
      original: originalReportContent,
      replacementSegment: reportContent,
      startTag,
      endTag
    })
    : reportContent)

  if (discoveryEnabled) {
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

})();

module.exports = __webpack_exports__;
/******/ })()
;