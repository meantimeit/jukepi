var CollectionView = require('./view.js');
var ArtistModelItemView = require('../model_item/artist.js');
var ArtistCollectionView = CollectionView.extend({
  template: 'artist_collection',
  itemViewClass: ArtistModelItemView
});

module.exports = ArtistCollectionView;
