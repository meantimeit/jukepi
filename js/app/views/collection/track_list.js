App.View.TrackList = App.View.CollectionView.extend({
  tagName: 'ul',
  className: 'track_list loading',
  template: 'tracklist_list',
  itemViewClass: App.View.TrackListTrack,
  initialize: function (attributes, options) {
    App.View.CollectionView.prototype.initialize.apply(this, arguments);
    this.once('rendering', function () {
      if (this.collection.length) {
        this.$el.removeClass('loading');
      }
    }.bind(this));
  }
});
