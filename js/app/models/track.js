App.Model.Track = Backbone.Model.extend({
    idAttribute: 'uri',
    sync: function (method, model, options) {
      try {
        var success = options.success;
        var error = options.error;
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
        else {
          if (this.attributes.lastfm === undefined) {
            _(response).extend(this.attributes);
            App.lastfm.album.getInfo({
              artist: this.attributes.artists[0].name,
              album: this.attributes.album.name
            }, { success: options.success, error: options.error });
          }
        }

        return xhr;
      } catch (e) { console.error(e.stack); }
    }
});
App.Model.TrackListTrack = Backbone.Model.extend({
    idAttribute: 'tlid',
    current: false,
    initialize: function (attributes, options) {
      Backbone.Model.prototype.initialize.call(this, attributes, options);
      options = options || {};

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
