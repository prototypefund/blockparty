'use strict'
const path = require('path')
const ssbKeys = require('ssb-keys')
const rimraf = require('rimraf')
const localSetup = require('./set-up-locally')
const blockpartyDir = require('./blockparty-dir')
const createConfig = require('./create-sbot-config')
const startSbot = require('./server')

module.exports = async function (code, cb) {
  const regExPort = code.match(/:([0-9]+):/)
  if (!regExPort) {
    return cb(new Error('badInviteCode'))
  }
  const cleanRegEx = regExPort[1]
  const port = parseInt(cleanRegEx)
  const inviteCodeParts = code.split('!')
  if (inviteCodeParts.length !== 4) {
    return cb(new Error('badInviteCode'))
  }
  const [invite, appId, inviterId, appName] = inviteCodeParts
  const config = createConfig(appName, appId, port, port + 1, appName)
  let appDir
  try {
    appDir = localSetup.setUpAppDir(appName, blockpartyDir, config)
  } catch (err) {
    return cb(err)
  }
  const keys = ssbKeys.loadOrCreateSync(path.join(appDir, 'secret'))
  config.keys = keys
  // TODO in sbot version 11, we don't learn about any errors from startSbot
  const sbot = startSbot(config)
  config.manifest = sbot.getManifest()
  config.ownId = keys.id
  sbot.invite.accept(invite, err => {
    if (err) {
      rimraf.sync(appDir)
      return cb(err)
    }
    sbot.publish({
      type: "contact",
      contact: inviterId,
      following: true
    }, err => {
      if (err) {
        rimraf.sync(appDir)
        return cb(err)
      }
      cb(null, appName, config)
    })
  })
}
