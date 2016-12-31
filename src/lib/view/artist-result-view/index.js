var View = require('../view');
var TabView = require('jpf').TabView;

var Collection = require('jpf').Collection;

var AlbumCollectionView = require('../album-collection-view');
var TrackListView = require('../track-list-view');
var LastfmArtistView = require('../lastfm-artist-view');

var ArtistResultView = View.extend({
  _initializeViews: function () {
    var tvc = [
      {
        name: 'Albums',
        view: new AlbumCollectionView({
          app: this._app,
          router: this.router,
          mopidy: this._app.mopidy,
          collection: this.model.albums
        })
      },
      {
        name: 'Tracks',
        view: new TrackListView({
          app: this._app,
          collection: this.model.tracks
        })
      }
    ];

    var views = new Collection([
      {
        name: 'Lastfm Artist View',
        view: new LastfmArtistView({
          app: this._app,
          mopidy: this._app.mopidy,
          model: this.model.lastfmArtist
        })
      },
      {
        name: 'Artist Results Tab View',
        view: new TabView({
          collection: tvc
        })
      }
    ]);

    return views;
  }
});

module.exports = ArtistResultView;