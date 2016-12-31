var ModelView = require('jpf').ModelView;
var LastfmAlbumView = ModelView.extend({
  tagName: 'div',
  className: 'lastfm-detail lastfm-album-detail',
  attributes: {},
  events: {},
  _template: function (data) {
    var h = '';

    if (data) {
      var title = [];

      if (data.name) {
        title.push(data.name);
      }

      if (data.artist) {
        title.push(data.artist);
      }

      if (title.length) {
        h += '<h1>' + title.join(' / ') + '</h1>';
      }

      if (data.wiki && data.wiki.summary) {
        var summary = data.wiki.summary;
        summary = summary.replace('\.?\s<a href="https://www.last.fm', '<a href="https://last.fm');
        summary = summary.replace('Read more on Last.fm', '…');
        summary = summary.replace(/<\/a>\.$/, '</a>');

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

module.exports = LastfmAlbumView;