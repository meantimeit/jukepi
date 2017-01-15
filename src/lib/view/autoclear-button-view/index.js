var ActionView = require('../action-view');
var AutoclearButtonView = ActionView.extend({
  initialize: function (options) {
    options = options || {};

    this.mopidy = options.mopidy;
    options.label = 'Disable auto-clear';
    options.action = this.toggleConsumeState.bind(this);

    this.mopidy.on('event:optionsChanged', this.checkConsumeState.bind(this));
    this.checkConsumeState();

    return ActionView.prototype.initialize.call(this, options);
  },
  checkConsumeState: function () {
    this.mopidy.tracklist.getConsume().then(function (state) {
      this.consumeStateChanged(state);
    }.bind(this));
  },
  toggleConsumeState: function () {
    var mopidy = this.mopidy;

    mopidy.tracklist.getConsume().then(function(consume) {
      mopidy.tracklist.setConsume(!consume);
    });
  },
  consumeStateChanged: function (state) {
    this._label = state ? 'Disable auto-clear' : 'Enable auto-clear';
    this.render();
  },
  template: function () {
    return '<span class="material-icons">clear_all</span> ' + this._label;
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