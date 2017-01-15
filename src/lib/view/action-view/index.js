var View = require('../view');
var ActionView = View.extend({
  initialize: function (options) {
    this._label = options.label;
    this._action = options.action;
    return View.prototype.initialize.call(this, options);
  },
  events: {
    'click': '_onClick',
    'keydown': '_onKeydown'
  },
  tagName: 'div',
  className: 'action-view',
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

ActionView.create = function (label, action, title, className) {
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

  var b = new ActionView(opts);

  return {
    name: label,
    view: b
  };
};

module.exports = ActionView;
