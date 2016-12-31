var JpfModelView = require('jpf').ModelView;
var ModelView = JpfModelView.extend({
  initialize: function (options) {
    this._app = options.app;
    this.router = options.router;
    return JpfModelView.prototype.initialize.call(this, options);
  }
});

module.exports = ModelView;
