'use strict'
const h = require('hyperscript')
const { div, button, p } =
  require('hyperscript-helpers')(h)
const textField = require('./input-field')
const labels = require('./labels').wizard

module.exports = function (state, emit) {
  const activePage = state.wizard.activePage || 'enterName'
  const wizardPages = {
    enterName: div(labels.enterAppId,
      textField({id: 'wizard-app-id'}),
      button(labels.continue, { onclick: () => {
        state.wizard.appId = document.getElementById('wizard-app-id').value
        goTo('hasAccount')
      }})
    ),
    hasAccount: div(labels.haveAccount,
      button(labels.accountYes, { onclick: () => goTo('apiKey')}),
      button(labels.accountNo)
    ),
    apiKey: div(labels.giveApiKey,
      textField({id: 'wizard-api-key'}),
      div(labels.continue, {onclick: () => {
        state.wizard.appId = document.getElementById('wizard-api-key').value
        goTo('confirmation')
      }})
    ),
    confirmation: div(labels.confirmation,
      p(state.wizard.appId),
      p(state.wizard.apiKey),
      button(labels.yesCreate, { onclick: () => {}}),
      button(labels.cancel)
    )
  }

  function goTo(pageName) {
    state.wizard.activePage = pageName
    emit('render')
  }

  const currentWizardPage = wizardPages[activePage]
  return div('#wizard-view', currentWizardPage)
}