var TabView = require('./view.js');
var AlbumView = require('../model/album.js');
var TrackListView = require('../list/track.js');
var Album = require('../../model/album.js');
var AlbumTabView = TabView.extend({
  tagName: 'div',
  className: 'view',
  title: 'Albums',
  initialize: function (options) {
    this.album = new Album({ uri: options.id, title: options.name }, {
      mopidy: options.mopidy,
      router: options.router,
      lastfm: options.lastfm
    });
    TabView.prototype.initialize.call(this, options);
    this.album.fetch();
  },
  queueAll: function () {
    this.mopidy.tracklist.add(this.album.tracks.toJSON()).then(function () {
    });
  },
  queueSelected: function () {
    var selectedInputs = this.$('li input[type=checkbox]:checked');
    var selectedTracks = selectedInputs.map(function (i, track) {
      return this.album.tracks.get(track.getAttribute('data-track-id')).toJSON();
    }.bind(this));
    this.mopidy.tracklist.add(selectedTracks).then(function () {
      selectedInputs.each(function (i, input) {
        input.checked = false;
      });
    }.bind(this));
  },
  _initSubViews: function () {
    this.views = [
      {
        name: this.album.get('title'),
        view: new AlbumView({
          model: this.album,
          mopidy: this.mopidy,
          router: this.router,
          lastfm: this._lastfm
        })
      },
      {
        name: 'Tracks',
        view: new TrackListView({
          collection: this.album.tracks,
          mopidy: this.mopidy,
          router: this.router,
          lastfm: this._lastfm
        })
      }
    ];
  }
});

module.exports = AlbumTabView;
