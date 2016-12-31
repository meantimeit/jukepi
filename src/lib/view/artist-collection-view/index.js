var CollectionView = require('../collection-view');
var ArtistModelView = require('../artist-model-view');
var ArtistCollectionView = CollectionView.extend({
  ModelViewClass: ArtistModelView,
  selectable: true
});

module.exports = ArtistCollectionView;