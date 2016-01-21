
var http = require('http')
var test = require('tape')
var Q = require('q')
var collect = require('stream-collector')
var typeforce = require('typeforce')
var memdown = require('memdown')
var ROOT_HASH = require('@tradle/constants').ROOT_HASH
var Messenger = require('../')
var Zlorp = require('zlorp')
var DHT = Zlorp.DHT
var DSA = Zlorp.DSA
var billPub = require('./fixtures/bill-pub')
var billPriv = require('./fixtures/bill-priv')
var tedPub = require('./fixtures/ted-pub')
var tedPriv = require('./fixtures/ted-priv')
var rufusPub = require('./fixtures/rufus-pub')
var rufusPriv = require('./fixtures/rufus-priv')
var BASE_PORT = 22222
var billRootHash
var tedRootHash
var rufusRootHash
var people = {}

test('p2p', function (t) {
  var received
  var identityInfos = [{
    pub: billPub,
    priv: billPriv,
  }, {
    pub: tedPub,
    priv: tedPriv
  }]

  makeConnectedZlorps(identityInfos, function (zlorps) {
    var messengers = zlorps.map(function (z) {
      return new Messenger({
        zlorp: z
      })
    })

    var msg = new Buffer('blah')
    messengers[0].send('123', msg, { identity: identityInfos[1].pub })
      .catch(t.fail)
      .finally(function () {
        t.ok(received)
        return Q.all(messengers.map(function (m) {
          m.destroy()
        }))
      })
      .then(function () {
        return Q.all(zlorps.map(function (z) {
          return Q.ninvoke(z._dht, 'destroy')
        }))
      })
      .then(function () {
        t.end()
      })
      .done()

    messengers[1].on('message', function () {
      received = true
    })
  })
})

function getDSAKey (keys) {
  var key = keys.filter(function (k) {
    return k.type === 'dsa'
  })[0]

  return DSA.parsePrivate(key.priv)
}

function makeConnectedDHTs (n, cb) {
  var dhts = []
  for (var i = 0; i < n; i++) {
    var dht = new DHT({ bootstrap: false })
    dht.listen(BASE_PORT++, finish)
    dhts.push(dht)
  }

  function finish () {
    if (--n === 0) {
      connectDHTs(dhts)
      cb(dhts)
    }
  }

  return dhts
}

function makeConnectedZlorps (identityInfos, cb) {
  identityInfos.forEach(function (identityInfo) {
    typeforce({
      pub: 'Object',
      priv: 'Array'
    }, identityInfo)
  })

  makeConnectedDHTs(identityInfos.length, function (dhts) {
    var nodes = dhts.map(function (dht, i) {
      var identityInfo = identityInfos[i]
      return new Zlorp({
        name: identityInfo.pub.name.firstName,
        port: process.env.MULTIPLEX ? dht.address().port : BASE_PORT++,
        dht: dht,
        key: getDSAKey(identityInfo.priv),
        leveldown: memdown
      })
    })

    cb(nodes)
  })
}

function destroyZlorps (nodes, cb) {
  nodes = [].concat(nodes)
  var togo = nodes.length * 2
  nodes.forEach(function (node) {
    node.destroy(finish)
    node._dht.destroy(finish)
  })

  function finish () {
    if (--togo === 0 && cb) cb()
  }
}

function connectDHTs (dhts) {
  var n = dhts.length

  for (var i = 0; i < n; i++) {
    var next = dhts[(i + 1) % n]
    dhts[i].addNode('127.0.0.1:' + next.address().port, next.nodeId)
  }
}

function getDSAKey (keys) {
  var key = keys.filter(function (k) {
    return k.type === 'dsa'
  })[0]

  return DSA.parsePrivate(key.priv)
}
