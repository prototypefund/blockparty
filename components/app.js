'use strict'
const h = require('hyperscript')
const { div, body } =
  require('hyperscript-helpers')(h)
const onLoad = require('on-load')
const loadingScreen = require('./loading-screen')
const makeSidebar = require('./sidebar')
const makeAppView = require('./main-view')

module.exports = (state, emit) => {
  if (!state.apps) return loadingScreen()
  const appIds = Object.keys(state.apps)
  const currentApp = state.apps[state.activeApp]
  const colors = ['lightyellow', 'lightblue']
  const appIndex = appIds.indexOf(state.activeApp)
  const bg = `background-color:${colors[appIndex]}`
  const appMarkup = body({style: bg},
    div('.SplitView',
      makeSidebar(appIds),
      makeAppView(currentApp)
    )
  )
  onLoad(appMarkup, () => setupDOMListeners(state, emit, appIds))
  return appMarkup
}

function setupDOMListeners(state, emit, appIds) {
  document.getElementById('publish').addEventListener('click', () => {
    getActiveApp().server.publish({
      type: 'hello-world'
    }, err => console.log(err))
  })

  document.getElementById('add-to-list').addEventListener('click', () => {
    const textField = document.getElementById('post')
    getActiveApp().server.publish({
      type: 'post',
      text: textField.value
    }, err => console.log(err))
    textField.value = ''
  })

  document.getElementById('blockparty1-link').addEventListener('click', () => {
    state.activeApp = appIds[0]
    emit('render')
  })

  document.getElementById('blockparty2-link').addEventListener('click', () => {
    state.activeApp = appIds[1]
    emit('render')
  })

  document.getElementById('add-username').addEventListener('click', () => {
    const textField = document.getElementById('username')
    getActiveApp().server.publish({
      type: 'about',
      name: textField.value,
      about: getActiveApp().ownId
    }, err => console.log(err))
    textField.value = ''
  })

  document.getElementById('load-more').addEventListener('click', () => {
    emit('get-messages')
  })


  function getActiveApp() {
    return state.apps[state.activeApp]
  }
}
