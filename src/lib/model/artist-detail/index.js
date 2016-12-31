var _ = require('underscore');
var Model = require('jpf').Model;
var Albums = require('../../collection/album-collection');
var Tracks = require('../../collection/track-collection');
var LastfmArtist = require('../lastfm-artist');
var unique = require('jpf').unique;
var filter = require('jpf').filter;
var map = require('jpf').map;
var ArtistDetail = Model.extend({
  idAttribute: 'uri',
  initialize: function (attributes, options) {
    options = options || {};

    this.lastfm = options.lastfm;
    this.lastfmArtist = new LastfmArtist();
    this.albums = new Albums();
    this.tracks = new Tracks();

    Model.prototype.initialize.apply(this, arguments);
  },
  sync: function (method, model, options) {
    this.mopidy.library.lookup(null, [this.get('id')])
      .then(this._syncCollections.bind(this))
      .catch(options.error);
    this.lastfm.artist.getInfo(
      { artist: this.get('name') },
      { success: this._syncLastfm.bind(this), error: options.error }
    );
  },
  _syncCollections: function (resp) {
    var tracks = resp[this.get('id')];
    var uriAlreadyTaken = function (acc, curr) {
      var uri = curr.uri;
      var uacc = map(function (i) {
        return i.uri;
      }, acc);

      return uacc.indexOf(uri) === -1;
    };
    var notNull = function (val) {
      return val != null;
    };
    var albums = unique(uriAlreadyTaken, filter(notNull, map(function (t) {
      return !t.album ? null : {
        name: t.album.name,
        uri: t.album.uri,
        artists: t.artists || []
      };
    }, tracks)));

    this.tracks[tracks.length ? 'set' : 'reset'](tracks);
    this.albums[albums.length ? 'set' : 'reset'](albums);
  },
  _syncLastfm: function (data) {
    this.lastfmArtist.set(data.artist);
  }
});

module.exports = ArtistDetail;
