var TabView = require('jpf').TabView;
var TrackListView = require('../track-list-view');
var AlbumCollectionView = require('../album-collection-view');
var ArtistCollectionView = require('../artist-collection-view');
var SearchResultView = TabView.extend({
  title: 'Search',
  initialize: function (options) {
    options = options || {};
    this.model = options.model;
    options.collection = [
      {
        name: 'Artists',
        view: new ArtistCollectionView({
          collection: this.model.artists,
          app: options.app,
          router: options.router
        })
      },
      {
        name: 'Albums',
        view: new AlbumCollectionView({
          collection: this.model.albums,
          mopidy: options.mopidy,
          router: options.router,
          lastfm: options.lastfm
        })
      },
      {
        name: 'Tracks',
        view: new TrackListView({
          collection: this.model.tracks,
          app: options.app,
          router: options.router
        })
      }
    ];

    this.listenTo(options.collection[0].view.collection, 'add remove change', function () {
      var model = this._views.at(0).get('view').collection.at(0);
      var name = model.get('name');
      var length = options.collection[0].view.collection.length;
      model.set('name', 'Artists (' + length + ')');
    }.bind(this));
    this.listenTo(options.collection[1].view.collection, 'add remove change', function () {
      var model = this._views.at(0).get('view').collection.at(1);
      var name = model.get('name');
      var length = options.collection[1].view.collection.length;
      model.set('name', 'Albums (' + length + ')');
    }.bind(this));

    this.listenTo(options.collection[2].view.collection, 'add remove change', function () {
      var model = this._views.at(0).get('view').collection.at(2);
      var name = model.get('name');
      var length = options.collection[2].view.collection.length;
      model.set('name', 'Tracks (' + length + ')');
    }.bind(this));

    TabView.prototype.initialize.call(this, options);
  }
});

module.exports = SearchResultView;
