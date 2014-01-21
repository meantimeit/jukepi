var View = require('./view');
var Track = require('../model/track.js');
var _ = require('underscore');
var NowPlayingView = View.extend({
  tagName: 'div',
  template: 'nowplaying_view',
  initialize: function (options) {
    View.prototype.initialize.call(this, options);
    this.listenTo(this.mopidy, 'event:trackPlaybackStarted', this._updateTrack.bind(this));

    if (options.tlTrack) {
      this.once('rendered', function () {
        this._updateTrack(options.tlTrack);
      }.bind(this));
    }
    else {
      this.mopidy.playback.getCurrentTlTrack().then(function (track) {
        if (track) {
          this._updateTrack({ tl_track: track });
        }
      }.bind(this));
    }
  },
  remove: function () {
    View.prototype.remove.apply(this, arguments);
    this.stopListening();
  },
  render: function () {
    var data = this._track && this._track.toJSON ? this._track.toJSON() : {};
    this.trigger('rendering');
    this.$el.html(this._template(data));
    this.trigger('rendered');
    return this;
  },
  _updateTrack: function (data) {
    if (data && data.tl_track && data.tl_track.track) {
      this._track = new Track(_(data.tl_track.track).clone(), {
        mopidy: this.mopidy,
        lastfm: this._lastfm
      });
      this._track.once('sync', this.render.bind(this));
      this._track.fetch();
    }
  }
});

module.exports = NowPlayingView;
