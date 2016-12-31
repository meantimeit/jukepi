var Model = require('jpf').Model;
var Album = Model.extend({
  idAttribute: 'uri',
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