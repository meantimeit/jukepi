var CollectionView = require('./view.js');
var TracklistTrackView = require('../model_item/tracklist_track.js');
var TracklistCollectionView = CollectionView.extend({
  template: 'tracklist_collection',
  itemViewClass: TracklistTrackView
});

module.exports = TracklistCollectionView;
