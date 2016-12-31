var CollectionView = require('../collection-view');
var TracklistModelView = require('../tracklist-model-view');
var TracklistCollectionView = CollectionView.extend({
  ModelViewClass: TracklistModelView,
  selectable: true,
  checkable: true
});

module.exports = TracklistCollectionView;
