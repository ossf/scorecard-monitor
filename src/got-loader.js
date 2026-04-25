'use strict'

let _gotPromise = null

function loadGot () {
  if (!_gotPromise) {
    _gotPromise = import('got').then(m => m.default)
  }
  return _gotPromise
}

module.exports = { loadGot }
