var $ = require('../../vendors/jquery.js');
var View = require('../view.js');
var PlaybackControlView = require('./playback_controls.js');
var VolumeControlView = require('./volume_control.js');
var MainControlView = View.extend({
  tagName: 'div',
  className: 'container',
  initialize: function (options) {
    View.prototype.initialize.call(this, options);
    this._initSubViews();
  },
  render: function () {
    var i;
    var col;

    this.trigger('rendering');
    
    for (i = 0; i < this.views.length; i++) {
      col = $('<div class="columns six"></div>').appendTo(this.el);
      this.views[i].view.render().$el.appendTo(col);
    }

    this.trigger('rendered');
    return this;
  },
  _initSubViews: function () {
    this.views = [
      {
        name: 'Playback',
        view: new PlaybackControlView({
          router: this.router,
          mopidy: this.mopidy,
          config: this._config,
          lastfm: this._lastfm
        })
      },
      {
        name: 'Volume',
        view: new VolumeControlView({
          router: this.router,
          mopidy: this.mopidy,
          config: this._config,
          lastfm: this._lastfm
        })
      }
    ];
  }
});

module.exports = MainControlView;
