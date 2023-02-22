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
          auto-scope-enabled: true
          # As an example Awesome Org and Myself
          auto-scope-orgs: 'UlisesGascon,Awesome'
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
- `auto-scope-enabled`: Defined if the auto scope is enabled
- `auto-scope-orgs`: List of organizations to be includes in the auto-scope, example: `auto-scope-orgs: owasp,nodejs`
- `report-tags-enabled`: Defines if the markdown report must be created/updated around tags by default is disabled. This is useful if the report is going to be include in a file that has other content on it, like docusaurus docs site or similar.
- `report-start-tag`: Defines the start tag, default `<!-- OPENSSF-SCORECARD-MONITOR:START -->`
- `report-end-tag` Defines the closing tag, default `<!-- OPENSSF-SCORECARD-MONITOR:END -->`


### Outputs

- `scores`: Score data in JSON format

## 🍿 Other

### Scoping Structure

Just for reference, the scope will be stored this way:

File: `reporting/scope.json`

```json
{
    "github.com": {
      "included": {
        "UlisesGascon":[
          "tor-detect-middleware", 
          "check-my-headers", 
          "express-simple-pagination"
        ]
      },
      "excluded": {
        "UlisesGascon": [
          "demo-stuff"
        ]
      }
    }

}
```


☕️ **PRO TIP:** You can exclude any project at any time by editing this file  


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