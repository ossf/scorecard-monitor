'use strict'

let _execPromise = null

function loadExec () {
  if (!_execPromise) {
    _execPromise = import('@actions/exec')
  }
  return _execPromise
}

module.exports = { loadExec }
