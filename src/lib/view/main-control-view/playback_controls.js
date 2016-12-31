var View = require('../view');

var PlaybackControlView = View.extend({
  tagName: 'nav',
  className: 'playback-controls',
  template: 'home_playback_control',
  events: {
    'click .playback-controls-back': 'previous',
    'click .playback-controls-next': 'next',
    'click .playback-controls-play': 'play',
    'click .playback-controls-pause': 'pause'
  },
  initialize: function (options) {
    this.on('rendered', function () {
      // TODO Sort this out
      // options.mopidy.playback.getState().then(this._changePlaybackState.bind(this));
    }.bind(this));
    this.listenTo(options.mopidy, 'event:playbackStateChanged', this._onPlaybackStateChanged.bind(this));
    return View.prototype.initialize.call(this, options);
  },
  play: function () {
    this._app.mopidy.playback.play();
  },
  pause: function () {
    this._app.mopidy.playback.pause();
  },
  next: function () {
    this._app.mopidy.playback.next();
  },
  previous: function () {
    this._app.mopidy.playback.previous();
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

module.exports = PlaybackControlView;
