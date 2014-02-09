var View = require('../view.js');
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
    View.prototype.initialize.call(this, options);
    this.on('rendered', function () {
      this.mopidy.playback.getState().then(this._changePlaybackState.bind(this));
    }.bind(this));
    this.listenTo(this.mopidy, 'event:playbackStateChanged', this._onPlaybackStateChanged.bind(this));
  },
  play: function () {
    this.mopidy.playback.play();
  },
  pause: function () {
    this.mopidy.playback.pause();
  },
  next: function () {
    this.mopidy.playback.next();
  },
  previous: function () {
    this.mopidy.playback.previous();
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
