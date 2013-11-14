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
    var spotifyData = {};
    var localData = [];
    var r;

    for (r = 0; r < resp.length; r++) {
      if (resp[r] && resp[r].tracks && resp[r].tracks.length) {
        if (resp[r].uri.match(/^file\:/)) {
          localData = resp[r].tracks;
        }
        else if (resp[r].uri.match(/^spotify\:/)) {
          spotifyData = resp[r];
        }
      }
    }

    if (localData.length) {
      this.localTracks.reset(localData);
    }
    else {
      this.localTracks.reset();
    }

    if (spotifyData.tracks && spotifyData.tracks.length) {
      this.tracks.reset(spotifyData.tracks);
    }
    else {
      this.tracks.reset();
    }

    if (spotifyData.albums && spotifyData.albums.length) {
      this.albums.reset(spotifyData.albums);
    }
    else {
      this.albums.reset();
    }

    if (spotifyData.artists && spotifyData.artists.length) {
      this.artists.reset(spotifyData.artists);
    }
    else {
      this.artists.reset();
    }
  }
});
