var View = require('../view');
var Collection = require('backbone').Collection;
var SearchControlView = require('../search-control-view');
var SearchView = View.extend({
  initialize: function (options) {
    options.views.unshift(new SearchControlView({
      app: options.app,
      router: options.router
    }));
    View.prototype.initialize.call(this, options);
  }
});

module.exports = SearchView;
