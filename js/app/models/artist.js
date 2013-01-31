App.Model.Artist = Backbone.Model.extend({
    idAttribute: 'uri',
    initialize: function (attributes, options) {
      Backbone.Model.prototype.initialize.apply(this, arguments);
      this.tracks = new App.Collection.Tracks();
      this.localTracks = new App.Collection.Tracks();
      this.albums = new App.Collection.Albums();
    },
    sync: function (method, model, options) {
        var success = options.success;
        var error = options.error;
        var artistUri = this.id;
        var artistName = this.get('name');
        var xhrTasks = {
          lastfm: false,
          lookup: false,
          search: false
        };
        var response = {};
        var xhr;

        var processLookup = function (resp) {
          var tracks = resp;
          var _tracks = _(tracks);
          var albums = _tracks.chain().pluck('album').uniq(false, function (album) { return album.uri; }).value();
          var artist = _tracks.chain().map(function (track) { return track.artists;  }).flatten().uniq(false, function (artist) { return artist.uri;  }).find(function (artist) { return artist.uri === artistUri;  }).value() || { uri: artistUri, name: artistName };
          _(response).extend(artist);

          xhrTasks.lookup = true;
          this.tracks.reset(tracks);
          this.albums.reset(albums);
          options.success(response);
        }.bind(this);

        function processLastfm(resp) {
          xhrTasks.lastfm = true;
          response.lastfm = resp.artist;
          response.images = resp.artist.image.map(function (image) {
            return { size: image.size, url: image['#text'] };
          });

          options.success(response);
        }

        function lastfmError() {
          xhrTasks.lastfm = true;
          options.success(response);
        }

        var processSearch = function (resp) {
          xhrTasks.search = true;
          this.localTracks.reset(resp[0].tracks);
        }.bind(this);

        function searchError(resp) {
        }

        options.success = function(resp) {
          if (xhrTasks.lookup && xhrTasks.lastfm) {
            if (success) {
              success(model, resp, options);
            }
            model.trigger('sync', model, resp, options);
          }
        }.bind(this);
        options.error = function(xhr) {
          if (error) {
            error(model, xhr, options);
          }
          model.trigger('error', model, xhr, options);
        }.bind(this);

        App.lastfm.artist.getInfo({ artist: artistName }, { success: processLastfm, error: lastfmError });
        xhr = App.mopidy.library.lookup(this.id);
        xhr.then(processLookup, options.error);
        App.mopidy.library.search({ artist: artistName, uri: 'file://' }).then(processSearch, searchError);

        return xhr;
    }
});
