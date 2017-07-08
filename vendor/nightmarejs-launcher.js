/*global  Testem, arguments, __nightmare*/
'use strict'
var Nightmare = require('nightmare')
const fs = require('fs')
const util = require('util')
require('nightmare-custom-event')(Nightmare)

Nightmare.action('sendImage',
  function (ns, options, parent, win, renderer, done) {
    parent.respondTo('sendImage', function (image, done) {
      win.webContents.send('return-image-event', {
        image: image
      }).catch(function (error) {
        console.error('error-send-image', error)
        fs.appendFileSync('nightmare.log', 'error-send-image\n' + util.inspect(error))

      })
      done()
    })
    done()
  },
  function (image, done) {
    this.child.call('sendImage', image, done)
  })

var nightmare = Nightmare(
  {
    openDevTools: {
      mode: 'detach'
    },
    show: true
  }
)
var url = process.argv[2]
nightmare
  .wait(2000)
  .on('capture-event', function (data) {
    fs.appendFileSync('nightmare.log', 'Responding to capture\n')
    return nightmare.viewport(data.rect.width + 1000, data.rect.height + 1000).wait(2000).scrollTo(data.rect.x + 20, data.rect.y + 20).wait(2000).evaluate(function (data) {
      var rect = document.getElementById(data.targetId).getBoundingClientRect()
      return {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      }
    }, data).then(function (rect) {
      return nightmare.screenshot(undefined, data.rect).then(function (result) {
        var image = result.toString('base64')
        return nightmare.sendImage(image).then(function (result) {}).catch(function (error) {
          console.error('error-call-send-image', error)
          fs.appendFileSync('nightmare.log', 'error-call-send-image\n' + util.inspect(error))

        })
      }).catch(function (error) {
        console.error('Search failed:', error)
        fs.appendFileSync('nightmare.log', 'Search failed:\n')

      })
    }).catch(function (error) {
      console.error('failed', error)
      debugger
      fs.appendFileSync('nightmare.log', 'failed to capture\n' + util.inspect(error, false, 2, false))

    })
  })
  .bind('capture-event')
  .on('exit-event', function () {
    nightmare.exit().then(function (result) {
      console.error(result)
    })
      .catch(function (error) {
        console.error('Search failed:', error)
        console.error('error.error', error)
      })
  })
  .bind('exit-event')
  .goto(url)
  .evaluate(function () {
    Testem.afterTests(
      // Asynchronously
      function (config, data, callback) {
        callback(null)
        // Set time to wait for callback to finish its work. Then close launcher (Issue Testem: fails to close custom launcher on Linux) https://github.com/testem/testem/issues/915
        setTimeout(function (params) {
          __nightmare.ipc.send('exit-event', {
            exit: true
          })
        }, 2000)
        // Set time to wait for callback to finish its work. Then close launcher (Issue Testem: fails to close custom launcher on Linux) https://github.com/testem/testem/issues/915
      }
    )
  })
  .then(function (result) {
    console.error(result)
  })
  .catch(function (error) {
    console.error('Search failed:', error)
    console.error('error.error', error)
  })
