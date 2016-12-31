var ModelView = require('../model-view');
var AlbumItemView = ModelView.extend({
  _template: function (data) {
    var t = data.name;

    if (data.artists && data.artists.length) {
      t += '<br><span class="option_extra_information">' + data.artists[0].name + '</span>';
    }

    return t;
  },
  _viewAlbum: function () {
    this._router.navigate('/search/albums/' + this.model.id + '/' + encodeURIComponent(this.model.get('artists')[0].name) + '/' + encodeURIComponent(this.model.get('name')), {
      trigger: true
    });
  },
  _onClick: function (event) {
    this._viewAlbum();
  }
});

module.exports = AlbumItemView;