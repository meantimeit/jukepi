var ModelView = require('./view.js');
var AlbumView = ModelView.extend({
  tagName: 'article',
  template: 'album_model'
});

module.exports = AlbumView;
