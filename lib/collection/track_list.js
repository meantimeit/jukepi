var Collection = require('./collection.js');
var TrackListTrack = require('../model/track_list_track.js');
var TrackListCollection = Collection.extend({
  model: TrackListTrack,
  _prepareModel: function (attrs, options) {
      return Collection.prototype._prepareModel.call(this, attrs, { mopidy: this.mopidy });
  },
  initialize: function (models, options) {
    Collection.prototype.initialize.apply(this, arguments);
    this.listenTo(this.mopidy, 'event:tracklistChanged', this.fetch);
  },
  move: function (model, toIndex) {
    var modelIndex = this.indexOf(model);
    Collection.prototype.move.apply(this, arguments);
    this.mopidy.tracklist.move(modelIndex, modelIndex + 1, toIndex).then(null, Collection.prototype.move.bind(this, model, modelIndex));
  },
  sync: function (method, collection, options) {
    var success = options.success;
    var error = options.error;

    options.success = function(resp) {
      success(resp);
    }.bind(this);

    var xhr = this.mopidy.tracklist.getTlTracks();
    this.mopidy.playback.getCurrentTlTrack().then(function (track) {
      track = track || {};
      options.activeTlid = track.tlid;
      xhr.then(options.success, options.error);
    }.bind(this));
    collection.trigger('request', collection, xhr, options);
    return xhr;
  },
  current: function() {
    var tlTrack = this.filter(function (tlTrack) {
      return tlTrack.current;
    })[0];

    return tlTrack;
  }
});

module.exports = TrackListCollection;
