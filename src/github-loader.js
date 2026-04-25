'use strict'

let _githubPromise = null

function loadGithub () {
  if (!_githubPromise) {
    _githubPromise = import('@actions/github')
  }
  return _githubPromise
}

module.exports = { loadGithub }
