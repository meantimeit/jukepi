var View = require('jpf').View;
var VolumeView = View.extend({
  tagName: 'div',
  events: {
    'input': 'updateVolume'
  },
  template: function () {
    return '<input type="range"><output></output>';
  },
  initialize: function (options) {
    options = options || {};

    this.mopidy = options.mopidy;
    this.mopidy.on('event:volumeChanged', this.checkVolume.bind(this));
    this.checkVolume();

    return View.prototype.initialize.call(this, options);
  },
  checkVolume: function () {
    this.mopidy.playback.getVolume().then(function (volume) {
      this.volumeChanged({volume: volume});
    }.bind(this));
  },
  updateVolume: function () {
    this.mopidy.playback.setVolume(this.el.querySelector('input').value * 1);
  },
  volumeChanged: function (state) {
    // Only set this if the input isn't currently the active
    // element
    if (document.activeElement != this.el.querySelector('input')) {
      this.el.querySelector('input').value = state.volume;
    }
    this.el.querySelector('output').textContent = state.volume;
  }
});

VolumeView.create = function (mopidy, className) {
  var opts = {
    mopidy: mopidy,
    attributes: {
      title: 'Adjust volume',
      type: 'range'
    }
  };

  if (className) {
    opts.className = className;
  }

  var b = new VolumeView(opts);

  return {
    name: b._label,
    view: b
  };
};

module.exports = VolumeView;