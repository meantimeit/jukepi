var Model = require('jpf').Model;
var Track = require('../track-model');
var TrackListTrack = Model.extend({
  idAttribute: 'tlid',
  current: false,
  initialize: function (attributes, options) {
    Model.prototype.initialize.call(this, attributes, options);
    options = options || {};
    this.mopidy = options.mopidy;
    this.current = attributes.tlid === options.activeTlid;
    this.track = new Track(attributes.track, {
      mopidy: this.mopidy,
      lastfm: this._lastfm
    });
  },
  play: function () {
    this.mopidy.playback.play(null, this.get('tlid'));
  }
});

module.exports = TrackListTrack;