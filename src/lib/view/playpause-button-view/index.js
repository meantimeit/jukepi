var ButtonView = require('../button-view');
var PlaypauseButtonView = ButtonView.extend({
  initialize: function (options) {
    options = options || {};

    this.mopidy = options.mopidy;
    options.label = 'play_arrow';
    options.action = this.togglePlaybackState.bind(this);

    this.mopidy.on('event:playbackStateChanged', this.onPlaybackStateChanged.bind(this));
    this.mopidy.playback.getState().then(this.playbackStateChanged.bind(this));

    return ButtonView.prototype.initialize.call(this, options);
  },
  togglePlaybackState: function () {
    if (this._label == 'pause') {
      this.mopidy.playback.pause();
    }
    else {
      this.mopidy.playback.play();
    }
  },
  onPlaybackStateChanged: function (state) {
    this.playbackStateChanged(state.new_state);
  },
  playbackStateChanged: function (state) {
    if (state == 'stopped') {
      this._label = 'play_arrow';
    }
    else if (state == 'playing') {
      this._label = 'pause';
    }
    else {
      this._label = 'play_arrow';
    }

    this.render();
  }
});

PlaypauseButtonView.create = function (mopidy) {
  var opts = {
    className: 'material-icons',
    mopidy: mopidy,
    attributes: {
      title: 'Play/Pause'
    }
  };

  var b = new PlaypauseButtonView(opts);

  return {
    name: b._label,
    view: b
  };
};

module.exports = PlaypauseButtonView;