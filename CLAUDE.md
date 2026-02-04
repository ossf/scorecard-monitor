# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenSSF Scorecard Monitor is a GitHub Action that automatically tracks OpenSSF Scorecard metrics across GitHub organizations, generating markdown reports and maintaining JSON databases of historical scores.

## Development Commands

```bash
# Install dependencies (use ci for clean install, matches CI/CD)
npm ci

# Run tests
npm run test                # Run all tests
npm run test:update         # Run tests and update snapshots
npm run test:coverage       # Run tests with coverage report
npm run test:watch          # Watch mode

# Linting (StandardJS)
npm run lint                # Check code style
npm run lint:fix            # Auto-fix linting issues

# Build (required before committing changes)
npm run build               # Bundles to /dist/ via Vercel NCC
```

**Important**: The `/dist/` folder must be committed after running `npm run build`. CI will fail if dist is outdated.

## Architecture

### Core Modules

- **src/action.js** - GitHub Action entry point. Reads action inputs, orchestrates discovery/scoring/reporting, handles git operations and issue creation.
- **src/index.js** - Core business logic with two main functions:
  - `generateScope()` - Auto-discovers repositories in GitHub organizations
  - `generateScores()` - Fetches scores from OpenSSF API, compares with historical data
- **src/utils.js** - Utilities for API calls, database operations, template rendering, and JSON schema validation

### Data Flow

1. Action reads scope file (included/excluded repos per org)
2. Fetches current scores from OpenSSF Scorecard API (`api.securityscorecards.dev`)
3. Compares with historical data in database JSON file
4. Generates markdown report and optionally creates GitHub issues for score changes

### Templates (EJS)

- `templates/report.ejs` - Markdown table report with scores and comparisons
- `templates/issue.ejs` - GitHub Issue body for score changes

### Schemas (JSON Schema via AJV)

- `schemas/database.json` - Validates database structure: `{platform: {org: {repo: {previous: [], current: {}}}}}`
- `schemas/scope.json` - Validates scope file with included/excluded repos per org

## Testing

Tests use Jest with snapshot testing. Test files are in `/__tests__/` with fixtures in `/__fixtures__/`.

When modifying template output or report generation, run `npm run test:update` to update snapshots after verifying changes are correct.

## Git Hooks

Husky manages pre-commit (lint), commit-msg (commitlint), and pre-push (test) hooks. Commits must follow Conventional Commits format and require DCO sign-off (`git commit -s`).

## Node Version

Node 20.11.0 (specified in `.nvmrc`). Use `nvm use` to switch.