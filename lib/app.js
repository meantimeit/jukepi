var extend = require('underscore').extend;
var Mopidy = require('mopidy');
var Backbone = require('backbone');
var Router = require('./router.js');
var RootView = require('./view/page/root.js');
var LastFM = require('browserified-lastfm-api');
var env = require('./env.json');

function jukePi(config, callback) {
  var mopidy;
  var elements;
  var lastfm;
  var router;
  var rootView;

  config = extend({}, env, config);
  mopidy = !config.mopidyWebSocketUrl ? new Mopidy() : new Mopidy({ webSocketUrl: config.mopidyWebSocketUrl });
  lastfm = new LastFM({
    apiKey: config.lastfm.key,
    apiSecret: config.lastfm.secret
  });
  elements = {
    tracklist: document.getElementById('section_tracklist'),
    main: document.getElementsByTagName('main')[0]
  };
  mopidy.once('state:online', function () {
    var router = new Router({
      mopidy: mopidy,
      lastfm: lastfm,
      config: config,
      rootElement: elements.main
    });
    var rootView = new RootView({
      router: router,
      mopidy: mopidy,
      config: config,
      lastfm: lastfm
    });
    elements.tracklist.appendChild(rootView.render().el);
    Backbone.history.start(true);

    if (typeof callback === 'function') {
      callback(null, {
        mopidy: mopidy
      });
    }
  });
  mopidy.on('state:online', function () {
    $('html').addClass('mopidy-connected');
  });
  mopidy.on('state:offline', function () {
  });
}

module.exports = jukePi;
