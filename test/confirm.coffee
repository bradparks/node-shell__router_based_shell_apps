
should = require 'should'
shell = require '..'
styles = require '../lib/styles'

describe 'req confirm', ->
  it 'should provide a boolean', (next) ->
    stdin = new shell.NullStream
    stdout = new shell.NullStream
    stdout.on 'data', (data) ->
      return unless data.trim()
      styles.unstyle(data).should.eql 'Do u confirm? [Yn] '
      @answer = not @answer
      stdin.emit 'data', new Buffer(if @answer then 'y\n' else 'N\n')
    app = shell
      workspace:  "#{__dirname}/plugins_http"
      command: 'test string'
      stdin: stdin
      stdout: stdout
    app.configure ->
      app.use shell.router shell: app
    app.cmd 'test string', (req, res) ->
      req.confirm 'Do u confirm?', (value) ->
        value.should.eql true
        req.confirm 'Do u confirm?', (value) ->
          value.should.eql false
          next()
