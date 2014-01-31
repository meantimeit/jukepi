var View = require('../view.js');
var VolumeControlView = View.extend({
  tagName: 'nav',
  className: 'volume-controls',
  template: 'home_volume_control',
  events: {
    'click .volume-down': '_decrementVolume',
    'click .volume-up': '_incrementVolume'
  },
  initialize: function (options) {
    View.prototype.initialize.call(this, options);
    this.listenTo(this.mopidy, 'event:volumeChanged', this._onVolumeChanged.bind(this));
    this.once('rendered', this._initializeVolume.bind(this));
  },
  render: function () {
    this.$el.html(this._template({ volume: this._volumeLevel }));
    this.trigger('rendered');
    return this;
  },
  remove: function () {
    View.prototype.remove.apply(this, arguments);
    //this.stopListening();
  },
  _volumeChangeTimeout: null,
  _volumeChangeTimeoutDelay: 1000,
  _volumeLevel: null,
  _onVolumeControlChange: function (event) {
    event.srcElement.value = event.srcElement.value.replace(/[^0-9]+/, '');
    this._volumeLevel = event.srcElement.value;
    window.clearTimeout(this._volumeChangeTimeout);
    this._volumeChangeTimeout = window.setTimeout(this._updateVolume.bind(this, +this._volumeLevel), this._volumeChangeTimeoutDelay);
  },
  _onVolumeChanged: function (event) {
    this._volumeLevel = event.volume;
    this._updateVolumeControl();
  },
  _updateVolume: function (volume) {
    this.mopidy.playback.setVolume(volume);
  },
  _updateVolumeControl: function () {
    this.$('.volume-level').text(this._volumeLevel);
  },
  _decrementVolume: function () {
    this._volumeLevel--;
    this._updateVolume(this._volumeLevel);
  },
  _incrementVolume: function () {
    this._volumeLevel++;
    this._updateVolume(this._volumeLevel);
  },
  _initializeVolume: function() {
    this.mopidy.playback.getVolume().then(this._onGetVolume.bind(this));
  },
  _onGetVolume: function (volume) {
    this._volumeLevel = volume;
    this.render();
  }
});

module.exports = VolumeControlView;
