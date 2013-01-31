App.Model.Search = Backbone.Model.extend({
  collections: {},
  initialize: function (attributes, options) {
    Backbone.Model.prototype.initialize.apply(this, arguments);
    this.localTracks = new App.Collection.Tracks();
    this.tracks = new App.Collection.Tracks();
    this.albums = new App.Collection.Albums();
    this.artists = new App.Collection.Artists();
  },
  sync: function (method, model, options) {
    var success = options.success;
    var error = options.error;
    var timestamp = Date.now();

    this._searchTimestamp = timestamp;

    options.success = function(resp) {
      if (timestamp === this._searchTimestamp) {
        if (success) {
          success(model, resp, options);
          this._syncResponseToCollections(resp);
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

    var xhr = App.mopidy.library.search({
      any: [options.query]
    });
    xhr.then(options.success, null, options.error);
    return xhr;
  },
  _searchTimestamp: 0,
  _syncResponseToCollections: function (resp) {
    if (resp[0] && resp[0].tracks && resp[0].tracks.length) {
      this.localTracks.reset(resp[0].tracks);
    }
    else {
      this.localTracks.reset();
    }

    if (resp[1]) {
      if (resp[1].tracks && resp[1].tracks.length) {
        this.tracks.reset(resp[1].tracks);
      }
      else {
        this.tracks.reset();
      }

      if (resp[1].albums && resp[1].albums.length) {
        this.albums.reset(resp[1].albums);
      }
      else {
        this.albums.reset();
      }

      if (resp[1].artists && resp[1].artists.length) {
        this.artists.reset(resp[1].artists);
      }
      else {
        this.artists.reset();
      }
    }
  }
});
