var View = require('../view');

var Collection = require('jpf').Collection;

var TrackListView = require('../track-list-view');
var LastfmAlbumView = require('../lastfm-album-view');

var AlbumResultView = View.extend({
  _initializeViews: function () {
    return new Collection([
      {
        name: 'Lastfm Album View',
        view: new LastfmAlbumView({
          app: this._app,
          mopidy: this._app.mopidy,
          model: this.model.lastfmAlbum
        })
      },
      {
        name: 'Tracks',
        view: new TrackListView({
          app: this._app,
          mopidy: this._app.mopidy,
          collection: this.model.tracks,
          router: this.router,
          artistButtonLabel: this.model.get('artist')
        })
      }
    ]);
  }
});

module.exports = AlbumResultView;