var Model = require('./model.js');
var TrackCollection = require('../collection/track.js');
var AlbumCollection = require('../collection/album.js');
var ArtistCollection = require('../collection/artist.js');
var Search = Model.extend({
  collections: {},
  initialize: function (attributes, options) {
    Model.prototype.initialize.call(this, attributes, options);
    this.tracks = new TrackCollection(null, {
      mopidy: this.mopidy,
      lastfm: this._lastfm
    });
    this.albums = new AlbumCollection(null, {
      mopidy: this.mopidy,
      lastfm: this._lastfm
    });
    this.artists = new ArtistCollection(null, {
      mopidy: this.mopidy,
      lastfm: this._lastfm
    });
  },
  sync: function (method, model, options) {
    var success = options.success;
    var timestamp = Date.now();

    this._searchTimestamp = timestamp;

    options.success = function(resp) {
      if (timestamp === this._searchTimestamp) {
        this._syncResponseToCollections(resp);
        success(model, resp, options);
      }
    }.bind(this);

    return this.mopidy.library.search({ any: [options.query] }).then(options.success, options.error);
  },
  _searchTimestamp: 0,
  _syncResponseToCollections: function (resp) {
    function extractResultsByKey(key, results) {
      return results.map(function (r) { return r[key] || []; }).reduce(function (a, b) { return a.concat(b); });
    }
    var tracks = extractResultsByKey('tracks', resp);
    var albums = extractResultsByKey('albums', resp);
    var artists = extractResultsByKey('artists', resp);

    if (tracks && tracks.length) {
      this.tracks.set(tracks);
    }
    else {
      this.tracks.reset();
    }

    if (albums && albums.length) {
      this.albums.set(albums);
    }
    else {
      this.albums.reset();
    }

    if (artists && artists.length) {
      this.artists.set(artists);
    }
    else {
      this.artists.reset();
    }
  }
});

module.exports = Search;
