App.View.Search = App.View.CoreView.extend({
  tagName: 'div',
  className: 'search_results_list triangle_border_top hidden',
  template: 'search_list',
  initialize: function (attributes, options) {
    App.View.CoreView.prototype.initialize.apply(this, arguments);
    this.model = attributes.model;
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
    this.on('rendered', function () {
      this.$('.search_results_tracks').append(this.views.tracks.render().el);
      this.$('.search_results_localtracks').append(this.views.localTracks.render().el);
      this.$('.search_results_albums').append(this.views.albums.render().el);
      this.$('.search_results_artists').append(this.views.artists.render().el);
    }.bind(this));
    this.listenTo(App.router, 'beforeRoute', function () {
      $('#search').addClass('hidden');
      this.$el.addClass('hidden');
    }.bind(this));
  },
  resetResults: function () {
    this.views.albums.resetResults();
    this.views.artists.resetResults();
    this.views.tracks.resetResults();
    this.views.localTracks.resetResults();
  }
});
