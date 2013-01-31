App.View.ArtistPage = App.View.PageView.extend({
  tagName: 'div',
  className: 'view',
  title: 'Artists',
  template: 'artist_page',
  events: {
    'click .queue_all': 'queueAll',
    'click .queue_all_local': 'queueAllLocal',
    'click .queue_selected': 'queueSelected',
    'click [data-album-uri]': 'viewAlbum'
  },
  initialize: function (attributes, options) {
    App.View.PageView.prototype.initialize.apply(this, arguments);
    this.artist = new App.Model.Artist({ uri: attributes.uri, name: attributes.name });
    this._initSubViews();
    this.on('rendered', function () {
      this.$('.artist_description').append(this.views.artistView.render().el);
      this.$('.artist_tracks').append(this.views.tracks.render().el);
      this.$('.artist_localtracks').append(this.views.localTracks.render().el);
      this.$('.artist_albums').append(this.views.albums.render().el);
    }.bind(this));
    this.artist.fetch();
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
      artistView: new App.View.Artist({
        model: this.artist
      }),
      albums: new App.View.Albums({
        collection: this.artist.albums
      }),
      tracks: new App.View.Tracks({
        collection: this.artist.tracks,
        extended: true
      }),
      localTracks: new App.View.Tracks({
        collection: this.artist.localTracks,
        extended: true
      })
    };
  }
});
