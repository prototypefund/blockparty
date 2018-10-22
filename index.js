'use strict'
const path = require('path')
const fs = require('fs')
const scuttleBot = require('scuttlebot')
const connection = require('ssb-client')
const ssbKeys = require('ssb-keys')
const config = require('ssb-config/inject')
const pull = require('pull-stream')
const choo = require('choo')
const h = require('hyperscript')
const { div, ul, body, li, input, button, section, h4 } =
  require('hyperscript-helpers')(h)


const createSbot = scuttleBot
  .use(require('scuttlebot/plugins/master'))
  .use(require('scuttlebot/plugins/gossip'))
  .use(require('scuttlebot/plugins/local'))
  .use(require('scuttlebot/plugins/logging'))
  .use(require('ssb-ws'))

const appIds =
  fs.readFileSync(path.join(process.env.HOME, '.blockparty'), 'utf-8')
    .trim()
    .split('\n')

// sbot regal

const shelf = appIds.reduce((acc, appName) => {
  const ssbConfig = config(appName)
  const keys = ssbKeys.loadOrCreateSync(path.join(ssbConfig.path, 'secret'))
  ssbConfig.keys = keys
  const sbot = createSbot(ssbConfig)
  acc[appName]=sbot
  return acc
}, {})

// choo app

const app = choo()
app.use(prepareStateAndListeners)
app.route('/', view)
app.route('/test-network-1', view)
app.route('/test-network-2', view)
app.mount('body')

function view(state) {
  const currentApp = state.activeApp
  const colors = ['lightyellow', 'lightblue']
  const appIndex = appIds.indexOf(currentApp)
  const bg = `background-color:${colors[appIndex]}`
  return body({style: bg},
    div('.MainWindow',
      div('.SplitView',
        div('.side',
          div('.switch-app',
            button('#switch-app', 'Switch to other app')
          ),
          div('.show-peers',
            h4('Online peers:'),
            ul(state.peers[currentApp].map(peer => li(peer.key)))
          )
        ),
        div('.main',
          div('.post-msg',
            input({type: "text", id: "post", name: "your message"}),
            button({ id: 'add-to-list' }, 'Post message')
          ),
          div('.say-hello',
            button({id: 'publish'}, 'say "hello world"')
          ),
          div('.feed',
            section('.content',
              state.messages[currentApp].map(msg => {
                const m = msg.value
                let author = m.author.slice(1, 4)
                if (m.content.type === 'post') {
                  return div('.FeedEvent',`${author} says: ${m.content.text}`)
                } else if (m.content.type === 'hello-world') {
                  return div('.FeedEvent', `${author} says: ${m.content.type}`)
                }
              })
            )
          )
        )
      )
    )
  )
}
function prepareStateAndListeners(state, emitter) {
  state.activeApp = appIds[0]
  state.sbot = shelf[state.activeApp]
  state.messages = {}
  state.peers = {}
  appIds.reduce((acc, curr) => {
    acc[curr] = []
    return acc
  }, state.messages)
  appIds.reduce((acc, curr) => {
    acc[curr] = []
    return acc
  }, state.peers)

  emitter.on('DOMContentLoaded', () => {
    document.getElementById('publish').addEventListener('click', () => {
      state.sbot.publish({
        type: 'hello-world'
      }, err => console.log(err)) // sbot from createSbot needs a cb
    })

    document.getElementById('add-to-list').addEventListener('click', () => {
      const textField = document.getElementById('post')
      state.sbot.publish({
        type: 'post',
        text: textField.value
      }, err => console.log(err))
      textField.value = ''
    })

    document.getElementById('switch-app').addEventListener('click', () => {
      const otherAppId = appIds.find(id => id !== state.activeApp)
      state.activeApp = otherAppId
      state.sbot = shelf[state.activeApp]
      emitter.emit('render')
    })
  })

  appIds.forEach(appName => {
    const ssbConfig = config(appName)
    const keys = ssbKeys.loadOrCreateSync(path.join(ssbConfig.path, 'secret'))
    ssbConfig.keys = keys
    const sbotFile = shelf[appName]
    ssbConfig.remote = sbotFile.getAddress()
    console.log(ssbConfig)
    connection(keys, ssbConfig, (err, server) => {
      if (err) return console.log(err)
      setInterval(function () {
        console.log('lïoft!' + appName)
        server.gossip.peers((err, peers) => {
          console.log(peers, appName)
          if (err) {
            console.log(err)
            return
          }
          state.peers[appName] = peers
          emitter.emit('render')
        })
      }, 8000) // peers als live-stream


      pull(
        server.createFeedStream({live: true}),
        pull.drain(msg => {
          if (!msg.value) return
          state.messages[appName].unshift(msg)
          emitter.emit('render')
        })
      )
    })
  })
}
