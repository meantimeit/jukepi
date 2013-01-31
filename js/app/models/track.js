App.Model.Track = Backbone.Model.extend({
    idAttribute: 'uri',
    sync: function (method, model, options) {
      var success = options.success;
      var error = options.error;
      var xhr;

      options.success = function(resp) {
        if (success) {
          success(model, resp, options);
        }
        model.trigger('sync', model, resp, options);
      }.bind(this);
      options.error = function(xhr) {
        if (error) {
          error(model, xhr, options);
        }
        model.trigger('error', model, xhr, options);
      }.bind(this);

      if (method === 'update') {
        xhr = App.mopidy.tracklist.add([ model ]);
        xhr.then(options.success, null, options.error);
      }

      return xhr;
    }
});
App.Model.TrackListTrack = Backbone.Model.extend({
    idAttribute: 'tlid',
    current: false,
    initialize: function (attributes, options) {
      Backbone.Model.prototype.initialize.apply(this, arguments);
      this.current = attributes.tlid === options.activeTlid;
      this.track = new App.Model.Track(attributes.track);
      this._initListeners();
    },
    _initListeners: function () {
      var callback = this._onTrackPlaybackStarted.bind(this);

      App.mopidy.on('event:trackPlaybackStarted', callback);
      this.on('remove', function () {
        App.mopidy.off('event:trackPlaybackStarted', callback);
      });
    },
    _onTrackPlaybackStarted: function (event) {
      if (this.current !== (this.id === event.tl_track.tlid)) {
        this.current = !this.current;
        this.trigger('change');
      }
    }
});
