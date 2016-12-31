var View = require('../view');
var Collection = require('backbone').Collection;
var PlaybackControlView = require('./playback_controls.js');
var VolumeControlView = require('./volume_control.js');
var MainControlView = View.extend({
  className: 'control-view',
  initialize: function (options) {
    options.views = [
      new PlaybackControlView({
        app: options.app,
        mopidy: options.mopidy,
        router: options.router
      }),
      new VolumeControlView({
        app: options.app,
        router: options.router
      })
    ];
    return View.prototype.initialize.call(this, options);
  }
});

module.exports = MainControlView;
