var View = require('../view.js');
var ListView = View.extend({
  tagName: 'div', 
  className: 'view-list',
  _collectionViewClass: null,
  initialize: function (options) {
    View.prototype.initialize.call(this, options);
    options = options || {};

    this._collection = options.collection;
    this._initSubView();
  },
  render: function () {
    this.trigger('rendering');
    this.$el.html(this._template());
    this.el.appendChild(this._collectionView.render().el);
    this.trigger('rendered');
    return this;
  },
  _initSubView: function () {
    this._collectionView = new this._collectionViewClass({
      mopidy: this.mopidy,
      router: this.router,
      collection: this._collection,
      lastfm: this._lastfm
    });
  }
});

module.exports = ListView;
