var Model = require('./model.js');
var Track = require('./track.js');
var TrackListTrack = Model.extend({
  idAttribute: 'tlid',
  current: false,
  initialize: function (attributes, options) {
    Model.prototype.initialize.call(this, attributes, options);
    options = options || {};
    this.current = attributes.tlid === options.activeTlid;
    this.track = new Track(attributes.track, {
      mopidy: this.mopidy,
      lastfm: this._lastfm
    });
    this._initListeners();
  },
  _initListeners: function () {
    var trackPlaybackStartedCallback = this._onTrackPlaybackStarted.bind(this);
    this.mopidy.on('event:trackPlaybackStarted', trackPlaybackStartedCallback);
    this.on('remove', this.mopidy.off.bind(this.mopidy, 'event:trackPlaybackStarted', trackPlaybackStartedCallback));
  },
  _onTrackPlaybackStarted: function (event) {
    if (this.current !== (this.id === event.tl_track.tlid)) {
      this.current = !this.current;
      this.trigger('change');
    }
  }
});

module.exports = TrackListTrack;
