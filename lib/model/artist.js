var _ = require('backbone/node_modules/underscore');
var Model = require('./model.js');
var Artist = Model.extend({
  idAttribute: 'uri',
  initialize: function (attributes, options) {
    if (!options.collection) {
      var TrackCollection = require('../collection/track.js');
      var AlbumCollection = require('../collection/album.js');
      Model.prototype.initialize.apply(this, arguments);
      this.tracks = new TrackCollection(null, {
        mopidy: this.mopidy,
        lastfm: this._lastfm
      });
      this.localTracks = new TrackCollection(null, {
        mopidy: this.mopidy,
        lastfm: this._lastfm
      });
      this.albums = new AlbumCollection(null, {
        mopidy: this.mopidy,
        lastfm: this._lastfm
      });
    }
  },
  sync: function (method, model, options) {
    var artistUri = this.id;
    var artistName = this.get('name');

    function spotifySuccess(tracks) {
      var _tracks = _(tracks);
      var albums = _tracks.chain().pluck('album').uniq(false, function (album) { return album.uri; }).value();
      var artist = _tracks.chain().map(function (track) { return track.artists;  }).flatten().uniq(false, function (artist) { return artist.uri;  }).find(function (artist) { return artist.uri === artistUri;  }).value() || { uri: artistUri, name: artistName };

      model.tracks.set(tracks);
      model.albums.set(albums);
    }

    function localSuccess(resp) {
      var tracks = resp[0].tracks;

      if (tracks) {
        model.localTracks.set(tracks);
      }
      else {
        model.localTracks.reset();
      }
    }

    function lastfmSuccess(resp) {
      options.success(resp.artist);
    }

    this.mopidy.library.search({ artist: artistName }, ['local:']).then(localSuccess);
    this.mopidy.library.lookup(this.id).then(spotifySuccess);
    this._lastfm.artist.getInfo({ artist: artistName }, { success: lastfmSuccess, error: options.error });
  }
});

module.exports = Artist;
