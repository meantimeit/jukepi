var extend = require('backbone/node_modules/underscore').extend;
var ModelItemView = require('./view.js');
var ArtistModelItemView = ModelItemView.extend({
  tagName: 'li',
  template: 'artist_item_model',
  className: 'interactive-list-item',
  _onClick: function (event) {
    ModelItemView.prototype._onClick.call(this, event);
    this._viewArtist();
  },
  _onKeyDown: function (event) {
    var enter = 13;

    if (event.which === 13) {
      this._viewArtist();
    }
    else {
      ModelItemView.prototype._onKeyDown.call(this, event);
    }
  },
  _viewArtist: function () {
    this.router.navigate('/artists/' + this.model.id + '/' + encodeURIComponent(this.model.get('name')), { trigger: true });
  }
});

module.exports = ArtistModelItemView;
