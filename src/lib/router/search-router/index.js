var ArtistDetail = require('../../model/artist-detail');
var ArtistResultView = require('../../view/artist-result-view');

var AlbumDetail = require('../../model/album-detail');
var AlbumResultView = require('../../view/album-result-view');

var Search = require('../../model/search-model');
var SearchResultView = require('../../view/search-result-view');

var Router = require('backbone').Router;
var SearchRouter = Router.extend({
  routes: {
    'search/albums/:uri/:artist/:name': 'albums',
    'search/artists/:uri/:name': 'artists',
    'search/:query': 'search'
  },
  initialize: function (options) {
    this._app = options.app;
    this.collection = options.collection;
    this._tabIndex = options.tabIndex;

    return Router.prototype.initialize.call(this, options);
  },
  _activatePrimaryViewTab: function () {
    this._app.primaryView.switchTab(this._tabIndex);
  },
  _replaceRouterView: function (view) {
    this.collection.forEach(function (i) {
      i.get('view').remove();
    });
    this.collection.reset([{ name: null, view: view }]);
  },
  albums: function (uri, artist, name) {
    this._activatePrimaryViewTab();

    var albumDetail = new AlbumDetail({
      id: uri,
      artist: artist,
      name: name
    }, {
      mopidy: this._app.mopidy,
      lastfm: this._app.lastfm
    });
    var view = new AlbumResultView({
      app: this._app,
      router: this,
      model: albumDetail
    });

    this._replaceRouterView(view);
    albumDetail.fetch();
  },
  artists: function (uri, name) {
    this._activatePrimaryViewTab();

    var artistDetail = new ArtistDetail({
      id: uri,
      name: name
    }, {
      mopidy: this._app.mopidy,
      lastfm: this._app.lastfm
    });
    var view = new ArtistResultView({
      app: this._app,
      router: this,
      model: artistDetail
    });

    this._replaceRouterView(view);
    artistDetail.fetch();
  },
  search: function (query) {
    this._activatePrimaryViewTab();

    var search = new Search(null, {
      mopidy: this._app.mopidy,
      config: this._app.config
    });
    var view = new SearchResultView({
      app: this._app,
      router: this,
      query: query,
      model: search
    });

    search.fetch({ query: query });
    this._replaceRouterView(view);
  }
});

module.exports = SearchRouter;
