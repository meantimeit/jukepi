var ModelView = require('./view.js');
var AlbumItemView = ModelView.extend({
  tagName: 'li',
  template: 'album_item_model',
  className: 'interactive-list-item',
  _viewAlbum: function () {
    this.router.navigate('/albums/' + this.model.id + '/' + this.model.get('artists')[0].name + '/' + this.model.get('name'), {
      trigger: true
    });
  },
  _onClick: function (event) {
    this._viewAlbum();
  }
});

module.exports = AlbumItemView;
