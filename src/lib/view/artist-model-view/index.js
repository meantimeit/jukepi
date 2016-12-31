var ModelView = require('../model-view');
var ArtistModelView = ModelView.extend({
  selectable: true,
  _template: function (data) {
    return data.name;
  },
  _onClick: function (event) {
    ModelView.prototype._onClick.call(this, event);
    this._viewArtist();
  },
  _onKeyDown: function (event) {
    var enter = 13;

    if (event.which === enter) {
      this._viewArtist();
    }
    else {
      ModelView.prototype._onKeyDown.call(this, event);
    }
  },
  _viewArtist: function () {
    this._router.navigate('/search/artists/' + this.model.id + '/' + encodeURIComponent(this.model.get('name')), { trigger: true });
  }
});

module.exports = ArtistModelView;
