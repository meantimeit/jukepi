var ModelView = require('./view.js');
var ArtistView = ModelView.extend({
  tagName: 'article',
  template: 'artist_model'
});

module.exports = ArtistView;
