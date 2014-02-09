var CollectionView = require('./view.js');
var TrackModelItemView = require('../model_item/track.js');
var TrackCollectionView = CollectionView.extend({
  template: 'track_collection',
  itemViewClass: TrackModelItemView
});

module.exports = TrackCollectionView;
