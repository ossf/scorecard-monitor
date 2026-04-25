'use strict'

let _corePromise = null

function loadCore () {
  if (!_corePromise) {
    _corePromise = import('@actions/core')
  }
  return _corePromise
}

module.exports = { loadCore }
