var CollectionView = require('./view.js');
var TrackModelItemView = require('../model_item/track.js');
var TrackCollectionView = CollectionView.extend({
  tagName: 'ul',
  className: 'interactive-list loading',
  template: 'track_collection',
  itemViewClass: TrackModelItemView,
  resetResults: function () {
    this.collection.reset();
    this.$el.addClass('loading');
  }

});

module.exports = TrackCollectionView;
