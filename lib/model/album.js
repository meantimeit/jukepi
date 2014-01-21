var extend = require('underscore').extend;
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
    var success = options.success;
    var xhr;

    options.success = function(resp) {
      if (resp[0] && resp[0].album) {
        var lastfm;
        var images;

        if (resp.lastfm) {
          lastfm = resp.lastfm.album;
          images = resp.lastfm.album.image.map(function (image) {
            return {
              url: image['#text'],
              size: image.size
            };
          });
        }

        resp = {
          name: resp[0].album.name,
          uri: resp[0].album.uri,
          date: resp[0].album.date,
          artist: resp[0].album.artists[0],
          lastfm: lastfm,
          images: images,
          tracks: resp
        };
      }

      this._syncResponseToSubClasses(resp);
      success(model, resp, options);
    }.bind(this);

    return this.mopidy.library.lookup(this.id).then(options.success, options.error);
  },
  _syncResponseToSubClasses: function (resp) {
    var tracks;
    var artist;

    if (resp.tracks) {
      tracks = resp.tracks;

      if (resp.artist) {
        artist = resp.artist;
      }
    }
    else if (Object.prototype.toString.call(resp) === '[object Array]') {
      tracks = resp;
    }

    this.tracks.reset(tracks);
    this.artist.set(artist);
  }
});

module.exports = Album;
