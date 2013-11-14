App.View.HomePage = App.View.PageView.extend({
  tagName: 'div',
  className: 'view',
  title: 'Home',
  events: {
    'click .clear_queue': 'clearQueue',
    'click .delete_selected': 'deleteSelected',
    'click [data-artist-uri]': 'viewArtist',
    'click [data-album-uri]': 'viewAlbum'
  },
  template: 'home_page',
  views: {},
  initialize: function (attributes, options) {
    App.View.PageView.prototype.initialize.apply(this, arguments);
    this._initTrackList();
    this._initSubViews();
    this.on('rendered', this._fetchTrackList.bind(this));
    this.on('rendered', this._attachSubViews.bind(this));
  },
  clearQueue: function () {
    var message1 = 'If you click OK to this, you WILL wipe the queue. Are you sure?',
        message2 = 'Really Sure? With great power, comes great responsibility.';

    if (confirm(message1) && confirm(message2)) {
      App.mopidy.tracklist.clear();
    }
  },
  deleteSelected: function (event) {
    var tlids = this.$('[type=checkbox]:checked').map(function (index, input) {
      return +input.getAttribute('data-tracklist-id');
    }.bind(this)).toArray();

    this._deleteSelectedTracks(tlids);
  },
  viewAlbum: function (event) {
    var uri = event.currentTarget.getAttribute('data-album-uri');

    event.preventDefault();
    App.router.navigate('/album/' + uri, { trigger: true });
  },
  viewArtist: function (event) {
    var name = event.currentTarget.getAttribute('data-artist-name');

    event.preventDefault();
    App.router.navigate('/artists/' + name, { trigger: true });
  },
  _deleteSelectedTracks: function (tlids) {
    var tlid, successCallback = null;

    if (tlids.length) {
      tlid = tlids.shift();
      App.mopidy.tracklist.remove({ tlid: tlid }).then(function () {
        this._trackList.remove(this._trackList.where({ tlid: tlid }));
        this._deleteSelectedTracks(tlids);
      }.bind(this));
      App.mopidy.tracklist.remove({ tlid: tlid }).then(this._deleteSelectedTracks.bind(this, tlids));
    }

  },
  _initSubViews: function () {
    this.views.trackList = new App.View.TrackList({
      collection: this._trackList,
      disableCollectionListenersOnRemove: false,
      extended: true
    });
    this.views.nowPlaying = new App.View.NowPlaying({
      tlTrack: { tlTrack: this._trackList.current() ? this._trackList.current().toJSON() : null }
    });
    this.views.volumeControl = new App.View.VolumeControl();
  },
  _initTrackList: function () {
    this._trackList = App.tracklist;
  },
  _fetchTrackList: function () {
    this._trackList.fetch();
  },
  _attachSubViews: function () {
    this.$('.play_queue').append(this.views.trackList.render().el);
    this.$('.now_playing').append(this.views.nowPlaying.render().el);
    this.$('.general_controls').append(this.views.volumeControl.render().el);
  },
  _trackList: null
});
