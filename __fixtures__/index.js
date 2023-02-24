const baseDatabase = {
  'github.com': {
    UlisesGascon: {
      'security-wg': {
        previous: [],
        current: {
          score: 4.3,
          date: '2023-02-20',
          commit: '846b3ddb5f75d95235e94d9eb52e920f4a067338'
        }
      },
      sweetpgp: {
        previous: [
          {
            score: 1.6,
            date: '2002-01-12',
            commit: '136da4a72ce9a9b9954e7c009da9f42f3d00fab1'
          }
        ],
        current: {
          score: 4.6,
          date: '2022-11-28',
          commit: 'b2d932467fdc06b11dedf88f17de68e75dc2b11d'
        }
      }
    }
  }
}

const baseScope = {
  'github.com': {
    UlisesGascon: {
      included: [
        'browser-redirect',
        'check-my-headers',
        'the-scraping-machine',
        'sweetpgp',
        'tor-detect-middleware'
      ],
      excluded: [
        'express-simple-pagination',
        'security-wg'
      ]
    },
    'refined-github': {
      included: [],
      excluded: []
    },
    istanbuljs: {
      included: [
        'babel-plugin-istanbul',
        'nyc',
        'spawn-wrap',
        'eslint-plugin-istanbul'
      ],
      excluded: []
    }
  }
}

const database = {
  fullDatabase: baseDatabase,
  emptyDatabase: {
    'github.com': {}
  }
}

const scope = {
  fullScope: baseScope,
  emptyScope: {
    'github.com': {}
  }
}

const scores = [
  {
    org: 'fake-org',
    repo: 'fake-repo',
    platform: 'github.com',
    commit: '846b3ddb5f75d95235e94d9eb52e920f4a067338',
    score: 10,
    date: '2023-02-20',
    currentDiff: 5
  }
]

module.exports = {
  database,
  scope,
  scores
}
