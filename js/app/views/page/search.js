App.View.SearchPage = App.View.PageView.extend({
  tagName: 'div',
  className: 'view',
  title: 'Search',
  template: 'search_page',
  events: {
    'click .queue_all': 'queueAll',
    'click .queue_all_local': 'queueAllLocal',
    'click .queue_selected': 'queueSelected',
    'click [data-album-uri]': 'viewAlbum'
  },
  initialize: function (attributes, options) {
    App.View.PageView.prototype.initialize.apply(this, arguments);
    this.model = attributes.model;
    this._initSubViews();
    this.on('rendered', function () {
      this.$('.search_results_tracks').append(this.views.tracks.render().el);
      this.$('.search_results_localtracks').append(this.views.localTracks.render().el);
      this.$('.search_results_albums').append(this.views.albums.render().el);
      this.$('.search_results_artists').append(this.views.artists.render().el);
    }.bind(this));
    this.model.fetch({ query: attributes.query });
  },
  resetResults: function () {
    this.views.albums.resetResults();
    this.views.artists.resetResults();
    this.views.tracks.resetResults();
    this.views.localTracks.resetResults();
  },
  queueAll: function () {
    App.mopidy.tracklist.add(this.album.tracks.toJSON()).then(function () {
      App.notifications.add({message: 'Added tracks to queue'});
    });
  },
  queueAllLocal: function () {
    App.mopidy.tracklist.add(this.album.localTracks.toJSON()).then(function () {
      App.notifications.add({message: 'Added tracks to queue'});
    });
  },
  queueSelected: function () {
    var selectedInputs = this.$('li input[type=checkbox]:checked');
    var selectedTracks = selectedInputs.map(function (i, track) {
      return this.artist.tracks.get(track.getAttribute('data-track-id')).toJSON();
    }.bind(this));
    App.mopidy.tracklist.add(selectedTracks).then(function () {
      selectedInputs.each(function (i, input) {
        input.checked = false;
      });
      App.notifications.add({ message: 'Tracks added to queue.' });
    }.bind(this));
  },
  viewAlbum: function (event) {
    var uri = event.currentTarget.getAttribute('data-album-uri');

    event.preventDefault();
    App.router.navigate('/album/' + uri, { trigger: true });
  },
  _initSubViews: function () {
    this.views = {
      tracks: new App.View.Tracks({
        collection: this.model.tracks
      }),
      localTracks: new App.View.Tracks({
        collection: this.model.localTracks
      }),
      albums: new App.View.Albums({
        collection: this.model.albums
      }),
      artists: new App.View.Artists({
        collection: this.model.artists
      })
    };
  }
});
