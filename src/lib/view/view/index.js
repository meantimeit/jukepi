var JpfView = require('jpf').View;

var View = JpfView.extend({
  initialize: function (options) {
    this._app = options.app;
    this.router = options.router;
    return JpfView.prototype.initialize.call(this, options);
  }
});

module.exports = View;
