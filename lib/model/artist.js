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
      this.albums = new AlbumCollection(null, {
        mopidy: this.mopidy,
        lastfm: this._lastfm
      });
    }
  },
  sync: function (method, model, options) {
    var artistUri = this.id;
    var artistName = this.get('name');

    function lookupSuccess(tracks) {
      var _tracks;

      tracks = tracks || [];
      _tracks = _(tracks.filter(function (track) { return !track.name.match(/^\[unplayable\]/); }));

      var albums = _tracks.chain().pluck('album').uniq(false, function (album) { return album.uri; }).value();
      var artist = _tracks.chain().map(function (track) { return track.artists;  }).flatten().uniq(false, function (artist) { return artist.uri;  }).find(function (artist) { return artist.uri === artistUri;  }).value() || { uri: artistUri, name: artistName };

      model.tracks.set(tracks);
      model.albums.set(albums);
    }

    function lastfmSuccess(resp) {
      options.success(resp.artist);
    }

    this.mopidy.library.lookup(this.id).then(lookupSuccess);
    this._lastfm.artist.getInfo({ artist: artistName }, { success: lastfmSuccess, error: options.error });
  }
});

module.exports = Artist;
