var JpfCollectionView = require('jpf').CollectionView;
var CollectionView = JpfCollectionView.extend({
  initialize: function (options) {
    this._app = options.app;
    this.router = options.router;
    return JpfCollectionView.prototype.initialize.call(this, options);
  }
});

module.exports = CollectionView;
