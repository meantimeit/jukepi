App.Collection.TrackList = App.Collection.CoreCollection.extend({
  mopidy: App.mopidy,
  model: App.Model.TrackListTrack,
  initialize: function (models, options) {
    App.Collection.CoreCollection.prototype.initialize.apply(this, arguments);
    this.listenTo(this.mopidy, 'event:tracklistChanged', this.fetch.bind(this));
  },
  move: function (model, toIndex) {
    var modelIndex = this.indexOf(model);
    App.Collection.CoreCollection.prototype.move.apply(this, arguments);
    App.mopidy.tracklist.move(modelIndex, modelIndex + 1, toIndex).then(null, App.Collection.CoreCollection.prototype.move.bind(this, model, modelIndex));
  },
  sync: function (method, model, options) {
    try {
      var success = options.success;
      var error = options.error;

      options.success = function(resp) {
        if (success) {
          success(model, resp, options);
        }
        model.trigger('sync', model, resp, options);
      };
      options.error = function(xhr) {
        if (error) {
          error(model, xhr, options);
        }
        model.trigger('error', model, xhr, options);
      };

      var xhr = this.mopidy.tracklist.getTlTracks();
      this.mopidy.playback.getCurrentTlTrack().then(function (track) {
        track = track || {};
        options.activeTlid = track.tlid;
        xhr.then(options.success, options.error);
      }.bind(this));
      model.trigger('request', model, xhr, options);
      return xhr;
    } catch (e) { console.error(e.stack); }
  },
  current: function() {
    var tlTrack = this.filter(function (tlTrack) {
      return tlTrack.current;
    })[0];

    return tlTrack;
  }
});
