var ButtonView = require('../button-view');
var AutoclearButtonView = ButtonView.extend({
  initialize: function (options) {
    options = options || {};

    this.mopidy = options.mopidy;
    options.label = 'check_box';
    options.action = this.toggleConsumeState.bind(this);

    this.mopidy.on('event:optionsChanged', this.checkConsumeState.bind(this));
    this.checkConsumeState();

    return ButtonView.prototype.initialize.call(this, options);
  },
  checkConsumeState: function () {
    this.mopidy.tracklist.getConsume().then(function (state) {
      this.consumeStateChanged(state);
    }.bind(this));
  },
  toggleConsumeState: function () {
    if (this._label == 'check_box') {
      this.mopidy.tracklist.setConsume(false);
    }
    else {
      this.mopidy.tracklist.setConsume(true);
    }
  },
  consumeStateChanged: function (state) {
    this._label = state ? 'check_box' : 'check_box_outline_blank';
    this.render();
  },
  template: function () {
    return '<span class="material-icons">' + this._label + '</span>' + ' Auto-clear';
  }
});

AutoclearButtonView.create = function (mopidy, className) {
  var opts = {
    mopidy: mopidy,
    attributes: {
      title: 'Auto-clear'
    }
  };

  if (className) {
    opts.className = className;
  }

  var b = new AutoclearButtonView(opts);

  return {
    name: b._label,
    view: b
  };
};

module.exports = AutoclearButtonView;