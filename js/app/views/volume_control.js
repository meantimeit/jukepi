App.View.VolumeControl = App.View.CoreView.extend({
  tagName: 'div',
  className: 'volume_control',
  template: 'home_volume_control',
  events: {
    'keyup [type=text]': '_onVolumeControlChange',
    'click .volume_down': '_decrementVolume',
    'click .volume_up': '_incrementVolume'
  },
  initialize: function (attributes, options) {
    App.View.CoreView.prototype.initialize.apply(this, arguments);
    this.listenTo(App.mopidy, 'event:volumeChanged', this._onVolumeChanged.bind(this));
    this.once('rendered', this._initializeVolume.bind(this));
  },
  render: function () {
    this.$el.html(this._template({ volume: this._volumeLevel }));
    this.trigger('rendered');
    return this;
  },
  remove: function () {
    this.stopListening();
    App.View.CoreView.prototype.remove.apply(this, arguments);
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
    this._disableVolumeControl();
    App.mopidy.playback.setVolume(volume).always(this._enableVolumeControl.bind(this));
  },
  _updateVolumeControl: function () {
    this.$('[type=text]').val(this._volumeLevel);
  },
  _disableVolumeControl: function () {
    this.$('[type=text]').disabled = true;
  },
  _enableVolumeControl: function () {
    this.$('[type=text]').disabled = false;
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
    App.mopidy.playback.getVolume().then(this._onGetVolume.bind(this));
  },
  _onGetVolume: function (volume) {
    this._volumeLevel = volume;
    this.render();
  }
});
