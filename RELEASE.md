# Releasing

This document describes the process for releasing a new version of the Scorecard Monitor.

## Changelog and versioning

**This work is done by the maintainers exclusively.**

In order to generate a new release, it is recommended to use the commands:

```console
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
6. :bulb: **Hint:** You can check another release ([example](https://github.com/ossf/scorecard-monitor/releases/tag/v2.0.0-beta7)) to follow the style for title and description (_Main Changes, PRs, New contributions_).
7. Click the `Generate release notes` button in the top right to automatically populate the release description.
