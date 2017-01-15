var ButtonView = require('../button-view');
var PopView = require('./pop-view.js');
var PopButtonView = ButtonView.extend({
  initialize: function (options) {
    this._label = options.label;
    this._createPopView(options.actionView);
    options.action = function () {
      this._popView.toggle();
    }.bind(this);
    return ButtonView.prototype.initialize.call(this, options);
  },
  _createPopView: function (actionView) {
    this._popView = new PopView({
      parent: this,
      views: [actionView]
    });
    actionView.setParent(this._popView);
    document.getElementsByTagName('body')[0].appendChild(this._popView.render().el);
  }
});

PopButtonView.create = function (label, view, title, className) {
  var opts = {
    label: label,
    actionView: view
  };

  if (className !== undefined) {
    opts.className = className;
  }

  if (title !== undefined) {
    opts.attributes = {
      title: title
    };
  }

  var b = new PopButtonView(opts);

  return {
    name: label,
    view: b
  };
};

module.exports = PopButtonView;
