
var util = require('util')
var EventEmitter = require('events').EventEmitter
var Q = require('q')
var debug = require('debug')('p2p-messenger')
var typeforce = require('typeforce')
var find = require('array-find')

function Messenger (options) {
  var self = this

  typeforce({
    zlorp: 'Object'
  }, options)

  EventEmitter.call(this, options)

  this._zlorp = options.zlorp
  this._zlorp.on('data', function (msg, fingerprint) {
    self.emit('message', msg, { fingerprint: fingerprint })
  })
}

module.exports = Messenger
util.inherits(Messenger, EventEmitter)

Messenger.prototype.send = function (rootHash, msg, identityInfo) {
  var fingerprint = find(identityInfo.identity.pubkeys, function (k) {
    return k.type === 'dsa' && k.purpose === 'sign'
  }).fingerprint

  return Q.ninvoke(this._zlorp, 'send', msg, fingerprint)
}

Messenger.prototype.destroy = function () {
  return Q.ninvoke(this._zlorp, 'destroy')
}

// Messenger.prototype._receive = function (buf, fingerprint) {
//   var self = this

//   try {
//     msg = utils.bufferToMsg(buf)
//   } catch (err) {
//     return this.emit('warn', 'received message not in JSON format', buf)
//   }

//   this._debug('received msg', msg)

//   // this thing repeats work all over the place
//   var txInfo
//   var valid = utils.validateMsg(msg)
//   return Q[valid ? 'resolve' : 'reject']()
//     .then(function () {
//       return Q.ninvoke(self.identities, 'byFingerprint', fingerprint)
//     })
//     .then(function (result) {
//       result.msg = msg
//       return result
//     })
// }
