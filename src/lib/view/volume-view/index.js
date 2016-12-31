var View = require('jpf').View;
var VolumeView = View.extend({
  tagName: 'input',
  attributes: {
    type: 'range'
  },
  events: {
    'input': 'updateVolume'
  },
  initialize: function (options) {
    options = options || {};

    this.mopidy = options.mopidy;
    options.label = 'check_box';
    options.action = this.updateVolume.bind(this);

    this.mopidy.on('event:volumeChanged', this.checkVolume.bind(this));
    this.checkVolume();

    return View.prototype.initialize.call(this, options);
  },
  checkVolume: function () {
    this.mopidy.playback.getVolume().then(function (volume) {
      this.volumeChanged({ volume: volume });
    }.bind(this));
  },
  updateVolume: function () {
    this.mopidy.playback.setVolume(this.el.value * 1);
  },
  volumeChanged: function (state) {
    this.el.value = state.volume;
    this.el.title = 'Adjust volume (' + state.volume + ')';
    this.render();
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