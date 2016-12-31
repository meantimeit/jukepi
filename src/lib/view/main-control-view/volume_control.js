var View = require('../view');
var debounce1000 = require('jpf').debounce(1000);
var VolumeControlView = View.extend({
  tagName: 'nav',
  className: 'volume-controls',
  events: {
    'click .volume-down': '_decrementVolume',
    'click .volume-up': '_incrementVolume'
  },
  template: require('../../../templates/home/volume_control.hbs'),
  initialize: function (options) {
    this._updateVolume = debounce1000(this._updateVolume);
    return View.prototype.initialize.call(this, options);
  },
  initialRenderContent: function () {
    this._initializeVolume();
    return View.prototype.initialRenderContent.call(this);
  },
  _initializeListeners: function () {
    this.listenTo(this._app.mopidy, 'event:volumeChanged', this._onVolumeChanged.bind(this));
  },
  _volumeLevel: null,
  _onVolumeChanged: function (event) {
    this._setVolume(event.volume);
  },
  _updateVolume: function () {
    this._app.mopidy.playback.setVolume(this._volumeLevel);
  },
  _setVolume: function (volume) {
    this._volumeLevel = volume;
    this.el.querySelector('.volume-level').innerHTML = this._volumeLevel;
  },
  _decrementVolume: function () {
    this._volumeLevel--;
    this._updateVolume();
  },
  _incrementVolume: function () {
    this._volumeLevel++;
    this._updateVolume();
  },
  _initializeVolume: function() {
    this._app.mopidy.playback.getVolume().then(this._setVolume.bind(this));
  }
});

module.exports = VolumeControlView;
