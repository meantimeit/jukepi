App.View.Artists = App.View.CollectionView.extend({
  tagName: 'ul',
  className: 'track_list loading',
  template: 'artist_index',
  itemViewClass: App.View.ArtistItem,
  resetResults: function () {
    this.collection.reset();
    this.$el.addClass('loading');
  }
});
