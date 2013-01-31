App.View.AlbumPage = App.View.PageView.extend({
  tagName: 'div',
  className: 'view',
  title: 'Albums',
  template: 'album_page',
  events: {
    'click .queue_all': 'queueAll',
    'click .queue_selected': 'queueSelected',
    'click [data-artist-uri]': 'viewArtist'
  },
  initialize: function (attributes, options) {
    App.View.PageView.prototype.initialize.apply(this, arguments);
    this.album = new App.Model.Album({ uri: attributes.id });
    this._initSubViews();
    this.on('rendered', function () {
      this.$('.album_description').append(this.views.albumView.render().el);
      this.$('.album_tracks').append(this.views.tracks.render().el);
    }.bind(this));
    this.album.fetch();
  },
  queueAll: function () {
    App.mopidy.tracklist.add(this.album.tracks.toJSON()).then(function () {
      App.notifications.add({message: 'Added tracks to queue'});
    });
  },
  queueSelected: function () {
    var selectedInputs = this.$('li input[type=checkbox]:checked');
    var selectedTracks = selectedInputs.map(function (i, track) {
      return this.album.tracks.get(track.getAttribute('data-track-id')).toJSON();
    }.bind(this));
    App.mopidy.tracklist.add(selectedTracks).then(function () {
      selectedInputs.each(function (i, input) {
        input.checked = false;
      });
      App.notifications.add({ message: 'Tracks added to queue.' });
    }.bind(this));
  },
  viewArtist: function (event) {
    var name = event.currentTarget.getAttribute('data-artist-name');

    event.preventDefault();
    App.router.navigate('/artists/' + name, { trigger: true });
  },
  _initSubViews: function () {
    this.views = {
      albumView: new App.View.Album({
        model: this.album
      }),
      tracks: new App.View.Tracks({
        collection: this.album.tracks,
        extended: true
      })
    };
  }
});
