var extend = require('backbone/node_modules/underscore').extend;
var Model = require('./model.js');
var Track = Model.extend({
  idAttribute: 'uri',
  sync: function (method, model, options) {
    function lastfmSuccess(resp) {
      var data = extend({}, this.attributes, resp);
      options.success(data);
    }

    if (method === 'update') {
      xhr = this.mopidy.tracklist.add([ model ]);
      xhr.then(options.success, options.error);
    }
    else {
      model._lastfm.album.getInfo({
        artist: this.attributes.artists[0].name,
        album: this.attributes.album.name
      }, { success: lastfmSuccess, error: options.error });
    }
  }
});

module.exports = Track;
