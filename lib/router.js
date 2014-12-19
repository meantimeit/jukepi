var Backbone = require('backbone');
var AlbumTabView = require('./view/tab/album.js');
var ArtistTabView = require('./view/tab/artist.js');
var SearchTabView = require('./view/tab/search.js');
var Search = require('./model/search.js');

var Router = Backbone.Router.extend({
  initialize: function (options) {
    Backbone.Router.prototype.initialize.call(this, options);
    this._mopidy = options.mopidy;
    this._lastfm = options.lastfm;
    this._rootElement = options.rootElement;
    this._config = options.config;
  },
  routes: {
    '': 'dashboard',
    'albums/:id/:artist/:name': 'albums',
    'artists/:uri/:name': 'artists',
    'search/:query': 'search'
  },
  dashboard: function () {
    this.trigger('beforeRoute');
  },
  albums: function (id, artist, name) {
    this.trigger('beforeRoute');
    var view = new AlbumTabView({
      router: this,
      mopidy: this._mopidy,
      lastfm: this._lastfm,
      config: this._config,
      id: id,
      name: name,
      artist: artist
    });
    this._rootElement.appendChild(view.render().el);
  },
  artists: function (uri, name) {
    this.trigger('beforeRoute');
    var view = new ArtistTabView({
      router: this,
      mopidy: this._mopidy,
      lastfm: this._lastfm,
      config: this._config,
      uri: uri,
      name: name
    });
    this._rootElement.appendChild(view.render().el);
  },
  search: function (query) {
    this.trigger('beforeRoute');
    var view = new SearchTabView({
      router: this,
      mopidy: this._mopidy,
      lastfm: this._lastfm,
      config: this._config,
      query: query,
      model: new Search(null, { mopidy: this._mopidy, config: this._config })
    });
    this._rootElement.appendChild(view.render().el);
  }
});

module.exports = Router;
