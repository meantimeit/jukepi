App.View.Tracks = App.View.CollectionView.extend({
  tagName: 'ul',
  className: 'track_list loading',
  template: 'track_index',
  itemViewClass: App.View.Track,
  initialize: function (attributes, options) {
    App.View.CollectionView.prototype.initialize.apply(this, arguments);
  },
  resetResults: function () {
    this.collection.reset();
    this.$el.addClass('loading');
  }

});
