var EventEmitter = require('events').EventEmitter;
var tracklist = require('./tracklist.js');
var search = require('./search.js');
var Mopidy = require('mopidy');
var LastFM = require('browserified-lastfm-api');
var history = require('backbone').history;
var TabView = require('jpf').TabView;

function jukePi(config, callback) {
  var mopidy = !config.mopidyWebSocketUrl ? new Mopidy({ callingConvention: 'by-position-only' }) : new Mopidy({ webSocketUrl: config.mopidyWebSocketUrl, callingConvention: 'by-position-only' });
  var lastfm = new LastFM({
    apiKey: config.lastfm && config.lastfm.key ? config.lastfm.key : '',
    apiSecret: config.lastfm && config.lastfm.secret ? config.lastfm.secret : ''
  });
  var app = {
    config: config,
    lastfm: lastfm,
    mopidy: mopidy,
    events: new EventEmitter()
  };
  function storeUriSchemes(uriSchemes) {
    config.uriSchemes = uriSchemes;
  }

  function start() {
    try {
      var collection = [
        tracklist(app, 0),
        search(app, 1)
      ];
      var view = new TabView({
        className: 'app-view',
        collection: collection
      });
      app.primaryView = view;

      document.body.appendChild(view.render().el);
      history.start(true);
    }
    catch (e) {
      console.error(e);
    }
  }

  function onceOnline() {
    mopidy.getUriSchemes().then(storeUriSchemes).then(start);
    if (typeof callback === 'function') {
      callback(app);
    }
  }

  mopidy.once('state:online', onceOnline);
}

module.exports = jukePi;
