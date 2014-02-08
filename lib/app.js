var Mopidy = require('mopidy');
var Handlebars = require('handlebars/runtime').default;
var LastFM = require('browserified-lastfm-api');
var Router = require('./router.js');
var RootView = require('./view/page/root.js');
var NavigationView = require('./view/page/navigation.js');
var AlertView = require('./view/modal/alert.js');
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
  var loadingAlert;

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
    loadingAlert = new AlertView({
      header: 'Loading',
      message: new Handlebars.SafeString(require('../templates/modal/loading.hbs')())
    });

    document.body.appendChild(loadingAlert.render().el);
    navigationViewEl.appendChild(navigation.render().el);
    rootViewEl.appendChild(view.render().el);
    history.start(true);

    if (typeof callback === 'function') {
      callback(null, { mopidy: mopidy });
    }
  });
  mopidy.on('state:online', function () {
    loadingAlert.remove();
  });
  mopidy.on('state:offline', function () {
  });
}

module.exports = jukePi;
