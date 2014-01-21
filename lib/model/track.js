var _ = require('underscore');
var Model = require('./model.js');
var Track = Model.extend({
  idAttribute: 'uri',
  sync: function (method, model, options) {
    var success = options.success;
    var response = {};
    var xhr;

    options.success = function(resp) {
      var lastfm, images;
      if (resp.album) {
        response.images = resp.album.image.map(function (image) {
          return {
            url: image['#text'],
            size: image.size
          };
        });
        response.lastfm = resp.album;
      }

      resp = response;

      success(model, resp, options);
    }.bind(this);

    if (method === 'update') {
      xhr = this.mopidy.tracklist.add([ model ]);
      xhr.then(options.success, null, options.error);
    }
    else {
      if (this.attributes.lastfm === undefined) {
        _(response).extend(this.attributes);
        this._lastfm.album.getInfo({
          artist: this.attributes.artists[0].name,
          album: this.attributes.album.name
        }, { success: options.success, error: options.error });
      }
    }

    return xhr;
  }
});

module.exports = Track;
