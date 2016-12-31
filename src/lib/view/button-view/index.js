var View = require('../view');
var ButtonView = View.extend({
  initialize: function (options) {
    this._label = options.label;
    this._action = options.action;
    return View.prototype.initialize.call(this, options);
  },
  events: {
    'click': '_onClick',
    'keydown': '_onKeydown'
  },
  tagName: 'button',
  template: function () {
    return this._label;
  },
  _onClick: function (event) {
    this._action();
  },
  _onKeydown: function (event) {
    var enterKey = event.which === 13;
    var spaceKey = event.which === 32;

    if (enterKey || spaceKey) {
      event.preventDefault();
      this._action();
    }
  }
});

ButtonView.create = function (label, action, title, className) {
  var opts = {
    label: label,
    action: action
  };

  if (className !== undefined) {
    opts.className = className;
  }

  if (title !== undefined) {
    opts.attributes = {
      title: title
    };
  }

  var b = new ButtonView(opts);

  return {
    name: label,
    view: b
  };
};

module.exports = ButtonView;
