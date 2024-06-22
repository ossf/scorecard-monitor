# Contributing to OpenSSF Scorecard Monitor

Thank you for contributing your time and expertise to the OpenSSF Scorecard Monitor
project. This document describes the contribution guidelines for the project.

> [!IMPORTANT]
> Before you start contributing, you must read and abide by our
**[Code of Conduct](./CODE_OF_CONDUCT.md)**.
>
> Additionally, the Linux Foundation (LF) requires all contributions include per-commit sign-offs.
> Ensure you use the `-s` or `--signoff` flag for every commit.
>
> For more details, see the [LF DCO wiki](https://wiki.linuxfoundation.org/dco)
> or [this Pi-hole signoff guide](https://docs.pi-hole.net/guides/github/how-to-signoff/).

* [Contributing code](#contributing-code)
    * [Getting started](#getting-started)
    * [Environment Setup](#environment-setup)
    * [New to Node.js?](#new-to-nodejs)
* [Contributing steps](#contributing-steps)
* [How to run the Scorecard Monitor locally](#how-to-run-the-scorecard-monitor-locally)
* [How to install the dependencies](#how-to-install-the-dependencies)
* [How to run the tests](#how-to-run-the-tests)
* [How to run the linter](#how-to-run-the-linter)
* [PR Process](#pr-process)
* [Changelog and versioning](#changelog-and-versioning)
* [Releasing a new version](#releasing-a-new-version)
* [What to do before submitting a pull request](#what-to-do-before-submitting-a-pull-request)
* [Where the CI Tests are configured](#where-the-ci-tests-are-configured)
* [Updating Docs](#updating-docs)

## Contributing code

### Getting started

1.  Create [a GitHub account](https://github.com/join)
1.  Create a
        [personal access token](https://docs.github.com/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
1.  Set up your [development environment](#environment-setup)

### Environment Setup

You must install these tools:

1.  [`git`](https://help.github.com/articles/set-up-git/): For source control

1.  [`node`](https://nodejs.org/en/download/package-manager): You need node version
        `v20+`. The project includes support for [nvm](https://github.com/nvm-sh/nvm).

### New to Node.js?

If you're unfamiliar with Node.js, there are plenty of articles, resources, and books.
We recommend starting with several resources from the official Node.js website:

* [Introduction to Node.js](https://nodejs.org/en/learn/getting-started/introduction-to-nodejs)

## Contributing steps

1.  Identify an existing issue you would like to work on, or submit an issue describing your proposed change to the repo in question.
1.  The repo owners will respond to your issue promptly.
1.  Fork the desired repo, develop and test your code changes.
1.  Submit a pull request.

## How to run the Scorecard Monitor locally

Currently, this project is consumed as a GitHub Action, so local development is quite limited. In order to test the full workflow, you can consume directly your fork and branch from another project or by adding a new workflow in your fork.

Aside from this, it is possible to test certain things locally, like the `utils.js` file. Just check the test folder `_tests_/utils.test.js` to get a better idea.

## How to install the dependencies

First, check that you are using Node 20.11.0 and then execute `npm run ci` instead of `npm i` or `npm install` as you want to mimic the pipeline steps in order to avoid discrepancies later on with the `dist/` as the dependencies are included there.

## How to run the tests

Currently, the project is using [Jest](https://jestjs.io/) and [Snapshot Testing](https://jestjs.io/docs/snapshot-testing).

You have several options to run the tests:
- `npm run test`: this will run the tests
- `npm run test:update`: this will run the tests and update the snapshots
- `npm run test:coverage` this will run the tests and generate a coverage report as terminal output and in HTML format that can be found at `coverage/` folder
- `npm run test:watch`: this will run the tests when you make changes in any of the project's files.

## How to run the linter

This project uses [JavaScript Standard Style](https://standardjs.com/). If you are not familiar with this style, you can make your changes and run `npm run lint:fix` when you are ready. The linter will fix most of the issues for you and it will highlight any additional issue that requires manual work.

To check that your files are properly linted, you can run `npm run lint`. This review won't make changes to your files.

## PR Process

Every PR should be annotated with an icon indicating whether it's a:

-   Breaking change: :warning: (`:warning:`)
-   Non-breaking feature: :sparkles: (`:sparkles:`)
-   Patch fix: :bug: (`:bug:`)
-   Documentation changes (user or developer): :book: (`:book:`)
-   Infra/Tests/Other: :seedling: (`:seedling:`)
-   No release note: :ghost: (`:ghost:`)

Use :ghost: (no release note) only for the PRs that change or revert unreleased
changes, which don't deserve a release note. Please don't abuse it.

Prefer using the `:xyz:` aliases over the equivalent emoji directly when possible.

Individual commits should not be tagged separately, but will generally be
assumed to match the PR. For instance, if you have a bugfix in with a breaking
change, it's generally encouraged to submit the bugfix separately, but if you must put them in one PR, you should mark the whole PR as breaking.

> [!NOTE]
> Once a maintainer reviews your code, please address feedback without rebasing when possible.
> This includes [synchronizing your PR](https://docs.github.com/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/keeping-your-pull-request-in-sync-with-the-base-branch)
> with `main`. The GitHub review experience is much nicer with traditional merge commits.

## Changelog and versioning

**This work is done by the maintainers exclusively.**

In order to generate a new release, it is recommended to use the commands:


```
npm run release:minor
npm run release:patch
npm run release:major
```


This includes all the changes in the [CHANGELOG](./CHANGELOG.md) and ensures that the `package.json` and `package-lock.json` are up to date.

You can discard the tag that has been generated locally, as we won't use it.

## Releasing a new version

**This work is done by the maintainers exclusively.**

It is important to ensure that the `package.json`, `package-lock.json` and `CHANGELOG.md` are correct and include all the details for the new release in the `main` branch.

In order to create a new release, follow these steps:

1. Use the GitHub web UI for [new releases](https://github.com/ossf/scorecard-monitor/releases/new).
2. Mark `Publish this Action to the GitHub Marketplace` as we want to deliver this to our users.
3. Target the new release version, like `v.1.0.3-beta5`. Note that you can use metadata like `-beta5` and you must include `v` as prefix.
4. Mark `Set as the latest release`
5. (Optionally) mark `Set as a pre-release` if it is non-production ready.
6. You can check another release ([example](https://github.com/ossf/scorecard-monitor/releases/tag/v2.0.0-beta7)) to follow the style for title and description (_Main Changes, PRs, New contributions_). Click the `Generate release notes` as it will add most of this information for you.

## What to do before submitting a pull request

The following are the targets that can be used to test your changes locally:

| Command  | Description                                        | Is called in the CI? |
| -------- | -------------------------------------------------- | -------------------- |
| `npm run lint:fix` | force the JS Standard style on your files | checked as `npm run lint` |
| `npm run test:coverage` | Run the unit tests | Yes |
| `npm run build` | Use ncc to generate the `dist/` folder | yes, it has a validation step |

## Where the CI Tests are configured

1.  See the [action files](.github/workflows) to check its tests, and the
    scripts used on it.

## Updating Docs

The documentation can be found in the [README](./README.md). Any changes that are merged to `main` will be reflected directly on https://github.com/marketplace/actions/openssf-scorecard-monitor. Therefore, documentation changes do not require a specific release.