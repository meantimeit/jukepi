var View = require('../view');
var Track = require('../../model/track.js');
var _ = require('backbone/node_modules/underscore');
var NowPlayingView = View.extend({
  tagName: 'div',
  className: 'view-model',
  template: 'nowplaying_view',
  initialize: function (options) {
    View.prototype.initialize.call(this, options);
    this.listenTo(this.mopidy, 'event:trackPlaybackStarted', this._updateTrack);
    this.mopidy.playback.getCurrentTlTrack().then(function (data) {
      if (!data) {
        return;
      }

      this._updateTrack({
        tl_track: data
      });
    }.bind(this));
  },
  remove: function () {
    View.prototype.remove.apply(this, arguments);
    //this.stopListening();
  },
  render: function () {
    var data = this._track && this._track.toJSON ? this._track.toJSON() : {};
    this.trigger('rendering');
    this.$el.html(this._template(data));
    this.trigger('rendered');
    return this;
  },
  _updateTrack: function (data) {
    if (data) {
      this._track = new Track(data.tl_track.track, {
        mopidy: this.mopidy,
        lastfm: this._lastfm
      });
      this._track.once('sync', this.render.bind(this));
      this._track.fetch();
    }
  }
});

module.exports = NowPlayingView;
