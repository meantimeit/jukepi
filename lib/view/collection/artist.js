var CollectionView = require('./view.js');
var ArtistModelItemView = require('../model_item/artist.js');
var ArtistCollectionView = CollectionView.extend({
  tagName: 'ul',
  className: 'interactive-list loading',
  template: 'artist_collection',
  itemViewClass: ArtistModelItemView,
  resetResults: function () {
    this.collection.reset();
    this.$el.addClass('loading');
  }
});

module.exports = ArtistCollectionView;
