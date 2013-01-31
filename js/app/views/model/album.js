App.View.AlbumItem = App.View.ModelView.extend({
  tagName: 'li',
  template: 'album_item',
  className: 'track_list_item',
  events: {
    'click li': 'viewAlbum'
  },
  viewAlbum: function () {
    App.router.navigate('/albums/' + this.model.id, {
      trigger: true
    });
  }
});
App.View.Album = App.View.ModelView.extend({
  tagName: 'article',
  template: 'album_view'
});
