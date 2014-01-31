var extend = require('backbone/node_modules/underscore').extend;
var Model = require('./model.js');
var Album = Model.extend({
  idAttribute: 'uri',
  initialize: function (attributes, options) {
    if (!options.collection) {
      var TrackCollection = require('../collection/track.js');
      var Artist = require('./artist.js');
      Model.prototype.initialize.call(this, attributes, options);
      this.tracks = new TrackCollection(null, {
        mopidy: this.mopidy,
        lastfm: this._lastfm
      });
      this.artist = new Artist(null, {
        mopidy: this.mopidy,
        lastfm: this._lastfm
      });
    }
  },
  toJSON: function () {
    var modelData = Model.prototype.toJSON.call(this);

    if (this.artist) {
      modelData.artist = this.artist.toJSON();
    }

    return modelData;
  },
  sync: function (method, model, options) {
    function modelSuccess(resp) {
      options.success(resp.album);
    }

    function tracksSuccess(resp) {
      var tracks;
      var artist;

      if (resp[0] && resp[0].album) {
        tracks = resp;
        artist = resp[0].album.artists[0];

        model.tracks.set(tracks);
        model.artist.set(artist);
      }
    }

    this.mopidy.library.lookup(this.id).then(tracksSuccess);
    this._lastfm.album.getInfo({ artist: this.get('artist'), album: this.get('title') }, { success: modelSuccess });
  }
});

module.exports = Album;
