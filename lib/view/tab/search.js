var TabView = require('./view.js');
var TrackListView = require('../list/track.js');
var AlbumCollectionView = require('../collection/album.js');
var ArtistCollectionView = require('../collection/artist.js');
var SearchTabView = TabView.extend({
  tagName: 'div',
  className: 'view-section opaque',
  title: 'Search',
  initialize: function (options) {
    this.model = options.model;
    TabView.prototype.initialize.call(this, options);
    this.model.fetch({ query: options.query });
  },
  resetResults: function () {
    this.views.albums.resetResults();
    this.views.artists.resetResults();
    this.views.tracks.resetResults();
    this.views.localTracks.resetResults();
  },
  _initSubViews: function () {
    this.views = [
      {
        name: 'Artists',
        view: new ArtistCollectionView({
          collection: this.model.artists,
          mopidy: this.mopidy,
          router: this.router,
          lastfm: this._lastfm
        })
      },
      {
        name: 'Albums',
        view: new AlbumCollectionView({
          collection: this.model.albums,
          mopidy: this.mopidy,
          router: this.router,
          lastfm: this._lastfm
        })
      },
      {
        name: 'Tracks',
        view: new TrackListView({
          collection: this.model.tracks,
          mopidy: this.mopidy,
          router: this.router,
          lastfm: this._lastfm
        })
      },
      {
        name: 'Local tracks',
        view: new TrackListView({
          collection: this.model.localTracks,
          mopidy: this.mopidy,
          router: this.router,
          lastfm: this._lastfm
        })
      }
    ];
  }
});

module.exports = SearchTabView;
