App.View.Albums = App.View.CollectionView.extend({
  tagName: 'ul',
  className: 'track_list loading',
  template: 'album_index',
  itemViewClass: App.View.AlbumItem,
  resetResults: function () {
    this.collection.reset();
    this.$el.addClass('loading');
  }
});
