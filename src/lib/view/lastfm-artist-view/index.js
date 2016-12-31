var ModelView = require('jpf').ModelView;
var LastfmArtistView = ModelView.extend({
  tagName: 'div',
  className: 'lastfm-detail lastfm-artist-detail',
  attributes: {},
  events: {},
  _template: function (data) {
    var h = '';

    if (data) {
      if (data.name) {
        h += '<h1>' + data.name + '</h1>';
      }

      if (data.bio && data.bio.summary) {
        var summary = data.bio.summary;
        summary = summary.replace('. <a href="https://www.last.fm', '<a href="https://last.fm');
        summary = summary.replace('Read more on Last.fm', '…');

        h += '<p>' + summary + '</p>';
      }
    }

    return h;
  },
  render: function () {
    if (this._model.get('image')) {
      var src = this.model.get('image')[3]['#text'];
      this.el.style.backgroundImage = 'linear-gradient(to bottom, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 1) 70%), url(\'' + src + '\')';
    }
    return ModelView.prototype.render.call(this);
  }
});

module.exports = LastfmArtistView;