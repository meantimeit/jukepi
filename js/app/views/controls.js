App.View.Controls = App.View.CoreView.extend({
  tagName: 'li',
  className: 'nav_main_controls',
  template: 'navigation_controls',
  events: {
    'click .nav_main_back': 'previous',
    'click .nav_main_next': 'next',
    'click .nav_main_play': 'play',
    'click .nav_main_pause': 'pause'
  },
  initialize: function (attributes, options) {
    App.View.CoreView.prototype.initialize.apply(this, arguments);
    this.on('rendered', function () {
      App.mopidy.playback.getState().then(this._changePlaybackState.bind(this));
    }.bind(this));
    this.listenTo(App.mopidy, 'event:playbackStateChanged', this._onPlaybackStateChanged.bind(this));
  },
  play: function () {
    App.mopidy.playback.play().then(null, console.error.bind(console));
  },
  pause: function () {
    App.mopidy.playback.pause().then(null, console.error.bind(console));
  },
  next: function () {
    App.mopidy.playback.next().then(null, console.error.bind(console));
  },
  previous: function () {
    App.mopidy.playback.previous().then(null, console.error.bind(console));
  },
  _onPlaybackStateChanged: function (event) {
    this._changePlaybackState(event.new_state);
  },
  _changePlaybackState: function (state) {
    if (state === 'playing') {
      this.$el.addClass('playing');
    }
    else {
      this.$el.removeClass('playing');
    }
  }
});
