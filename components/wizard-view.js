'use strict'
const { ipcRenderer, shell } = require('electron')
const mutantValue = require('mutant/value')
const computed = require('mutant/computed')
const { div, button, p, h2, h3, section, select, input, option } =
  require('../html-helpers')
const {wizard, errors} = require('./labels')
const joinNetwork = require('../join-network')
const startApp = require('../start-app')
const makeErrorMessage = require('../components/error-message')
const errorMessagePlaceholder = mutantValue()
const getSizes = require('../get-sizes')

module.exports = function (state) {
  const appIdObs = mutantValue()
  const apiKeyObs = mutantValue()
  const sizesObs = mutantValue()
  const regionsObs = mutantValue()
  const wizardPages = {
    enterName: section('.wizard-page', [
      div('.wrapper', [
        h2('Create a new community or join an existing one!'),
        div('.box', [
          h3(wizard.enterAppId),
          input('#wizard-app-id', {attributes: {required: true}}),
          button('.button-continue .app-button', {'ev-click': () => {
            const wizardInput = document.getElementById('wizard-app-id').value
            if (!wizardInput) {
              return
            }
            appIdObs.set(wizardInput)
            pageObs.set(wizardPages.hasAccount)
          }}, wizard.continue)
        ]),
        div('.box', [
          h3(wizard.enterInvite),
          input('#invite-code'),
          button('.button-continue .app-button', {'ev-click': () => {
            const inviteCode = document.getElementById('invite-code').value
            if (!inviteCode) return
            joinNetwork(inviteCode, (err, appName, config) => {
              if (err) {
                if (err.message === 'bad invite code') {
                  console.log(err.message)
                  const errorHTML = makeErrorMessage(errors.badInviteCode.title, errors.badInviteCode.text, () => {
                    errorMessagePlaceholder.set(null)
                  })
                  errorMessagePlaceholder.set(errorHTML)
                  return
                }
                return
              }
              config.appName = appName
              state.appsFound.set(true)
              state.wizardActive.set(false)
              state.noApps.set(false)
              startApp(state, config, true)
            })
          }}, wizard.continue)
        ])
      ])
    ]),
    hasAccount: section('.wizard-page', [
      div('.wrapper', [
        h2(wizard.haveAccount),
        div('.box', [
          h3(wizard.accountNo),
          p(wizard.getDOAccount),
          button('#make-account .app-button', {'ev-click': () => shell.openExternal(wizard.dOURL)}, wizard.goToDO)
        ]),
        div('.box', [
          h3(wizard.accountYes),
          p(wizard.giveApiKey),
          input({id: 'wizard-api-key'}),
          makeCancelButton(),
          button('.button-continue .app-button', {'ev-click': async () => {
            const apiKeyValue = document.getElementById('wizard-api-key').value
            apiKeyObs.set(apiKeyValue)
            pageObs.set(wizardPages.sizeAndRegion)
            sizesObs.set(await getSizes(apiKeyValue))
          }}, wizard.continue)
        ])
      ])
    ]),
    sizeAndRegion: section('.wizard-page', [
      div('.wrapper', [
        h2(wizard.chooseOptions),
        div('.box', [
          select(
            {'ev-change': (ev) => {
              const chosenSize = ev.target.value
              const matchSize = sizesObs().find(item => item.slug === chosenSize)
              regionsObs.set(matchSize.regions)
            }},
            computed([sizesObs], sizes => sizes && sizes.map(size => {
              return option(size.slug)
            }))
          ),
          select(
            computed([regionsObs], regions => regions && regions.map(region => option(region)))
          ),
          makeCancelButton(),
          button('.button-continue .app-button', {'ev-click': () => {
            ipcRenderer.send('create-network', {
              appName: appIdObs(),
              apiToken: apiKeyObs()
            })
            pageObs.set(wizardPages.confirmation)
          }}, wizard.yesCreate)
        ])
      ])
    ]),
    confirmation: section('.wizard-page', [
      div('.wrapper', [
        h2(wizard.confirmation),
        div('.box', [
          p(appIdObs),
          p(apiKeyObs),
          makeCancelButton(),
          button('.button-continue .app-button', {'ev-click': () => {
            ipcRenderer.send('create-network', {
              appName: appIdObs(),
              apiToken: apiKeyObs()
            })
            pageObs.set(wizardPages.wait)
          }}, wizard.yesCreate)
        ])
      ])
    ]),
    wait: section('.wizard-page', [
      div('.wrapper', [
        h2(wizard.paintWhileWaiting),
        p(wizard.takeSomeTime)
      ])
    ])
  }
  const pageObs = mutantValue(wizardPages.enterName)

  function makeCancelButton() {
    return button('.button-cancel .app-button', {'ev-click': () => {
      delete state.wizard.appId
      delete state.wizard.apiKey
      if (state.apps) {
        pageObs.set(wizardPages.enterName)
      } else {
        state.wizardActive = false
      }
    }}, wizard.cancel)
  }

  return div('#wizard-view', [
    pageObs,
    div(errorMessagePlaceholder)
  ])
}
