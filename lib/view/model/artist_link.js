var ModelView = require('./view.js');
var ArtistLinkView = ModelView.extend({
  tagName: 'div',
  className: function () {
    return ModelView.prototype.className + ' view-model-link';
  },
  template: 'artist_link_model',
  events: {
    'click a': '_viewArtist'
  },
  _viewArtist: function (event) {
    event.preventDefault();
    this.router.navigate('/artists/' + this.model.id + '/' + encodeURIComponent(this.model.get('name')), { trigger: true });
  }
});

module.exports = ArtistLinkView;
