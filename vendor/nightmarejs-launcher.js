/*global  Testem, arguments*/
'use strict'
const util = require('util')
var Nightmare = require('nightmare')
require('nightmare-custom-event')(Nightmare)

Nightmare.action('sendImage',
  function (ns, options, parent, win, renderer, done) {
    parent.respondTo('sendImage', function (image, name, done) {
      win.webContents.send('return-image-event' + name, {
        image: image
      })
      done()
    })
    done()
  },
  function (image, done) {
    // // fs.appendFileSync('image-sent.log', 'I must be called right?\n' + image + '\n' + done)
    this.child.call('sendImage', image, done)
  })

var nightmare = Nightmare()
var fs = require('fs')
var url = process.argv[2]
nightmare
  .goto(url)
  .on('capture-event', function (data) {
    try {
      return nightmare.evaluate(() => {
          const body = document.querySelector('body')
          const emberTestingContainer = document.getElementById('ember-testing-container')
          return {
            height: emberTestingContainer.scrollHeight > body.scrollHeight ? emberTestingContainer.scrollHeight : body.scrollHeight,
            width: emberTestingContainer.scrollWidth > body.scrollWidth ? emberTestingContainer.scrollWidth : body.scrollWidth
          }
        })
        .then(function (dimensions) {
          return nightmare
            .viewport(dimensions.width + 500, dimensions.height + 500)
            .wait(1500)
        }).then(function () {
          return nightmare.evaluate((data) => {
            var element = document.getElementById(data.id)
            var rect = element.getBoundingClientRect()
            var clip = {
              x: rect.left,
              y: rect.top,
              width: rect.width,
              height: rect.height
            }
            console.log('evaled')
            return clip
          }, data).then(function (clip) {
            console.log('getting a screenshot ' + data.name)
            return nightmare.screenshot(undefined, clip).then(function (result) {
              var image = result.toString('base64')
              console.log( 'sending image' + data.name)
              return nightmare.viewport(1920, 1080).wait(1500).sendImage(image, data.name)
            }).catch((error) => {
              console.log('screen shot dun fucked', error)
            })
          }).catch(function (error) {
            fs.appendFileSync('error.log', util.inspect(error, {
              showHidden: false,
              depth: null
            }))
          })
        }).catch(function (error) {
          fs.appendFileSync('error.log', util.inspect(error, {
            showHidden: false,
            depth: null
          }))
        })
    } catch (error) {
      // fs.appendFileSync('error-capture.log', error)
    }
  })
  .bind('capture-event')
  .evaluate(function () {
    Testem.afterTests(
      // Asynchronously
      function (config, data, callback) {
        callback(null)
        // Set time to wait for callback to finish its work. Then close launcher (Issue Testem: fails to close custom launcher on Linux) https://github.com/testem/testem/issues/915
      }
    )
  })
  .wait(2000)
  .then(function (result) {
    console.log('Result', result)
  })
  .catch(function (error) {
    console.error('Search failed:', error)
    fs.appendFileSync('error.log', util.inspect(error, {
      showHidden: false,
      depth: null
    }))
  })
