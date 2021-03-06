'use strict'

const { div, button, img, h2 } = require('../html-helpers')

module.exports = function (title, text, buttonAction, buttonTitle = 'Close',) {
  return [
    div('#error-message', [
      div('.top .errorTop', [
        img('.error-icon', {src: 'styles/img/error.png'}),
        h2('.message-title', title)
      ]),
      div('.bottom', [
        text,
        button('.errorMessageAction .app-button', {
          'ev-click': buttonAction
        }, buttonTitle)
      ])
    ]),
    div('#overlay')
  ]
}
