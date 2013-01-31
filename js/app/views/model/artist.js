App.View.ArtistItem = App.View.ModelView.extend({
  tagName: 'li',
  template: 'artist_item',
  className: 'track_list_item',
  events: {
    'click li': 'viewArtist'
  },
  viewArtist: function () {
    App.router.navigate('/artists/' + this.model.id + '/' + this.model.get('name'), { trigger: true });
  }
});
App.View.Artist = App.View.ModelView.extend({
  tagName: 'article',
  template: 'artist_view'
});
