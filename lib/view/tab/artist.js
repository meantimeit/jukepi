var PageView = require('./view.js');
var AlbumCollectionView = require('../collection/album.js');
var TrackListView = require('../list/track.js');
var ArtistView = require('../model/artist.js');
var JoinView = require('../misc/join.js');
var Artist = require('../../model/artist.js');
var ArtistTabView = PageView.extend({
  tagName: 'div',
  title: 'Artists',
  initialize: function (options) {
    this.artist = new Artist({ uri: options.uri, name: options.name }, {
      mopidy: options.mopidy,
      router: options.router,
      lastfm: options.lastfm
    });
    PageView.prototype.initialize.call(this, options);
    this.artist.fetch();
  },
  _initSubViews: function () {
    this.views = [
      {
        name: this.artist.get('name'),
        view: new JoinView({
          views: [
            {
              name: this.artist.get('name'),
              view: new ArtistView({
                mopidy: this.mopidy,
                router: this.router,
                lastfm: this._lastfm,
                model: this.artist
              }),
            },
            {
              name: 'Albums',
              view: new AlbumCollectionView({
                mopidy: this.mopidy,
                router: this.router,
                lastfm: this._lastfm,
                collection: this.artist.albums
              }),
            }
          ]
        })
      },
      {
        name: 'Tracks',
        view: new TrackListView({
          mopidy: this.mopidy,
          router: this.router,
          lastfm: this._lastfm,
          collection: this.artist.tracks,
          extended: true
        }),
      }
    ];
  }
});

module.exports = ArtistTabView;
