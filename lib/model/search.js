var Model = require('./model.js');
var TrackCollection = require('../collection/track.js');
var AlbumCollection = require('../collection/album.js');
var ArtistCollection = require('../collection/artist.js');
var Search = Model.extend({
  collections: {},
  initialize: function (attributes, options) {
    Model.prototype.initialize.call(this, attributes, options);
    this.localTracks = new TrackCollection(null, {
      mopidy: this.mopidy,
      lastfm: this._lastfm
    });
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
    var spotifyData = {};
    var localData = [];
    var r;

    for (r = 0; r < resp.length; r++) {
      if (resp[r] && resp[r].tracks && resp[r].tracks.length) {
        if (resp[r].uri.match(/^local\:/)) {
          localData = resp[r].tracks;
        }
        else if (resp[r].uri.match(/^spotify\:/)) {
          spotifyData = resp[r];
        }
      }
    }

    if (localData.length) {
      this.localTracks.set(localData);
    }
    else {
      this.localTracks.reset();
    }

    if (spotifyData.tracks && spotifyData.tracks.length) {
      this.tracks.set(spotifyData.tracks);
    }
    else {
      this.tracks.reset();
    }

    if (spotifyData.albums && spotifyData.albums.length) {
      this.albums.set(spotifyData.albums);
    }
    else {
      this.albums.reset();
    }

    if (spotifyData.artists && spotifyData.artists.length) {
      this.artists.set(spotifyData.artists);
    }
    else {
      this.artists.reset();
    }
  }
});

module.exports = Search;
