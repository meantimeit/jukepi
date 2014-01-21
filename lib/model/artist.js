var _ = require('underscore');
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
    var success = options.success;
    var artistUri = this.id;
    var artistName = this.get('name');
    var taskCounter = 2;
    var response = {};

    var processLookup = function (tracks) {
      var _tracks = _(tracks);
      var albums = _tracks.chain().pluck('album').uniq(false, function (album) { return album.uri; }).value();
      var artist = _tracks.chain().map(function (track) { return track.artists;  }).flatten().uniq(false, function (artist) { return artist.uri;  }).find(function (artist) { return artist.uri === artistUri;  }).value() || { uri: artistUri, name: artistName };
      _(response).extend(artist);

      taskCounter -= 1;
      this.tracks.reset(tracks);
      this.albums.reset(albums);
      options.success(response);
    }.bind(this);

    var processSearch = function (resp) {
      taskCounter -= 1;
      this.localTracks.reset(resp[0].tracks);
      options.success(response);
    }.bind(this);

    options.success = function(resp) {
      if (taskCounter === 0) {
        success(model, resp, options);
      }
    }.bind(this);

    this.mopidy.library.search({ artist: artistName }, ['local:']).then(processSearch, options.error);
    return this.mopidy.library.lookup(this.id).then(processLookup, options.error);
  }
});

module.exports = Artist;
