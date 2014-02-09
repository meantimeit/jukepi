var CollectionView = require('./view.js');
var AlbumModelItemView = require('../model_item/album.js');
var AlbumCollectionView = CollectionView.extend({
  template: 'album_collection',
  itemViewClass: AlbumModelItemView
});

module.exports = AlbumCollectionView;
