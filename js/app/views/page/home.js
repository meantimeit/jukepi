App.View.HomePage = App.View.PageView.extend({
  tagName: 'div',
  className: 'view',
  title: 'Home',
  events: {
    'click .clear_queue': 'clearQueue'
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
  _initSubViews: function () {
    this.views.trackList = new App.View.TrackList({
      collection: this._trackList
    });
  },
  _initTrackList: function () {
    this._trackList = new App.Collection.TrackList();
  },
  _fetchTrackList: function () {
    this._trackList.fetch();
  },
  _attachSubViews: function () {
    this.$('.play_queue').append(this.views.trackList.render().el);
  },
  _trackList: null
});
