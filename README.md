# OpenSSF Scorecard Monitor

**Simplify OpenSSF Scorecard tracking in your organization with automated markdown and JSON reports, plus optional GitHub issue alerts.**

## 🔮 About

If you're feeling overwhelmed by an avalanche of repository scorecards in your organization, you can breathe easy: Automation is here to make your life easier! It will streamline the process of keeping track of them all by providing a comprehensive report in Markdown and a local database in JSON with all the scores. Furthermore, to stay on top of any changes in the scores, you can choose to get notifications through Github Issues.

## 📺 Tutorial

_soon_

## ❤️ Awesome Features

- Reporting in Markdown with simply information and comparative against the prior score. [Demo](https://github.com/UlisesGascon/openssf-scorecard-monitor-demo/blob/main/reporting/openssf-scorecard-report.md)
- The reporting data is stored in json format (including previous records). [Demo](https://github.com/UlisesGascon/openssf-scorecard-monitor-demo/blob/main/reporting/database.json)
- Generate an issue with the last changes in the scores, including links to the full report. [Demo](https://github.com/UlisesGascon/openssf-scorecard-monitor-demo/issues/2)
- Easy to add/remove new repositories in scope from any github organization
- Debug supported
- Easy to use and great test coverage (soon)

### 🎉 Demo

Here is a [demo repository](https://github.com/UlisesGascon/openssf-scorecard-monitor-demo) that is using this Action

**Sample Report**

![sample report](.github/img/report.png)

**Sample Issue**

![sample issue](.github/img/issue.png)


## :shipit: Used By

_Soon_
## ☕️ Setup

Create a folder in your project (for example: `reporting`) and include the scope as follow:

File: `reporting/scope.json`

```json
{
    "github.com": [{
        "org": "UlisesGascon",
        "repo": "tor-detect-middleware"
    }, {
        "org": "UlisesGascon",
        "repo": "check-my-headers"
    },{
        "org": "UlisesGascon",
        "repo": "express-simple-pagination"
    }]
}
```

Note: You must follow this structure, and only `github.com` projects are included


## 📡 Usage

```yml
name: "OpenSSF Scoring"
on: 
  schedule:
    - cron: "0 0 * * *"

permissions:
  contents: write
  pull-requests: none 
  issues: write
  packages: none

jobs:
  security-scoring:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: OpenSSF Scorecard Monitor
        uses: UlisesGascon/openssf-scorecard-monitor@v1.0.1
        with:
          scope: reporting/scope.json
          database: reporting/database.json
          report: reporting/openssf-scorecard-report.md
          auto-commit: true
          auto-push: true
          generate-issue: true
          issue-title: "OpenSSF Scorecard Report Updated!"
          github-token: ${{ secrets.GITHUB_TOKEN }}
          max-request-in-parallel: 10
```

### Options

- `scope`: defined the path to the file where the scope is defined
- `database`: define the path to the json file usage to store the scores and compare
- `report`: define the path where the markdown report will be added/updated
- `auto-commit`: commit the changes in the `database` and `report` files
- `auto-push`: push the code changes to the branch
- `generate-issue`: create an issue with the scores that had been updated
- `issue-title`: Defines the issue title
- `github-token`: The token usage to create the issue and push the code
- `max-request-in-parallel`: Defines the total HTTP Request that can be done in parallel


## 🍿 Other

### Database structure

Just for reference, the database will store the current value and previous values with the date:

```json
{
  "github.com": {
    "UlisesGascon": {
      "check-my-headers": {
        "previous": [ {
          "score": 6.7,
          "date": "2022-08-21"
        }],
        "current": {
          "score": 4.4,
          "date": "2022-11-28"
        }
      }
    }
  }
}
```