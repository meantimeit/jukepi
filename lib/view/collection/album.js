var CollectionView = require('./view.js');
var AlbumModelItemView = require('../model_item/album.js');
var AlbumCollectionView = CollectionView.extend({
  tagName: 'ul',
  className: 'interactive-list loading',
  template: 'album_collection',
  itemViewClass: AlbumModelItemView,
  resetResults: function () {
    this.collection.reset();
    this.$el.addClass('loading');
  }
});

module.exports = AlbumCollectionView;
