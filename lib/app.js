var Mopidy = require('mopidy');
var LastFM = require('browserified-lastfm-api');
var Router = require('./router.js');
var RootView = require('./view/page/root.js');
var NavigationView = require('./view/page/navigation.js');
var extend = require('backbone/node_modules/underscore').extend;
var history = require('backbone').history;
var env = require('./env.json');

function jukePi(config, callback) {
  var mopidy;
  var lastfm;
  var router;
  var rootView;
  var rootViewEl;
  var routerViewEl;
  var navigationViewEl;

  config = extend({}, env, config);
  mopidy = !config.mopidyWebSocketUrl ? new Mopidy() : new Mopidy({ webSocketUrl: config.mopidyWebSocketUrl });
  lastfm = new LastFM({
    apiKey: config.lastfm.key,
    apiSecret: config.lastfm.secret
  });
  rootViewEl = document.getElementById('root_view');
  routerViewEl = document.getElementById('primary_router_view');
  navigationViewEl = document.getElementById('navigation_view');
  mopidy.once('state:online', function () {
    var router = new Router({
      mopidy: mopidy,
      lastfm: lastfm,
      config: config,
      rootElement: routerViewEl
    });
    var navigation = new NavigationView({
      router: router,
      mopidy: mopidy,
      config: config,
      lastfm: lastfm
    });
    var view = new RootView({
      router: router,
      mopidy: mopidy,
      config: config,
      lastfm: lastfm
    });

    navigationViewEl.appendChild(navigation.render().el);
    console.log(navigation.el);
    rootViewEl.appendChild(view.render().el);
    history.start(true);

    if (typeof callback === 'function') {
      callback(null, { mopidy: mopidy });
    }
  });
  mopidy.on('state:online', function () {
    $('html').addClass('mopidy-connected');
  });
  mopidy.on('state:offline', function () {
  });
}

module.exports = jukePi;
