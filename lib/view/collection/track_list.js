var CollectionView = require('./view.js');
var TracklistTrackView = require('../model_item/tracklist_track.js');
var TracklistCollectionView = CollectionView.extend({
  tagName: 'ul',
  className: 'interactive-list loading',
  template: 'tracklist_collection',
  itemViewClass: TracklistTrackView,
  initialize: function (options) {
    CollectionView.prototype.initialize.call(this, options);
    this.once('rendering', function () {
      if (this.collection.length) {
        this.$el.removeClass('loading');
      }
    }.bind(this));
  }
});

module.exports = TracklistCollectionView;
