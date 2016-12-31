var CollectionView = require('../collection-view');
var AlbumModelView = require('../album-model-view');
var AlbumCollectionView = CollectionView.extend({
  ModelViewClass: AlbumModelView,
  selectable: true
});

module.exports = AlbumCollectionView;
