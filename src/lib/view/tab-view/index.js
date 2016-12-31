var JpfTabView = require('jpf').TabView;
var TabView = JpfTabView.extend({
  initialize: function (options) {
    this._app = options.app;
    this.router = options.router;
    return JpfTabView.prototype.initialize.call(this, options);
  }
});

module.exports = TabView;
