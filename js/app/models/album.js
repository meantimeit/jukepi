App.Model.Album = Backbone.Model.extend({
    idAttribute: 'uri',
    initialize: function (attributes, options) {
      Backbone.Model.prototype.initialize.apply(this, arguments);
      this.tracks = new App.Collection.Tracks();
      this.artist = new App.Model.Artist();
    },
    sync: function (method, model, options) {
      var success = options.success;
      var error = options.error;
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

        if (success) {
          success(model, resp, options);
          this._syncResponseToSubClasses(resp);
        }
        model.trigger('sync', model, resp, options);
      }.bind(this);
      options.error = function(xhr) {
        if (error) {
          error(model, xhr, options);
        }
        model.trigger('error', model, xhr, options);
      }.bind(this);

      xhr = App.mopidy.library.lookup(this.id);
      //xhr.then(options.success, options.error);
      xhr.then(function (mResp) {
        App.lastfm.album.getInfo({
          artist: mResp[0].artists[0].name,
          album: mResp[0].album.name
        }, { success: function (lfmResp) {
          mResp.lastfm = lfmResp;
          options.success(mResp);
        }, error: function () {
          options.success(mResp);
        } });
      }, options.error);
      return xhr;
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
