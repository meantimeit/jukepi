var Model = require('jpf').Model;
var Tracks = require('../../collection/track-collection');
var LastfmAlbum = require('../lastfm-album');
var AlbumDetail = Model.extend({
  idAttribute: 'uri',
  initialize: function (attributes, options) {
    options = options || {};

    this.lastfm = options.lastfm;
    this.lastfmAlbum = new LastfmAlbum();
    this.tracks = new Tracks();

    Model.prototype.initialize.apply(this, arguments);
  },
  sync: function (method, model, options) {
    this.mopidy.library.lookup(null, [this.get('id')])
      .then(this._syncCollections.bind(this))
      .catch(options.error);
    this.lastfm.album.getInfo(
      { artist: this.get('artist'), album: this.get('name') },
      { success: this._syncLastfm.bind(this), error: options.error }
    );
  },
  _syncCollections: function (resp) {
    var tracks = resp[this.get('id')];
    this.tracks[tracks.length ? 'set' : 'reset'](tracks);
  },
  _syncLastfm: function (data) {
    this.lastfmAlbum.set(data.album);
  }
});

module.exports = AlbumDetail;
