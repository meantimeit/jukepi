!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.jukePi=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var Mopidy = _dereq_('mopidy');
var Handlebars = _dereq_('handlebars/runtime').default;
var LastFM = _dereq_('browserified-lastfm-api');
var Router = _dereq_('./router.js');
var RootView = _dereq_('./view/page/root.js');
var NavigationView = _dereq_('./view/page/navigation.js');
var AlertView = _dereq_('./view/modal/alert.js');
var extend = _dereq_('backbone/node_modules/underscore').extend;
var history = _dereq_('backbone').history;
var env = _dereq_('./env.json');

function jukePi(config, callback) {
  var mopidy;
  var lastfm;
  var router;
  var rootView;
  var rootViewEl;
  var routerViewEl;
  var navigationViewEl;
  var loadingAlert;

  config = extend({}, env, config);
  mopidy = !config.mopidyWebSocketUrl ? new Mopidy({ callingConvention: 'by-position-only' }) : new Mopidy({ webSocketUrl: config.mopidyWebSocketUrl, callingConvention: 'by-position-only' });
  lastfm = new LastFM({
    apiKey: config.lastfm.key,
    apiSecret: config.lastfm.secret
  });
  rootViewEl = document.getElementById('root_view');
  routerViewEl = document.getElementById('primary_router_view');
  navigationViewEl = document.getElementById('navigation_view');
  mopidy.once('state:online', function () {
    var router = new Router({
      mopidy: mopidy,
      lastfm: lastfm,
      config: config,
      rootElement: routerViewEl
    });
    var navigation = new NavigationView({
      router: router,
      mopidy: mopidy,
      config: config,
      lastfm: lastfm
    });
    var view = new RootView({
      router: router,
      mopidy: mopidy,
      config: config,
      lastfm: lastfm
    });
    loadingAlert = new AlertView({
      header: 'Loading',
      message: new Handlebars.SafeString(_dereq_('../templates/modal/loading.hbs')())
    });

    document.body.appendChild(loadingAlert.render().el);
    navigationViewEl.appendChild(navigation.render().el);
    rootViewEl.appendChild(view.render().el);
    history.start(true);

    if (typeof callback === 'function') {
      callback(null, { mopidy: mopidy });
    }
  });
  mopidy.once('state:online', function () {
    loadingAlert.remove();
  });
  mopidy.on('state:offline', function () {
  });
}

module.exports = jukePi;

},{"../templates/modal/loading.hbs":101,"./env.json":7,"./router.js":14,"./view/modal/alert.js":30,"./view/page/navigation.js":40,"./view/page/root.js":41,"backbone":"5kFNoY","backbone/node_modules/underscore":48,"browserified-lastfm-api":50,"handlebars/runtime":67,"mopidy":88}],2:[function(_dereq_,module,exports){
var Collection = _dereq_('./collection.js');
var Album = _dereq_('../model/album.js');
var AlbumCollection = Collection.extend({
  model: Album
});

module.exports = AlbumCollection;

},{"../model/album.js":8,"./collection.js":4}],3:[function(_dereq_,module,exports){
var Collection = _dereq_('./collection.js');
var Artist = _dereq_('../model/artist.js');
var ArtistCollection = Collection.extend({
  model: Artist
});

module.exports = ArtistCollection;

},{"../model/artist.js":9,"./collection.js":4}],4:[function(_dereq_,module,exports){
var Backbone = _dereq_('backbone');
var Collection = Backbone.Collection.extend({
  initialize: function (models, options) {
    Backbone.Collection.prototype.initialize.call(this, models, options);

    if (options.mopidy) {
      this.mopidy = options.mopidy;
    }

    if (options.lastfm) {
      this._lastfm = options.lastfm;
    }
  },
  move: function (model, toIndex) {
    var fromIndex = this.indexOf(model);

    if (fromIndex === -1) {
      throw new Error("Can't move a model that's not in the collection");
    }
    if (fromIndex !== toIndex) {
      this.models.splice(toIndex, 0, this.models.splice(fromIndex, 1)[0]);
    }

    this.trigger('sort');
  },
  modelAttributes: function () {
    return this.map(this._modelAttributes.bind(this));
  },
  _modelAttributes: function (model) {
    return modelAttributes;
  }
});

module.exports = Collection;

},{"backbone":"5kFNoY"}],5:[function(_dereq_,module,exports){
var Collection = _dereq_('./collection.js');
var Track = _dereq_('../model/track.js');
var TrackCollection = Collection.extend({
  model: Track
});

module.exports = TrackCollection;

},{"../model/track.js":12,"./collection.js":4}],6:[function(_dereq_,module,exports){
var extend = _dereq_('backbone/node_modules/underscore').extend;
var Collection = _dereq_('./collection.js');
var TrackListTrack = _dereq_('../model/track_list_track.js');
var TrackListCollection = Collection.extend({
  model: TrackListTrack,
  _resyncCounter: 0,
  _prepareModel: function (attrs, options) {
    var opts = extend({}, options, { mopidy: this.mopidy });
    return Collection.prototype._prepareModel.call(this, attrs, opts);
  },
  initialize: function (models, options) {
    Collection.prototype.initialize.apply(this, arguments);
    this.listenTo(this.mopidy, 'event:tracklistChanged', this.fetch);
  },
  move: function (model, toIndex) {
    var modelIndex = this.indexOf(model);
    Collection.prototype.move.apply(this, arguments);
    this.mopidy.tracklist.move(modelIndex, modelIndex + 1, toIndex).then(null, Collection.prototype.move.bind(this, model, modelIndex));
  },
  sync: function (method, collection, options) {
    var xhr = this.mopidy.tracklist.getTlTracks();

    function tlTracksSuccess(resp) {
      options.success(resp);
    }

    this.mopidy.playback.getCurrentTlTrack().then(function (track) {
      track = track || {};
      options.activeTlid = track.tlid;
      xhr.then(tlTracksSuccess);
    });

    return xhr;
  },
  current: function() {
    return this.filter(function (tlTrack) {
      return tlTrack.current;
    })[0];
  }
});

module.exports = TrackListCollection;

},{"../model/track_list_track.js":13,"./collection.js":4,"backbone/node_modules/underscore":48}],7:[function(_dereq_,module,exports){
module.exports={
  "title": "JukePi",
  "mopidyWebSocketUrl": null,
  "lastfm": {
    "key": null,
    "secret": null
  }
}

},{}],8:[function(_dereq_,module,exports){
var extend = _dereq_('backbone/node_modules/underscore').extend;
var Model = _dereq_('./model.js');
var Album = Model.extend({
  idAttribute: 'uri',
  initialize: function (attributes, options) {
    if (!options.collection) {
      var TrackCollection = _dereq_('../collection/track.js');
      var Artist = _dereq_('./artist.js');
      Model.prototype.initialize.call(this, attributes, options);
      this.tracks = new TrackCollection(null, {
        mopidy: this.mopidy,
        lastfm: this._lastfm
      });
      this.artist = new Artist(null, {
        mopidy: this.mopidy,
        lastfm: this._lastfm
      });
    }
  },
  toJSON: function () {
    var modelData = Model.prototype.toJSON.call(this);

    if (this.artist) {
      modelData.artist = this.artist.toJSON();
    }

    return modelData;
  },
  sync: function (method, model, options) {
    function modelSuccess(resp) {
      options.success(resp.album);
    }

    function tracksSuccess(resp) {
      var tracks;
      var artist;

      if (resp[0] && resp[0].album) {
        tracks = resp;
        artist = resp[0].album.artists[0];

        model.tracks.set(tracks);
        model.artist.set(artist);
      }
    }

    this.mopidy.library.lookup(this.id).then(tracksSuccess);
    this._lastfm.album.getInfo({ artist: this.get('artist'), album: this.get('title') }, { success: modelSuccess });
  }
});

module.exports = Album;

},{"../collection/track.js":5,"./artist.js":9,"./model.js":10,"backbone/node_modules/underscore":48}],9:[function(_dereq_,module,exports){
var _ = _dereq_('backbone/node_modules/underscore');
var Model = _dereq_('./model.js');
var Artist = Model.extend({
  idAttribute: 'uri',
  initialize: function (attributes, options) {
    if (!options.collection) {
      var TrackCollection = _dereq_('../collection/track.js');
      var AlbumCollection = _dereq_('../collection/album.js');
      Model.prototype.initialize.apply(this, arguments);
      this.tracks = new TrackCollection(null, {
        mopidy: this.mopidy,
        lastfm: this._lastfm
      });
      this.albums = new AlbumCollection(null, {
        mopidy: this.mopidy,
        lastfm: this._lastfm
      });
    }
  },
  sync: function (method, model, options) {
    var artistUri = this.id;
    var artistName = this.get('name');

    function lookupSuccess(tracks) {
      var _tracks;

      tracks = tracks || [];
      _tracks = _(tracks.filter(function (track) { return !track.name.match(/^\[unplayable\]/); }));

      var albums = _tracks.chain().pluck('album').uniq(false, function (album) { return album.uri; }).value();
      var artist = _tracks.chain().map(function (track) { return track.artists;  }).flatten().uniq(false, function (artist) { return artist.uri;  }).find(function (artist) { return artist.uri === artistUri;  }).value() || { uri: artistUri, name: artistName };

      model.tracks.set(tracks);
      model.albums.set(albums);
    }

    function lastfmSuccess(resp) {
      options.success(resp.artist);
    }

    this.mopidy.library.lookup(this.id).then(lookupSuccess);
    this._lastfm.artist.getInfo({ artist: artistName }, { success: lastfmSuccess, error: options.error });
  }
});

module.exports = Artist;

},{"../collection/album.js":2,"../collection/track.js":5,"./model.js":10,"backbone/node_modules/underscore":48}],10:[function(_dereq_,module,exports){
var Backbone = _dereq_('backbone');
var Model = Backbone.Model.extend({
  initialize: function (attributes, options) {
    Backbone.Model.prototype.initialize.call(this, attributes, options);
    options = options || {};
    this.mopidy = options.mopidy;
    this._lastfm = options.lastfm;
  }
});

module.exports = Model;

},{"backbone":"5kFNoY"}],11:[function(_dereq_,module,exports){
var Model = _dereq_('./model.js');
var TrackCollection = _dereq_('../collection/track.js');
var AlbumCollection = _dereq_('../collection/album.js');
var ArtistCollection = _dereq_('../collection/artist.js');
var Search = Model.extend({
  collections: {},
  initialize: function (attributes, options) {
    Model.prototype.initialize.call(this, attributes, options);
    this.tracks = new TrackCollection(null, {
      mopidy: this.mopidy,
      lastfm: this._lastfm
    });
    this.albums = new AlbumCollection(null, {
      mopidy: this.mopidy,
      lastfm: this._lastfm
    });
    this.artists = new ArtistCollection(null, {
      mopidy: this.mopidy,
      lastfm: this._lastfm
    });
  },
  sync: function (method, model, options) {
    var success = options.success;
    var timestamp = Date.now();

    this._searchTimestamp = timestamp;

    options.success = function(resp) {
      if (timestamp === this._searchTimestamp) {
        this._syncResponseToCollections(resp);
        success(model, resp, options);
      }
    }.bind(this);

    return this.mopidy.library.search({ any: [options.query] }).then(options.success, options.error);
  },
  _searchTimestamp: 0,
  _syncResponseToCollections: function (resp) {
    function extractResultsByKey(key, results) {
      return results.map(function (r) { return r[key] || []; }).reduce(function (a, b) { return a.concat(b); });
    }
    var tracks = extractResultsByKey('tracks', resp);
    var albums = extractResultsByKey('albums', resp);
    var artists = extractResultsByKey('artists', resp);

    if (tracks && tracks.length) {
      this.tracks.set(tracks);
    }
    else {
      this.tracks.reset();
    }

    if (albums && albums.length) {
      this.albums.set(albums);
    }
    else {
      this.albums.reset();
    }

    if (artists && artists.length) {
      this.artists.set(artists);
    }
    else {
      this.artists.reset();
    }
  }
});

module.exports = Search;

},{"../collection/album.js":2,"../collection/artist.js":3,"../collection/track.js":5,"./model.js":10}],12:[function(_dereq_,module,exports){
var extend = _dereq_('backbone/node_modules/underscore').extend;
var Model = _dereq_('./model.js');
var Track = Model.extend({
  idAttribute: 'uri',
  sync: function (method, model, options) {
    function lastfmSuccess(resp) {
      var data = extend({}, this.attributes, resp);
      options.success(data);
    }

    if (method === 'update') {
      xhr = this.mopidy.tracklist.add([ model ]);
      xhr.then(options.success, options.error);
    }
    else {
      model._lastfm.album.getInfo({
        artist: this.attributes.artists[0].name,
        album: this.attributes.album.name
      }, { success: lastfmSuccess, error: options.error });
    }
  }
});

module.exports = Track;

},{"./model.js":10,"backbone/node_modules/underscore":48}],13:[function(_dereq_,module,exports){
var Model = _dereq_('./model.js');
var Track = _dereq_('./track.js');
var TrackListTrack = Model.extend({
  idAttribute: 'tlid',
  current: false,
  initialize: function (attributes, options) {
    Model.prototype.initialize.call(this, attributes, options);
    options = options || {};
    this.current = attributes.tlid === options.activeTlid;
    this.track = new Track(attributes.track, {
      mopidy: this.mopidy,
      lastfm: this._lastfm
    });
    this._initListeners();
  },
  _initListeners: function () {
    var trackPlaybackStartedCallback = this._onTrackPlaybackStarted.bind(this);
    this.mopidy.on('event:trackPlaybackStarted', trackPlaybackStartedCallback);
    this.on('remove', this.mopidy.off.bind(this.mopidy, 'event:trackPlaybackStarted', trackPlaybackStartedCallback));
  },
  _onTrackPlaybackStarted: function (event) {
    if (this.current !== (this.id === event.tl_track.tlid)) {
      this.current = !this.current;
      this.trigger('change');
    }
  }
});

module.exports = TrackListTrack;

},{"./model.js":10,"./track.js":12}],14:[function(_dereq_,module,exports){
var Backbone = _dereq_('backbone');
var AlbumTabView = _dereq_('./view/tab/album.js');
var ArtistTabView = _dereq_('./view/tab/artist.js');
var SearchTabView = _dereq_('./view/tab/search.js');
var Search = _dereq_('./model/search.js');

var Router = Backbone.Router.extend({
  initialize: function (options) {
    Backbone.Router.prototype.initialize.call(this, options);
    this._mopidy = options.mopidy;
    this._lastfm = options.lastfm;
    this._rootElement = options.rootElement;
    this._config = options.config;
  },
  routes: {
    '': 'dashboard',
    'albums/:id/:artist/:name': 'albums',
    'artists/:uri/:name': 'artists',
    'search/:query': 'search'
  },
  dashboard: function () {
    this.trigger('beforeRoute');
  },
  albums: function (id, artist, name) {
    this.trigger('beforeRoute');
    var view = new AlbumTabView({
      router: this,
      mopidy: this._mopidy,
      lastfm: this._lastfm,
      config: this._config,
      id: id,
      name: name,
      artist: artist
    });
    this._rootElement.appendChild(view.render().el);
  },
  artists: function (uri, name) {
    this.trigger('beforeRoute');
    var view = new ArtistTabView({
      router: this,
      mopidy: this._mopidy,
      lastfm: this._lastfm,
      config: this._config,
      uri: uri,
      name: name
    });
    this._rootElement.appendChild(view.render().el);
  },
  search: function (query) {
    this.trigger('beforeRoute');
    var view = new SearchTabView({
      router: this,
      mopidy: this._mopidy,
      lastfm: this._lastfm,
      config: this._config,
      query: query,
      model: new Search(null, { mopidy: this._mopidy })
    });
    this._rootElement.appendChild(view.render().el);
  }
});

module.exports = Router;

},{"./model/search.js":11,"./view/tab/album.js":43,"./view/tab/artist.js":44,"./view/tab/search.js":45,"backbone":"5kFNoY"}],15:[function(_dereq_,module,exports){
var Handlebars = _dereq_('handlebars/runtime').default;
var marked = _dereq_('marked');
var templates = {};

marked.setOptions({
  gfm: true
});

Handlebars.registerHelper('markdown', function (options) {
  var content = options.fn(this);
  return marked(content);
});

Handlebars.registerHelper('debug', function (options) {
  console.log(this);
});

templates.tab_view = _dereq_('../templates/tab/view.hbs');

templates.album_collection = _dereq_('../templates/album/collection.hbs');
templates.album_item_model = _dereq_('../templates/album/item_model.hbs');
templates.album_page = _dereq_('../templates/album/page.hbs');
templates.album_model = _dereq_('../templates/album/model.hbs');

templates.artist_collection = _dereq_('../templates/artist/collection.hbs');
templates.artist_item_model = _dereq_('../templates/artist/item_model.hbs');
templates.artist_link_model = _dereq_('../templates/artist/link_model.hbs');
templates.artist_model = _dereq_('../templates/artist/model.hbs');

templates.home_volume_control = _dereq_('../templates/home/volume_control.hbs');
templates.home_search_control = _dereq_('../templates/home/search_control.hbs');
templates.home_playback_control = _dereq_('../templates/home/playback_control.hbs');

templates.nowplaying_view = _dereq_('../templates/nowplaying/view.hbs');


templates.track_list = _dereq_('../templates/track/list.hbs');
templates.track_collection = _dereq_('../templates/track/collection.hbs');
templates.track_model_item = _dereq_('../templates/track/model_item.hbs');

templates.tracklist_list = _dereq_('../templates/tracklist/list.hbs');
templates.tracklist_collection = _dereq_('../templates/tracklist/collection.hbs');
templates.tracklist_model = _dereq_('../templates/tracklist/model.hbs');


module.exports = templates;

},{"../templates/album/collection.hbs":89,"../templates/album/item_model.hbs":90,"../templates/album/model.hbs":91,"../templates/album/page.hbs":92,"../templates/artist/collection.hbs":93,"../templates/artist/item_model.hbs":94,"../templates/artist/link_model.hbs":95,"../templates/artist/model.hbs":96,"../templates/home/playback_control.hbs":97,"../templates/home/search_control.hbs":98,"../templates/home/volume_control.hbs":99,"../templates/nowplaying/view.hbs":103,"../templates/tab/view.hbs":105,"../templates/track/collection.hbs":106,"../templates/track/list.hbs":107,"../templates/track/model_item.hbs":108,"../templates/tracklist/collection.hbs":109,"../templates/tracklist/list.hbs":110,"../templates/tracklist/model.hbs":111,"handlebars/runtime":67,"marked":68}],16:[function(_dereq_,module,exports){
var CollectionView = _dereq_('./view.js');
var AlbumModelItemView = _dereq_('../model_item/album.js');
var AlbumCollectionView = CollectionView.extend({
  template: 'album_collection',
  itemViewClass: AlbumModelItemView
});

module.exports = AlbumCollectionView;

},{"../model_item/album.js":35,"./view.js":20}],17:[function(_dereq_,module,exports){
var CollectionView = _dereq_('./view.js');
var ArtistModelItemView = _dereq_('../model_item/artist.js');
var ArtistCollectionView = CollectionView.extend({
  template: 'artist_collection',
  itemViewClass: ArtistModelItemView
});

module.exports = ArtistCollectionView;

},{"../model_item/artist.js":36,"./view.js":20}],18:[function(_dereq_,module,exports){
var CollectionView = _dereq_('./view.js');
var TrackModelItemView = _dereq_('../model_item/track.js');
var TrackCollectionView = CollectionView.extend({
  template: 'track_collection',
  itemViewClass: TrackModelItemView
});

module.exports = TrackCollectionView;

},{"../model_item/track.js":37,"./view.js":20}],19:[function(_dereq_,module,exports){
var CollectionView = _dereq_('./view.js');
var TracklistTrackView = _dereq_('../model_item/tracklist_track.js');
var TracklistCollectionView = CollectionView.extend({
  template: 'tracklist_collection',
  itemViewClass: TracklistTrackView
});

module.exports = TracklistCollectionView;

},{"../model_item/tracklist_track.js":38,"./view.js":20}],20:[function(_dereq_,module,exports){
var View = _dereq_('../view.js');
var ModelView = _dereq_('../model/view.js');
var CollectionView = View.extend({
  tagName: 'ul',
  className: 'interactive-list loading',
  attributes: {
    'role': 'listbox'
  },
  itemViewClass: ModelView,
  initialize: function (options) {
    View.prototype.initialize.call(this, options);
    this._checkable = !!options.checkable;
    this.views = [];
    this.collection = options.collection;
    this.listenTo(this.collection, 'add', this._addModelView);
    this.listenTo(this.collection, 'change', this.render);
    this.listenTo(this.collection, 'reset', this.render);
    this.listenTo(this.collection, 'sort', this.render);
    this.listenTo(this.collection, 'sort', this._hideLoadingMessage);
    this.listenTo(this.collection, 'change', this._hideLoadingMessage);
    this.listenTo(this.collection, 'reset', this._hideLoadingMessage);
  },
  render: function () {
    this.trigger('rendering');
    var data = {
      collection: this.collection.toJSON()
    };
    if (!this.collection.length) {
      this.$el.html(this._template(data));
      this._initialRender = true;
    }
    else {
      if (!this._initialRender) {
        this.$el.html(this._template(data));
        this._initialRender = true;
      }
      this._renderViews();
      this.$('.empty-list').remove();
    }
    this.trigger('rendered');

    return this;
  },
  remove: function () {
    View.prototype.remove.apply(this);
    this.collection.stopListening();
  },
  next: function (view) {
    var index = this._viewIndex(view);

    if (index !== undefined && index < this.views.length - 1) {
      this.updateSelected(this.views[index + 1]);
    }
  },
  prev: function (view) {
    var index = this._viewIndex(view);

    if (index !== undefined && index > 0) {
      this.updateSelected(this.views[index - 1]);
    }
  },
  updateSelected: function (view) {
    var length = this.views.length;
    var i;

    for (i = 0; i < length; i++) {
      this.views[i].setSelected(view.model.cid === this.views[i].model.cid);
    }
  },
  removeSubView: function (view) {
    var index = this.views.indexOf(view);

    if (index !== -1) {
      this.views.splice(index, 1);
    }
  },
  _viewIndex: function (view) {
    return this.views.reduce(function (previous, current, index) {
      if (previous !== undefined) {
        return previous;
      }

      return view.model.cid === current.model.cid ? index : undefined;
    }, undefined);
  },
  _hideLoadingMessage: function () {
    this.$el.removeClass('loading');
  },
  _removeViews: function () {
    var i = this.views.length;

    while (i--) {
      this.views.pop().remove();
    }
  },
  _renderViews: function () {
    var i;
    var collection = this.collection;

    if (this.views.length) {
      this.views.sort(function (a, b) {
        var ai = collection.indexOf(a.model);
        var bi = collection.indexOf(b.model);

        return ai - bi;
      });

      for (i = 0; i < this.views.length; i++) {
        this.el.appendChild(this.views[i].el);

        if (i === 0) {
          this.views[i].el.setAttribute('tabindex', 0);
        }
      }
    }
    else {
      this.$('.empty-list').remove();
    }
  },
  _addModelView: function (model, index) {
    var view = new this.itemViewClass({
      mopidy: this.mopidy,
      router: this.router,
      model: model,
      collectionView: this,
      lastfm: this._lastfm,
      checkable: this._checkable
    });
    this.views.push(view);
    this.$el.append(view.render().el);
  },
  getChecked: function () {
    return this.views.filter(function (view) {
      return view.isChecked();
    });
  },
  allChecked: function () {
    return this.getChecked().length === this.collection.length;
  },
  checkAll: function (checked) {
    this.views.forEach(function (view) {
      view.setChecked(checked);
    });
  },
  _hideOnRender: false,
  _updateListItems: function ($current) {
    this.$('.interactive-list-item').each(function (i) {
      var $item = $(this);
      if ($item.is($current)) {
        $item.attr('tabindex', 0);
        $item.attr('aria-selected', 'true');
      }
      else {
        $item.attr('tabindex', -1);
        $item.attr('aria-selected', 'false');
      }
    });
  }
});

module.exports = CollectionView;

},{"../model/view.js":34,"../view.js":47}],21:[function(_dereq_,module,exports){
var ListView = _dereq_('./view.js');
var TrackCollectionView = _dereq_('../collection/track.js');
var TrackListView = ListView.extend({
  _collectionViewClass: TrackCollectionView,
  template: 'track_list',
  events: {
    'click .queue_all': '_queueAll',
    'click .queue_selected': '_queueSelected',
    'change .action-toolbar input[type=checkbox]': '_toggleChecked'
  },
  _queueSelected: function () {
    var selectedModelViews = this._collectionView.getChecked();
    var tracks;

    if (selectedModelViews.length) {
      tracks = selectedModelViews.map(function (view) {
        return view.model.toJSON();
      });
      this.mopidy.tracklist.add(tracks).then(function () {
        selectedModelViews.forEach(function (view) {
          view.setChecked(false);
        });
      });
    }
  },
  _toggleChecked: function (event) {
    this._collectionView.checkAll(!this._collectionView.allChecked());
  }
});

module.exports = TrackListView;

},{"../collection/track.js":18,"./view.js":23}],22:[function(_dereq_,module,exports){
var ListView = _dereq_('./view.js');
var TrackListCollectionView = _dereq_('../collection/track_list.js');
var TrackListListView = ListView.extend({
  _collectionViewClass: TrackListCollectionView,
  initialize: function (options) {
    ListView.prototype.initialize.call(this, options);
    this.on('rendered', this._fetchTrackList.bind(this));
  },
  template: 'tracklist_list',
  events: {
    'click .clear_queue': '_clearQueue',
    'click .delete_selected': '_deleteChecked'
  },
  _clearQueue: function () {
    var message1 = 'If you click OK to this, you WILL wipe the queue. Are you sure?',
        message2 = 'Really Sure? With great power, comes great responsibility.';

    if (confirm(message1) && confirm(message2)) {
      this.mopidy.tracklist.clear();
    }
  },
  _deleteChecked: function (event) {
    this._deleteCheckedTracks(this._collectionView.getChecked().map(function (view) {
      return view.model.get('tlid');
    }));
  },
  _deleteCheckedTracks: function (tlids) {
    this.mopidy.tracklist.remove({ tlid: tlids });
  },
  _fetchTrackList: function () {
    this._collection.fetch();
  }
});

module.exports = TrackListListView;

},{"../collection/track_list.js":19,"./view.js":23}],23:[function(_dereq_,module,exports){
var View = _dereq_('../view.js');
var ListView = View.extend({
  tagName: 'div', 
  className: 'view-list',
  _collectionViewClass: null,
  initialize: function (options) {
    View.prototype.initialize.call(this, options);
    options = options || {};

    this._collection = options.collection;
    this._initSubView();
  },
  render: function () {
    this.trigger('rendering');
    this.$el.html(this._template());
    this.el.appendChild(this._collectionView.render().el);
    this.trigger('rendered');
    return this;
  },
  _initSubView: function () {
    this._collectionView = new this._collectionViewClass({
      mopidy: this.mopidy,
      router: this.router,
      collection: this._collection,
      lastfm: this._lastfm
    });
  }
});

module.exports = ListView;

},{"../view.js":47}],24:[function(_dereq_,module,exports){
var $ = _dereq_('jquery');
var View = _dereq_('../view.js');
var JoinView = View.extend({
  tagName: 'div',
  initialize: function (options) {
    View.prototype.initialize.call(this, options);
    this.views = options.views || [];
  },
  render: function () {
    var i;
    var wrap;

    this.trigger('rendering');

    for (i = 0; i < this.views.length; i++) {
      if (this.views[i].wrap) {
        wrap = $(this.views[i].wrap).appendTo(this.el);
        this.views[i].view.render().$el.appendTo(wrap);
      }
      else {
        this.el.appendChild(this.views[i].view.render().el);
      }
    }

    this.trigger('rendered');
    return this;
  }
});

module.exports = JoinView;

},{"../view.js":47,"jquery":"HlZQrA"}],25:[function(_dereq_,module,exports){
var $ = _dereq_('jquery');
var View = _dereq_('../view.js');
var PlaybackControlView = _dereq_('./playback_controls.js');
var VolumeControlView = _dereq_('./volume_control.js');
var MainControlView = View.extend({
  tagName: 'div',
  className: 'row',
  initialize: function (options) {
    View.prototype.initialize.call(this, options);
    this._initSubViews();
  },
  render: function () {
    var i;
    var col;

    this.trigger('rendering');
    
    for (i = 0; i < this.views.length; i++) {
      col = $('<div class="col-xs-6"></div>').appendTo(this.el);
      this.views[i].view.render().$el.appendTo(col);
    }

    this.trigger('rendered');
    return this;
  },
  _initSubViews: function () {
    this.views = [
      {
        name: 'Playback',
        view: new PlaybackControlView({
          router: this.router,
          mopidy: this.mopidy,
          config: this._config,
          lastfm: this._lastfm
        })
      },
      {
        name: 'Volume',
        view: new VolumeControlView({
          router: this.router,
          mopidy: this.mopidy,
          config: this._config,
          lastfm: this._lastfm
        })
      }
    ];
  }
});

module.exports = MainControlView;

},{"../view.js":47,"./playback_controls.js":27,"./volume_control.js":29,"jquery":"HlZQrA"}],26:[function(_dereq_,module,exports){
var View = _dereq_('../view');
var Track = _dereq_('../../model/track.js');
var _ = _dereq_('backbone/node_modules/underscore');
var NowPlayingView = View.extend({
  tagName: 'div',
  className: 'view-model',
  template: 'nowplaying_view',
  initialize: function (options) {
    View.prototype.initialize.call(this, options);
    this.listenTo(this.mopidy, 'event:trackPlaybackStarted', this._updateTrack);
    this.mopidy.playback.getCurrentTlTrack().then(function (data) {
      if (!data) {
        return;
      }

      this._updateTrack({
        tl_track: data
      });
    }.bind(this));
  },
  remove: function () {
    View.prototype.remove.apply(this, arguments);
    //this.stopListening();
  },
  render: function () {
    var data = this._track && this._track.toJSON ? this._track.toJSON() : {};
    this.trigger('rendering');
    this.$el.html(this._template(data));
    this.trigger('rendered');
    return this;
  },
  _updateTrack: function (data) {
    if (data) {
      this._track = new Track(data.tl_track.track, {
        mopidy: this.mopidy,
        lastfm: this._lastfm
      });
      this._track.once('sync', this.render.bind(this));
      this._track.fetch();
    }
  }
});

module.exports = NowPlayingView;

},{"../../model/track.js":12,"../view":47,"backbone/node_modules/underscore":48}],27:[function(_dereq_,module,exports){
var View = _dereq_('../view.js');
var PlaybackControlView = View.extend({
  tagName: 'nav',
  className: 'playback-controls',
  template: 'home_playback_control',
  events: {
    'click .playback-controls-back': 'previous',
    'click .playback-controls-next': 'next',
    'click .playback-controls-play': 'play',
    'click .playback-controls-pause': 'pause'
  },
  initialize: function (options) {
    View.prototype.initialize.call(this, options);
    this.on('rendered', function () {
      this.mopidy.playback.getState().then(this._changePlaybackState.bind(this));
    }.bind(this));
    this.listenTo(this.mopidy, 'event:playbackStateChanged', this._onPlaybackStateChanged.bind(this));
  },
  play: function () {
    this.mopidy.playback.play();
  },
  pause: function () {
    this.mopidy.playback.pause();
  },
  next: function () {
    this.mopidy.playback.next();
  },
  previous: function () {
    this.mopidy.playback.previous();
  },
  _onPlaybackStateChanged: function (event) {
    this._changePlaybackState(event.new_state);
  },
  _changePlaybackState: function (state) {
    if (state === 'playing') {
      this.$el.addClass('playing');
    }
    else {
      this.$el.removeClass('playing');
    }
  }
});

module.exports = PlaybackControlView;

},{"../view.js":47}],28:[function(_dereq_,module,exports){
var View = _dereq_('../view.js');
var SearchControlView = View.extend({
  tagName: 'nav',
  className: 'search-controls',
  template: 'home_search_control',
  events: {
    'keyup [type=search]': 'search'
  },
  search: function (event) {
    var query = encodeURIComponent(event.currentTarget.value);

    if (event.which === 13 && query !== '') {
      this.router.navigate('search/' + query, { trigger: true });
    }
    
  }
});

module.exports = SearchControlView;

},{"../view.js":47}],29:[function(_dereq_,module,exports){
var View = _dereq_('../view.js');
var VolumeControlView = View.extend({
  tagName: 'nav',
  className: 'volume-controls',
  template: 'home_volume_control',
  events: {
    'click .volume-down': '_decrementVolume',
    'click .volume-up': '_incrementVolume'
  },
  initialize: function (options) {
    View.prototype.initialize.call(this, options);
    this.listenTo(this.mopidy, 'event:volumeChanged', this._onVolumeChanged.bind(this));
    this.once('rendered', this._initializeVolume.bind(this));
  },
  render: function () {
    this.$el.html(this._template({ volume: this._volumeLevel }));
    this.trigger('rendered');
    return this;
  },
  remove: function () {
    View.prototype.remove.apply(this, arguments);
    //this.stopListening();
  },
  _volumeChangeTimeout: null,
  _volumeChangeTimeoutDelay: 1000,
  _volumeLevel: null,
  _onVolumeControlChange: function (event) {
    event.srcElement.value = event.srcElement.value.replace(/[^0-9]+/, '');
    this._volumeLevel = event.srcElement.value;
    window.clearTimeout(this._volumeChangeTimeout);
    this._volumeChangeTimeout = window.setTimeout(this._updateVolume.bind(this, +this._volumeLevel), this._volumeChangeTimeoutDelay);
  },
  _onVolumeChanged: function (event) {
    this._volumeLevel = event.volume;
    this._updateVolumeControl();
  },
  _updateVolume: function (volume) {
    this.mopidy.playback.setVolume(volume);
  },
  _updateVolumeControl: function () {
    this.$('.volume-level').text(this._volumeLevel);
  },
  _decrementVolume: function () {
    this._volumeLevel--;
    this._updateVolume(this._volumeLevel);
  },
  _incrementVolume: function () {
    this._volumeLevel++;
    this._updateVolume(this._volumeLevel);
  },
  _initializeVolume: function() {
    this.mopidy.playback.getVolume().then(this._onGetVolume.bind(this));
  },
  _onGetVolume: function (volume) {
    this._volumeLevel = volume;
    this.render();
  }
});

module.exports = VolumeControlView;

},{"../view.js":47}],30:[function(_dereq_,module,exports){
var View = _dereq_('../view.js');
var AlertView = View.extend({
  className: 'modal in',
  initialize: function (options) {
    View.prototype.initialize.call(this, options);
    options = options || {};
    this._data = {
      header: options.header,
      message: options.message
    };
  },
  render: function () {
    this._overlayElement = this._createOverlay();
    document.body.appendChild(this._overlayElement);
    this.el.innerHTML = this._template(this._data);
    this.el.style.display = 'block';
    return this;
  },
  remove: function () {
    this.$el.fadeOut('fast', View.prototype.remove.bind(this));
    this._overlayElement.parentElement.removeChild(this._overlayElement);
  },
  _template: _dereq_('../../../templates/modal/alert.hbs'),
  _createOverlay: function () {
    var overlay = document.createElement('div');
    overlay.className = 'modal-backdrop in';
    return overlay;
  }
});

module.exports = AlertView;

},{"../../../templates/modal/alert.hbs":100,"../view.js":47}],31:[function(_dereq_,module,exports){
var ModelView = _dereq_('./view.js');
var AlbumView = ModelView.extend({
  tagName: 'article',
  template: 'album_model'
});

module.exports = AlbumView;

},{"./view.js":34}],32:[function(_dereq_,module,exports){
var ModelView = _dereq_('./view.js');
var ArtistView = ModelView.extend({
  tagName: 'article',
  template: 'artist_model'
});

module.exports = ArtistView;

},{"./view.js":34}],33:[function(_dereq_,module,exports){
var ModelView = _dereq_('./view.js');
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

},{"./view.js":34}],34:[function(_dereq_,module,exports){
var View = _dereq_('../view.js');
var ModelView = View.extend({
  className: 'view-model',
  initialize: function (options) {
    View.prototype.initialize.call(this, options);
    if (options.extended) {
      this._extended = !!options.extended;
    }
    this.model = options.model;
    this.listenTo(this.model, 'change', this.render);
    this.listenTo(this.model, 'remove', this.remove);
  },
  render: function () {
    var model = this.model.toJSON();
    this.trigger('rendering');
    this.$el.html(this._template(model));
    this.trigger('rendered');
    return this;
  },
  remove: function () {
    View.prototype.remove.apply(this);
  },
  _hideOnRender: false
});

module.exports = ModelView;

},{"../view.js":47}],35:[function(_dereq_,module,exports){
var ModelView = _dereq_('./view.js');
var AlbumItemView = ModelView.extend({
  tagName: 'li',
  template: 'album_item_model',
  className: 'interactive-list-item',
  _viewAlbum: function () {
    this.router.navigate('/albums/' + this.model.id + '/' + encodeURIComponent(this.model.get('artists')[0].name) + '/' + encodeURIComponent(this.model.get('name')), {
      trigger: true
    });
  },
  _onClick: function (event) {
    this._viewAlbum();
  }
});

module.exports = AlbumItemView;

},{"./view.js":39}],36:[function(_dereq_,module,exports){
var extend = _dereq_('backbone/node_modules/underscore').extend;
var ModelItemView = _dereq_('./view.js');
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

},{"./view.js":39,"backbone/node_modules/underscore":48}],37:[function(_dereq_,module,exports){
var extend = _dereq_('backbone/node_modules/underscore').extend;
var ModelItemView = _dereq_('./view.js');
var TrackView = ModelItemView.extend({
  tagName: 'li',
  events: function () {
    return extend({}, ModelItemView.prototype.events, {
      'dblclick li': '_addToTracklist'
    });
  },
  template: 'track_model_item',
  className: 'interactive-list-item',
  initialize: function (options) {
    ModelItemView.prototype.initialize.call(this, options);
  },
  _checkable: true,
  _addToTracklist: function (event) {
    this.model.save();
  }
});

module.exports = TrackView;

},{"./view.js":39,"backbone/node_modules/underscore":48}],38:[function(_dereq_,module,exports){
var extend = _dereq_('backbone/node_modules/underscore').extend;
var ModelItemView = _dereq_('./view.js');
var TracklistTrackModelItemView = ModelItemView.extend({
  tagName: 'li',
  className: 'interactive-list-item',
  template: 'tracklist_model',
  events: function () {
    return extend({}, ModelItemView.prototype.events, {
      'dblclick': 'play',
      'dragstart': '_onDragStart',
      'dragend': '_onDragEnd',
      'drop': '_onDrop',
      'dragenter': '_onDragEnter',
      'dragover': '_onDragOver',
      'dragleave': '_onDragLeave'
    });
  },
  initialize: function (options) {
    ModelItemView.prototype.initialize.call(this, options);
    this.on('rendered', this._onRendered.bind(this));
  },
  play: function (event) {
    var isKeyDownPlay = event.type === 'keydown' && event.which === 13;
    var isDoubleClick = event.type === 'dblclick';

    if (isKeyDownPlay || isDoubleClick) {
      event.preventDefault();
      this.mopidy.playback.play(this.model.attributes);
    }
  },
  _checkable: true,
  _onKeydown: function (event) {
    var enterKey = event.which === 13;
    var spaceKey = event.which === 32;

    if (enterKey) {
      this._play(event);
    }
    else if (spaceKey) {
      this._toggleSelected(event);
    }
  },
  _onRendered: function () {
    this._enableDraggableOnElement();
    this._toggleCurrentTrackIfCurrent();
  },
  _enableDraggableOnElement: function () {
    this.$el.attr('draggable', 'true');
  },
  _toggleCurrentTrackIfCurrent: function () {
    if (this.model.current) {
      this.$el.addClass('current_track');
    }
    else {
      this.$el.removeClass('current_track');
    }
  },
  _toggleSelected: function (event) {
    var checkbox = this.$('input[type=checkbox]')[0];
    checkbox.checked = !checkbox.checked;
    event.preventDefault();
  },
  _onDragStart: function (event) {
    event.originalEvent.dataTransfer.setData('track_index', this.model.collection.indexOf(this.model));
  },
  _onDragEnd: function (event) {
    this.$el.removeClass('dragover');
  },
  _onDrop: function (event) {
    var index, sourceTrack, targetIndex, newIndex;

    if (this.model && this.model.collection) {
      index = +event.originalEvent.dataTransfer.getData('track_index');
      sourceTrack = this.model.collection.at(index);
      targetIndex = this.model.collection.indexOf(this.model);
      newIndex = targetIndex + (targetIndex < index ? 1 : 0);

      this.$el.removeClass('dragover');

      if (index !== targetIndex) {
        this.model.collection.move(sourceTrack, newIndex);
      }
    }
  },
  _onDragEnter: function (event) {
    this.$el.addClass('dragover');
    event.preventDefault();
  },
  _onDragOver: function (event) {
    event.preventDefault();
  },
  _onDragLeave: function (event) {
    this.$el.removeClass('dragover');
  },
});

module.exports = TracklistTrackModelItemView;

},{"./view.js":39,"backbone/node_modules/underscore":48}],39:[function(_dereq_,module,exports){
var ModelView = _dereq_('../model/view.js');
var ModelItemView = ModelView.extend({
  initialize: function (options) {
    ModelView.prototype.initialize.call(this, options);
    this._collectionView = options.collectionView;
    this._selected = false;
    this._checked = false;
  },
  attributes: function () {
    var attrs = {
      'role': 'option',
      'aria-selected': 'false',
      'tabindex': '-1'
    };

    if (this._checkable) {
      attrs['aria-checked'] = 'false';
    }

    return attrs;
  },
  remove: function () {
    this._collectionView.removeSubView(this);
    return ModelView.prototype.remove.call(this);
  },
  events: {
    'keydown': '_onKeyDown',
    'click': '_onClick',
    'click input[type=checkbox]': '_onClickCheckbox',
    'focus': '_onFocus'
  },
  isSelected: function () {
    return this._selected;
  },
  isChecked: function () {
    return this._checked;
  },
  setSelected: function (selected) {
    var alreadySelected = this.isSelected();
    if (selected) {
      this._selected = true;
      this.el.setAttribute('aria-selected', 'true');
      this.el.setAttribute('tabindex', 0);

      if (!alreadySelected) {
        this.$el.focus();
      }
    }
    else {
      this._selected = false;
      this.el.setAttribute('aria-selected', 'false');
      this.el.setAttribute('tabindex', -1);
    }
  },
  setChecked: function (checked) {
    if (checked) {
      this._checked = true;
      this.el.setAttribute('aria-checked', 'true');
      this.$('input[type=checkbox]').prop('checked', true);
    }
    else {
      this._checked = false;
      this.el.setAttribute('aria-checked', 'false');
      this.$('input[type=checkbox]').prop('checked', false);
    }
  },
  toggleChecked: function () {
    this.setChecked(!this.isChecked());
  },
  _onKeyDown: function (event) {
    var j = 74, k = 75, up = 38, down = 40, space = 32;

    if (event.which === j || event.which === down) {
      event.preventDefault();
      this._collectionView.next(this);
    }
    else if (event.which === k || event.which === up) {
      event.preventDefault();
      this._collectionView.prev(this);
    }
    else if (this._checkable && event.which === space) {
      event.preventDefault();
      this.toggleChecked();
    }
  },
  _onClick: function (event) {
    this._collectionView.updateSelected(this);
  },
  _onClickCheckbox: function (event) {
    this.toggleChecked();
  },
  _onFocus: function (event) {
    this._collectionView.updateSelected(this);
  }
});

module.exports = ModelItemView;

},{"../model/view.js":34}],40:[function(_dereq_,module,exports){
var $ = _dereq_('jquery');
var View = _dereq_('../view.js');
var PageView = _dereq_('./view.js');
var JoinView = _dereq_('../misc/join.js');
var SearchControlView = _dereq_('../misc/search_control.js');
var MainControlView = _dereq_('../misc/main_control.js');
var NavigationView = PageView.extend({
  initialize: function (options) {
    View.prototype.initialize.call(this, options);
    this._initSubViews();
  },
  _template: _dereq_('../../../templates/navigation/index.hbs'),
  _initSubViews: function () {
    this.views = [
      {
        name: 'Search',
        view: new SearchControlView({
          router: this.router,
          mopidy: this.mopidy,
          config: this._config,
          lastfm: this._lastfm
        })
      },
      {
        name: 'Controls',
        view: new MainControlView({
          router: this.router,
          mopidy: this.mopidy,
          config: this._config,
          lastfm: this._lastfm
        })
      }
    ];
  },
  render: function () {
    var i;
    var col;

    this.trigger('rendering');
    this.$el.html(this._template());

    col = $('<div class="view-section"></div>').appendTo(this.el);
    this.views[0].view.render().$el.appendTo(col);
    col = $('<div class="view-section"></div>').appendTo(this.el);
    this.views[1].view.render().$el.appendTo(col);

    this.trigger('rendered');
    return this;
  }
});

module.exports = NavigationView;

},{"../../../templates/navigation/index.hbs":102,"../misc/join.js":24,"../misc/main_control.js":25,"../misc/search_control.js":28,"../view.js":47,"./view.js":42,"jquery":"HlZQrA"}],41:[function(_dereq_,module,exports){
var $ = _dereq_('jquery');
var View = _dereq_('../view.js');
var PageView = _dereq_('./view.js');
var JoinView = _dereq_('../misc/join.js');
var SearchControlView = _dereq_('../misc/search_control.js');
var MainControlView = _dereq_('../misc/main_control.js');
var NowPlayingView = _dereq_('../misc/now_playing.js');
var TrackListListView = _dereq_('../list/track_list.js');
var TrackListCollection = _dereq_('../../collection/track_list.js');
var RootView = PageView.extend({
  initialize: function (options) {
    View.prototype.initialize.call(this, options);
    this._initSubViews();
  },
  _template: _dereq_('../../../templates/root/index.hbs'),
  _initSubViews: function () {
    this.views = [
      {
        name: 'MainContent',
        view: new JoinView({
          router: this.router,
          mopidy: this.mopidy,
          config: this._config,
          lastfm: this._lastfm,
          views: [
            {
              name: 'NowPlaying',
              view: new NowPlayingView({
                router: this.router,
                mopidy: this.mopidy,
                config: this._config,
                lastfm: this._lastfm
              })
            },
            {
              name: 'Queue',
              view: new TrackListListView({
                router: this.router,
                collection: new TrackListCollection(null, {
                  mopidy: this.mopidy
                }),
                mopidy: this.mopidy,
                config: this._config,
                lastfm: this._lastfm
              })
            }
          ]
        })
      }
    ];
  },
  render: function () {
    var i;
    var col;

    this.trigger('rendering');
    this.$el.html(this._template());

    col = $('<div class="view-section"></div>').appendTo(this.el);
    this.views[0].view.render().$el.appendTo(col);

    this.trigger('rendered');
    return this;
  }
});

module.exports = RootView;

},{"../../../templates/root/index.hbs":104,"../../collection/track_list.js":6,"../list/track_list.js":22,"../misc/join.js":24,"../misc/main_control.js":25,"../misc/now_playing.js":26,"../misc/search_control.js":28,"../view.js":47,"./view.js":42,"jquery":"HlZQrA"}],42:[function(_dereq_,module,exports){
var View = _dereq_('../view.js');
var PageView = View.extend({
  initialize: function (options) {
    View.prototype.initialize.call(this, options);
    this._initSubViews();
    this.listenTo(this.router, 'beforeRoute', this.remove);
  },
  render: function () {
    var i;

    this.trigger('rendering');
    this.$el.html(this._template());

    for (i = 0; i < this.views.length; i++) {
      this.el.appendChild(this.views[i].view.render().el);
    }

    this._setTitle(this.title);
    this.trigger('rendered');

    return this;
  },
  remove: function () {
    this.stopListening();
    View.prototype.remove.apply(this, arguments);
  },
  _setTitle: function (title) {
    $('title').text(title + ': ' + this._config.title);
  }
});

module.exports = PageView;

},{"../view.js":47}],43:[function(_dereq_,module,exports){
var TabView = _dereq_('./view.js');
var JoinView = _dereq_('../misc/join.js');
var AlbumView = _dereq_('../model/album.js');
var ArtistLinkView = _dereq_('../model/artist_link.js');
var TrackListView = _dereq_('../list/track.js');
var Album = _dereq_('../../model/album.js');
var AlbumTabView = TabView.extend({
  tagName: 'div',
  className: 'view',
  title: 'Albums',
  initialize: function (options) {
    this.album = new Album({ uri: options.id, title: options.name, artist: options.artist }, {
      mopidy: options.mopidy,
      router: options.router,
      lastfm: options.lastfm
    });
    TabView.prototype.initialize.call(this, options);
    this.album.fetch();
  },
  queueAll: function () {
    this.mopidy.tracklist.add(this.album.tracks.toJSON()).then(function () {
    });
  },
  queueSelected: function () {
    var selectedInputs = this.$('li input[type=checkbox]:checked');
    var selectedTracks = selectedInputs.map(function (i, track) {
      return this.album.tracks.get(track.getAttribute('data-track-id')).toJSON();
    }.bind(this));
    this.mopidy.tracklist.add(selectedTracks).then(function () {
      selectedInputs.each(function (i, input) {
        input.checked = false;
      });
    }.bind(this));
  },
  _initSubViews: function () {
    this.views = [
      {
        name: this.album.get('title'),
        view: new JoinView({
          mopidy: this.mopidy,
          router: this.router,
          lastfm: this._lastfm,
          views: [
            {
              view: new AlbumView({
                model: this.album,
                mopidy: this.mopidy,
                router: this.router,
                lastfm: this._lastfm
              })
            },
            {
              view: new ArtistLinkView({
                model: this.album.artist,
                mopidy: this.mopidy,
                router: this.router,
                lastfm: this._lastfm
              })
            },
            {
              view: new TrackListView({
                collection: this.album.tracks,
                mopidy: this.mopidy,
                router: this.router,
                lastfm: this._lastfm
              })
            }
          ]
        })
      }
    ];
  }
});

module.exports = AlbumTabView;

},{"../../model/album.js":8,"../list/track.js":21,"../misc/join.js":24,"../model/album.js":31,"../model/artist_link.js":33,"./view.js":46}],44:[function(_dereq_,module,exports){
var PageView = _dereq_('./view.js');
var AlbumCollectionView = _dereq_('../collection/album.js');
var TrackListView = _dereq_('../list/track.js');
var ArtistView = _dereq_('../model/artist.js');
var JoinView = _dereq_('../misc/join.js');
var Artist = _dereq_('../../model/artist.js');
var ArtistTabView = PageView.extend({
  tagName: 'div',
  title: 'Artists',
  initialize: function (options) {
    this.artist = new Artist({ uri: options.uri, name: options.name }, {
      mopidy: options.mopidy,
      router: options.router,
      lastfm: options.lastfm
    });
    PageView.prototype.initialize.call(this, options);
    this.artist.fetch();
  },
  _initSubViews: function () {
    this.views = [
      {
        name: this.artist.get('name'),
        view: new JoinView({
          views: [
            {
              name: this.artist.get('name'),
              view: new ArtistView({
                mopidy: this.mopidy,
                router: this.router,
                lastfm: this._lastfm,
                model: this.artist
              }),
            },
            {
              name: 'Albums',
              view: new AlbumCollectionView({
                mopidy: this.mopidy,
                router: this.router,
                lastfm: this._lastfm,
                collection: this.artist.albums
              }),
            }
          ]
        })
      },
      {
        name: 'Tracks',
        view: new TrackListView({
          mopidy: this.mopidy,
          router: this.router,
          lastfm: this._lastfm,
          collection: this.artist.tracks,
          extended: true
        }),
      }
    ];
  }
});

module.exports = ArtistTabView;

},{"../../model/artist.js":9,"../collection/album.js":16,"../list/track.js":21,"../misc/join.js":24,"../model/artist.js":32,"./view.js":46}],45:[function(_dereq_,module,exports){
var TabView = _dereq_('./view.js');
var TrackListView = _dereq_('../list/track.js');
var AlbumCollectionView = _dereq_('../collection/album.js');
var ArtistCollectionView = _dereq_('../collection/artist.js');
var SearchTabView = TabView.extend({
  tagName: 'div',
  className: 'view-section',
  title: 'Search',
  initialize: function (options) {
    this.model = options.model;
    TabView.prototype.initialize.call(this, options);
    this.model.fetch({ query: options.query });
  },
  resetResults: function () {
    this.views.albums.resetResults();
    this.views.artists.resetResults();
    this.views.tracks.resetResults();
  },
  _initSubViews: function () {
    this.views = [
      {
        name: 'Artists',
        view: new ArtistCollectionView({
          collection: this.model.artists,
          mopidy: this.mopidy,
          router: this.router,
          lastfm: this._lastfm
        })
      },
      {
        name: 'Albums',
        view: new AlbumCollectionView({
          collection: this.model.albums,
          mopidy: this.mopidy,
          router: this.router,
          lastfm: this._lastfm
        })
      },
      {
        name: 'Tracks',
        view: new TrackListView({
          collection: this.model.tracks,
          mopidy: this.mopidy,
          router: this.router,
          lastfm: this._lastfm
        })
      }
    ];
  }
});

module.exports = SearchTabView;

},{"../collection/album.js":16,"../collection/artist.js":17,"../list/track.js":21,"./view.js":46}],46:[function(_dereq_,module,exports){
var $ = _dereq_('jquery');
var PageView = _dereq_('../page/view.js');
var TabView = PageView.extend({
  className: 'tab-view-section',
  template: 'tab_view',
  events: {
    'click [role=tab]': '_clickTab',
    'keydown [role=tab]': '_switchTab'
  },
  initialize: function (options) {
    PageView.prototype.initialize.call(this, options);
  },
  render: function () {
    var i;
    var baseName = Date.now();
    var panel;

    this.trigger('rendering');
    this.$el.html(this._template({
      baseName: baseName,
      tabs: this._getTabs()
    }));

    for (i = 0; i < this.views.length; i++) {
      panel = $(this._generateTabHTML(i, baseName)).appendTo(this.el);
      $(this.views[i].view.render().el).appendTo(panel);
    }

    this.trigger('rendered');
    return this;
  },
  _getTabs: function () {
    return this.views.map(function (v, index) {
      return v.name;
    }.bind(this));
  },
  _generateTabHTML: function (index, baseName) {
    var currentTabClass = '';
    var ariaHiddenAttribute = 'true';

    if (index === 0) {
      ariaHiddenAttribute = 'false';
    }

    return '<div class=\"tab-view-section-tab opaque\" id=\"panel-' + baseName + '-' + index + '\" aria-labeledby=\"tab-' + baseName + '-' + index + '\" role=\"tabpanel\" aria-hidden="' + ariaHiddenAttribute + '"></div>';
  },
  _clickTab: function (event) {
    var selected = event.target.getAttribute('aria-controls');
    this._updateTabs(selected);
  },
  _updateTabs: function (selected) {
    this.$('[role=tab]').each(function (i) {
      var $tab = $(this);
      var id = $tab.attr('aria-controls');

      if (id === selected) {
        $tab.attr('tabindex', 0);
      }
      else {
        $tab.attr('tabindex', -1);
      }
    });
    this.$('[role=tabpanel]').each(function (i) {
      var $panel = $(this);
      var id = $panel.attr('id');

      if (id === selected) {
        $panel.addClass('current-tab');
        $panel.attr('aria-hidden', 'false');
      }
      else {
        $panel.removeClass('current-tab');
        $panel.attr('aria-hidden', 'true');
      }
    });
  },
  _switchTab: function (event) {
    var selected;
    var right = 39, l = 76, h = 72, left = 37;

    // Right
    if (event.which === right || event.which === l) {
      selected = $(event.target).next('[role=tab]').eq(0);
      if (selected.length) {
        event.preventDefault();
        selected.focus();
        this._updateTabs(selected.attr('aria-controls'));
      }
    }
    // Left
    else if (event.which === left || event.which === h) {
      selected = $(event.target).prev('[role=tab]').eq(0);
      if (selected.length) {
        event.preventDefault();
        selected.focus();
        this._updateTabs(selected.attr('aria-controls'));
      }
    }
  }
});

module.exports = TabView;

},{"../page/view.js":42,"jquery":"HlZQrA"}],47:[function(_dereq_,module,exports){
var templates = _dereq_('../templates.js');
var Backbone = _dereq_('backbone');
var View = Backbone.View.extend({
  initialize: function (options) {
    Backbone.View.prototype.initialize.call(this, options);

    options = options || {};

    options.templates = options.templates || templates;

    if (this.template) {
      this._setTemplate(templates);
    }

    if (options.mopidy) {
      this.mopidy = options.mopidy;
    }

    if (options.router) {
      this.router = options.router;
    }

    if (options.config) {
      this._config = options.config;
    }

    this._lastfm = options.lastfm;

    this.on('rendering', this._rendering, this);
    this.on('rendered', this._rendered, this);
  },
  remove: function (callback) {
    this.$el.toggleClass('hidden');
    Backbone.View.prototype.remove.apply(this, arguments);
  },
  render: function () {
    this.trigger('rendering');
    this.$el.html(this._template());
    this.trigger('rendered');
    return this;
  },
  _setTemplate: function (templates) {
    this._template = templates[this.template];
  },
  _rendering: function () {
    if (this._hideOnRender) {
      this.$el.addClass('hidden');
    }
  },
  _rendered: function () {
    if (this._hideOnRender) {
      this.$el.removeClass('hidden');
    }
  },
  _hideOnRender: false
});

Backbone.$ = _dereq_('jquery');

module.exports = View;

},{"../templates.js":15,"backbone":"5kFNoY","jquery":"HlZQrA"}],48:[function(_dereq_,module,exports){
//     Underscore.js 1.7.0
//     http://underscorejs.org
//     (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    concat           = ArrayProto.concat,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.7.0';

  // Internal function that returns an efficient (for current engines) version
  // of the passed-in callback, to be repeatedly applied in other Underscore
  // functions.
  var createCallback = function(func, context, argCount) {
    if (context === void 0) return func;
    switch (argCount == null ? 3 : argCount) {
      case 1: return function(value) {
        return func.call(context, value);
      };
      case 2: return function(value, other) {
        return func.call(context, value, other);
      };
      case 3: return function(value, index, collection) {
        return func.call(context, value, index, collection);
      };
      case 4: return function(accumulator, value, index, collection) {
        return func.call(context, accumulator, value, index, collection);
      };
    }
    return function() {
      return func.apply(context, arguments);
    };
  };

  // A mostly-internal function to generate callbacks that can be applied
  // to each element in a collection, returning the desired result — either
  // identity, an arbitrary callback, a property matcher, or a property accessor.
  _.iteratee = function(value, context, argCount) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return createCallback(value, context, argCount);
    if (_.isObject(value)) return _.matches(value);
    return _.property(value);
  };

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles raw objects in addition to array-likes. Treats all
  // sparse array-likes as if they were dense.
  _.each = _.forEach = function(obj, iteratee, context) {
    if (obj == null) return obj;
    iteratee = createCallback(iteratee, context);
    var i, length = obj.length;
    if (length === +length) {
      for (i = 0; i < length; i++) {
        iteratee(obj[i], i, obj);
      }
    } else {
      var keys = _.keys(obj);
      for (i = 0, length = keys.length; i < length; i++) {
        iteratee(obj[keys[i]], keys[i], obj);
      }
    }
    return obj;
  };

  // Return the results of applying the iteratee to each element.
  _.map = _.collect = function(obj, iteratee, context) {
    if (obj == null) return [];
    iteratee = _.iteratee(iteratee, context);
    var keys = obj.length !== +obj.length && _.keys(obj),
        length = (keys || obj).length,
        results = Array(length),
        currentKey;
    for (var index = 0; index < length; index++) {
      currentKey = keys ? keys[index] : index;
      results[index] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`.
  _.reduce = _.foldl = _.inject = function(obj, iteratee, memo, context) {
    if (obj == null) obj = [];
    iteratee = createCallback(iteratee, context, 4);
    var keys = obj.length !== +obj.length && _.keys(obj),
        length = (keys || obj).length,
        index = 0, currentKey;
    if (arguments.length < 3) {
      if (!length) throw new TypeError(reduceError);
      memo = obj[keys ? keys[index++] : index++];
    }
    for (; index < length; index++) {
      currentKey = keys ? keys[index] : index;
      memo = iteratee(memo, obj[currentKey], currentKey, obj);
    }
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  _.reduceRight = _.foldr = function(obj, iteratee, memo, context) {
    if (obj == null) obj = [];
    iteratee = createCallback(iteratee, context, 4);
    var keys = obj.length !== + obj.length && _.keys(obj),
        index = (keys || obj).length,
        currentKey;
    if (arguments.length < 3) {
      if (!index) throw new TypeError(reduceError);
      memo = obj[keys ? keys[--index] : --index];
    }
    while (index--) {
      currentKey = keys ? keys[index] : index;
      memo = iteratee(memo, obj[currentKey], currentKey, obj);
    }
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var result;
    predicate = _.iteratee(predicate, context);
    _.some(obj, function(value, index, list) {
      if (predicate(value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    if (obj == null) return results;
    predicate = _.iteratee(predicate, context);
    _.each(obj, function(value, index, list) {
      if (predicate(value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, _.negate(_.iteratee(predicate)), context);
  };

  // Determine whether all of the elements match a truth test.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    if (obj == null) return true;
    predicate = _.iteratee(predicate, context);
    var keys = obj.length !== +obj.length && _.keys(obj),
        length = (keys || obj).length,
        index, currentKey;
    for (index = 0; index < length; index++) {
      currentKey = keys ? keys[index] : index;
      if (!predicate(obj[currentKey], currentKey, obj)) return false;
    }
    return true;
  };

  // Determine if at least one element in the object matches a truth test.
  // Aliased as `any`.
  _.some = _.any = function(obj, predicate, context) {
    if (obj == null) return false;
    predicate = _.iteratee(predicate, context);
    var keys = obj.length !== +obj.length && _.keys(obj),
        length = (keys || obj).length,
        index, currentKey;
    for (index = 0; index < length; index++) {
      currentKey = keys ? keys[index] : index;
      if (predicate(obj[currentKey], currentKey, obj)) return true;
    }
    return false;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (obj.length !== +obj.length) obj = _.values(obj);
    return _.indexOf(obj, target) >= 0;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matches(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matches(attrs));
  };

  // Return the maximum element (or element-based computation).
  _.max = function(obj, iteratee, context) {
    var result = -Infinity, lastComputed = -Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = obj.length === +obj.length ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value > result) {
          result = value;
        }
      }
    } else {
      iteratee = _.iteratee(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iteratee, context) {
    var result = Infinity, lastComputed = Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = obj.length === +obj.length ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value < result) {
          result = value;
        }
      }
    } else {
      iteratee = _.iteratee(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed < lastComputed || computed === Infinity && result === Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Shuffle a collection, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var set = obj && obj.length === +obj.length ? obj : _.values(obj);
    var length = set.length;
    var shuffled = Array(length);
    for (var index = 0, rand; index < length; index++) {
      rand = _.random(0, index);
      if (rand !== index) shuffled[index] = shuffled[rand];
      shuffled[rand] = set[index];
    }
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (obj.length !== +obj.length) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // Sort the object's values by a criterion produced by an iteratee.
  _.sortBy = function(obj, iteratee, context) {
    iteratee = _.iteratee(iteratee, context);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iteratee(value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iteratee, context) {
      var result = {};
      iteratee = _.iteratee(iteratee, context);
      _.each(obj, function(value, index) {
        var key = iteratee(value, index, obj);
        behavior(result, value, key);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key].push(value); else result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, value, key) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key]++; else result[key] = 1;
  });

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iteratee, context) {
    iteratee = _.iteratee(iteratee, context, 1);
    var value = iteratee(obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = low + high >>> 1;
      if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
    }
    return low;
  };

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return obj.length === +obj.length ? obj.length : _.keys(obj).length;
  };

  // Split a collection into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(obj, predicate, context) {
    predicate = _.iteratee(predicate, context);
    var pass = [], fail = [];
    _.each(obj, function(value, key, obj) {
      (predicate(value, key, obj) ? pass : fail).push(value);
    });
    return [pass, fail];
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[0];
    if (n < 0) return [];
    return slice.call(array, 0, n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[array.length - 1];
    return slice.call(array, Math.max(array.length - n, 0));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, n == null || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, strict, output) {
    if (shallow && _.every(input, _.isArray)) {
      return concat.apply(output, input);
    }
    for (var i = 0, length = input.length; i < length; i++) {
      var value = input[i];
      if (!_.isArray(value) && !_.isArguments(value)) {
        if (!strict) output.push(value);
      } else if (shallow) {
        push.apply(output, value);
      } else {
        flatten(value, shallow, strict, output);
      }
    }
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, false, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iteratee, context) {
    if (array == null) return [];
    if (!_.isBoolean(isSorted)) {
      context = iteratee;
      iteratee = isSorted;
      isSorted = false;
    }
    if (iteratee != null) iteratee = _.iteratee(iteratee, context);
    var result = [];
    var seen = [];
    for (var i = 0, length = array.length; i < length; i++) {
      var value = array[i];
      if (isSorted) {
        if (!i || seen !== value) result.push(value);
        seen = value;
      } else if (iteratee) {
        var computed = iteratee(value, i, array);
        if (_.indexOf(seen, computed) < 0) {
          seen.push(computed);
          result.push(value);
        }
      } else if (_.indexOf(result, value) < 0) {
        result.push(value);
      }
    }
    return result;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(flatten(arguments, true, true, []));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    if (array == null) return [];
    var result = [];
    var argsLength = arguments.length;
    for (var i = 0, length = array.length; i < length; i++) {
      var item = array[i];
      if (_.contains(result, item)) continue;
      for (var j = 1; j < argsLength; j++) {
        if (!_.contains(arguments[j], item)) break;
      }
      if (j === argsLength) result.push(item);
    }
    return result;
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = flatten(slice.call(arguments, 1), true, true, []);
    return _.filter(array, function(value){
      return !_.contains(rest, value);
    });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function(array) {
    if (array == null) return [];
    var length = _.max(arguments, 'length').length;
    var results = Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(arguments, i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, length = list.length; i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // Return the position of the first occurrence of an item in an array,
  // or -1 if the item is not included in the array.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, length = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = isSorted < 0 ? Math.max(0, length + isSorted) : isSorted;
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    for (; i < length; i++) if (array[i] === item) return i;
    return -1;
  };

  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var idx = array.length;
    if (typeof from == 'number') {
      idx = from < 0 ? idx + from + 1 : Math.min(idx, from + 1);
    }
    while (--idx >= 0) if (array[idx] === item) return idx;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = step || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var range = Array(length);

    for (var idx = 0; idx < length; idx++, start += step) {
      range[idx] = start;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var Ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    var args, bound;
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError('Bind must be called on a function');
    args = slice.call(arguments, 2);
    bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      Ctor.prototype = func.prototype;
      var self = new Ctor;
      Ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (_.isObject(result)) return result;
      return self;
    };
    return bound;
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    return function() {
      var position = 0;
      var args = boundArgs.slice();
      for (var i = 0, length = args.length; i < length; i++) {
        if (args[i] === _) args[i] = arguments[position++];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return func.apply(this, args);
    };
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var i, length = arguments.length, key;
    if (length <= 1) throw new Error('bindAll must be passed function names');
    for (i = 1; i < length; i++) {
      key = arguments[i];
      obj[key] = _.bind(obj[key], obj);
    }
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memoize = function(key) {
      var cache = memoize.cache;
      var address = hasher ? hasher.apply(this, arguments) : key;
      if (!_.has(cache, address)) cache[address] = func.apply(this, arguments);
      return cache[address];
    };
    memoize.cache = {};
    return memoize;
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){
      return func.apply(null, args);
    }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;

      if (last < wait && last > 0) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          if (!timeout) context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) timeout = setTimeout(later, wait);
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a negated version of the passed-in predicate.
  _.negate = function(predicate) {
    return function() {
      return !predicate.apply(this, arguments);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var args = arguments;
    var start = args.length - 1;
    return function() {
      var i = start;
      var result = args[start].apply(this, arguments);
      while (i--) result = args[i].call(this, result);
      return result;
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Returns a function that will only be executed before being called N times.
  _.before = function(times, func) {
    var memo;
    return function() {
      if (--times > 0) {
        memo = func.apply(this, arguments);
      } else {
        func = null;
      }
      return memo;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = _.partial(_.before, 2);

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    if (!_.isObject(obj)) return obj;
    var source, prop;
    for (var i = 1, length = arguments.length; i < length; i++) {
      source = arguments[i];
      for (prop in source) {
        if (hasOwnProperty.call(source, prop)) {
            obj[prop] = source[prop];
        }
      }
    }
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj, iteratee, context) {
    var result = {}, key;
    if (obj == null) return result;
    if (_.isFunction(iteratee)) {
      iteratee = createCallback(iteratee, context);
      for (key in obj) {
        var value = obj[key];
        if (iteratee(value, key, obj)) result[key] = value;
      }
    } else {
      var keys = concat.apply([], slice.call(arguments, 1));
      obj = new Object(obj);
      for (var i = 0, length = keys.length; i < length; i++) {
        key = keys[i];
        if (key in obj) result[key] = obj[key];
      }
    }
    return result;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj, iteratee, context) {
    if (_.isFunction(iteratee)) {
      iteratee = _.negate(iteratee);
    } else {
      var keys = _.map(concat.apply([], slice.call(arguments, 1)), String);
      iteratee = function(value, key) {
        return !_.contains(keys, key);
      };
    }
    return _.pick(obj, iteratee, context);
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    if (!_.isObject(obj)) return obj;
    for (var i = 1, length = arguments.length; i < length; i++) {
      var source = arguments[i];
      for (var prop in source) {
        if (obj[prop] === void 0) obj[prop] = source[prop];
      }
    }
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a === 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className !== toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, regular expressions, dates, and booleans are compared by value.
      case '[object RegExp]':
      // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return '' + a === '' + b;
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive.
        // Object(NaN) is equivalent to NaN
        if (+a !== +a) return +b !== +b;
        // An `egal` comparison is performed for other numeric values.
        return +a === 0 ? 1 / +a === 1 / b : +a === +b;
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a === +b;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] === a) return bStack[length] === b;
    }
    // Objects with different constructors are not equivalent, but `Object`s
    // from different frames are.
    var aCtor = a.constructor, bCtor = b.constructor;
    if (
      aCtor !== bCtor &&
      // Handle Object.create(x) cases
      'constructor' in a && 'constructor' in b &&
      !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
        _.isFunction(bCtor) && bCtor instanceof bCtor)
    ) {
      return false;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size, result;
    // Recursively compare objects and arrays.
    if (className === '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size === b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Deep compare objects.
      var keys = _.keys(a), key;
      size = keys.length;
      // Ensure that both objects contain the same number of properties before comparing deep equality.
      result = _.keys(b).length === size;
      if (result) {
        while (size--) {
          // Deep compare each member
          key = keys[size];
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj) || _.isArguments(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) === '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) === '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return _.has(obj, 'callee');
    };
  }

  // Optimize `isFunction` if appropriate. Work around an IE 11 bug.
  if (typeof /./ !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj == 'function' || false;
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj !== +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return obj != null && hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iteratees.
  _.identity = function(value) {
    return value;
  };

  _.constant = function(value) {
    return function() {
      return value;
    };
  };

  _.noop = function(){};

  _.property = function(key) {
    return function(obj) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of `key:value` pairs.
  _.matches = function(attrs) {
    var pairs = _.pairs(attrs), length = pairs.length;
    return function(obj) {
      if (obj == null) return !length;
      obj = new Object(obj);
      for (var i = 0; i < length; i++) {
        var pair = pairs[i], key = pair[0];
        if (pair[1] !== obj[key] || !(key in obj)) return false;
      }
      return true;
    };
  };

  // Run a function **n** times.
  _.times = function(n, iteratee, context) {
    var accum = Array(Math.max(0, n));
    iteratee = createCallback(iteratee, context, 1);
    for (var i = 0; i < n; i++) accum[i] = iteratee(i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() {
    return new Date().getTime();
  };

   // List of HTML entities for escaping.
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };
  var unescapeMap = _.invert(escapeMap);

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  var createEscaper = function(map) {
    var escaper = function(match) {
      return map[match];
    };
    // Regexes for identifying a key that needs to be escaped
    var source = '(?:' + _.keys(map).join('|') + ')';
    var testRegexp = RegExp(source);
    var replaceRegexp = RegExp(source, 'g');
    return function(string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
  };
  _.escape = createEscaper(escapeMap);
  _.unescape = createEscaper(unescapeMap);

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? object[property]() : value;
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\u2028|\u2029/g;

  var escapeChar = function(match) {
    return '\\' + escapes[match];
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  // NB: `oldSettings` only exists for backwards compatibility.
  _.template = function(text, settings, oldSettings) {
    if (!settings && oldSettings) settings = oldSettings;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset).replace(escaper, escapeChar);
      index = offset + match.length;

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      } else if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      } else if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }

      // Adobe VMs need the match returned to produce the correct offest.
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + 'return __p;\n';

    try {
      var render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled source as a convenience for precompilation.
    var argument = settings.variable || 'obj';
    template.source = 'function(' + argument + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function. Start chaining a wrapped Underscore object.
  _.chain = function(obj) {
    var instance = _(obj);
    instance._chain = true;
    return instance;
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    _.each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  _.each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  // Extracts the result from a wrapped and chained object.
  _.prototype.value = function() {
    return this._wrapped;
  };

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}.call(this));

},{}],49:[function(_dereq_,module,exports){
/*
 *
 * Copyright (c) 2008-2009, Felix Bruns <felixbruns@web.de>
 *
 */

/* Set an object on a Storage object. */
Storage.prototype.setObject = function(key, value){
	this.setItem(key, JSON.stringify(value));
}

/* Get an object from a Storage object. */
Storage.prototype.getObject = function(key){
	var item = this.getItem(key);

	return JSON.parse(item);
}

/* Creates a new cache object. */
function LastFMCache(){
	/* Expiration times. */
	var MINUTE =          60;
	var HOUR   = MINUTE * 60;
	var DAY    = HOUR   * 24;
	var WEEK   = DAY    *  7;
	var MONTH  = WEEK   *  4.34812141;
	var YEAR   = MONTH  * 12;

	/* Methods with weekly expiration. */
	var weeklyMethods = [
		'artist.getSimilar',
		'tag.getSimilar',
		'track.getSimilar',
		'artist.getTopAlbums',
		'artist.getTopTracks',
		'geo.getTopArtists',
		'geo.getTopTracks',
		'tag.getTopAlbums',
		'tag.getTopArtists',
		'tag.getTopTags',
		'tag.getTopTracks',
		'user.getTopAlbums',
		'user.getTopArtists',
		'user.getTopTags',
		'user.getTopTracks'
	];

	/* Name for this cache. */
	var name = 'lastfm';

	/* Create cache if it doesn't exist yet. */
	if(localStorage.getObject(name) == null){
		localStorage.setObject(name, {});
	}

	/* Get expiration time for given parameters. */
	this.getExpirationTime = function(params){
		var method = params.method;

		if((/Weekly/).test(method) && !(/List/).test(method)){
			if(typeof(params.to) != 'undefined' && typeof(params.from) != 'undefined'){
				return YEAR;
			}
			else{
				return WEEK;
			}
		}

		for(var key in this.weeklyMethods){
			if(method == this.weeklyMethods[key]){
				return WEEK;
			}
		}

		return -1;
	};

	/* Check if this cache contains specific data. */
	this.contains = function(hash){
		return typeof(localStorage.getObject(name)[hash]) != 'undefined' &&
			typeof(localStorage.getObject(name)[hash].data) != 'undefined';
	};

	/* Load data from this cache. */
	this.load = function(hash){
		return localStorage.getObject(name)[hash].data;
	};

	/* Remove data from this cache. */
	this.remove = function(hash){
		var object = localStorage.getObject(name);

		object[hash] = undefined;

		localStorage.setObject(name, object);
	};

	/* Store data in this cache with a given expiration time. */
	this.store = function(hash, data, expiration){
		var object = localStorage.getObject(name);
		var time   = Math.round(new Date().getTime() / 1000);

		object[hash] = {
			data       : data,
			expiration : time + expiration
		};

		localStorage.setObject(name, object);
	};

	/* Check if some specific data expired. */
	this.isExpired = function(hash){
		var object = localStorage.getObject(name);
		var time   = Math.round(new Date().getTime() / 1000);

		if(time > object[hash].expiration){
			return true;
		}

		return false;
	};

	/* Clear this cache. */
	this.clear = function(){
		localStorage.setObject(name, {});
	};
};

module.exports = LastFMCache;

},{}],50:[function(_dereq_,module,exports){
/*
 *
 * Copyright (c) 2008-2010, Felix Bruns <felixbruns@web.de>
 *
 */

var crypto = _dereq_('crypto');
var Cache = _dereq_('./cache.js');

function md5(data) {
    return crypto.createHash('md5').update(data).digest('hex');
}

function LastFM(options){
    /* Set default values for required options. */
    var apiKey    = options.apiKey    || '';
    var apiSecret = options.apiSecret || '';
    var apiUrl    = options.apiUrl    || 'http://ws.audioscrobbler.com/2.0/';
    var cache     = options.cache     || undefined;

    /* Set API key. */
    this.setApiKey = function(_apiKey){
        apiKey = _apiKey;
    };

    /* Set API key. */
    this.setApiSecret = function(_apiSecret){
        apiSecret = _apiSecret;
    };

    /* Set API URL. */
    this.setApiUrl = function(_apiUrl){
        apiUrl = _apiUrl;
    };

    /* Set cache. */
    this.setCache = function(_cache){
        cache = _cache;
    };

    /* Set the JSONP callback identifier counter. This is used to ensure the callbacks are unique */
    var jsonpCounter = 0;

    /* Internal call (POST, GET). */
    var internalCall = function(params, callbacks, requestMethod){
        /* Cross-domain POST request (doesn't return any data, always successful). */
        if(requestMethod === 'POST'){
            /* Create iframe element to post data. */
            var html   = document.getElementsByTagName('html')[0];
            var iframe = document.createElement('iframe');
            var doc;

            /* Set iframe attributes. */
            iframe.width        = 1;
            iframe.height       = 1;
            iframe.style.border = 'none';
            iframe.onload       = function(){
                /* Remove iframe element. */
                //html.removeChild(iframe);

                /* Call user callback. */
                if(typeof(callbacks.success) !== 'undefined'){
                    callbacks.success();
                }
            };

            /* Append iframe. */
            html.appendChild(iframe);

            /* Get iframe document. */
            if(typeof(iframe.contentWindow) !== 'undefined'){
                doc = iframe.contentWindow.document;
            }
            else if(typeof(iframe.contentDocument.document) !== 'undefined'){
                doc = iframe.contentDocument.document.document;
            }
            else{
                doc = iframe.contentDocument.document;
            }

            /* Open iframe document and write a form. */
            doc.open();
            doc.clear();
            doc.write('<form method="post" action="' + apiUrl + '" id="form">');

            /* Write POST parameters as input fields. */
            var param;
            for(param in params){
                if (params.hasOwnProperty(param)) {
                    doc.write('<input type="text" name="' + param + '" value="' + params[param] + '">');
                }
            }

            /* Write automatic form submission code. */
            doc.write('</form>');
            doc.write('<script type="application/x-javascript">');
            doc.write('document.getElementById("form").submit();');
            doc.write('</script>');

            /* Close iframe document. */
            doc.close();
        }
        /* Cross-domain GET request (JSONP). */
        else{
            /* Get JSONP callback name. */
            var jsonp = 'jsonp' + new Date().getTime() + jsonpCounter;

            /* Update the unique JSONP callback counter */
            jsonpCounter += 1;

            /* Calculate cache hash. */
            var hash = auth.getApiSignature(params);

            /* Check cache. */
            if(typeof(cache) !== 'undefined' && cache.contains(hash) && !cache.isExpired(hash)){
                if(typeof(callbacks.success) !== 'undefined'){
                    callbacks.success(cache.load(hash));
                }

                return;
            }

            /* Set callback name and response format. */
            params.callback = jsonp;
            params.format   = 'json';

            /* Create JSONP callback function. */
            window[jsonp] = function(data){
                /* Is a cache available?. */
                if(typeof(cache) !== 'undefined'){
                    var expiration = cache.getExpirationTime(params);

                    if(expiration > 0){
                        cache.store(hash, data, expiration);
                    }
                }

                /* Call user callback. */
                if(typeof(data.error) !== 'undefined'){
                    if(typeof(callbacks.error) !== 'undefined'){
                        callbacks.error(data.error, data.message);
                    }
                }
                else if(typeof(callbacks.success) !== 'undefined'){
                    callbacks.success(data);
                }

                /* Garbage collect. */
                window[jsonp] = undefined;

                try{
                    delete window[jsonp];
                }
                catch(e){
                    /* Nothing. */
                }

                /* Remove script element. */
                if(head){
                    head.removeChild(script);
                }
            };

            /* Create script element to load JSON data. */
            var head   = document.getElementsByTagName("head")[0];
            var script = document.createElement("script");

            /* Build parameter string. */
            var array = [];

            var param2;
            for(param2 in params){
                if (params.hasOwnProperty(param2)) {
                    array.push(encodeURIComponent(param2) + "=" + encodeURIComponent(params[param2]));
                }
            }

            /* Set script source. */
            script.src = apiUrl + '?' + array.join('&').replace(/%20/g, '+');

            /* Append script element. */
            head.appendChild(script);
        }
    };

    /* Normal method call. */
    var call = function(method, params, callbacks, requestMethod){
        /* Set default values. */
        params        = params        || {};
        callbacks     = callbacks     || {};
        requestMethod = requestMethod || 'GET';

        /* Add parameters. */
        params.method  = method;
        params.api_key = apiKey;

        /* Call method. */
        internalCall(params, callbacks, requestMethod);
    };

    /* Signed method call. */
    var signedCall = function(method, params, session, callbacks, requestMethod){
        /* Set default values. */
        params        = params        || {};
        callbacks     = callbacks     || {};
        requestMethod = requestMethod || 'GET';

        /* Add parameters. */
        params.method  = method;
        params.api_key = apiKey;

        /* Add session key. */
        if(session && typeof(session.key) !== 'undefined'){
            params.sk = session.key;
        }

        /* Get API signature. */
        params.api_sig = auth.getApiSignature(params);

        /* Call method. */
        internalCall(params, callbacks, requestMethod);
    };

    /* Album methods. */
    this.album = {
        addTags : function(params, session, callbacks){
            /* Build comma separated tags string. */
            if(typeof(params.tags) === 'object'){
                params.tags = params.tags.join(',');
            }

            signedCall('album.addTags', params, session, callbacks, 'POST');
        },

        getBuylinks : function(params, callbacks){
            call('album.getBuylinks', params, callbacks);
        },

        getInfo : function(params, callbacks){
            call('album.getInfo', params, callbacks);
        },

        getTags : function(params, session, callbacks){
            signedCall('album.getTags', params, session, callbacks);
        },

        removeTag : function(params, session, callbacks){
            signedCall('album.removeTag', params, session, callbacks, 'POST');
        },

        search : function(params, callbacks){
            call('album.search', params, callbacks);
        },

        share : function(params, session, callbacks){
            /* Build comma separated recipients string. */
            if(typeof(params.recipient) === 'object'){
                params.recipient = params.recipient.join(',');
            }

            signedCall('album.share', params, callbacks);
        }
    };

    /* Artist methods. */
    this.artist = {
        addTags : function(params, session, callbacks){
            /* Build comma separated tags string. */
            if(typeof(params.tags) === 'object'){
                params.tags = params.tags.join(',');
            }

            signedCall('artist.addTags', params, session, callbacks, 'POST');
        },

        getCorrection : function(params, callbacks){
            call('artist.getCorrection', params, callbacks);
        },

        getEvents : function(params, callbacks){
            call('artist.getEvents', params, callbacks);
        },

        getImages : function(params, callbacks){
            call('artist.getImages', params, callbacks);
        },

        getInfo : function(params, callbacks){
            call('artist.getInfo', params, callbacks);
        },

        getPastEvents : function(params, callbacks){
            call('artist.getPastEvents', params, callbacks);
        },

        getPodcast : function(params, callbacks){
            call('artist.getPodcast', params, callbacks);
        },

        getShouts : function(params, callbacks){
            call('artist.getShouts', params, callbacks);
        },

        getSimilar : function(params, callbacks){
            call('artist.getSimilar', params, callbacks);
        },

        getTags : function(params, session, callbacks){
            signedCall('artist.getTags', params, session, callbacks);
        },

        getTopAlbums : function(params, callbacks){
            call('artist.getTopAlbums', params, callbacks);
        },

        getTopFans : function(params, callbacks){
            call('artist.getTopFans', params, callbacks);
        },

        getTopTags : function(params, callbacks){
            call('artist.getTopTags', params, callbacks);
        },

        getTopTracks : function(params, callbacks){
            call('artist.getTopTracks', params, callbacks);
        },

        removeTag : function(params, session, callbacks){
            signedCall('artist.removeTag', params, session, callbacks, 'POST');
        },

        search : function(params, callbacks){
            call('artist.search', params, callbacks);
        },

        share : function(params, session, callbacks){
            /* Build comma separated recipients string. */
            if(typeof(params.recipient) === 'object'){
                params.recipient = params.recipient.join(',');
            }

            signedCall('artist.share', params, session, callbacks, 'POST');
        },

        shout : function(params, session, callbacks){
            signedCall('artist.shout', params, session, callbacks, 'POST');
        }
    };

    /* Auth methods. */
    this.auth = {
        getMobileSession : function(params, callbacks){
            /* Set new params object with authToken. */
            params = {
                username  : params.username,
                authToken : md5(params.username + md5(params.password))
            };

            signedCall('auth.getMobileSession', params, null, callbacks);
        },

        getSession : function(params, callbacks){
            signedCall('auth.getSession', params, null, callbacks);
        },

        getToken : function(callbacks){
            signedCall('auth.getToken', null, null, callbacks);
        },

        /* Deprecated. Security hole was fixed. */
        getWebSession : function(callbacks){
            /* Save API URL and set new one (needs to be done due to a cookie!). */
            var previuousApiUrl = apiUrl;

            apiUrl = 'http://ext.last.fm/2.0/';

            signedCall('auth.getWebSession', null, null, callbacks);

            /* Restore API URL. */
            apiUrl = previuousApiUrl;
        }
    };

    /* Chart methods. */
    this.chart = {
        getHypedArtists : function(params, session, callbacks){
            call('chart.getHypedArtists', params, callbacks);
        },

        getHypedTracks : function(params, session, callbacks){
            call('chart.getHypedTracks', params, callbacks);
        },

        getLovedTracks : function(params, session, callbacks){
            call('chart.getLovedTracks', params, callbacks);
        },

        getTopArtists : function(params, session, callbacks){
            call('chart.getTopArtists', params, callbacks);
        },

        getTopTags : function(params, session, callbacks){
            call('chart.getTopTags', params, callbacks);
        },

        getTopTracks : function(params, session, callbacks){
            call('chart.getTopTracks', params, callbacks);
        }
    };

    /* Event methods. */
    this.event = {
        attend : function(params, session, callbacks){
            signedCall('event.attend', params, session, callbacks, 'POST');
        },

        getAttendees : function(params, session, callbacks){
            call('event.getAttendees', params, callbacks);
        },

        getInfo : function(params, callbacks){
            call('event.getInfo', params, callbacks);
        },

        getShouts : function(params, callbacks){
            call('event.getShouts', params, callbacks);
        },

        share : function(params, session, callbacks){
            /* Build comma separated recipients string. */
            if(typeof(params.recipient) === 'object'){
                params.recipient = params.recipient.join(',');
            }

            signedCall('event.share', params, session, callbacks, 'POST');
        },

        shout : function(params, session, callbacks){
            signedCall('event.shout', params, session, callbacks, 'POST');
        }
    };

    /* Geo methods. */
    this.geo = {
        getEvents : function(params, callbacks){
            call('geo.getEvents', params, callbacks);
        },

        getMetroArtistChart : function(params, callbacks){
            call('geo.getMetroArtistChart', params, callbacks);
        },

        getMetroHypeArtistChart : function(params, callbacks){
            call('geo.getMetroHypeArtistChart', params, callbacks);
        },

        getMetroHypeTrackChart : function(params, callbacks){
            call('geo.getMetroHypeTrackChart', params, callbacks);
        },

        getMetroTrackChart : function(params, callbacks){
            call('geo.getMetroTrackChart', params, callbacks);
        },

        getMetroUniqueArtistChart : function(params, callbacks){
            call('geo.getMetroUniqueArtistChart', params, callbacks);
        },

        getMetroUniqueTrackChart : function(params, callbacks){
            call('geo.getMetroUniqueTrackChart', params, callbacks);
        },

        getMetroWeeklyChartlist : function(params, callbacks){
            call('geo.getMetroWeeklyChartlist', params, callbacks);
        },

        getMetros : function(params, callbacks){
            call('geo.getMetros', params, callbacks);
        },

        getTopArtists : function(params, callbacks){
            call('geo.getTopArtists', params, callbacks);
        },

        getTopTracks : function(params, callbacks){
            call('geo.getTopTracks', params, callbacks);
        }
    };

    /* Group methods. */
    this.group = {
        getHype : function(params, callbacks){
            call('group.getHype', params, callbacks);
        },

        getMembers : function(params, callbacks){
            call('group.getMembers', params, callbacks);
        },

        getWeeklyAlbumChart : function(params, callbacks){
            call('group.getWeeklyAlbumChart', params, callbacks);
        },

        getWeeklyArtistChart : function(params, callbacks){
            call('group.getWeeklyArtistChart', params, callbacks);
        },

        getWeeklyChartList : function(params, callbacks){
            call('group.getWeeklyChartList', params, callbacks);
        },

        getWeeklyTrackChart : function(params, callbacks){
            call('group.getWeeklyTrackChart', params, callbacks);
        }
    };

    /* Library methods. */
    this.library = {
        addAlbum : function(params, session, callbacks){
            signedCall('library.addAlbum', params, session, callbacks, 'POST');
        },

        addArtist : function(params, session, callbacks){
            signedCall('library.addArtist', params, session, callbacks, 'POST');
        },

        addTrack : function(params, session, callbacks){
            signedCall('library.addTrack', params, session, callbacks, 'POST');
        },

        getAlbums : function(params, callbacks){
            call('library.getAlbums', params, callbacks);
        },

        getArtists : function(params, callbacks){
            call('library.getArtists', params, callbacks);
        },

        getTracks : function(params, callbacks){
            call('library.getTracks', params, callbacks);
        }
    };

    /* Playlist methods. */
    this.playlist = {
        addTrack : function(params, session, callbacks){
            signedCall('playlist.addTrack', params, session, callbacks, 'POST');
        },

        create : function(params, session, callbacks){
            signedCall('playlist.create', params, session, callbacks, 'POST');
        },

        fetch : function(params, callbacks){
            call('playlist.fetch', params, callbacks);
        }
    };

    /* Radio methods. */
    this.radio = {
        getPlaylist : function(params, session, callbacks){
            signedCall('radio.getPlaylist', params, session, callbacks);
        },

        search : function(params, session, callbacks){
            signedCall('radio.search', params, session, callbacks);
        },

        tune : function(params, session, callbacks){
            signedCall('radio.tune', params, session, callbacks);
        }
    };

    /* Tag methods. */
    this.tag = {
        getInfo : function(params, callbacks){
            call('tag.getInfo', params, callbacks);
        },

        getSimilar : function(params, callbacks){
            call('tag.getSimilar', params, callbacks);
        },

        getTopAlbums : function(params, callbacks){
            call('tag.getTopAlbums', params, callbacks);
        },

        getTopArtists : function(params, callbacks){
            call('tag.getTopArtists', params, callbacks);
        },

        getTopTags : function(callbacks){
            call('tag.getTopTags', null, callbacks);
        },

        getTopTracks : function(params, callbacks){
            call('tag.getTopTracks', params, callbacks);
        },

        getWeeklyArtistChart : function(params, callbacks){
            call('tag.getWeeklyArtistChart', params, callbacks);
        },

        getWeeklyChartList : function(params, callbacks){
            call('tag.getWeeklyChartList', params, callbacks);
        },

        search : function(params, callbacks){
            call('tag.search', params, callbacks);
        }
    };

    /* Tasteometer method. */
    this.tasteometer = {
        compare : function(params, callbacks){
            call('tasteometer.compare', params, callbacks);
        },

        compareGroup : function(params, callbacks){
            call('tasteometer.compareGroup', params, callbacks);
        }
    };

    /* Track methods. */
    this.track = {
        addTags : function(params, session, callbacks){
            signedCall('track.addTags', params, session, callbacks, 'POST');
        },

        ban : function(params, session, callbacks){
            signedCall('track.ban', params, session, callbacks, 'POST');
        },

        getBuylinks : function(params, callbacks){
            call('track.getBuylinks', params, callbacks);
        },

        getCorrection : function(params, callbacks){
            call('track.getCorrection', params, callbacks);
        },

        getFingerprintMetadata : function(params, callbacks){
            call('track.getFingerprintMetadata', params, callbacks);
        },

        getInfo : function(params, callbacks){
            call('track.getInfo', params, callbacks);
        },

        getShouts : function(params, callbacks){
            call('track.getShouts', params, callbacks);
        },

        getSimilar : function(params, callbacks){
            call('track.getSimilar', params, callbacks);
        },

        getTags : function(params, session, callbacks){
            signedCall('track.getTags', params, session, callbacks);
        },

        getTopFans : function(params, callbacks){
            call('track.getTopFans', params, callbacks);
        },

        getTopTags : function(params, callbacks){
            call('track.getTopTags', params, callbacks);
        },

        love : function(params, session, callbacks){
            signedCall('track.love', params, session, callbacks, 'POST');
        },

        removeTag : function(params, session, callbacks){
            signedCall('track.removeTag', params, session, callbacks, 'POST');
        },

        scrobble : function(params, session, callbacks){
            /* Flatten an array of multiple tracks into an object with "array notation". */
            if(params.constructor.toString().indexOf("Array") !== -1){
                var p = {};
                var i;
                var j;

                for(i in params){
                    if (params.hasOwnProperty(i)) {
                        for(j in params[i]){
                            if (params[i].hasOwnProperty(j)) {
                                p[j + '[' + i + ']'] = params[i][j];
                            }
                        }
                    }
                }

                params = p;
            }

            signedCall('track.scrobble', params, session, callbacks, 'POST');
        },

        search : function(params, callbacks){
            call('track.search', params, callbacks);
        },

        share : function(params, session, callbacks){
            /* Build comma separated recipients string. */
            if(typeof(params.recipient) === 'object'){
                params.recipient = params.recipient.join(',');
            }

            signedCall('track.share', params, session, callbacks, 'POST');
        },

        unban : function(params, session, callbacks){
            signedCall('track.unban', params, session, callbacks, 'POST');
        },

        unlove : function(params, session, callbacks){
            signedCall('track.unlove', params, session, callbacks, 'POST');
        },

        updateNowPlaying : function(params, session, callbacks){
            signedCall('track.updateNowPlaying', params, session, callbacks, 'POST');
        }
    };

    /* User methods. */
    this.user = {
        getArtistTracks : function(params, callbacks){
            call('user.getArtistTracks', params, callbacks);
        },

        getBannedTracks : function(params, callbacks){
            call('user.getBannedTracks', params, callbacks);
        },

        getEvents : function(params, callbacks){
            call('user.getEvents', params, callbacks);
        },

        getFriends : function(params, callbacks){
            call('user.getFriends', params, callbacks);
        },

        getInfo : function(params, callbacks){
            call('user.getInfo', params, callbacks);
        },

        getLovedTracks : function(params, callbacks){
            call('user.getLovedTracks', params, callbacks);
        },

        getNeighbours : function(params, callbacks){
            call('user.getNeighbours', params, callbacks);
        },

        getNewReleases : function(params, callbacks){
            call('user.getNewReleases', params, callbacks);
        },

        getPastEvents : function(params, callbacks){
            call('user.getPastEvents', params, callbacks);
        },

        getPersonalTracks : function(params, callbacks){
            call('user.getPersonalTracks', params, callbacks);
        },

        getPlaylists : function(params, callbacks){
            call('user.getPlaylists', params, callbacks);
        },

        getRecentStations : function(params, session, callbacks){
            signedCall('user.getRecentStations', params, session, callbacks);
        },

        getRecentTracks : function(params, callbacks){
            call('user.getRecentTracks', params, callbacks);
        },

        getRecommendedArtists : function(params, session, callbacks){
            signedCall('user.getRecommendedArtists', params, session, callbacks);
        },

        getRecommendedEvents : function(params, session, callbacks){
            signedCall('user.getRecommendedEvents', params, session, callbacks);
        },

        getShouts : function(params, callbacks){
            call('user.getShouts', params, callbacks);
        },

        getTopAlbums : function(params, callbacks){
            call('user.getTopAlbums', params, callbacks);
        },

        getTopArtists : function(params, callbacks){
            call('user.getTopArtists', params, callbacks);
        },

        getTopTags : function(params, callbacks){
            call('user.getTopTags', params, callbacks);
        },

        getTopTracks : function(params, callbacks){
            call('user.getTopTracks', params, callbacks);
        },

        getWeeklyAlbumChart : function(params, callbacks){
            call('user.getWeeklyAlbumChart', params, callbacks);
        },

        getWeeklyArtistChart : function(params, callbacks){
            call('user.getWeeklyArtistChart', params, callbacks);
        },

        getWeeklyChartList : function(params, callbacks){
            call('user.getWeeklyChartList', params, callbacks);
        },

        getWeeklyTrackChart : function(params, callbacks){
            call('user.getWeeklyTrackChart', params, callbacks);
        },

        shout : function(params, session, callbacks){
            signedCall('user.shout', params, session, callbacks, 'POST');
        }
    };

    /* Venue methods. */
    this.venue = {
        getEvents : function(params, callbacks){
            call('venue.getEvents', params, callbacks);
        },

        getPastEvents : function(params, callbacks){
            call('venue.getPastEvents', params, callbacks);
        },

        search : function(params, callbacks){
            call('venue.search', params, callbacks);
        }
    };

    /* Private auth methods. */
    var auth = {
        getApiSignature : function(params){
            var keys   = [];
            var string = '';
            var key;
            var index;

            for(key in params){
                if (params.hasOwnProperty(key)) {
                    keys.push(key);
                }
            }

            keys.sort();

            for(index in keys){
                if (keys.hasOwnProperty(index)) {
                    key = keys[index];

                    string += key + params[key];
                }
            }

            string += apiSecret;

            /* Needs lastfm.api.md5.js. */
            return md5(string);
        }
    };
}

LastFM.Cache = Cache;

module.exports = LastFM;

},{"./cache.js":49,"crypto":55}],51:[function(_dereq_,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = _dereq_('base64-js')
var ieee754 = _dereq_('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

/**
 * If `Buffer._useTypedArrays`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (compatible down to IE6)
 */
Buffer._useTypedArrays = (function () {
  // Detect if browser supports Typed Arrays. Supported browsers are IE 10+, Firefox 4+,
  // Chrome 7+, Safari 5.1+, Opera 11.6+, iOS 4.2+. If the browser does not support adding
  // properties to `Uint8Array` instances, then that's the same as no `Uint8Array` support
  // because we need to be able to add all the node Buffer API methods. This is an issue
  // in Firefox 4-29. Now fixed: https://bugzilla.mozilla.org/show_bug.cgi?id=695438
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() &&
        typeof arr.subarray === 'function' // Chrome 9-10 lack `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Workaround: node's base64 implementation allows for non-padded strings
  // while base64-js does not.
  if (encoding === 'base64' && type === 'string') {
    subject = stringtrim(subject)
    while (subject.length % 4 !== 0) {
      subject = subject + '='
    }
  }

  // Find the length
  var length
  if (type === 'number')
    length = coerce(subject)
  else if (type === 'string')
    length = Buffer.byteLength(subject, encoding)
  else if (type === 'object')
    length = coerce(subject.length) // assume that object is array-like
  else
    throw new Error('First argument needs to be a number, array or string.')

  var buf
  if (Buffer._useTypedArrays) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer._useTypedArrays && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    for (i = 0; i < length; i++) {
      if (Buffer.isBuffer(subject))
        buf[i] = subject.readUInt8(i)
      else
        buf[i] = subject[i]
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer._useTypedArrays && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.isBuffer = function (b) {
  return !!(b !== null && b !== undefined && b._isBuffer)
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'hex':
      ret = str.length / 2
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.concat = function (list, totalLength) {
  assert(isArray(list), 'Usage: Buffer.concat(list, [totalLength])\n' +
      'list should be an Array.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (typeof totalLength !== 'number') {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

// BUFFER INSTANCE METHODS
// =======================

function _hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  assert(strLen % 2 === 0, 'Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    assert(!isNaN(byte), 'Invalid hex string')
    buf[offset + i] = byte
  }
  Buffer._charsWritten = i * 2
  return i
}

function _utf8Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function _asciiWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function _binaryWrite (buf, string, offset, length) {
  return _asciiWrite(buf, string, offset, length)
}

function _base64Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function _utf16leWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf16leToBytes(string), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = _asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = _binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = _base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leWrite(this, string, offset, length)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toString = function (encoding, start, end) {
  var self = this

  encoding = String(encoding || 'utf8').toLowerCase()
  start = Number(start) || 0
  end = (end !== undefined)
    ? Number(end)
    : end = self.length

  // Fastpath empty strings
  if (end === start)
    return ''

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexSlice(self, start, end)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Slice(self, start, end)
      break
    case 'ascii':
      ret = _asciiSlice(self, start, end)
      break
    case 'binary':
      ret = _binarySlice(self, start, end)
      break
    case 'base64':
      ret = _base64Slice(self, start, end)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leSlice(self, start, end)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  assert(end >= start, 'sourceEnd < sourceStart')
  assert(target_start >= 0 && target_start < target.length,
      'targetStart out of bounds')
  assert(start >= 0 && start < source.length, 'sourceStart out of bounds')
  assert(end >= 0 && end <= source.length, 'sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 100 || !Buffer._useTypedArrays) {
    for (var i = 0; i < len; i++)
      target[i + target_start] = this[i + start]
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

function _base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function _utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function _asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++)
    ret += String.fromCharCode(buf[i])
  return ret
}

function _binarySlice (buf, start, end) {
  return _asciiSlice(buf, start, end)
}

function _hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function _utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i+1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = clamp(start, len, 0)
  end = clamp(end, len, len)

  if (Buffer._useTypedArrays) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  return this[offset]
}

function _readUInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    val = buf[offset]
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
  } else {
    val = buf[offset] << 8
    if (offset + 1 < len)
      val |= buf[offset + 1]
  }
  return val
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  return _readUInt16(this, offset, true, noAssert)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  return _readUInt16(this, offset, false, noAssert)
}

function _readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    if (offset + 2 < len)
      val = buf[offset + 2] << 16
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
    val |= buf[offset]
    if (offset + 3 < len)
      val = val + (buf[offset + 3] << 24 >>> 0)
  } else {
    if (offset + 1 < len)
      val = buf[offset + 1] << 16
    if (offset + 2 < len)
      val |= buf[offset + 2] << 8
    if (offset + 3 < len)
      val |= buf[offset + 3]
    val = val + (buf[offset] << 24 >>> 0)
  }
  return val
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  return _readUInt32(this, offset, true, noAssert)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  return _readUInt32(this, offset, false, noAssert)
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  var neg = this[offset] & 0x80
  if (neg)
    return (0xff - this[offset] + 1) * -1
  else
    return this[offset]
}

function _readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt16(buf, offset, littleEndian, true)
  var neg = val & 0x8000
  if (neg)
    return (0xffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  return _readInt16(this, offset, true, noAssert)
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  return _readInt16(this, offset, false, noAssert)
}

function _readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt32(buf, offset, littleEndian, true)
  var neg = val & 0x80000000
  if (neg)
    return (0xffffffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  return _readInt32(this, offset, true, noAssert)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  return _readInt32(this, offset, false, noAssert)
}

function _readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 23, 4)
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  return _readFloat(this, offset, true, noAssert)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  return _readFloat(this, offset, false, noAssert)
}

function _readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 52, 8)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  return _readDouble(this, offset, true, noAssert)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  return _readDouble(this, offset, false, noAssert)
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'trying to write beyond buffer length')
    verifuint(value, 0xff)
  }

  if (offset >= this.length) return

  this[offset] = value
}

function _writeUInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
    buf[offset + i] =
        (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
            (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, false, noAssert)
}

function _writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 4); i < j; i++) {
    buf[offset + i] =
        (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, false, noAssert)
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= this.length)
    return

  if (value >= 0)
    this.writeUInt8(value, offset, noAssert)
  else
    this.writeUInt8(0xff + value + 1, offset, noAssert)
}

function _writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt16(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, false, noAssert)
}

function _writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt32(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, false, noAssert)
}

function _writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 23, 4)
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, false, noAssert)
}

function _writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 52, 8)
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (typeof value === 'string') {
    value = value.charCodeAt(0)
  }

  assert(typeof value === 'number' && !isNaN(value), 'value is not a number')
  assert(end >= start, 'end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  assert(start >= 0 && start < this.length, 'start out of bounds')
  assert(end >= 0 && end <= this.length, 'end out of bounds')

  for (var i = start; i < end; i++) {
    this[i] = value
  }
}

Buffer.prototype.inspect = function () {
  var out = []
  var len = this.length
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i])
    if (i === exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...'
      break
    }
  }
  return '<Buffer ' + out.join(' ') + '>'
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer._useTypedArrays) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1)
        buf[i] = this[i]
      return buf.buffer
    }
  } else {
    throw new Error('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

// slice(start, end)
function clamp (index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len
  if (index >= 0) return index
  index += len
  if (index >= 0) return index
  return 0
}

function coerce (length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length)
  return length < 0 ? 0 : length
}

function isArray (subject) {
  return (Array.isArray || function (subject) {
    return Object.prototype.toString.call(subject) === '[object Array]'
  })(subject)
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F)
      byteArray.push(str.charCodeAt(i))
    else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16))
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  var pos
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

/*
 * We have to make sure that the value is a valid integer. This means that it
 * is non-negative. It has no fractional component and that it does not
 * exceed the maximum allowed value.
 */
function verifuint (value, max) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value >= 0, 'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifsint (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754 (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

},{"base64-js":52,"ieee754":53}],52:[function(_dereq_,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS)
			return 62 // '+'
		if (code === SLASH)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],53:[function(_dereq_,module,exports){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],54:[function(_dereq_,module,exports){
var Buffer = _dereq_('buffer').Buffer;
var intSize = 4;
var zeroBuffer = new Buffer(intSize); zeroBuffer.fill(0);
var chrsz = 8;

function toArray(buf, bigEndian) {
  if ((buf.length % intSize) !== 0) {
    var len = buf.length + (intSize - (buf.length % intSize));
    buf = Buffer.concat([buf, zeroBuffer], len);
  }

  var arr = [];
  var fn = bigEndian ? buf.readInt32BE : buf.readInt32LE;
  for (var i = 0; i < buf.length; i += intSize) {
    arr.push(fn.call(buf, i));
  }
  return arr;
}

function toBuffer(arr, size, bigEndian) {
  var buf = new Buffer(size);
  var fn = bigEndian ? buf.writeInt32BE : buf.writeInt32LE;
  for (var i = 0; i < arr.length; i++) {
    fn.call(buf, arr[i], i * 4, true);
  }
  return buf;
}

function hash(buf, fn, hashSize, bigEndian) {
  if (!Buffer.isBuffer(buf)) buf = new Buffer(buf);
  var arr = fn(toArray(buf, bigEndian), buf.length * chrsz);
  return toBuffer(arr, hashSize, bigEndian);
}

module.exports = { hash: hash };

},{"buffer":51}],55:[function(_dereq_,module,exports){
var Buffer = _dereq_('buffer').Buffer
var sha = _dereq_('./sha')
var sha256 = _dereq_('./sha256')
var rng = _dereq_('./rng')
var md5 = _dereq_('./md5')

var algorithms = {
  sha1: sha,
  sha256: sha256,
  md5: md5
}

var blocksize = 64
var zeroBuffer = new Buffer(blocksize); zeroBuffer.fill(0)
function hmac(fn, key, data) {
  if(!Buffer.isBuffer(key)) key = new Buffer(key)
  if(!Buffer.isBuffer(data)) data = new Buffer(data)

  if(key.length > blocksize) {
    key = fn(key)
  } else if(key.length < blocksize) {
    key = Buffer.concat([key, zeroBuffer], blocksize)
  }

  var ipad = new Buffer(blocksize), opad = new Buffer(blocksize)
  for(var i = 0; i < blocksize; i++) {
    ipad[i] = key[i] ^ 0x36
    opad[i] = key[i] ^ 0x5C
  }

  var hash = fn(Buffer.concat([ipad, data]))
  return fn(Buffer.concat([opad, hash]))
}

function hash(alg, key) {
  alg = alg || 'sha1'
  var fn = algorithms[alg]
  var bufs = []
  var length = 0
  if(!fn) error('algorithm:', alg, 'is not yet supported')
  return {
    update: function (data) {
      if(!Buffer.isBuffer(data)) data = new Buffer(data)
        
      bufs.push(data)
      length += data.length
      return this
    },
    digest: function (enc) {
      var buf = Buffer.concat(bufs)
      var r = key ? hmac(fn, key, buf) : fn(buf)
      bufs = null
      return enc ? r.toString(enc) : r
    }
  }
}

function error () {
  var m = [].slice.call(arguments).join(' ')
  throw new Error([
    m,
    'we accept pull requests',
    'http://github.com/dominictarr/crypto-browserify'
    ].join('\n'))
}

exports.createHash = function (alg) { return hash(alg) }
exports.createHmac = function (alg, key) { return hash(alg, key) }
exports.randomBytes = function(size, callback) {
  if (callback && callback.call) {
    try {
      callback.call(this, undefined, new Buffer(rng(size)))
    } catch (err) { callback(err) }
  } else {
    return new Buffer(rng(size))
  }
}

function each(a, f) {
  for(var i in a)
    f(a[i], i)
}

// the least I can do is make error messages for the rest of the node.js/crypto api.
each(['createCredentials'
, 'createCipher'
, 'createCipheriv'
, 'createDecipher'
, 'createDecipheriv'
, 'createSign'
, 'createVerify'
, 'createDiffieHellman'
, 'pbkdf2'], function (name) {
  exports[name] = function () {
    error('sorry,', name, 'is not implemented yet')
  }
})

},{"./md5":56,"./rng":57,"./sha":58,"./sha256":59,"buffer":51}],56:[function(_dereq_,module,exports){
/*
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.1 Copyright (C) Paul Johnston 1999 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */

var helpers = _dereq_('./helpers');

/*
 * Perform a simple self-test to see if the VM is working
 */
function md5_vm_test()
{
  return hex_md5("abc") == "900150983cd24fb0d6963f7d28e17f72";
}

/*
 * Calculate the MD5 of an array of little-endian words, and a bit length
 */
function core_md5(x, len)
{
  /* append padding */
  x[len >> 5] |= 0x80 << ((len) % 32);
  x[(((len + 64) >>> 9) << 4) + 14] = len;

  var a =  1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d =  271733878;

  for(var i = 0; i < x.length; i += 16)
  {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;

    a = md5_ff(a, b, c, d, x[i+ 0], 7 , -680876936);
    d = md5_ff(d, a, b, c, x[i+ 1], 12, -389564586);
    c = md5_ff(c, d, a, b, x[i+ 2], 17,  606105819);
    b = md5_ff(b, c, d, a, x[i+ 3], 22, -1044525330);
    a = md5_ff(a, b, c, d, x[i+ 4], 7 , -176418897);
    d = md5_ff(d, a, b, c, x[i+ 5], 12,  1200080426);
    c = md5_ff(c, d, a, b, x[i+ 6], 17, -1473231341);
    b = md5_ff(b, c, d, a, x[i+ 7], 22, -45705983);
    a = md5_ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
    d = md5_ff(d, a, b, c, x[i+ 9], 12, -1958414417);
    c = md5_ff(c, d, a, b, x[i+10], 17, -42063);
    b = md5_ff(b, c, d, a, x[i+11], 22, -1990404162);
    a = md5_ff(a, b, c, d, x[i+12], 7 ,  1804603682);
    d = md5_ff(d, a, b, c, x[i+13], 12, -40341101);
    c = md5_ff(c, d, a, b, x[i+14], 17, -1502002290);
    b = md5_ff(b, c, d, a, x[i+15], 22,  1236535329);

    a = md5_gg(a, b, c, d, x[i+ 1], 5 , -165796510);
    d = md5_gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
    c = md5_gg(c, d, a, b, x[i+11], 14,  643717713);
    b = md5_gg(b, c, d, a, x[i+ 0], 20, -373897302);
    a = md5_gg(a, b, c, d, x[i+ 5], 5 , -701558691);
    d = md5_gg(d, a, b, c, x[i+10], 9 ,  38016083);
    c = md5_gg(c, d, a, b, x[i+15], 14, -660478335);
    b = md5_gg(b, c, d, a, x[i+ 4], 20, -405537848);
    a = md5_gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
    d = md5_gg(d, a, b, c, x[i+14], 9 , -1019803690);
    c = md5_gg(c, d, a, b, x[i+ 3], 14, -187363961);
    b = md5_gg(b, c, d, a, x[i+ 8], 20,  1163531501);
    a = md5_gg(a, b, c, d, x[i+13], 5 , -1444681467);
    d = md5_gg(d, a, b, c, x[i+ 2], 9 , -51403784);
    c = md5_gg(c, d, a, b, x[i+ 7], 14,  1735328473);
    b = md5_gg(b, c, d, a, x[i+12], 20, -1926607734);

    a = md5_hh(a, b, c, d, x[i+ 5], 4 , -378558);
    d = md5_hh(d, a, b, c, x[i+ 8], 11, -2022574463);
    c = md5_hh(c, d, a, b, x[i+11], 16,  1839030562);
    b = md5_hh(b, c, d, a, x[i+14], 23, -35309556);
    a = md5_hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
    d = md5_hh(d, a, b, c, x[i+ 4], 11,  1272893353);
    c = md5_hh(c, d, a, b, x[i+ 7], 16, -155497632);
    b = md5_hh(b, c, d, a, x[i+10], 23, -1094730640);
    a = md5_hh(a, b, c, d, x[i+13], 4 ,  681279174);
    d = md5_hh(d, a, b, c, x[i+ 0], 11, -358537222);
    c = md5_hh(c, d, a, b, x[i+ 3], 16, -722521979);
    b = md5_hh(b, c, d, a, x[i+ 6], 23,  76029189);
    a = md5_hh(a, b, c, d, x[i+ 9], 4 , -640364487);
    d = md5_hh(d, a, b, c, x[i+12], 11, -421815835);
    c = md5_hh(c, d, a, b, x[i+15], 16,  530742520);
    b = md5_hh(b, c, d, a, x[i+ 2], 23, -995338651);

    a = md5_ii(a, b, c, d, x[i+ 0], 6 , -198630844);
    d = md5_ii(d, a, b, c, x[i+ 7], 10,  1126891415);
    c = md5_ii(c, d, a, b, x[i+14], 15, -1416354905);
    b = md5_ii(b, c, d, a, x[i+ 5], 21, -57434055);
    a = md5_ii(a, b, c, d, x[i+12], 6 ,  1700485571);
    d = md5_ii(d, a, b, c, x[i+ 3], 10, -1894986606);
    c = md5_ii(c, d, a, b, x[i+10], 15, -1051523);
    b = md5_ii(b, c, d, a, x[i+ 1], 21, -2054922799);
    a = md5_ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
    d = md5_ii(d, a, b, c, x[i+15], 10, -30611744);
    c = md5_ii(c, d, a, b, x[i+ 6], 15, -1560198380);
    b = md5_ii(b, c, d, a, x[i+13], 21,  1309151649);
    a = md5_ii(a, b, c, d, x[i+ 4], 6 , -145523070);
    d = md5_ii(d, a, b, c, x[i+11], 10, -1120210379);
    c = md5_ii(c, d, a, b, x[i+ 2], 15,  718787259);
    b = md5_ii(b, c, d, a, x[i+ 9], 21, -343485551);

    a = safe_add(a, olda);
    b = safe_add(b, oldb);
    c = safe_add(c, oldc);
    d = safe_add(d, oldd);
  }
  return Array(a, b, c, d);

}

/*
 * These functions implement the four basic operations the algorithm uses.
 */
function md5_cmn(q, a, b, x, s, t)
{
  return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s),b);
}
function md5_ff(a, b, c, d, x, s, t)
{
  return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
}
function md5_gg(a, b, c, d, x, s, t)
{
  return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
}
function md5_hh(a, b, c, d, x, s, t)
{
  return md5_cmn(b ^ c ^ d, a, b, x, s, t);
}
function md5_ii(a, b, c, d, x, s, t)
{
  return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safe_add(x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function bit_rol(num, cnt)
{
  return (num << cnt) | (num >>> (32 - cnt));
}

module.exports = function md5(buf) {
  return helpers.hash(buf, core_md5, 16);
};

},{"./helpers":54}],57:[function(_dereq_,module,exports){
// Original code adapted from Robert Kieffer.
// details at https://github.com/broofa/node-uuid
(function() {
  var _global = this;

  var mathRNG, whatwgRNG;

  // NOTE: Math.random() does not guarantee "cryptographic quality"
  mathRNG = function(size) {
    var bytes = new Array(size);
    var r;

    for (var i = 0, r; i < size; i++) {
      if ((i & 0x03) == 0) r = Math.random() * 0x100000000;
      bytes[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return bytes;
  }

  if (_global.crypto && crypto.getRandomValues) {
    whatwgRNG = function(size) {
      var bytes = new Uint8Array(size);
      crypto.getRandomValues(bytes);
      return bytes;
    }
  }

  module.exports = whatwgRNG || mathRNG;

}())

},{}],58:[function(_dereq_,module,exports){
/*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
 * in FIPS PUB 180-1
 * Version 2.1a Copyright Paul Johnston 2000 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for details.
 */

var helpers = _dereq_('./helpers');

/*
 * Calculate the SHA-1 of an array of big-endian words, and a bit length
 */
function core_sha1(x, len)
{
  /* append padding */
  x[len >> 5] |= 0x80 << (24 - len % 32);
  x[((len + 64 >> 9) << 4) + 15] = len;

  var w = Array(80);
  var a =  1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d =  271733878;
  var e = -1009589776;

  for(var i = 0; i < x.length; i += 16)
  {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;
    var olde = e;

    for(var j = 0; j < 80; j++)
    {
      if(j < 16) w[j] = x[i + j];
      else w[j] = rol(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1);
      var t = safe_add(safe_add(rol(a, 5), sha1_ft(j, b, c, d)),
                       safe_add(safe_add(e, w[j]), sha1_kt(j)));
      e = d;
      d = c;
      c = rol(b, 30);
      b = a;
      a = t;
    }

    a = safe_add(a, olda);
    b = safe_add(b, oldb);
    c = safe_add(c, oldc);
    d = safe_add(d, oldd);
    e = safe_add(e, olde);
  }
  return Array(a, b, c, d, e);

}

/*
 * Perform the appropriate triplet combination function for the current
 * iteration
 */
function sha1_ft(t, b, c, d)
{
  if(t < 20) return (b & c) | ((~b) & d);
  if(t < 40) return b ^ c ^ d;
  if(t < 60) return (b & c) | (b & d) | (c & d);
  return b ^ c ^ d;
}

/*
 * Determine the appropriate additive constant for the current iteration
 */
function sha1_kt(t)
{
  return (t < 20) ?  1518500249 : (t < 40) ?  1859775393 :
         (t < 60) ? -1894007588 : -899497514;
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safe_add(x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function rol(num, cnt)
{
  return (num << cnt) | (num >>> (32 - cnt));
}

module.exports = function sha1(buf) {
  return helpers.hash(buf, core_sha1, 20, true);
};

},{"./helpers":54}],59:[function(_dereq_,module,exports){

/**
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
 * in FIPS 180-2
 * Version 2.2-beta Copyright Angel Marin, Paul Johnston 2000 - 2009.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 *
 */

var helpers = _dereq_('./helpers');

var safe_add = function(x, y) {
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
};

var S = function(X, n) {
  return (X >>> n) | (X << (32 - n));
};

var R = function(X, n) {
  return (X >>> n);
};

var Ch = function(x, y, z) {
  return ((x & y) ^ ((~x) & z));
};

var Maj = function(x, y, z) {
  return ((x & y) ^ (x & z) ^ (y & z));
};

var Sigma0256 = function(x) {
  return (S(x, 2) ^ S(x, 13) ^ S(x, 22));
};

var Sigma1256 = function(x) {
  return (S(x, 6) ^ S(x, 11) ^ S(x, 25));
};

var Gamma0256 = function(x) {
  return (S(x, 7) ^ S(x, 18) ^ R(x, 3));
};

var Gamma1256 = function(x) {
  return (S(x, 17) ^ S(x, 19) ^ R(x, 10));
};

var core_sha256 = function(m, l) {
  var K = new Array(0x428A2F98,0x71374491,0xB5C0FBCF,0xE9B5DBA5,0x3956C25B,0x59F111F1,0x923F82A4,0xAB1C5ED5,0xD807AA98,0x12835B01,0x243185BE,0x550C7DC3,0x72BE5D74,0x80DEB1FE,0x9BDC06A7,0xC19BF174,0xE49B69C1,0xEFBE4786,0xFC19DC6,0x240CA1CC,0x2DE92C6F,0x4A7484AA,0x5CB0A9DC,0x76F988DA,0x983E5152,0xA831C66D,0xB00327C8,0xBF597FC7,0xC6E00BF3,0xD5A79147,0x6CA6351,0x14292967,0x27B70A85,0x2E1B2138,0x4D2C6DFC,0x53380D13,0x650A7354,0x766A0ABB,0x81C2C92E,0x92722C85,0xA2BFE8A1,0xA81A664B,0xC24B8B70,0xC76C51A3,0xD192E819,0xD6990624,0xF40E3585,0x106AA070,0x19A4C116,0x1E376C08,0x2748774C,0x34B0BCB5,0x391C0CB3,0x4ED8AA4A,0x5B9CCA4F,0x682E6FF3,0x748F82EE,0x78A5636F,0x84C87814,0x8CC70208,0x90BEFFFA,0xA4506CEB,0xBEF9A3F7,0xC67178F2);
  var HASH = new Array(0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A, 0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19);
    var W = new Array(64);
    var a, b, c, d, e, f, g, h, i, j;
    var T1, T2;
  /* append padding */
  m[l >> 5] |= 0x80 << (24 - l % 32);
  m[((l + 64 >> 9) << 4) + 15] = l;
  for (var i = 0; i < m.length; i += 16) {
    a = HASH[0]; b = HASH[1]; c = HASH[2]; d = HASH[3]; e = HASH[4]; f = HASH[5]; g = HASH[6]; h = HASH[7];
    for (var j = 0; j < 64; j++) {
      if (j < 16) {
        W[j] = m[j + i];
      } else {
        W[j] = safe_add(safe_add(safe_add(Gamma1256(W[j - 2]), W[j - 7]), Gamma0256(W[j - 15])), W[j - 16]);
      }
      T1 = safe_add(safe_add(safe_add(safe_add(h, Sigma1256(e)), Ch(e, f, g)), K[j]), W[j]);
      T2 = safe_add(Sigma0256(a), Maj(a, b, c));
      h = g; g = f; f = e; e = safe_add(d, T1); d = c; c = b; b = a; a = safe_add(T1, T2);
    }
    HASH[0] = safe_add(a, HASH[0]); HASH[1] = safe_add(b, HASH[1]); HASH[2] = safe_add(c, HASH[2]); HASH[3] = safe_add(d, HASH[3]);
    HASH[4] = safe_add(e, HASH[4]); HASH[5] = safe_add(f, HASH[5]); HASH[6] = safe_add(g, HASH[6]); HASH[7] = safe_add(h, HASH[7]);
  }
  return HASH;
};

module.exports = function sha256(buf) {
  return helpers.hash(buf, core_sha256, 32, true);
};

},{"./helpers":54}],60:[function(_dereq_,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],61:[function(_dereq_,module,exports){
"use strict";
/*globals Handlebars: true */
var base = _dereq_("./handlebars/base");

// Each of these augment the Handlebars object. No need to setup here.
// (This is done to easily share code between commonjs and browse envs)
var SafeString = _dereq_("./handlebars/safe-string")["default"];
var Exception = _dereq_("./handlebars/exception")["default"];
var Utils = _dereq_("./handlebars/utils");
var runtime = _dereq_("./handlebars/runtime");

// For compatibility and usage outside of module systems, make the Handlebars object a namespace
var create = function() {
  var hb = new base.HandlebarsEnvironment();

  Utils.extend(hb, base);
  hb.SafeString = SafeString;
  hb.Exception = Exception;
  hb.Utils = Utils;

  hb.VM = runtime;
  hb.template = function(spec) {
    return runtime.template(spec, hb);
  };

  return hb;
};

var Handlebars = create();
Handlebars.create = create;

exports["default"] = Handlebars;
},{"./handlebars/base":62,"./handlebars/exception":63,"./handlebars/runtime":64,"./handlebars/safe-string":65,"./handlebars/utils":66}],62:[function(_dereq_,module,exports){
"use strict";
var Utils = _dereq_("./utils");
var Exception = _dereq_("./exception")["default"];

var VERSION = "1.3.0";
exports.VERSION = VERSION;var COMPILER_REVISION = 4;
exports.COMPILER_REVISION = COMPILER_REVISION;
var REVISION_CHANGES = {
  1: '<= 1.0.rc.2', // 1.0.rc.2 is actually rev2 but doesn't report it
  2: '== 1.0.0-rc.3',
  3: '== 1.0.0-rc.4',
  4: '>= 1.0.0'
};
exports.REVISION_CHANGES = REVISION_CHANGES;
var isArray = Utils.isArray,
    isFunction = Utils.isFunction,
    toString = Utils.toString,
    objectType = '[object Object]';

function HandlebarsEnvironment(helpers, partials) {
  this.helpers = helpers || {};
  this.partials = partials || {};

  registerDefaultHelpers(this);
}

exports.HandlebarsEnvironment = HandlebarsEnvironment;HandlebarsEnvironment.prototype = {
  constructor: HandlebarsEnvironment,

  logger: logger,
  log: log,

  registerHelper: function(name, fn, inverse) {
    if (toString.call(name) === objectType) {
      if (inverse || fn) { throw new Exception('Arg not supported with multiple helpers'); }
      Utils.extend(this.helpers, name);
    } else {
      if (inverse) { fn.not = inverse; }
      this.helpers[name] = fn;
    }
  },

  registerPartial: function(name, str) {
    if (toString.call(name) === objectType) {
      Utils.extend(this.partials,  name);
    } else {
      this.partials[name] = str;
    }
  }
};

function registerDefaultHelpers(instance) {
  instance.registerHelper('helperMissing', function(arg) {
    if(arguments.length === 2) {
      return undefined;
    } else {
      throw new Exception("Missing helper: '" + arg + "'");
    }
  });

  instance.registerHelper('blockHelperMissing', function(context, options) {
    var inverse = options.inverse || function() {}, fn = options.fn;

    if (isFunction(context)) { context = context.call(this); }

    if(context === true) {
      return fn(this);
    } else if(context === false || context == null) {
      return inverse(this);
    } else if (isArray(context)) {
      if(context.length > 0) {
        return instance.helpers.each(context, options);
      } else {
        return inverse(this);
      }
    } else {
      return fn(context);
    }
  });

  instance.registerHelper('each', function(context, options) {
    var fn = options.fn, inverse = options.inverse;
    var i = 0, ret = "", data;

    if (isFunction(context)) { context = context.call(this); }

    if (options.data) {
      data = createFrame(options.data);
    }

    if(context && typeof context === 'object') {
      if (isArray(context)) {
        for(var j = context.length; i<j; i++) {
          if (data) {
            data.index = i;
            data.first = (i === 0);
            data.last  = (i === (context.length-1));
          }
          ret = ret + fn(context[i], { data: data });
        }
      } else {
        for(var key in context) {
          if(context.hasOwnProperty(key)) {
            if(data) { 
              data.key = key; 
              data.index = i;
              data.first = (i === 0);
            }
            ret = ret + fn(context[key], {data: data});
            i++;
          }
        }
      }
    }

    if(i === 0){
      ret = inverse(this);
    }

    return ret;
  });

  instance.registerHelper('if', function(conditional, options) {
    if (isFunction(conditional)) { conditional = conditional.call(this); }

    // Default behavior is to render the positive path if the value is truthy and not empty.
    // The `includeZero` option may be set to treat the condtional as purely not empty based on the
    // behavior of isEmpty. Effectively this determines if 0 is handled by the positive path or negative.
    if ((!options.hash.includeZero && !conditional) || Utils.isEmpty(conditional)) {
      return options.inverse(this);
    } else {
      return options.fn(this);
    }
  });

  instance.registerHelper('unless', function(conditional, options) {
    return instance.helpers['if'].call(this, conditional, {fn: options.inverse, inverse: options.fn, hash: options.hash});
  });

  instance.registerHelper('with', function(context, options) {
    if (isFunction(context)) { context = context.call(this); }

    if (!Utils.isEmpty(context)) return options.fn(context);
  });

  instance.registerHelper('log', function(context, options) {
    var level = options.data && options.data.level != null ? parseInt(options.data.level, 10) : 1;
    instance.log(level, context);
  });
}

var logger = {
  methodMap: { 0: 'debug', 1: 'info', 2: 'warn', 3: 'error' },

  // State enum
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  level: 3,

  // can be overridden in the host environment
  log: function(level, obj) {
    if (logger.level <= level) {
      var method = logger.methodMap[level];
      if (typeof console !== 'undefined' && console[method]) {
        console[method].call(console, obj);
      }
    }
  }
};
exports.logger = logger;
function log(level, obj) { logger.log(level, obj); }

exports.log = log;var createFrame = function(object) {
  var obj = {};
  Utils.extend(obj, object);
  return obj;
};
exports.createFrame = createFrame;
},{"./exception":63,"./utils":66}],63:[function(_dereq_,module,exports){
"use strict";

var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

function Exception(message, node) {
  var line;
  if (node && node.firstLine) {
    line = node.firstLine;

    message += ' - ' + line + ':' + node.firstColumn;
  }

  var tmp = Error.prototype.constructor.call(this, message);

  // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
  for (var idx = 0; idx < errorProps.length; idx++) {
    this[errorProps[idx]] = tmp[errorProps[idx]];
  }

  if (line) {
    this.lineNumber = line;
    this.column = node.firstColumn;
  }
}

Exception.prototype = new Error();

exports["default"] = Exception;
},{}],64:[function(_dereq_,module,exports){
"use strict";
var Utils = _dereq_("./utils");
var Exception = _dereq_("./exception")["default"];
var COMPILER_REVISION = _dereq_("./base").COMPILER_REVISION;
var REVISION_CHANGES = _dereq_("./base").REVISION_CHANGES;

function checkRevision(compilerInfo) {
  var compilerRevision = compilerInfo && compilerInfo[0] || 1,
      currentRevision = COMPILER_REVISION;

  if (compilerRevision !== currentRevision) {
    if (compilerRevision < currentRevision) {
      var runtimeVersions = REVISION_CHANGES[currentRevision],
          compilerVersions = REVISION_CHANGES[compilerRevision];
      throw new Exception("Template was precompiled with an older version of Handlebars than the current runtime. "+
            "Please update your precompiler to a newer version ("+runtimeVersions+") or downgrade your runtime to an older version ("+compilerVersions+").");
    } else {
      // Use the embedded version info since the runtime doesn't know about this revision yet
      throw new Exception("Template was precompiled with a newer version of Handlebars than the current runtime. "+
            "Please update your runtime to a newer version ("+compilerInfo[1]+").");
    }
  }
}

exports.checkRevision = checkRevision;// TODO: Remove this line and break up compilePartial

function template(templateSpec, env) {
  if (!env) {
    throw new Exception("No environment passed to template");
  }

  // Note: Using env.VM references rather than local var references throughout this section to allow
  // for external users to override these as psuedo-supported APIs.
  var invokePartialWrapper = function(partial, name, context, helpers, partials, data) {
    var result = env.VM.invokePartial.apply(this, arguments);
    if (result != null) { return result; }

    if (env.compile) {
      var options = { helpers: helpers, partials: partials, data: data };
      partials[name] = env.compile(partial, { data: data !== undefined }, env);
      return partials[name](context, options);
    } else {
      throw new Exception("The partial " + name + " could not be compiled when running in runtime-only mode");
    }
  };

  // Just add water
  var container = {
    escapeExpression: Utils.escapeExpression,
    invokePartial: invokePartialWrapper,
    programs: [],
    program: function(i, fn, data) {
      var programWrapper = this.programs[i];
      if(data) {
        programWrapper = program(i, fn, data);
      } else if (!programWrapper) {
        programWrapper = this.programs[i] = program(i, fn);
      }
      return programWrapper;
    },
    merge: function(param, common) {
      var ret = param || common;

      if (param && common && (param !== common)) {
        ret = {};
        Utils.extend(ret, common);
        Utils.extend(ret, param);
      }
      return ret;
    },
    programWithDepth: env.VM.programWithDepth,
    noop: env.VM.noop,
    compilerInfo: null
  };

  return function(context, options) {
    options = options || {};
    var namespace = options.partial ? options : env,
        helpers,
        partials;

    if (!options.partial) {
      helpers = options.helpers;
      partials = options.partials;
    }
    var result = templateSpec.call(
          container,
          namespace, context,
          helpers,
          partials,
          options.data);

    if (!options.partial) {
      env.VM.checkRevision(container.compilerInfo);
    }

    return result;
  };
}

exports.template = template;function programWithDepth(i, fn, data /*, $depth */) {
  var args = Array.prototype.slice.call(arguments, 3);

  var prog = function(context, options) {
    options = options || {};

    return fn.apply(this, [context, options.data || data].concat(args));
  };
  prog.program = i;
  prog.depth = args.length;
  return prog;
}

exports.programWithDepth = programWithDepth;function program(i, fn, data) {
  var prog = function(context, options) {
    options = options || {};

    return fn(context, options.data || data);
  };
  prog.program = i;
  prog.depth = 0;
  return prog;
}

exports.program = program;function invokePartial(partial, name, context, helpers, partials, data) {
  var options = { partial: true, helpers: helpers, partials: partials, data: data };

  if(partial === undefined) {
    throw new Exception("The partial " + name + " could not be found");
  } else if(partial instanceof Function) {
    return partial(context, options);
  }
}

exports.invokePartial = invokePartial;function noop() { return ""; }

exports.noop = noop;
},{"./base":62,"./exception":63,"./utils":66}],65:[function(_dereq_,module,exports){
"use strict";
// Build out our basic SafeString type
function SafeString(string) {
  this.string = string;
}

SafeString.prototype.toString = function() {
  return "" + this.string;
};

exports["default"] = SafeString;
},{}],66:[function(_dereq_,module,exports){
"use strict";
/*jshint -W004 */
var SafeString = _dereq_("./safe-string")["default"];

var escape = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "`": "&#x60;"
};

var badChars = /[&<>"'`]/g;
var possible = /[&<>"'`]/;

function escapeChar(chr) {
  return escape[chr] || "&amp;";
}

function extend(obj, value) {
  for(var key in value) {
    if(Object.prototype.hasOwnProperty.call(value, key)) {
      obj[key] = value[key];
    }
  }
}

exports.extend = extend;var toString = Object.prototype.toString;
exports.toString = toString;
// Sourced from lodash
// https://github.com/bestiejs/lodash/blob/master/LICENSE.txt
var isFunction = function(value) {
  return typeof value === 'function';
};
// fallback for older versions of Chrome and Safari
if (isFunction(/x/)) {
  isFunction = function(value) {
    return typeof value === 'function' && toString.call(value) === '[object Function]';
  };
}
var isFunction;
exports.isFunction = isFunction;
var isArray = Array.isArray || function(value) {
  return (value && typeof value === 'object') ? toString.call(value) === '[object Array]' : false;
};
exports.isArray = isArray;

function escapeExpression(string) {
  // don't escape SafeStrings, since they're already safe
  if (string instanceof SafeString) {
    return string.toString();
  } else if (!string && string !== 0) {
    return "";
  }

  // Force a string conversion as this will be done by the append regardless and
  // the regex test will do this transparently behind the scenes, causing issues if
  // an object's to string has escaped characters in it.
  string = "" + string;

  if(!possible.test(string)) { return string; }
  return string.replace(badChars, escapeChar);
}

exports.escapeExpression = escapeExpression;function isEmpty(value) {
  if (!value && value !== 0) {
    return true;
  } else if (isArray(value) && value.length === 0) {
    return true;
  } else {
    return false;
  }
}

exports.isEmpty = isEmpty;
},{"./safe-string":65}],67:[function(_dereq_,module,exports){
// Create a simple path alias to allow browserify to resolve
// the runtime on a supported path.
module.exports = _dereq_('./dist/cjs/handlebars.runtime');

},{"./dist/cjs/handlebars.runtime":61}],68:[function(_dereq_,module,exports){
(function (global){
/**
 * marked - a markdown parser
 * Copyright (c) 2011-2013, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 */

;(function() {

/**
 * Block-Level Grammar
 */

var block = {
  newline: /^\n+/,
  code: /^( {4}[^\n]+\n*)+/,
  fences: noop,
  hr: /^( *[-*_]){3,} *(?:\n+|$)/,
  heading: /^ *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)/,
  nptable: noop,
  lheading: /^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/,
  blockquote: /^( *>[^\n]+(\n[^\n]+)*\n*)+/,
  list: /^( *)(bull) [\s\S]+?(?:hr|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,
  html: /^ *(?:comment|closed|closing) *(?:\n{2,}|\s*$)/,
  def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)/,
  table: noop,
  paragraph: /^((?:[^\n]+\n?(?!hr|heading|lheading|blockquote|tag|def))+)\n*/,
  text: /^[^\n]+/
};

block.bullet = /(?:[*+-]|\d+\.)/;
block.item = /^( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/;
block.item = replace(block.item, 'gm')
  (/bull/g, block.bullet)
  ();

block.list = replace(block.list)
  (/bull/g, block.bullet)
  ('hr', /\n+(?=(?: *[-*_]){3,} *(?:\n+|$))/)
  ();

block._tag = '(?!(?:'
  + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code'
  + '|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo'
  + '|span|br|wbr|ins|del|img)\\b)\\w+(?!:/|@)\\b';

block.html = replace(block.html)
  ('comment', /<!--[\s\S]*?-->/)
  ('closed', /<(tag)[\s\S]+?<\/\1>/)
  ('closing', /<tag(?:"[^"]*"|'[^']*'|[^'">])*?>/)
  (/tag/g, block._tag)
  ();

block.paragraph = replace(block.paragraph)
  ('hr', block.hr)
  ('heading', block.heading)
  ('lheading', block.lheading)
  ('blockquote', block.blockquote)
  ('tag', '<' + block._tag)
  ('def', block.def)
  ();

/**
 * Normal Block Grammar
 */

block.normal = merge({}, block);

/**
 * GFM Block Grammar
 */

block.gfm = merge({}, block.normal, {
  fences: /^ *(`{3,}|~{3,}) *(\S+)? *\n([\s\S]+?)\s*\1 *(?:\n+|$)/,
  paragraph: /^/
});

block.gfm.paragraph = replace(block.paragraph)
  ('(?!', '(?!'
    + block.gfm.fences.source.replace('\\1', '\\2') + '|'
    + block.list.source.replace('\\1', '\\3') + '|')
  ();

/**
 * GFM + Tables Block Grammar
 */

block.tables = merge({}, block.gfm, {
  nptable: /^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/,
  table: /^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/
});

/**
 * Block Lexer
 */

function Lexer(options) {
  this.tokens = [];
  this.tokens.links = {};
  this.options = options || marked.defaults;
  this.rules = block.normal;

  if (this.options.gfm) {
    if (this.options.tables) {
      this.rules = block.tables;
    } else {
      this.rules = block.gfm;
    }
  }
}

/**
 * Expose Block Rules
 */

Lexer.rules = block;

/**
 * Static Lex Method
 */

Lexer.lex = function(src, options) {
  var lexer = new Lexer(options);
  return lexer.lex(src);
};

/**
 * Preprocessing
 */

Lexer.prototype.lex = function(src) {
  src = src
    .replace(/\r\n|\r/g, '\n')
    .replace(/\t/g, '    ')
    .replace(/\u00a0/g, ' ')
    .replace(/\u2424/g, '\n');

  return this.token(src, true);
};

/**
 * Lexing
 */

Lexer.prototype.token = function(src, top) {
  var src = src.replace(/^ +$/gm, '')
    , next
    , loose
    , cap
    , bull
    , b
    , item
    , space
    , i
    , l;

  while (src) {
    // newline
    if (cap = this.rules.newline.exec(src)) {
      src = src.substring(cap[0].length);
      if (cap[0].length > 1) {
        this.tokens.push({
          type: 'space'
        });
      }
    }

    // code
    if (cap = this.rules.code.exec(src)) {
      src = src.substring(cap[0].length);
      cap = cap[0].replace(/^ {4}/gm, '');
      this.tokens.push({
        type: 'code',
        text: !this.options.pedantic
          ? cap.replace(/\n+$/, '')
          : cap
      });
      continue;
    }

    // fences (gfm)
    if (cap = this.rules.fences.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'code',
        lang: cap[2],
        text: cap[3]
      });
      continue;
    }

    // heading
    if (cap = this.rules.heading.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'heading',
        depth: cap[1].length,
        text: cap[2]
      });
      continue;
    }

    // table no leading pipe (gfm)
    if (top && (cap = this.rules.nptable.exec(src))) {
      src = src.substring(cap[0].length);

      item = {
        type: 'table',
        header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
        align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
        cells: cap[3].replace(/\n$/, '').split('\n')
      };

      for (i = 0; i < item.align.length; i++) {
        if (/^ *-+: *$/.test(item.align[i])) {
          item.align[i] = 'right';
        } else if (/^ *:-+: *$/.test(item.align[i])) {
          item.align[i] = 'center';
        } else if (/^ *:-+ *$/.test(item.align[i])) {
          item.align[i] = 'left';
        } else {
          item.align[i] = null;
        }
      }

      for (i = 0; i < item.cells.length; i++) {
        item.cells[i] = item.cells[i].split(/ *\| */);
      }

      this.tokens.push(item);

      continue;
    }

    // lheading
    if (cap = this.rules.lheading.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'heading',
        depth: cap[2] === '=' ? 1 : 2,
        text: cap[1]
      });
      continue;
    }

    // hr
    if (cap = this.rules.hr.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'hr'
      });
      continue;
    }

    // blockquote
    if (cap = this.rules.blockquote.exec(src)) {
      src = src.substring(cap[0].length);

      this.tokens.push({
        type: 'blockquote_start'
      });

      cap = cap[0].replace(/^ *> ?/gm, '');

      // Pass `top` to keep the current
      // "toplevel" state. This is exactly
      // how markdown.pl works.
      this.token(cap, top);

      this.tokens.push({
        type: 'blockquote_end'
      });

      continue;
    }

    // list
    if (cap = this.rules.list.exec(src)) {
      src = src.substring(cap[0].length);
      bull = cap[2];

      this.tokens.push({
        type: 'list_start',
        ordered: bull.length > 1
      });

      // Get each top-level item.
      cap = cap[0].match(this.rules.item);

      next = false;
      l = cap.length;
      i = 0;

      for (; i < l; i++) {
        item = cap[i];

        // Remove the list item's bullet
        // so it is seen as the next token.
        space = item.length;
        item = item.replace(/^ *([*+-]|\d+\.) +/, '');

        // Outdent whatever the
        // list item contains. Hacky.
        if (~item.indexOf('\n ')) {
          space -= item.length;
          item = !this.options.pedantic
            ? item.replace(new RegExp('^ {1,' + space + '}', 'gm'), '')
            : item.replace(/^ {1,4}/gm, '');
        }

        // Determine whether the next list item belongs here.
        // Backpedal if it does not belong in this list.
        if (this.options.smartLists && i !== l - 1) {
          b = block.bullet.exec(cap[i + 1])[0];
          if (bull !== b && !(bull.length > 1 && b.length > 1)) {
            src = cap.slice(i + 1).join('\n') + src;
            i = l - 1;
          }
        }

        // Determine whether item is loose or not.
        // Use: /(^|\n)(?! )[^\n]+\n\n(?!\s*$)/
        // for discount behavior.
        loose = next || /\n\n(?!\s*$)/.test(item);
        if (i !== l - 1) {
          next = item.charAt(item.length - 1) === '\n';
          if (!loose) loose = next;
        }

        this.tokens.push({
          type: loose
            ? 'loose_item_start'
            : 'list_item_start'
        });

        // Recurse.
        this.token(item, false);

        this.tokens.push({
          type: 'list_item_end'
        });
      }

      this.tokens.push({
        type: 'list_end'
      });

      continue;
    }

    // html
    if (cap = this.rules.html.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: this.options.sanitize
          ? 'paragraph'
          : 'html',
        pre: cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style',
        text: cap[0]
      });
      continue;
    }

    // def
    if (top && (cap = this.rules.def.exec(src))) {
      src = src.substring(cap[0].length);
      this.tokens.links[cap[1].toLowerCase()] = {
        href: cap[2],
        title: cap[3]
      };
      continue;
    }

    // table (gfm)
    if (top && (cap = this.rules.table.exec(src))) {
      src = src.substring(cap[0].length);

      item = {
        type: 'table',
        header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
        align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
        cells: cap[3].replace(/(?: *\| *)?\n$/, '').split('\n')
      };

      for (i = 0; i < item.align.length; i++) {
        if (/^ *-+: *$/.test(item.align[i])) {
          item.align[i] = 'right';
        } else if (/^ *:-+: *$/.test(item.align[i])) {
          item.align[i] = 'center';
        } else if (/^ *:-+ *$/.test(item.align[i])) {
          item.align[i] = 'left';
        } else {
          item.align[i] = null;
        }
      }

      for (i = 0; i < item.cells.length; i++) {
        item.cells[i] = item.cells[i]
          .replace(/^ *\| *| *\| *$/g, '')
          .split(/ *\| */);
      }

      this.tokens.push(item);

      continue;
    }

    // top-level paragraph
    if (top && (cap = this.rules.paragraph.exec(src))) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'paragraph',
        text: cap[1].charAt(cap[1].length - 1) === '\n'
          ? cap[1].slice(0, -1)
          : cap[1]
      });
      continue;
    }

    // text
    if (cap = this.rules.text.exec(src)) {
      // Top-level should never reach here.
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'text',
        text: cap[0]
      });
      continue;
    }

    if (src) {
      throw new
        Error('Infinite loop on byte: ' + src.charCodeAt(0));
    }
  }

  return this.tokens;
};

/**
 * Inline-Level Grammar
 */

var inline = {
  escape: /^\\([\\`*{}\[\]()#+\-.!_>])/,
  autolink: /^<([^ >]+(@|:\/)[^ >]+)>/,
  url: noop,
  tag: /^<!--[\s\S]*?-->|^<\/?\w+(?:"[^"]*"|'[^']*'|[^'">])*?>/,
  link: /^!?\[(inside)\]\(href\)/,
  reflink: /^!?\[(inside)\]\s*\[([^\]]*)\]/,
  nolink: /^!?\[((?:\[[^\]]*\]|[^\[\]])*)\]/,
  strong: /^__([\s\S]+?)__(?!_)|^\*\*([\s\S]+?)\*\*(?!\*)/,
  em: /^\b_((?:__|[\s\S])+?)_\b|^\*((?:\*\*|[\s\S])+?)\*(?!\*)/,
  code: /^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/,
  br: /^ {2,}\n(?!\s*$)/,
  del: noop,
  text: /^[\s\S]+?(?=[\\<!\[_*`]| {2,}\n|$)/
};

inline._inside = /(?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*/;
inline._href = /\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*/;

inline.link = replace(inline.link)
  ('inside', inline._inside)
  ('href', inline._href)
  ();

inline.reflink = replace(inline.reflink)
  ('inside', inline._inside)
  ();

/**
 * Normal Inline Grammar
 */

inline.normal = merge({}, inline);

/**
 * Pedantic Inline Grammar
 */

inline.pedantic = merge({}, inline.normal, {
  strong: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
  em: /^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/
});

/**
 * GFM Inline Grammar
 */

inline.gfm = merge({}, inline.normal, {
  escape: replace(inline.escape)('])', '~|])')(),
  url: /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/,
  del: /^~~(?=\S)([\s\S]*?\S)~~/,
  text: replace(inline.text)
    (']|', '~]|')
    ('|', '|https?://|')
    ()
});

/**
 * GFM + Line Breaks Inline Grammar
 */

inline.breaks = merge({}, inline.gfm, {
  br: replace(inline.br)('{2,}', '*')(),
  text: replace(inline.gfm.text)('{2,}', '*')()
});

/**
 * Inline Lexer & Compiler
 */

function InlineLexer(links, options) {
  this.options = options || marked.defaults;
  this.links = links;
  this.rules = inline.normal;

  if (!this.links) {
    throw new
      Error('Tokens array requires a `links` property.');
  }

  if (this.options.gfm) {
    if (this.options.breaks) {
      this.rules = inline.breaks;
    } else {
      this.rules = inline.gfm;
    }
  } else if (this.options.pedantic) {
    this.rules = inline.pedantic;
  }
}

/**
 * Expose Inline Rules
 */

InlineLexer.rules = inline;

/**
 * Static Lexing/Compiling Method
 */

InlineLexer.output = function(src, links, options) {
  var inline = new InlineLexer(links, options);
  return inline.output(src);
};

/**
 * Lexing/Compiling
 */

InlineLexer.prototype.output = function(src) {
  var out = ''
    , link
    , text
    , href
    , cap;

  while (src) {
    // escape
    if (cap = this.rules.escape.exec(src)) {
      src = src.substring(cap[0].length);
      out += cap[1];
      continue;
    }

    // autolink
    if (cap = this.rules.autolink.exec(src)) {
      src = src.substring(cap[0].length);
      if (cap[2] === '@') {
        text = cap[1].charAt(6) === ':'
          ? this.mangle(cap[1].substring(7))
          : this.mangle(cap[1]);
        href = this.mangle('mailto:') + text;
      } else {
        text = escape(cap[1]);
        href = text;
      }
      out += '<a href="'
        + href
        + '">'
        + text
        + '</a>';
      continue;
    }

    // url (gfm)
    if (cap = this.rules.url.exec(src)) {
      src = src.substring(cap[0].length);
      text = escape(cap[1]);
      href = text;
      out += '<a href="'
        + href
        + '">'
        + text
        + '</a>';
      continue;
    }

    // tag
    if (cap = this.rules.tag.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.options.sanitize
        ? escape(cap[0])
        : cap[0];
      continue;
    }

    // link
    if (cap = this.rules.link.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.outputLink(cap, {
        href: cap[2],
        title: cap[3]
      });
      continue;
    }

    // reflink, nolink
    if ((cap = this.rules.reflink.exec(src))
        || (cap = this.rules.nolink.exec(src))) {
      src = src.substring(cap[0].length);
      link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
      link = this.links[link.toLowerCase()];
      if (!link || !link.href) {
        out += cap[0].charAt(0);
        src = cap[0].substring(1) + src;
        continue;
      }
      out += this.outputLink(cap, link);
      continue;
    }

    // strong
    if (cap = this.rules.strong.exec(src)) {
      src = src.substring(cap[0].length);
      out += '<strong>'
        + this.output(cap[2] || cap[1])
        + '</strong>';
      continue;
    }

    // em
    if (cap = this.rules.em.exec(src)) {
      src = src.substring(cap[0].length);
      out += '<em>'
        + this.output(cap[2] || cap[1])
        + '</em>';
      continue;
    }

    // code
    if (cap = this.rules.code.exec(src)) {
      src = src.substring(cap[0].length);
      out += '<code>'
        + escape(cap[2], true)
        + '</code>';
      continue;
    }

    // br
    if (cap = this.rules.br.exec(src)) {
      src = src.substring(cap[0].length);
      out += '<br>';
      continue;
    }

    // del (gfm)
    if (cap = this.rules.del.exec(src)) {
      src = src.substring(cap[0].length);
      out += '<del>'
        + this.output(cap[1])
        + '</del>';
      continue;
    }

    // text
    if (cap = this.rules.text.exec(src)) {
      src = src.substring(cap[0].length);
      out += escape(this.smartypants(cap[0]));
      continue;
    }

    if (src) {
      throw new
        Error('Infinite loop on byte: ' + src.charCodeAt(0));
    }
  }

  return out;
};

/**
 * Compile Link
 */

InlineLexer.prototype.outputLink = function(cap, link) {
  if (cap[0].charAt(0) !== '!') {
    return '<a href="'
      + escape(link.href)
      + '"'
      + (link.title
      ? ' title="'
      + escape(link.title)
      + '"'
      : '')
      + '>'
      + this.output(cap[1])
      + '</a>';
  } else {
    return '<img src="'
      + escape(link.href)
      + '" alt="'
      + escape(cap[1])
      + '"'
      + (link.title
      ? ' title="'
      + escape(link.title)
      + '"'
      : '')
      + '>';
  }
};

/**
 * Smartypants Transformations
 */

InlineLexer.prototype.smartypants = function(text) {
  if (!this.options.smartypants) return text;
  return text
    // em-dashes
    .replace(/--/g, '\u2014')
    // opening singles
    .replace(/(^|[-\u2014/(\[{"\s])'/g, '$1\u2018')
    // closing singles & apostrophes
    .replace(/'/g, '\u2019')
    // opening doubles
    .replace(/(^|[-\u2014/(\[{\u2018\s])"/g, '$1\u201c')
    // closing doubles
    .replace(/"/g, '\u201d')
    // ellipses
    .replace(/\.{3}/g, '\u2026');
};

/**
 * Mangle Links
 */

InlineLexer.prototype.mangle = function(text) {
  var out = ''
    , l = text.length
    , i = 0
    , ch;

  for (; i < l; i++) {
    ch = text.charCodeAt(i);
    if (Math.random() > 0.5) {
      ch = 'x' + ch.toString(16);
    }
    out += '&#' + ch + ';';
  }

  return out;
};

/**
 * Parsing & Compiling
 */

function Parser(options) {
  this.tokens = [];
  this.token = null;
  this.options = options || marked.defaults;
}

/**
 * Static Parse Method
 */

Parser.parse = function(src, options) {
  var parser = new Parser(options);
  return parser.parse(src);
};

/**
 * Parse Loop
 */

Parser.prototype.parse = function(src) {
  this.inline = new InlineLexer(src.links, this.options);
  this.tokens = src.reverse();

  var out = '';
  while (this.next()) {
    out += this.tok();
  }

  return out;
};

/**
 * Next Token
 */

Parser.prototype.next = function() {
  return this.token = this.tokens.pop();
};

/**
 * Preview Next Token
 */

Parser.prototype.peek = function() {
  return this.tokens[this.tokens.length - 1] || 0;
};

/**
 * Parse Text Tokens
 */

Parser.prototype.parseText = function() {
  var body = this.token.text;

  while (this.peek().type === 'text') {
    body += '\n' + this.next().text;
  }

  return this.inline.output(body);
};

/**
 * Parse Current Token
 */

Parser.prototype.tok = function() {
  switch (this.token.type) {
    case 'space': {
      return '';
    }
    case 'hr': {
      return '<hr>\n';
    }
    case 'heading': {
      return '<h'
        + this.token.depth
        + ' id="'
        + this.token.text.toLowerCase().replace(/[^\w]+/g, '-')
        + '">'
        + this.inline.output(this.token.text)
        + '</h'
        + this.token.depth
        + '>\n';
    }
    case 'code': {
      if (this.options.highlight) {
        var code = this.options.highlight(this.token.text, this.token.lang);
        if (code != null && code !== this.token.text) {
          this.token.escaped = true;
          this.token.text = code;
        }
      }

      if (!this.token.escaped) {
        this.token.text = escape(this.token.text, true);
      }

      return '<pre><code'
        + (this.token.lang
        ? ' class="'
        + this.options.langPrefix
        + this.token.lang
        + '"'
        : '')
        + '>'
        + this.token.text
        + '</code></pre>\n';
    }
    case 'table': {
      var body = ''
        , heading
        , i
        , row
        , cell
        , j;

      // header
      body += '<thead>\n<tr>\n';
      for (i = 0; i < this.token.header.length; i++) {
        heading = this.inline.output(this.token.header[i]);
        body += '<th';
        if (this.token.align[i]) {
          body += ' style="text-align:' + this.token.align[i] + '"';
        }
        body += '>' + heading + '</th>\n';
      }
      body += '</tr>\n</thead>\n';

      // body
      body += '<tbody>\n'
      for (i = 0; i < this.token.cells.length; i++) {
        row = this.token.cells[i];
        body += '<tr>\n';
        for (j = 0; j < row.length; j++) {
          cell = this.inline.output(row[j]);
          body += '<td';
          if (this.token.align[j]) {
            body += ' style="text-align:' + this.token.align[j] + '"';
          }
          body += '>' + cell + '</td>\n';
        }
        body += '</tr>\n';
      }
      body += '</tbody>\n';

      return '<table>\n'
        + body
        + '</table>\n';
    }
    case 'blockquote_start': {
      var body = '';

      while (this.next().type !== 'blockquote_end') {
        body += this.tok();
      }

      return '<blockquote>\n'
        + body
        + '</blockquote>\n';
    }
    case 'list_start': {
      var type = this.token.ordered ? 'ol' : 'ul'
        , body = '';

      while (this.next().type !== 'list_end') {
        body += this.tok();
      }

      return '<'
        + type
        + '>\n'
        + body
        + '</'
        + type
        + '>\n';
    }
    case 'list_item_start': {
      var body = '';

      while (this.next().type !== 'list_item_end') {
        body += this.token.type === 'text'
          ? this.parseText()
          : this.tok();
      }

      return '<li>'
        + body
        + '</li>\n';
    }
    case 'loose_item_start': {
      var body = '';

      while (this.next().type !== 'list_item_end') {
        body += this.tok();
      }

      return '<li>'
        + body
        + '</li>\n';
    }
    case 'html': {
      return !this.token.pre && !this.options.pedantic
        ? this.inline.output(this.token.text)
        : this.token.text;
    }
    case 'paragraph': {
      return '<p>'
        + this.inline.output(this.token.text)
        + '</p>\n';
    }
    case 'text': {
      return '<p>'
        + this.parseText()
        + '</p>\n';
    }
  }
};

/**
 * Helpers
 */

function escape(html, encode) {
  return html
    .replace(!encode ? /&(?!#?\w+;)/g : /&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function replace(regex, opt) {
  regex = regex.source;
  opt = opt || '';
  return function self(name, val) {
    if (!name) return new RegExp(regex, opt);
    val = val.source || val;
    val = val.replace(/(^|[^\[])\^/g, '$1');
    regex = regex.replace(name, val);
    return self;
  };
}

function noop() {}
noop.exec = noop;

function merge(obj) {
  var i = 1
    , target
    , key;

  for (; i < arguments.length; i++) {
    target = arguments[i];
    for (key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        obj[key] = target[key];
      }
    }
  }

  return obj;
}

/**
 * Marked
 */

function marked(src, opt, callback) {
  if (callback || typeof opt === 'function') {
    if (!callback) {
      callback = opt;
      opt = null;
    }

    opt = merge({}, marked.defaults, opt || {});

    var highlight = opt.highlight
      , tokens
      , pending
      , i = 0;

    try {
      tokens = Lexer.lex(src, opt)
    } catch (e) {
      return callback(e);
    }

    pending = tokens.length;

    var done = function() {
      var out, err;

      try {
        out = Parser.parse(tokens, opt);
      } catch (e) {
        err = e;
      }

      opt.highlight = highlight;

      return err
        ? callback(err)
        : callback(null, out);
    };

    if (!highlight || highlight.length < 3) {
      return done();
    }

    delete opt.highlight;

    if (!pending) return done();

    for (; i < tokens.length; i++) {
      (function(token) {
        if (token.type !== 'code') {
          return --pending || done();
        }
        return highlight(token.text, token.lang, function(err, code) {
          if (code == null || code === token.text) {
            return --pending || done();
          }
          token.text = code;
          token.escaped = true;
          --pending || done();
        });
      })(tokens[i]);
    }

    return;
  }
  try {
    if (opt) opt = merge({}, marked.defaults, opt);
    return Parser.parse(Lexer.lex(src, opt), opt);
  } catch (e) {
    e.message += '\nPlease report this to https://github.com/chjj/marked.';
    if ((opt || marked.defaults).silent) {
      return '<p>An error occured:</p><pre>'
        + escape(e.message + '', true)
        + '</pre>';
    }
    throw e;
  }
}

/**
 * Options
 */

marked.options =
marked.setOptions = function(opt) {
  merge(marked.defaults, opt);
  return marked;
};

marked.defaults = {
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  smartLists: false,
  silent: false,
  highlight: null,
  langPrefix: 'lang-',
  smartypants: false
};

/**
 * Expose
 */

marked.Parser = Parser;
marked.parser = Parser.parse;

marked.Lexer = Lexer;
marked.lexer = Lexer.lex;

marked.InlineLexer = InlineLexer;
marked.inlineLexer = InlineLexer.output;

marked.parse = marked;

if (typeof exports === 'object') {
  module.exports = marked;
} else if (typeof define === 'function' && define.amd) {
  define(function() { return marked; });
} else {
  this.marked = marked;
}

}).call(function() {
  return this || (typeof window !== 'undefined' ? window : global);
}());

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],69:[function(_dereq_,module,exports){
module.exports = { Client: window.WebSocket };

},{}],70:[function(_dereq_,module,exports){
((typeof define === "function" && define.amd && function (m) { define("bane", m); }) ||
 (typeof module === "object" && function (m) { module.exports = m(); }) ||
 function (m) { this.bane = m(); }
)(function () {
    "use strict";
    var slice = Array.prototype.slice;

    function handleError(event, error, errbacks) {
        var i, l = errbacks.length;
        if (l > 0) {
            for (i = 0; i < l; ++i) { errbacks[i](event, error); }
            return;
        }
        setTimeout(function () {
            error.message = event + " listener threw error: " + error.message;
            throw error;
        }, 0);
    }

    function assertFunction(fn) {
        if (typeof fn !== "function") {
            throw new TypeError("Listener is not function");
        }
        return fn;
    }

    function supervisors(object) {
        if (!object.supervisors) { object.supervisors = []; }
        return object.supervisors;
    }

    function listeners(object, event) {
        if (!object.listeners) { object.listeners = {}; }
        if (event && !object.listeners[event]) { object.listeners[event] = []; }
        return event ? object.listeners[event] : object.listeners;
    }

    function errbacks(object) {
        if (!object.errbacks) { object.errbacks = []; }
        return object.errbacks;
    }

    /**
     * @signature var emitter = bane.createEmitter([object]);
     *
     * Create a new event emitter. If an object is passed, it will be modified
     * by adding the event emitter methods (see below).
     */
    function createEventEmitter(object) {
        object = object || {};

        function notifyListener(event, listener, args) {
            try {
                listener.listener.apply(listener.thisp || object, args);
            } catch (e) {
                handleError(event, e, errbacks(object));
            }
        }

        object.on = function (event, listener, thisp) {
            if (typeof event === "function") {
                return supervisors(this).push({
                    listener: event,
                    thisp: listener
                });
            }
            listeners(this, event).push({
                listener: assertFunction(listener),
                thisp: thisp
            });
        };

        object.off = function (event, listener) {
            var fns, events, i, l;
            if (!event) {
                fns = supervisors(this);
                fns.splice(0, fns.length);

                events = listeners(this);
                for (i in events) {
                    if (events.hasOwnProperty(i)) {
                        fns = listeners(this, i);
                        fns.splice(0, fns.length);
                    }
                }

                fns = errbacks(this);
                fns.splice(0, fns.length);

                return;
            }
            if (typeof event === "function") {
                fns = supervisors(this);
                listener = event;
            } else {
                fns = listeners(this, event);
            }
            if (!listener) {
                fns.splice(0, fns.length);
                return;
            }
            for (i = 0, l = fns.length; i < l; ++i) {
                if (fns[i].listener === listener) {
                    fns.splice(i, 1);
                    return;
                }
            }
        };

        object.once = function (event, listener, thisp) {
            var wrapper = function () {
                object.off(event, wrapper);
                listener.apply(this, arguments);
            };

            object.on(event, wrapper, thisp);
        };

        object.bind = function (object, events) {
            var prop, i, l;
            if (!events) {
                for (prop in object) {
                    if (typeof object[prop] === "function") {
                        this.on(prop, object[prop], object);
                    }
                }
            } else {
                for (i = 0, l = events.length; i < l; ++i) {
                    if (typeof object[events[i]] === "function") {
                        this.on(events[i], object[events[i]], object);
                    } else {
                        throw new Error("No such method " + events[i]);
                    }
                }
            }
            return object;
        };

        object.emit = function (event) {
            var toNotify = supervisors(this);
            var args = slice.call(arguments), i, l;

            for (i = 0, l = toNotify.length; i < l; ++i) {
                notifyListener(event, toNotify[i], args);
            }

            toNotify = listeners(this, event).slice();
            args = slice.call(arguments, 1);
            for (i = 0, l = toNotify.length; i < l; ++i) {
                notifyListener(event, toNotify[i], args);
            }
        };

        object.errback = function (listener) {
            if (!this.errbacks) { this.errbacks = []; }
            this.errbacks.push(assertFunction(listener));
        };

        return object;
    }

    return {
        createEventEmitter: createEventEmitter,
        aggregate: function (emitters) {
            var aggregate = createEventEmitter();
            emitters.forEach(function (emitter) {
                emitter.on(function (event, data) {
                    aggregate.emit(event, data);
                });
            });
            return aggregate;
        }
    };
});

},{}],71:[function(_dereq_,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function (_dereq_) {

	var makePromise = _dereq_('./makePromise');
	var Scheduler = _dereq_('./scheduler');
	var async = _dereq_('./async');

	return makePromise({
		scheduler: new Scheduler(async)
	});

});
})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(_dereq_); });

},{"./async":74,"./makePromise":84,"./scheduler":85}],72:[function(_dereq_,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {
	/**
	 * Circular queue
	 * @param {number} capacityPow2 power of 2 to which this queue's capacity
	 *  will be set initially. eg when capacityPow2 == 3, queue capacity
	 *  will be 8.
	 * @constructor
	 */
	function Queue(capacityPow2) {
		this.head = this.tail = this.length = 0;
		this.buffer = new Array(1 << capacityPow2);
	}

	Queue.prototype.push = function(x) {
		if(this.length === this.buffer.length) {
			this._ensureCapacity(this.length * 2);
		}

		this.buffer[this.tail] = x;
		this.tail = (this.tail + 1) & (this.buffer.length - 1);
		++this.length;
		return this.length;
	};

	Queue.prototype.shift = function() {
		var x = this.buffer[this.head];
		this.buffer[this.head] = void 0;
		this.head = (this.head + 1) & (this.buffer.length - 1);
		--this.length;
		return x;
	};

	Queue.prototype._ensureCapacity = function(capacity) {
		var head = this.head;
		var buffer = this.buffer;
		var newBuffer = new Array(capacity);
		var i = 0;
		var len;

		if(head === 0) {
			len = this.length;
			for(; i<len; ++i) {
				newBuffer[i] = buffer[i];
			}
		} else {
			capacity = buffer.length;
			len = this.tail;
			for(; head<capacity; ++i, ++head) {
				newBuffer[i] = buffer[head];
			}

			for(head=0; head<len; ++i, ++head) {
				newBuffer[i] = buffer[head];
			}
		}

		this.buffer = newBuffer;
		this.head = 0;
		this.tail = this.length;
	};

	return Queue;

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],73:[function(_dereq_,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	/**
	 * Custom error type for promises rejected by promise.timeout
	 * @param {string} message
	 * @constructor
	 */
	function TimeoutError (message) {
		Error.call(this);
		this.message = message;
		this.name = TimeoutError.name;
		if (typeof Error.captureStackTrace === 'function') {
			Error.captureStackTrace(this, TimeoutError);
		}
	}

	TimeoutError.prototype = Object.create(Error.prototype);
	TimeoutError.prototype.constructor = TimeoutError;

	return TimeoutError;
});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));
},{}],74:[function(_dereq_,module,exports){
(function (process){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function(_dereq_) {

	// Sniff "best" async scheduling option
	// Prefer process.nextTick or MutationObserver, then check for
	// vertx and finally fall back to setTimeout

	/*jshint maxcomplexity:6*/
	/*global process,document,setTimeout,MutationObserver,WebKitMutationObserver*/
	var nextTick, MutationObs;

	if (typeof process !== 'undefined' && process !== null &&
		typeof process.nextTick === 'function') {
		nextTick = function(f) {
			process.nextTick(f);
		};

	} else if (MutationObs =
		(typeof MutationObserver === 'function' && MutationObserver) ||
		(typeof WebKitMutationObserver === 'function' && WebKitMutationObserver)) {
		nextTick = (function (document, MutationObserver) {
			var scheduled;
			var el = document.createElement('div');
			var o = new MutationObserver(run);
			o.observe(el, { attributes: true });

			function run() {
				var f = scheduled;
				scheduled = void 0;
				f();
			}

			return function (f) {
				scheduled = f;
				el.setAttribute('class', 'x');
			};
		}(document, MutationObs));

	} else {
		nextTick = (function(cjsRequire) {
			try {
				// vert.x 1.x || 2.x
				return cjsRequire('vertx').runOnLoop || cjsRequire('vertx').runOnContext;
			} catch (ignore) {}

			// capture setTimeout to avoid being caught by fake timers
			// used in time based tests
			var capturedSetTimeout = setTimeout;
			return function (t) {
				capturedSetTimeout(t, 0);
			};
		}(_dereq_));
	}

	return nextTick;
});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(_dereq_); }));

}).call(this,_dereq_("FWaASH"))
},{"FWaASH":60}],75:[function(_dereq_,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return function array(Promise) {

		var arrayMap = Array.prototype.map;
		var arrayReduce = Array.prototype.reduce;
		var arrayReduceRight = Array.prototype.reduceRight;
		var arrayForEach = Array.prototype.forEach;

		var toPromise = Promise.resolve;
		var all = Promise.all;

		// Additional array combinators

		Promise.any = any;
		Promise.some = some;
		Promise.settle = settle;

		Promise.map = map;
		Promise.reduce = reduce;
		Promise.reduceRight = reduceRight;

		/**
		 * When this promise fulfills with an array, do
		 * onFulfilled.apply(void 0, array)
		 * @param (function) onFulfilled function to apply
		 * @returns {Promise} promise for the result of applying onFulfilled
		 */
		Promise.prototype.spread = function(onFulfilled) {
			return this.then(all).then(function(array) {
				return onFulfilled.apply(void 0, array);
			});
		};

		return Promise;

		/**
		 * One-winner competitive race.
		 * Return a promise that will fulfill when one of the promises
		 * in the input array fulfills, or will reject when all promises
		 * have rejected.
		 * @param {array} promises
		 * @returns {Promise} promise for the first fulfilled value
		 */
		function any(promises) {
			return new Promise(function(resolve, reject) {
				var pending = 0;
				var errors = [];

				arrayForEach.call(promises, function(p) {
					++pending;
					toPromise(p).then(resolve, handleReject);
				});

				if(pending === 0) {
					resolve();
				}

				function handleReject(e) {
					errors.push(e);
					if(--pending === 0) {
						reject(errors);
					}
				}
			});
		}

		/**
		 * N-winner competitive race
		 * Return a promise that will fulfill when n input promises have
		 * fulfilled, or will reject when it becomes impossible for n
		 * input promises to fulfill (ie when promises.length - n + 1
		 * have rejected)
		 * @param {array} promises
		 * @param {number} n
		 * @returns {Promise} promise for the earliest n fulfillment values
		 *
		 * @deprecated
		 */
		function some(promises, n) {
			return new Promise(function(resolve, reject, notify) {
				var nFulfill = 0;
				var nReject;
				var results = [];
				var errors = [];

				arrayForEach.call(promises, function(p) {
					++nFulfill;
					toPromise(p).then(handleResolve, handleReject, notify);
				});

				n = Math.max(n, 0);
				nReject = (nFulfill - n + 1);
				nFulfill = Math.min(n, nFulfill);

				if(nFulfill === 0) {
					resolve(results);
					return;
				}

				function handleResolve(x) {
					if(nFulfill > 0) {
						--nFulfill;
						results.push(x);

						if(nFulfill === 0) {
							resolve(results);
						}
					}
				}

				function handleReject(e) {
					if(nReject > 0) {
						--nReject;
						errors.push(e);

						if(nReject === 0) {
							reject(errors);
						}
					}
				}
			});
		}

		/**
		 * Apply f to the value of each promise in a list of promises
		 * and return a new list containing the results.
		 * @param {array} promises
		 * @param {function} f
		 * @param {function} fallback
		 * @returns {Promise}
		 */
		function map(promises, f, fallback) {
			return all(arrayMap.call(promises, function(x) {
				return toPromise(x).then(f, fallback);
			}));
		}

		/**
		 * Return a promise that will always fulfill with an array containing
		 * the outcome states of all input promises.  The returned promise
		 * will never reject.
		 * @param {array} promises
		 * @returns {Promise}
		 */
		function settle(promises) {
			return all(arrayMap.call(promises, function(p) {
				p = toPromise(p);
				return p.then(inspect, inspect);

				function inspect() {
					return p.inspect();
				}
			}));
		}

		function reduce(promises, f) {
			return arguments.length > 2
				? arrayReduce.call(promises, reducer, arguments[2])
				: arrayReduce.call(promises, reducer);

			function reducer(result, x, i) {
				return toPromise(result).then(function(r) {
					return toPromise(x).then(function(x) {
						return f(r, x, i);
					});
				});
			}
		}

		function reduceRight(promises, f) {
			return arguments.length > 2
				? arrayReduceRight.call(promises, reducer, arguments[2])
				: arrayReduceRight.call(promises, reducer);

			function reducer(result, x, i) {
				return toPromise(result).then(function(r) {
					return toPromise(x).then(function(x) {
						return f(r, x, i);
					});
				});
			}
		}
	};


});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],76:[function(_dereq_,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return function flow(Promise) {

		var reject = Promise.reject;
		var origCatch = Promise.prototype['catch'];

		/**
		 * Handle the ultimate fulfillment value or rejection reason, and assume
		 * responsibility for all errors.  If an error propagates out of result
		 * or handleFatalError, it will be rethrown to the host, resulting in a
		 * loud stack track on most platforms and a crash on some.
		 * @param {function?} onResult
		 * @param {function?} onError
		 * @returns {undefined}
		 */
		Promise.prototype.done = function(onResult, onError) {
			var h = this._handler;
			h.when({ resolve: this._maybeFatal, notify: noop, context: this,
				receiver: h.receiver, fulfilled: onResult, rejected: onError,
				progress: void 0 });
		};

		/**
		 * Add Error-type and predicate matching to catch.  Examples:
		 * promise.catch(TypeError, handleTypeError)
		 *   .catch(predicate, handleMatchedErrors)
		 *   .catch(handleRemainingErrors)
		 * @param onRejected
		 * @returns {*}
		 */
		Promise.prototype['catch'] = Promise.prototype.otherwise = function(onRejected) {
			if (arguments.length === 1) {
				return origCatch.call(this, onRejected);
			} else {
				if(typeof onRejected !== 'function') {
					return this.ensure(rejectInvalidPredicate);
				}

				return origCatch.call(this, createCatchFilter(arguments[1], onRejected));
			}
		};

		/**
		 * Wraps the provided catch handler, so that it will only be called
		 * if the predicate evaluates truthy
		 * @param {?function} handler
		 * @param {function} predicate
		 * @returns {function} conditional catch handler
		 */
		function createCatchFilter(handler, predicate) {
			return function(e) {
				return evaluatePredicate(e, predicate)
					? handler.call(this, e)
					: reject(e);
			};
		}

		/**
		 * Ensures that onFulfilledOrRejected will be called regardless of whether
		 * this promise is fulfilled or rejected.  onFulfilledOrRejected WILL NOT
		 * receive the promises' value or reason.  Any returned value will be disregarded.
		 * onFulfilledOrRejected may throw or return a rejected promise to signal
		 * an additional error.
		 * @param {function} handler handler to be called regardless of
		 *  fulfillment or rejection
		 * @returns {Promise}
		 */
		Promise.prototype['finally'] = Promise.prototype.ensure = function(handler) {
			if(typeof handler !== 'function') {
				// Optimization: result will not change, return same promise
				return this;
			}

			handler = isolate(handler, this);
			return this.then(handler, handler);
		};

		/**
		 * Recover from a failure by returning a defaultValue.  If defaultValue
		 * is a promise, it's fulfillment value will be used.  If defaultValue is
		 * a promise that rejects, the returned promise will reject with the
		 * same reason.
		 * @param {*} defaultValue
		 * @returns {Promise} new promise
		 */
		Promise.prototype['else'] = Promise.prototype.orElse = function(defaultValue) {
			return this.then(void 0, function() {
				return defaultValue;
			});
		};

		/**
		 * Shortcut for .then(function() { return value; })
		 * @param  {*} value
		 * @return {Promise} a promise that:
		 *  - is fulfilled if value is not a promise, or
		 *  - if value is a promise, will fulfill with its value, or reject
		 *    with its reason.
		 */
		Promise.prototype['yield'] = function(value) {
			return this.then(function() {
				return value;
			});
		};

		/**
		 * Runs a side effect when this promise fulfills, without changing the
		 * fulfillment value.
		 * @param {function} onFulfilledSideEffect
		 * @returns {Promise}
		 */
		Promise.prototype.tap = function(onFulfilledSideEffect) {
			return this.then(onFulfilledSideEffect)['yield'](this);
		};

		return Promise;
	};

	function rejectInvalidPredicate() {
		throw new TypeError('catch predicate must be a function');
	}

	function evaluatePredicate(e, predicate) {
		return isError(predicate) ? e instanceof predicate : predicate(e);
	}

	function isError(predicate) {
		return predicate === Error
			|| (predicate != null && predicate.prototype instanceof Error);
	}

	// prevent argument passing to f and ignore return value
	function isolate(f, x) {
		return function() {
			f.call(this);
			return x;
		};
	}

	function noop() {}

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],77:[function(_dereq_,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */
/** @author Jeff Escalante */

(function(define) { 'use strict';
define(function() {

	return function fold(Promise) {

		Promise.prototype.fold = function(fn, arg) {
			var promise = this._beget();
			this._handler.fold(promise._handler, fn, arg);
			return promise;
		};

		return Promise;
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],78:[function(_dereq_,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return function inspect(Promise) {

		Promise.prototype.inspect = function() {
			return this._handler.inspect();
		};

		return Promise;
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],79:[function(_dereq_,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return function generate(Promise) {

		var resolve = Promise.resolve;

		Promise.iterate = iterate;
		Promise.unfold = unfold;

		return Promise;

		/**
		 * Generate a (potentially infinite) stream of promised values:
		 * x, f(x), f(f(x)), etc. until condition(x) returns true
		 * @param {function} f function to generate a new x from the previous x
		 * @param {function} condition function that, given the current x, returns
		 *  truthy when the iterate should stop
		 * @param {function} handler function to handle the value produced by f
		 * @param {*|Promise} x starting value, may be a promise
		 * @return {Promise} the result of the last call to f before
		 *  condition returns true
		 */
		function iterate(f, condition, handler, x) {
			return unfold(function(x) {
				return [x, f(x)];
			}, condition, handler, x);
		}

		/**
		 * Generate a (potentially infinite) stream of promised values
		 * by applying handler(generator(seed)) iteratively until
		 * condition(seed) returns true.
		 * @param {function} unspool function that generates a [value, newSeed]
		 *  given a seed.
		 * @param {function} condition function that, given the current seed, returns
		 *  truthy when the unfold should stop
		 * @param {function} handler function to handle the value produced by unspool
		 * @param x {*|Promise} starting value, may be a promise
		 * @return {Promise} the result of the last value produced by unspool before
		 *  condition returns true
		 */
		function unfold(unspool, condition, handler, x) {
			return resolve(x).then(function(seed) {
				return resolve(condition(seed)).then(function(done) {
					return done ? seed : resolve(unspool(seed)).spread(next);
				});
			});

			function next(item, newSeed) {
				return resolve(handler(item)).then(function() {
					return unfold(unspool, condition, handler, newSeed);
				});
			}
		}
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],80:[function(_dereq_,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return function progress(Promise) {

		/**
		 * Register a progress handler for this promise
		 * @param {function} onProgress
		 * @returns {Promise}
		 */
		Promise.prototype.progress = function(onProgress) {
			return this.then(void 0, void 0, onProgress);
		};

		return Promise;
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],81:[function(_dereq_,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function(_dereq_) {

	var timer = _dereq_('../timer');
	var TimeoutError = _dereq_('../TimeoutError');

	return function timed(Promise) {
		/**
		 * Return a new promise whose fulfillment value is revealed only
		 * after ms milliseconds
		 * @param {number} ms milliseconds
		 * @returns {Promise}
		 */
		Promise.prototype.delay = function(ms) {
			var p = this._beget();
			var h = p._handler;

			this._handler.map(function delay(x) {
				timer.set(function() { h.resolve(x); }, ms);
			}, h);

			return p;
		};

		/**
		 * Return a new promise that rejects after ms milliseconds unless
		 * this promise fulfills earlier, in which case the returned promise
		 * fulfills with the same value.
		 * @param {number} ms milliseconds
		 * @param {Error|*=} reason optional rejection reason to use, defaults
		 *   to an Error if not provided
		 * @returns {Promise}
		 */
		Promise.prototype.timeout = function(ms, reason) {
			var hasReason = arguments.length > 1;
			var p = this._beget();
			var h = p._handler;

			var t = timer.set(onTimeout, ms);

			this._handler.chain(h,
				function onFulfill(x) {
					timer.clear(t);
					this.resolve(x); // this = p._handler
				},
				function onReject(x) {
					timer.clear(t);
					this.reject(x); // this = p._handler
				},
				h.notify);

			return p;

			function onTimeout() {
				h.reject(hasReason
					? reason : new TimeoutError('timed out after ' + ms + 'ms'));
			}
		};

		return Promise;
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(_dereq_); }));

},{"../TimeoutError":73,"../timer":86}],82:[function(_dereq_,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function(_dereq_) {

	var timer = _dereq_('../timer');

	return function unhandledRejection(Promise) {
		var logError = noop;
		var logInfo = noop;

		if(typeof console !== 'undefined') {
			logError = typeof console.error !== 'undefined'
				? function (e) { console.error(e); }
				: function (e) { console.log(e); };

			logInfo = typeof console.info !== 'undefined'
				? function (e) { console.info(e); }
				: function (e) { console.log(e); };
		}

		Promise.onPotentiallyUnhandledRejection = function(rejection) {
			enqueue(report, rejection);
		};

		Promise.onPotentiallyUnhandledRejectionHandled = function(rejection) {
			enqueue(unreport, rejection);
		};

		Promise.onFatalRejection = function(rejection) {
			enqueue(throwit, rejection.value);
		};

		var tasks = [];
		var reported = [];
		var running = false;

		function report(r) {
			if(!r.handled) {
				reported.push(r);
				logError('Potentially unhandled rejection [' + r.id + '] ' + formatError(r.value));
			}
		}

		function unreport(r) {
			var i = reported.indexOf(r);
			if(i >= 0) {
				reported.splice(i, 1);
				logInfo('Handled previous rejection [' + r.id + '] ' + formatObject(r.value));
			}
		}

		function enqueue(f, x) {
			tasks.push(f, x);
			if(!running) {
				running = true;
				running = timer.set(flush, 0);
			}
		}

		function flush() {
			running = false;
			while(tasks.length > 0) {
				tasks.shift()(tasks.shift());
			}
		}

		return Promise;
	};

	function formatError(e) {
		var s = typeof e === 'object' && e.stack ? e.stack : formatObject(e);
		return e instanceof Error ? s : s + ' (WARNING: non-Error used)';
	}

	function formatObject(o) {
		var s = String(o);
		if(s === '[object Object]' && typeof JSON !== 'undefined') {
			s = tryStringify(o, s);
		}
		return s;
	}

	function tryStringify(e, defaultValue) {
		try {
			return JSON.stringify(e);
		} catch(e) {
			// Ignore. Cannot JSON.stringify e, stick with String(e)
			return defaultValue;
		}
	}

	function throwit(e) {
		throw e;
	}

	function noop() {}

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(_dereq_); }));

},{"../timer":86}],83:[function(_dereq_,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return function addWith(Promise) {
		/**
		 * Returns a promise whose handlers will be called with `this` set to
		 * the supplied `thisArg`.  Subsequent promises derived from the
		 * returned promise will also have their handlers called with `thisArg`.
		 * Calling `with` with undefined or no arguments will return a promise
		 * whose handlers will again be called in the usual Promises/A+ way (no `this`)
		 * thus safely undoing any previous `with` in the promise chain.
		 *
		 * WARNING: Promises returned from `with`/`withThis` are NOT Promises/A+
		 * compliant, specifically violating 2.2.5 (http://promisesaplus.com/#point-41)
		 *
		 * @param {object} thisArg `this` value for all handlers attached to
		 *  the returned promise.
		 * @returns {Promise}
		 */
		Promise.prototype['with'] = Promise.prototype.withThis
			= Promise.prototype._bindContext;

		return Promise;
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));


},{}],84:[function(_dereq_,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return function makePromise(environment) {

		var tasks = environment.scheduler;

		var objectCreate = Object.create ||
			function(proto) {
				function Child() {}
				Child.prototype = proto;
				return new Child();
			};

		/**
		 * Create a promise whose fate is determined by resolver
		 * @constructor
		 * @returns {Promise} promise
		 * @name Promise
		 */
		function Promise(resolver, handler) {
			this._handler = resolver === Handler ? handler : init(resolver);
		}

		/**
		 * Run the supplied resolver
		 * @param resolver
		 * @returns {makePromise.DeferredHandler}
		 */
		function init(resolver) {
			var handler = new DeferredHandler();

			try {
				resolver(promiseResolve, promiseReject, promiseNotify);
			} catch (e) {
				promiseReject(e);
			}

			return handler;

			/**
			 * Transition from pre-resolution state to post-resolution state, notifying
			 * all listeners of the ultimate fulfillment or rejection
			 * @param {*} x resolution value
			 */
			function promiseResolve (x) {
				handler.resolve(x);
			}
			/**
			 * Reject this promise with reason, which will be used verbatim
			 * @param {Error|*} reason rejection reason, strongly suggested
			 *   to be an Error type
			 */
			function promiseReject (reason) {
				handler.reject(reason);
			}

			/**
			 * Issue a progress event, notifying all progress listeners
			 * @param {*} x progress event payload to pass to all listeners
			 */
			function promiseNotify (x) {
				handler.notify(x);
			}
		}

		// Creation

		Promise.resolve = resolve;
		Promise.reject = reject;
		Promise.never = never;

		Promise._defer = defer;

		/**
		 * Returns a trusted promise. If x is already a trusted promise, it is
		 * returned, otherwise returns a new trusted Promise which follows x.
		 * @param  {*} x
		 * @return {Promise} promise
		 */
		function resolve(x) {
			return isPromise(x) ? x
				: new Promise(Handler, new AsyncHandler(getHandler(x)));
		}

		/**
		 * Return a reject promise with x as its reason (x is used verbatim)
		 * @param {*} x
		 * @returns {Promise} rejected promise
		 */
		function reject(x) {
			return new Promise(Handler, new AsyncHandler(new RejectedHandler(x)));
		}

		/**
		 * Return a promise that remains pending forever
		 * @returns {Promise} forever-pending promise.
		 */
		function never() {
			return foreverPendingPromise; // Should be frozen
		}

		/**
		 * Creates an internal {promise, resolver} pair
		 * @private
		 * @returns {Promise}
		 */
		function defer() {
			return new Promise(Handler, new DeferredHandler());
		}

		// Transformation and flow control

		/**
		 * Transform this promise's fulfillment value, returning a new Promise
		 * for the transformed result.  If the promise cannot be fulfilled, onRejected
		 * is called with the reason.  onProgress *may* be called with updates toward
		 * this promise's fulfillment.
		 * @param {function=} onFulfilled fulfillment handler
		 * @param {function=} onRejected rejection handler
		 * @deprecated @param {function=} onProgress progress handler
		 * @return {Promise} new promise
		 */
		Promise.prototype.then = function(onFulfilled, onRejected) {
			var parent = this._handler;

			if (typeof onFulfilled !== 'function' && parent.join().state() > 0) {
				// Short circuit: value will not change, simply share handler
				return new Promise(Handler, parent);
			}

			var p = this._beget();
			var child = p._handler;

			parent.when({
				resolve: child.resolve,
				notify: child.notify,
				context: child,
				receiver: parent.receiver,
				fulfilled: onFulfilled,
				rejected: onRejected,
				progress: arguments.length > 2 ? arguments[2] : void 0
			});

			return p;
		};

		/**
		 * If this promise cannot be fulfilled due to an error, call onRejected to
		 * handle the error. Shortcut for .then(undefined, onRejected)
		 * @param {function?} onRejected
		 * @return {Promise}
		 */
		Promise.prototype['catch'] = function(onRejected) {
			return this.then(void 0, onRejected);
		};

		/**
		 * Private function to bind a thisArg for this promise's handlers
		 * @private
		 * @param {object} thisArg `this` value for all handlers attached to
		 *  the returned promise.
		 * @returns {Promise}
		 */
		Promise.prototype._bindContext = function(thisArg) {
			return new Promise(Handler, new BoundHandler(this._handler, thisArg));
		};

		/**
		 * Creates a new, pending promise of the same type as this promise
		 * @private
		 * @returns {Promise}
		 */
		Promise.prototype._beget = function() {
			var parent = this._handler;
			var child = new DeferredHandler(parent.receiver, parent.join().context);
			return new this.constructor(Handler, child);
		};

		/**
		 * Check if x is a rejected promise, and if so, delegate to handler._fatal
		 * @private
		 * @param {*} x
		 */
		Promise.prototype._maybeFatal = function(x) {
			if(!maybeThenable(x)) {
				return;
			}

			var handler = getHandler(x);
			var context = this._handler.context;
			handler.catchError(function() {
				this._fatal(context);
			}, handler);
		};

		// Array combinators

		Promise.all = all;
		Promise.race = race;

		/**
		 * Return a promise that will fulfill when all promises in the
		 * input array have fulfilled, or will reject when one of the
		 * promises rejects.
		 * @param {array} promises array of promises
		 * @returns {Promise} promise for array of fulfillment values
		 */
		function all(promises) {
			/*jshint maxcomplexity:8*/
			var resolver = new DeferredHandler();
			var pending = promises.length >>> 0;
			var results = new Array(pending);

			var i, h, x, s;
			for (i = 0; i < promises.length; ++i) {
				x = promises[i];

				if (x === void 0 && !(i in promises)) {
					--pending;
					continue;
				}

				if (maybeThenable(x)) {
					h = isPromise(x)
						? x._handler.join()
						: getHandlerUntrusted(x);

					s = h.state();
					if (s === 0) {
						resolveOne(resolver, results, h, i);
					} else if (s > 0) {
						results[i] = h.value;
						--pending;
					} else {
						resolver.become(h);
						break;
					}

				} else {
					results[i] = x;
					--pending;
				}
			}

			if(pending === 0) {
				resolver.become(new FulfilledHandler(results));
			}

			return new Promise(Handler, resolver);
			function resolveOne(resolver, results, handler, i) {
				handler.map(function(x) {
					results[i] = x;
					if(--pending === 0) {
						this.become(new FulfilledHandler(results));
					}
				}, resolver);
			}
		}

		/**
		 * Fulfill-reject competitive race. Return a promise that will settle
		 * to the same state as the earliest input promise to settle.
		 *
		 * WARNING: The ES6 Promise spec requires that race()ing an empty array
		 * must return a promise that is pending forever.  This implementation
		 * returns a singleton forever-pending promise, the same singleton that is
		 * returned by Promise.never(), thus can be checked with ===
		 *
		 * @param {array} promises array of promises to race
		 * @returns {Promise} if input is non-empty, a promise that will settle
		 * to the same outcome as the earliest input promise to settle. if empty
		 * is empty, returns a promise that will never settle.
		 */
		function race(promises) {
			// Sigh, race([]) is untestable unless we return *something*
			// that is recognizable without calling .then() on it.
			if(Object(promises) === promises && promises.length === 0) {
				return never();
			}

			var h = new DeferredHandler();
			var i, x;
			for(i=0; i<promises.length; ++i) {
				x = promises[i];
				if (x !== void 0 && i in promises) {
					getHandler(x).chain(h, h.resolve, h.reject);
				}
			}
			return new Promise(Handler, h);
		}

		// Promise internals

		/**
		 * Get an appropriate handler for x, without checking for cycles
		 * @private
		 * @param {*} x
		 * @returns {object} handler
		 */
		function getHandler(x) {
			if(isPromise(x)) {
				return x._handler.join();
			}
			return maybeThenable(x) ? getHandlerUntrusted(x) : new FulfilledHandler(x);
		}

		function isPromise(x) {
			return x instanceof Promise;
		}

		/**
		 * Get a handler for potentially untrusted thenable x
		 * @param {*} x
		 * @returns {object} handler
		 */
		function getHandlerUntrusted(x) {
			try {
				var untrustedThen = x.then;
				return typeof untrustedThen === 'function'
					? new ThenableHandler(untrustedThen, x)
					: new FulfilledHandler(x);
			} catch(e) {
				return new RejectedHandler(e);
			}
		}

		/**
		 * Handler for a promise that is pending forever
		 * @private
		 * @constructor
		 */
		function Handler() {}

		Handler.prototype.when
			= Handler.prototype.resolve
			= Handler.prototype.reject
			= Handler.prototype.notify
			= Handler.prototype._fatal
			= Handler.prototype._unreport
			= Handler.prototype._report
			= noop;

		Handler.prototype.inspect = toPendingState;

		Handler.prototype._state = 0;

		Handler.prototype.state = function() {
			return this._state;
		};

		/**
		 * Recursively collapse handler chain to find the handler
		 * nearest to the fully resolved value.
		 * @returns {object} handler nearest the fully resolved value
		 */
		Handler.prototype.join = function() {
			var h = this;
			while(h.handler !== void 0) {
				h = h.handler;
			}
			return h;
		};

		Handler.prototype.chain = function(to, fulfilled, rejected, progress) {
			this.when({
				resolve: noop,
				notify: noop,
				context: void 0,
				receiver: to,
				fulfilled: fulfilled,
				rejected: rejected,
				progress: progress
			});
		};

		Handler.prototype.map = function(f, to) {
			this.chain(to, f, to.reject, to.notify);
		};

		Handler.prototype.catchError = function(f, to) {
			this.chain(to, to.resolve, f, to.notify);
		};

		Handler.prototype.fold = function(to, f, z) {
			this.join().map(function(x) {
				getHandler(z).map(function(z) {
					this.resolve(tryCatchReject2(f, z, x, this.receiver));
				}, this);
			}, to);
		};

		/**
		 * Handler that manages a queue of consumers waiting on a pending promise
		 * @private
		 * @constructor
		 */
		function DeferredHandler(receiver, inheritedContext) {
			Promise.createContext(this, inheritedContext);

			this.consumers = void 0;
			this.receiver = receiver;
			this.handler = void 0;
			this.resolved = false;
		}

		inherit(Handler, DeferredHandler);

		DeferredHandler.prototype._state = 0;

		DeferredHandler.prototype.inspect = function() {
			return this.resolved ? this.join().inspect() : toPendingState();
		};

		DeferredHandler.prototype.resolve = function(x) {
			if(!this.resolved) {
				this.become(getHandler(x));
			}
		};

		DeferredHandler.prototype.reject = function(x) {
			if(!this.resolved) {
				this.become(new RejectedHandler(x));
			}
		};

		DeferredHandler.prototype.join = function() {
			if (this.resolved) {
				var h = this;
				while(h.handler !== void 0) {
					h = h.handler;
					if(h === this) {
						return this.handler = new Cycle();
					}
				}
				return h;
			} else {
				return this;
			}
		};

		DeferredHandler.prototype.run = function() {
			var q = this.consumers;
			var handler = this.join();
			this.consumers = void 0;

			for (var i = 0; i < q.length; ++i) {
				handler.when(q[i]);
			}
		};

		DeferredHandler.prototype.become = function(handler) {
			this.resolved = true;
			this.handler = handler;
			if(this.consumers !== void 0) {
				tasks.enqueue(this);
			}

			if(this.context !== void 0) {
				handler._report(this.context);
			}
		};

		DeferredHandler.prototype.when = function(continuation) {
			if(this.resolved) {
				tasks.enqueue(new ContinuationTask(continuation, this.handler));
			} else {
				if(this.consumers === void 0) {
					this.consumers = [continuation];
				} else {
					this.consumers.push(continuation);
				}
			}
		};

		DeferredHandler.prototype.notify = function(x) {
			if(!this.resolved) {
				tasks.enqueue(new ProgressTask(this, x));
			}
		};

		DeferredHandler.prototype._report = function(context) {
			this.resolved && this.handler.join()._report(context);
		};

		DeferredHandler.prototype._unreport = function() {
			this.resolved && this.handler.join()._unreport();
		};

		DeferredHandler.prototype._fatal = function(context) {
			var c = typeof context === 'undefined' ? this.context : context;
			this.resolved && this.handler.join()._fatal(c);
		};

		/**
		 * Abstract base for handler that delegates to another handler
		 * @private
		 * @param {object} handler
		 * @constructor
		 */
		function DelegateHandler(handler) {
			this.handler = handler;
		}

		inherit(Handler, DelegateHandler);

		DelegateHandler.prototype.inspect = function() {
			return this.join().inspect();
		};

		DelegateHandler.prototype._report = function(context) {
			this.join()._report(context);
		};

		DelegateHandler.prototype._unreport = function() {
			this.join()._unreport();
		};

		/**
		 * Wrap another handler and force it into a future stack
		 * @private
		 * @param {object} handler
		 * @constructor
		 */
		function AsyncHandler(handler) {
			DelegateHandler.call(this, handler);
		}

		inherit(DelegateHandler, AsyncHandler);

		AsyncHandler.prototype.when = function(continuation) {
			tasks.enqueue(new ContinuationTask(continuation, this.join()));
		};

		/**
		 * Handler that follows another handler, injecting a receiver
		 * @private
		 * @param {object} handler another handler to follow
		 * @param {object=undefined} receiver
		 * @constructor
		 */
		function BoundHandler(handler, receiver) {
			DelegateHandler.call(this, handler);
			this.receiver = receiver;
		}

		inherit(DelegateHandler, BoundHandler);

		BoundHandler.prototype.when = function(continuation) {
			// Because handlers are allowed to be shared among promises,
			// each of which possibly having a different receiver, we have
			// to insert our own receiver into the chain if it has been set
			// so that callbacks (f, r, u) will be called using our receiver
			if(this.receiver !== void 0) {
				continuation.receiver = this.receiver;
			}
			this.join().when(continuation);
		};

		/**
		 * Handler that wraps an untrusted thenable and assimilates it in a future stack
		 * @private
		 * @param {function} then
		 * @param {{then: function}} thenable
		 * @constructor
		 */
		function ThenableHandler(then, thenable) {
			DeferredHandler.call(this);
			tasks.enqueue(new AssimilateTask(then, thenable, this));
		}

		inherit(DeferredHandler, ThenableHandler);

		/**
		 * Handler for a fulfilled promise
		 * @private
		 * @param {*} x fulfillment value
		 * @constructor
		 */
		function FulfilledHandler(x) {
			Promise.createContext(this);
			this.value = x;
		}

		inherit(Handler, FulfilledHandler);

		FulfilledHandler.prototype._state = 1;

		FulfilledHandler.prototype.inspect = function() {
			return { state: 'fulfilled', value: this.value };
		};

		FulfilledHandler.prototype.when = function(cont) {
			var x;

			if (typeof cont.fulfilled === 'function') {
				Promise.enterContext(this);
				x = tryCatchReject(cont.fulfilled, this.value, cont.receiver);
				Promise.exitContext();
			} else {
				x = this.value;
			}

			cont.resolve.call(cont.context, x);
		};

		var id = 0;
		/**
		 * Handler for a rejected promise
		 * @private
		 * @param {*} x rejection reason
		 * @constructor
		 */
		function RejectedHandler(x) {
			Promise.createContext(this);

			this.id = ++id;
			this.value = x;
			this.handled = false;
			this.reported = false;

			this._report();
		}

		inherit(Handler, RejectedHandler);

		RejectedHandler.prototype._state = -1;

		RejectedHandler.prototype.inspect = function() {
			return { state: 'rejected', reason: this.value };
		};

		RejectedHandler.prototype.when = function(cont) {
			var x;

			if (typeof cont.rejected === 'function') {
				this._unreport();
				Promise.enterContext(this);
				x = tryCatchReject(cont.rejected, this.value, cont.receiver);
				Promise.exitContext();
			} else {
				x = new Promise(Handler, this);
			}


			cont.resolve.call(cont.context, x);
		};

		RejectedHandler.prototype._report = function(context) {
			tasks.afterQueue(reportUnhandled, this, context);
		};

		RejectedHandler.prototype._unreport = function() {
			this.handled = true;
			tasks.afterQueue(reportHandled, this);
		};

		RejectedHandler.prototype._fatal = function(context) {
			Promise.onFatalRejection(this, context);
		};

		function reportUnhandled(rejection, context) {
			if(!rejection.handled) {
				rejection.reported = true;
				Promise.onPotentiallyUnhandledRejection(rejection, context);
			}
		}

		function reportHandled(rejection) {
			if(rejection.reported) {
				Promise.onPotentiallyUnhandledRejectionHandled(rejection);
			}
		}

		// Unhandled rejection hooks
		// By default, everything is a noop

		// TODO: Better names: "annotate"?
		Promise.createContext
			= Promise.enterContext
			= Promise.exitContext
			= Promise.onPotentiallyUnhandledRejection
			= Promise.onPotentiallyUnhandledRejectionHandled
			= Promise.onFatalRejection
			= noop;

		// Errors and singletons

		var foreverPendingHandler = new Handler();
		var foreverPendingPromise = new Promise(Handler, foreverPendingHandler);

		function Cycle() {
			RejectedHandler.call(this, new TypeError('Promise cycle'));
		}

		inherit(RejectedHandler, Cycle);

		// Snapshot states

		/**
		 * Creates a pending state snapshot
		 * @private
		 * @returns {{state:'pending'}}
		 */
		function toPendingState() {
			return { state: 'pending' };
		}

		// Task runners

		/**
		 * Run a single consumer
		 * @private
		 * @constructor
		 */
		function ContinuationTask(continuation, handler) {
			this.continuation = continuation;
			this.handler = handler;
		}

		ContinuationTask.prototype.run = function() {
			this.handler.join().when(this.continuation);
		};

		/**
		 * Run a queue of progress handlers
		 * @private
		 * @constructor
		 */
		function ProgressTask(handler, value) {
			this.handler = handler;
			this.value = value;
		}

		ProgressTask.prototype.run = function() {
			var q = this.handler.consumers;
			if(q === void 0) {
				return;
			}
			// First progress handler is at index 1
			for (var i = 0; i < q.length; ++i) {
				this._notify(q[i]);
			}
		};

		ProgressTask.prototype._notify = function(continuation) {
			var x = typeof continuation.progress === 'function'
				? tryCatchReturn(continuation.progress, this.value, continuation.receiver)
				: this.value;

			continuation.notify.call(continuation.context, x);
		};

		/**
		 * Assimilate a thenable, sending it's value to resolver
		 * @private
		 * @param {function} then
		 * @param {object|function} thenable
		 * @param {object} resolver
		 * @constructor
		 */
		function AssimilateTask(then, thenable, resolver) {
			this._then = then;
			this.thenable = thenable;
			this.resolver = resolver;
		}

		AssimilateTask.prototype.run = function() {
			var h = this.resolver;
			tryAssimilate(this._then, this.thenable, _resolve, _reject, _notify);

			function _resolve(x) { h.resolve(x); }
			function _reject(x)  { h.reject(x); }
			function _notify(x)  { h.notify(x); }
		};

		function tryAssimilate(then, thenable, resolve, reject, notify) {
			try {
				then.call(thenable, resolve, reject, notify);
			} catch (e) {
				reject(e);
			}
		}

		// Other helpers

		/**
		 * @param {*} x
		 * @returns {boolean} false iff x is guaranteed not to be a thenable
		 */
		function maybeThenable(x) {
			return (typeof x === 'object' || typeof x === 'function') && x !== null;
		}

		/**
		 * Return f.call(thisArg, x), or if it throws return a rejected promise for
		 * the thrown exception
		 * @private
		 */
		function tryCatchReject(f, x, thisArg) {
			try {
				return f.call(thisArg, x);
			} catch(e) {
				return reject(e);
			}
		}

		/**
		 * Same as above, but includes the extra argument parameter.
		 * @private
		 */
		function tryCatchReject2(f, x, y, thisArg) {
			try {
				return f.call(thisArg, x, y);
			} catch(e) {
				return reject(e);
			}
		}

		/**
		 * Return f.call(thisArg, x), or if it throws, *return* the exception
		 * @private
		 */
		function tryCatchReturn(f, x, thisArg) {
			try {
				return f.call(thisArg, x);
			} catch(e) {
				return e;
			}
		}

		function inherit(Parent, Child) {
			Child.prototype = objectCreate(Parent.prototype);
			Child.prototype.constructor = Child;
		}

		function noop() {}

		return Promise;
	};
});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],85:[function(_dereq_,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function(_dereq_) {

	var Queue = _dereq_('./Queue');

	// Credit to Twisol (https://github.com/Twisol) for suggesting
	// this type of extensible queue + trampoline approach for next-tick conflation.

	function Scheduler(enqueue) {
		this._enqueue = enqueue;
		this._handlerQueue = new Queue(15);
		this._afterQueue = new Queue(5);
		this._running = false;

		var self = this;
		this.drain = function() {
			self._drain();
		};
	}

	/**
	 * Enqueue a task. If the queue is not currently scheduled to be
	 * drained, schedule it.
	 * @param {function} task
	 */
	Scheduler.prototype.enqueue = function(task) {
		this._handlerQueue.push(task);
		if(!this._running) {
			this._running = true;
			this._enqueue(this.drain);
		}
	};

	Scheduler.prototype.afterQueue = function(f, x, y) {
		this._afterQueue.push(f);
		this._afterQueue.push(x);
		this._afterQueue.push(y);
		if(!this._running) {
			this._running = true;
			this._enqueue(this.drain);
		}
	};

	/**
	 * Drain the handler queue entirely, being careful to allow the
	 * queue to be extended while it is being processed, and to continue
	 * processing until it is truly empty.
	 */
	Scheduler.prototype._drain = function() {
		var q = this._handlerQueue;
		while(q.length > 0) {
			q.shift().run();
		}

		this._running = false;

		q = this._afterQueue;
		while(q.length > 0) {
			q.shift()(q.shift(), q.shift());
		}
	};

	return Scheduler;

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(_dereq_); }));

},{"./Queue":72}],86:[function(_dereq_,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function(_dereq_) {
	/*global setTimeout,clearTimeout*/
	var cjsRequire, vertx, setTimer, clearTimer;

	cjsRequire = _dereq_;

	try {
		vertx = cjsRequire('vertx');
		setTimer = function (f, ms) { return vertx.setTimer(ms, f); };
		clearTimer = vertx.cancelTimer;
	} catch (e) {
		setTimer = function(f, ms) { return setTimeout(f, ms); };
		clearTimer = function(t) { return clearTimeout(t); };
	}

	return {
		set: setTimer,
		clear: clearTimer
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(_dereq_); }));

},{}],87:[function(_dereq_,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */

/**
 * Promises/A+ and when() implementation
 * when is part of the cujoJS family of libraries (http://cujojs.com/)
 * @author Brian Cavalier
 * @author John Hann
 * @version 3.2.3
 */
(function(define) { 'use strict';
define(function (_dereq_) {

	var timed = _dereq_('./lib/decorators/timed');
	var array = _dereq_('./lib/decorators/array');
	var flow = _dereq_('./lib/decorators/flow');
	var fold = _dereq_('./lib/decorators/fold');
	var inspect = _dereq_('./lib/decorators/inspect');
	var generate = _dereq_('./lib/decorators/iterate');
	var progress = _dereq_('./lib/decorators/progress');
	var withThis = _dereq_('./lib/decorators/with');
	var unhandledRejection = _dereq_('./lib/decorators/unhandledRejection');
	var TimeoutError = _dereq_('./lib/TimeoutError');

	var Promise = [array, flow, fold, generate, progress,
		inspect, withThis, timed, unhandledRejection]
		.reduce(function(Promise, feature) {
			return feature(Promise);
		}, _dereq_('./lib/Promise'));

	var slice = Array.prototype.slice;

	// Public API

	when.promise     = promise;              // Create a pending promise
	when.resolve     = Promise.resolve;      // Create a resolved promise
	when.reject      = Promise.reject;       // Create a rejected promise

	when.lift        = lift;                 // lift a function to return promises
	when['try']      = attempt;              // call a function and return a promise
	when.attempt     = attempt;              // alias for when.try

	when.iterate     = Promise.iterate;      // Generate a stream of promises
	when.unfold      = Promise.unfold;       // Generate a stream of promises

	when.join        = join;                 // Join 2 or more promises

	when.all         = all;                  // Resolve a list of promises
	when.settle      = settle;               // Settle a list of promises

	when.any         = lift(Promise.any);    // One-winner race
	when.some        = lift(Promise.some);   // Multi-winner race

	when.map         = map;                  // Array.map() for promises
	when.reduce      = reduce;               // Array.reduce() for promises
	when.reduceRight = reduceRight;          // Array.reduceRight() for promises

	when.isPromiseLike = isPromiseLike;      // Is something promise-like, aka thenable

	when.Promise     = Promise;              // Promise constructor
	when.defer       = defer;                // Create a {promise, resolve, reject} tuple

	// Error types

	when.TimeoutError = TimeoutError;

	/**
	 * Get a trusted promise for x, or by transforming x with onFulfilled
	 *
	 * @param {*} x
	 * @param {function?} onFulfilled callback to be called when x is
	 *   successfully fulfilled.  If promiseOrValue is an immediate value, callback
	 *   will be invoked immediately.
	 * @param {function?} onRejected callback to be called when x is
	 *   rejected.
	 * @deprecated @param {function?} onProgress callback to be called when progress updates
	 *   are issued for x.
	 * @returns {Promise} a new promise that will fulfill with the return
	 *   value of callback or errback or the completion value of promiseOrValue if
	 *   callback and/or errback is not supplied.
	 */
	function when(x, onFulfilled, onRejected) {
		var p = Promise.resolve(x);
		if(arguments.length < 2) {
			return p;
		}

		return arguments.length > 3
			? p.then(onFulfilled, onRejected, arguments[3])
			: p.then(onFulfilled, onRejected);
	}

	/**
	 * Creates a new promise whose fate is determined by resolver.
	 * @param {function} resolver function(resolve, reject, notify)
	 * @returns {Promise} promise whose fate is determine by resolver
	 */
	function promise(resolver) {
		return new Promise(resolver);
	}

	/**
	 * Lift the supplied function, creating a version of f that returns
	 * promises, and accepts promises as arguments.
	 * @param {function} f
	 * @returns {Function} version of f that returns promises
	 */
	function lift(f) {
		return function() {
			return _apply(f, this, slice.call(arguments));
		};
	}

	/**
	 * Call f in a future turn, with the supplied args, and return a promise
	 * for the result.
	 * @param {function} f
	 * @returns {Promise}
	 */
	function attempt(f /*, args... */) {
		/*jshint validthis:true */
		return _apply(f, this, slice.call(arguments, 1));
	}

	/**
	 * try/lift helper that allows specifying thisArg
	 * @private
	 */
	function _apply(f, thisArg, args) {
		return Promise.all(args).then(function(args) {
			return f.apply(thisArg, args);
		});
	}

	/**
	 * Creates a {promise, resolver} pair, either or both of which
	 * may be given out safely to consumers.
	 * @return {{promise: Promise, resolve: function, reject: function, notify: function}}
	 */
	function defer() {
		return new Deferred();
	}

	function Deferred() {
		var p = Promise._defer();

		function resolve(x) { p._handler.resolve(x); }
		function reject(x) { p._handler.reject(x); }
		function notify(x) { p._handler.notify(x); }

		this.promise = p;
		this.resolve = resolve;
		this.reject = reject;
		this.notify = notify;
		this.resolver = { resolve: resolve, reject: reject, notify: notify };
	}

	/**
	 * Determines if x is promise-like, i.e. a thenable object
	 * NOTE: Will return true for *any thenable object*, and isn't truly
	 * safe, since it may attempt to access the `then` property of x (i.e.
	 *  clever/malicious getters may do weird things)
	 * @param {*} x anything
	 * @returns {boolean} true if x is promise-like
	 */
	function isPromiseLike(x) {
		return x && typeof x.then === 'function';
	}

	/**
	 * Return a promise that will resolve only once all the supplied arguments
	 * have resolved. The resolution value of the returned promise will be an array
	 * containing the resolution values of each of the arguments.
	 * @param {...*} arguments may be a mix of promises and values
	 * @returns {Promise}
	 */
	function join(/* ...promises */) {
		return Promise.all(arguments);
	}

	/**
	 * Return a promise that will fulfill once all input promises have
	 * fulfilled, or reject when any one input promise rejects.
	 * @param {array|Promise} promises array (or promise for an array) of promises
	 * @returns {Promise}
	 */
	function all(promises) {
		return when(promises, Promise.all);
	}

	/**
	 * Return a promise that will always fulfill with an array containing
	 * the outcome states of all input promises.  The returned promise
	 * will only reject if `promises` itself is a rejected promise.
	 * @param {array|Promise} promises array (or promise for an array) of promises
	 * @returns {Promise}
	 */
	function settle(promises) {
		return when(promises, Promise.settle);
	}

	/**
	 * Promise-aware array map function, similar to `Array.prototype.map()`,
	 * but input array may contain promises or values.
	 * @param {Array|Promise} promises array of anything, may contain promises and values
	 * @param {function} mapFunc map function which may return a promise or value
	 * @returns {Promise} promise that will fulfill with an array of mapped values
	 *  or reject if any input promise rejects.
	 */
	function map(promises, mapFunc) {
		return when(promises, function(promises) {
			return Promise.map(promises, mapFunc);
		});
	}

	/**
	 * Traditional reduce function, similar to `Array.prototype.reduce()`, but
	 * input may contain promises and/or values, and reduceFunc
	 * may return either a value or a promise, *and* initialValue may
	 * be a promise for the starting value.
	 *
	 * @param {Array|Promise} promises array or promise for an array of anything,
	 *      may contain a mix of promises and values.
	 * @param {function} f reduce function reduce(currentValue, nextValue, index)
	 * @returns {Promise} that will resolve to the final reduced value
	 */
	function reduce(promises, f /*, initialValue */) {
		/*jshint unused:false*/
		var args = slice.call(arguments, 1);
		return when(promises, function(array) {
			args.unshift(array);
			return Promise.reduce.apply(Promise, args);
		});
	}

	/**
	 * Traditional reduce function, similar to `Array.prototype.reduceRight()`, but
	 * input may contain promises and/or values, and reduceFunc
	 * may return either a value or a promise, *and* initialValue may
	 * be a promise for the starting value.
	 *
	 * @param {Array|Promise} promises array or promise for an array of anything,
	 *      may contain a mix of promises and values.
	 * @param {function} f reduce function reduce(currentValue, nextValue, index)
	 * @returns {Promise} that will resolve to the final reduced value
	 */
	function reduceRight(promises, f /*, initialValue */) {
		/*jshint unused:false*/
		var args = slice.call(arguments, 1);
		return when(promises, function(array) {
			args.unshift(array);
			return Promise.reduceRight.apply(Promise, args);
		});
	}

	return when;
});
})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(_dereq_); });

},{"./lib/Promise":71,"./lib/TimeoutError":73,"./lib/decorators/array":75,"./lib/decorators/flow":76,"./lib/decorators/fold":77,"./lib/decorators/inspect":78,"./lib/decorators/iterate":79,"./lib/decorators/progress":80,"./lib/decorators/timed":81,"./lib/decorators/unhandledRejection":82,"./lib/decorators/with":83}],88:[function(_dereq_,module,exports){
/*global module:true, require:false*/

var bane = _dereq_("bane");
var websocket = _dereq_("../lib/websocket/");
var when = _dereq_("when");

function Mopidy(settings) {
    if (!(this instanceof Mopidy)) {
        return new Mopidy(settings);
    }

    this._console = this._getConsole(settings || {});
    this._settings = this._configure(settings || {});

    this._backoffDelay = this._settings.backoffDelayMin;
    this._pendingRequests = {};
    this._webSocket = null;

    bane.createEventEmitter(this);
    this._delegateEvents();

    if (this._settings.autoConnect) {
        this.connect();
    }
}

Mopidy.ConnectionError = function (message) {
    this.name = "ConnectionError";
    this.message = message;
};
Mopidy.ConnectionError.prototype = new Error();
Mopidy.ConnectionError.prototype.constructor = Mopidy.ConnectionError;

Mopidy.ServerError = function (message) {
    this.name = "ServerError";
    this.message = message;
};
Mopidy.ServerError.prototype = new Error();
Mopidy.ServerError.prototype.constructor = Mopidy.ServerError;

Mopidy.WebSocket = websocket.Client;

Mopidy.prototype._getConsole = function (settings) {
    if (typeof settings.console !== "undefined") {
        return settings.console;
    }

    var con = typeof console !== "undefined" && console || {};

    con.log = con.log || function () {};
    con.warn = con.warn || function () {};
    con.error = con.error || function () {};

    return con;
};

Mopidy.prototype._configure = function (settings) {
    var currentHost = (typeof document !== "undefined" &&
        document.location.host) || "localhost";
    settings.webSocketUrl = settings.webSocketUrl ||
        "ws://" + currentHost + "/mopidy/ws";

    if (settings.autoConnect !== false) {
        settings.autoConnect = true;
    }

    settings.backoffDelayMin = settings.backoffDelayMin || 1000;
    settings.backoffDelayMax = settings.backoffDelayMax || 64000;

    if (typeof settings.callingConvention === "undefined") {
        this._console.warn(
            "Mopidy.js is using the default calling convention. The " +
            "default will change in the future. You should explicitly " +
            "specify which calling convention you use.");
    }
    settings.callingConvention = (
        settings.callingConvention || "by-position-only");

    return settings;
};

Mopidy.prototype._delegateEvents = function () {
    // Remove existing event handlers
    this.off("websocket:close");
    this.off("websocket:error");
    this.off("websocket:incomingMessage");
    this.off("websocket:open");
    this.off("state:offline");

    // Register basic set of event handlers
    this.on("websocket:close", this._cleanup);
    this.on("websocket:error", this._handleWebSocketError);
    this.on("websocket:incomingMessage", this._handleMessage);
    this.on("websocket:open", this._resetBackoffDelay);
    this.on("websocket:open", this._getApiSpec);
    this.on("state:offline", this._reconnect);
};

Mopidy.prototype.connect = function () {
    if (this._webSocket) {
        if (this._webSocket.readyState === Mopidy.WebSocket.OPEN) {
            return;
        } else {
            this._webSocket.close();
        }
    }

    this._webSocket = this._settings.webSocket ||
        new Mopidy.WebSocket(this._settings.webSocketUrl);

    this._webSocket.onclose = function (close) {
        this.emit("websocket:close", close);
    }.bind(this);

    this._webSocket.onerror = function (error) {
        this.emit("websocket:error", error);
    }.bind(this);

    this._webSocket.onopen = function () {
        this.emit("websocket:open");
    }.bind(this);

    this._webSocket.onmessage = function (message) {
        this.emit("websocket:incomingMessage", message);
    }.bind(this);
};

Mopidy.prototype._cleanup = function (closeEvent) {
    Object.keys(this._pendingRequests).forEach(function (requestId) {
        var resolver = this._pendingRequests[requestId];
        delete this._pendingRequests[requestId];
        var error = new Mopidy.ConnectionError("WebSocket closed");
        error.closeEvent = closeEvent;
        resolver.reject(error);
    }.bind(this));

    this.emit("state:offline");
};

Mopidy.prototype._reconnect = function () {
    this.emit("reconnectionPending", {
        timeToAttempt: this._backoffDelay
    });

    setTimeout(function () {
        this.emit("reconnecting");
        this.connect();
    }.bind(this), this._backoffDelay);

    this._backoffDelay = this._backoffDelay * 2;
    if (this._backoffDelay > this._settings.backoffDelayMax) {
        this._backoffDelay = this._settings.backoffDelayMax;
    }
};

Mopidy.prototype._resetBackoffDelay = function () {
    this._backoffDelay = this._settings.backoffDelayMin;
};

Mopidy.prototype.close = function () {
    this.off("state:offline", this._reconnect);
    this._webSocket.close();
};

Mopidy.prototype._handleWebSocketError = function (error) {
    this._console.warn("WebSocket error:", error.stack || error);
};

Mopidy.prototype._send = function (message) {
    switch (this._webSocket.readyState) {
    case Mopidy.WebSocket.CONNECTING:
        return when.reject(
            new Mopidy.ConnectionError("WebSocket is still connecting"));
    case Mopidy.WebSocket.CLOSING:
        return when.reject(
            new Mopidy.ConnectionError("WebSocket is closing"));
    case Mopidy.WebSocket.CLOSED:
        return when.reject(
            new Mopidy.ConnectionError("WebSocket is closed"));
    default:
        var deferred = when.defer();
        message.jsonrpc = "2.0";
        message.id = this._nextRequestId();
        this._pendingRequests[message.id] = deferred.resolver;
        this._webSocket.send(JSON.stringify(message));
        this.emit("websocket:outgoingMessage", message);
        return deferred.promise;
    }
};

Mopidy.prototype._nextRequestId = (function () {
    var lastUsed = -1;
    return function () {
        lastUsed += 1;
        return lastUsed;
    };
}());

Mopidy.prototype._handleMessage = function (message) {
    try {
        var data = JSON.parse(message.data);
        if (data.hasOwnProperty("id")) {
            this._handleResponse(data);
        } else if (data.hasOwnProperty("event")) {
            this._handleEvent(data);
        } else {
            this._console.warn(
                "Unknown message type received. Message was: " +
                message.data);
        }
    } catch (error) {
        if (error instanceof SyntaxError) {
            this._console.warn(
                "WebSocket message parsing failed. Message was: " +
                message.data);
        } else {
            throw error;
        }
    }
};

Mopidy.prototype._handleResponse = function (responseMessage) {
    if (!this._pendingRequests.hasOwnProperty(responseMessage.id)) {
        this._console.warn(
            "Unexpected response received. Message was:", responseMessage);
        return;
    }

    var error;
    var resolver = this._pendingRequests[responseMessage.id];
    delete this._pendingRequests[responseMessage.id];

    if (responseMessage.hasOwnProperty("result")) {
        resolver.resolve(responseMessage.result);
    } else if (responseMessage.hasOwnProperty("error")) {
        error = new Mopidy.ServerError(responseMessage.error.message);
        error.code = responseMessage.error.code;
        error.data = responseMessage.error.data;
        resolver.reject(error);
        this._console.warn("Server returned error:", responseMessage.error);
    } else {
        error = new Error("Response without 'result' or 'error' received");
        error.data = {response: responseMessage};
        resolver.reject(error);
        this._console.warn(
            "Response without 'result' or 'error' received. Message was:",
            responseMessage);
    }
};

Mopidy.prototype._handleEvent = function (eventMessage) {
    var type = eventMessage.event;
    var data = eventMessage;
    delete data.event;

    this.emit("event:" + this._snakeToCamel(type), data);
};

Mopidy.prototype._getApiSpec = function () {
    return this._send({method: "core.describe"})
        .then(this._createApi.bind(this))
        .catch(this._handleWebSocketError);
};

Mopidy.prototype._createApi = function (methods) {
    var byPositionOrByName = (
        this._settings.callingConvention === "by-position-or-by-name");

    var caller = function (method) {
        return function () {
            var message = {method: method};
            if (arguments.length === 0) {
                return this._send(message);
            }
            if (!byPositionOrByName) {
                message.params = Array.prototype.slice.call(arguments);
                return this._send(message);
            }
            if (arguments.length > 1) {
                return when.reject(new Error(
                    "Expected zero arguments, a single array, " +
                    "or a single object."));
            }
            if (!Array.isArray(arguments[0]) &&
                arguments[0] !== Object(arguments[0])) {
                return when.reject(new TypeError(
                    "Expected an array or an object."));
            }
            message.params = arguments[0];
            return this._send(message);
        }.bind(this);
    }.bind(this);

    var getPath = function (fullName) {
        var path = fullName.split(".");
        if (path.length >= 1 && path[0] === "core") {
            path = path.slice(1);
        }
        return path;
    };

    var createObjects = function (objPath) {
        var parentObj = this;
        objPath.forEach(function (objName) {
            objName = this._snakeToCamel(objName);
            parentObj[objName] = parentObj[objName] || {};
            parentObj = parentObj[objName];
        }.bind(this));
        return parentObj;
    }.bind(this);

    var createMethod = function (fullMethodName) {
        var methodPath = getPath(fullMethodName);
        var methodName = this._snakeToCamel(methodPath.slice(-1)[0]);
        var object = createObjects(methodPath.slice(0, -1));
        object[methodName] = caller(fullMethodName);
        object[methodName].description = methods[fullMethodName].description;
        object[methodName].params = methods[fullMethodName].params;
    }.bind(this);

    Object.keys(methods).forEach(createMethod);
    this.emit("state:online");
};

Mopidy.prototype._snakeToCamel = function (name) {
    return name.replace(/(_[a-z])/g, function (match) {
        return match.toUpperCase().replace("_", "");
    });
};

module.exports = Mopidy;

},{"../lib/websocket/":69,"bane":70,"when":87}],89:[function(_dereq_,module,exports){
var templater = _dereq_("handlebars/runtime").default.template;module.exports = templater(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, self=this;

function program1(depth0,data) {
  
  
  return "\n<li class=\"track_list_item empty-list\">No Albums</li>\n";
  }

  stack1 = helpers.unless.call(depth0, (depth0 && depth0.collection), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  });
},{"handlebars/runtime":67}],90:[function(_dereq_,module,exports){
var templater = _dereq_("handlebars/runtime").default.template;module.exports = templater(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<span class=\"album_title\">";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</span> <span class=\"album_artist\">"
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = (depth0 && depth0.artists)),stack1 == null || stack1 === false ? stack1 : stack1[0])),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</span>\n";
  return buffer;
  });
},{"handlebars/runtime":67}],91:[function(_dereq_,module,exports){
var templater = _dereq_("handlebars/runtime").default.template;module.exports = templater(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<img src=\""
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = (depth0 && depth0.image)),stack1 == null || stack1 === false ? stack1 : stack1[2])),stack1 == null || stack1 === false ? stack1 : stack1['#text'])),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">\n";
  return buffer;
  });
},{"handlebars/runtime":67}],92:[function(_dereq_,module,exports){
var templater = _dereq_("handlebars/runtime").default.template;module.exports = templater(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div class=\"columns one-half\">\n<section class=\"view-section album_tracks\">\n<h1>Tracks</h1>\n<ul class=\"action-toolbar\">\n  <li><span role=\"button\" class=\"queue_all\" tabindex=\"0\">Queue Album</span> <span role=\"button\" class=\"queue_selected\" tabindex=\"0\">Queue Selected</span></li>\n</ul>\n</section>\n</div>\n\n<div class=\"columns one-half\">\n<section class=\"view-section album_description\">\n</section>\n</div>\n";
  });
},{"handlebars/runtime":67}],93:[function(_dereq_,module,exports){
var templater = _dereq_("handlebars/runtime").default.template;module.exports = templater(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, self=this;

function program1(depth0,data) {
  
  
  return "\n<li class=\"interactive-list-item empty-list\">No Artists</li>\n";
  }

  stack1 = helpers.unless.call(depth0, (depth0 && depth0.collection), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  });
},{"handlebars/runtime":67}],94:[function(_dereq_,module,exports){
var templater = _dereq_("handlebars/runtime").default.template;module.exports = templater(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<span class=\"artist_title\">";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</span>\n";
  return buffer;
  });
},{"handlebars/runtime":67}],95:[function(_dereq_,module,exports){
var templater = _dereq_("handlebars/runtime").default.template;module.exports = templater(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<a href=\"#artists/";
  if (helper = helpers.uri) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.uri); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "/";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</a>\n";
  return buffer;
  });
},{"handlebars/runtime":67}],96:[function(_dereq_,module,exports){
var templater = _dereq_("handlebars/runtime").default.template;module.exports = templater(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n<img src=\"";
  stack1 = ((stack1 = ((stack1 = ((stack1 = (depth0 && depth0.image)),stack1 == null || stack1 === false ? stack1 : stack1[3])),stack1 == null || stack1 === false ? stack1 : stack1['#text'])),typeof stack1 === functionType ? stack1.apply(depth0) : stack1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\" alt=\"Artist image\" class=\"cover-art\">\n";
  return buffer;
  }

function program3(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n<p>";
  stack1 = ((stack1 = ((stack1 = (depth0 && depth0.bio)),stack1 == null || stack1 === false ? stack1 : stack1.summary)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</p>\n\n<p>"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.bio)),stack1 == null || stack1 === false ? stack1 : stack1.placeformed)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " "
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.bio)),stack1 == null || stack1 === false ? stack1 : stack1.yearformed)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</p>\n";
  return buffer;
  }

  stack1 = helpers['if'].call(depth0, (depth0 && depth0.image), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.bio), {hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  });
},{"handlebars/runtime":67}],97:[function(_dereq_,module,exports){
var templater = _dereq_("handlebars/runtime").default.template;module.exports = templater(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<ul>\n<li class=\"playback-controls-back\" role=\"button\">Back</li><li class=\"playback-controls-play\" role=\"button\">Play</li><li class=\"playback-controls-pause\" role=\"button\">Pause</li><li class=\"playback-controls-next\" role=\"button\">Next</li>\n</ul>\n";
  });
},{"handlebars/runtime":67}],98:[function(_dereq_,module,exports){
var templater = _dereq_("handlebars/runtime").default.template;module.exports = templater(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<input type=\"search\">\n";
  });
},{"handlebars/runtime":67}],99:[function(_dereq_,module,exports){
var templater = _dereq_("handlebars/runtime").default.template;module.exports = templater(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += " ";
  if (helper = helpers.volume) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.volume); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  return buffer;
  }

function program3(depth0,data) {
  
  
  return "-";
  }

  buffer += "<ul>\n<li role=button class=\"volume-control volume-down\">Down</li><li class=\"volume-control volume-level\">";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.volume), {hash:{},inverse:self.program(3, program3, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</li><li role=\"button\" class=\"volume-control volume-up\">Up</li>\n</ul>\n";
  return buffer;
  });
},{"handlebars/runtime":67}],100:[function(_dereq_,module,exports){
var templater = _dereq_("handlebars/runtime").default.template;module.exports = templater(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n    <div class=\"modal-header\">\n      <h1 class=\"modal-title\">";
  if (helper = helpers.header) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.header); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</h1>\n    </div>\n    ";
  return buffer;
  }

  buffer += "<div class=\"modal-dialog\">\n  <div class=\"modal-content\">\n    ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.header), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    <div class=\"modal-body\">\n      ";
  if (helper = helpers.message) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.message); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\n    </div>\n  </div>\n</div>\n";
  return buffer;
  });
},{"handlebars/runtime":67}],101:[function(_dereq_,module,exports){
var templater = _dereq_("handlebars/runtime").default.template;module.exports = templater(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<p><strong>juke<span class=\"pink\">Pi</span></strong> is connecting to the Pi in the Sky. Please hold.</p>\n";
  });
},{"handlebars/runtime":67}],102:[function(_dereq_,module,exports){
var templater = _dereq_("handlebars/runtime").default.template;module.exports = templater(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<header role=\"banner\"><h1>JukePi</h1></header>\n";
  });
},{"handlebars/runtime":67}],103:[function(_dereq_,module,exports){
var templater = _dereq_("handlebars/runtime").default.template;module.exports = templater(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.album)),stack1 == null || stack1 === false ? stack1 : stack1.image), {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  }
function program2(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n";
  stack1 = helpers['if'].call(depth0, ((stack1 = ((stack1 = (depth0 && depth0.album)),stack1 == null || stack1 === false ? stack1 : stack1.image)),stack1 == null || stack1 === false ? stack1 : stack1[1]), {hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  }
function program3(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n";
  stack1 = helpers['if'].call(depth0, ((stack1 = ((stack1 = ((stack1 = (depth0 && depth0.album)),stack1 == null || stack1 === false ? stack1 : stack1.image)),stack1 == null || stack1 === false ? stack1 : stack1[1])),stack1 == null || stack1 === false ? stack1 : stack1['#text']), {hash:{},inverse:self.noop,fn:self.program(4, program4, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  }
function program4(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n<img src=\""
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = ((stack1 = (depth0 && depth0.album)),stack1 == null || stack1 === false ? stack1 : stack1.image)),stack1 == null || stack1 === false ? stack1 : stack1[1])),stack1 == null || stack1 === false ? stack1 : stack1['#text'])),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" alt=\"Cover art for "
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.album)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" class=\"cover-art\">\n";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "<br>"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.album)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "<br>"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.album)),stack1 == null || stack1 === false ? stack1 : stack1.artist)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\n";
  return buffer;
  }

  stack1 = helpers['if'].call(depth0, (depth0 && depth0.album), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  });
},{"handlebars/runtime":67}],104:[function(_dereq_,module,exports){
var templater = _dereq_("handlebars/runtime").default.template;module.exports = templater(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "";


  return buffer;
  });
},{"handlebars/runtime":67}],105:[function(_dereq_,module,exports){
var templater = _dereq_("handlebars/runtime").default.template;module.exports = templater(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data,depth1) {
  
  var buffer = "", stack1;
  buffer += "\n  <li id=\"tab-"
    + escapeExpression(((stack1 = (depth1 && depth1.baseName)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "-"
    + escapeExpression(((stack1 = (data == null || data === false ? data : data.index)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" role=\"tab\" aria-controls=\"panel-"
    + escapeExpression(((stack1 = (depth1 && depth1.baseName)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "-"
    + escapeExpression(((stack1 = (data == null || data === false ? data : data.index)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" tabindex=\"";
  stack1 = helpers['if'].call(depth0, (data == null || data === false ? data : data.first), {hash:{},inverse:self.program(4, program4, data),fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\">"
    + escapeExpression((typeof depth0 === functionType ? depth0.apply(depth0) : depth0))
    + "</li>\n  ";
  return buffer;
  }
function program2(depth0,data) {
  
  
  return "0";
  }

function program4(depth0,data) {
  
  
  return "-1";
  }

  buffer += "<ul role=\"tablist\">\n  ";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.tabs), {hash:{},inverse:self.noop,fn:self.programWithDepth(1, program1, data, depth0),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n</ul>\n";
  return buffer;
  });
},{"handlebars/runtime":67}],106:[function(_dereq_,module,exports){
var templater = _dereq_("handlebars/runtime").default.template;module.exports = templater(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, self=this;

function program1(depth0,data) {
  
  
  return "\n<li class=\"interactive-list-item empty-list\">No Tracks</li>\n";
  }

  stack1 = helpers.unless.call(depth0, (depth0 && depth0.collection), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  });
},{"handlebars/runtime":67}],107:[function(_dereq_,module,exports){
var templater = _dereq_("handlebars/runtime").default.template;module.exports = templater(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<ul class=\"action-toolbar\">\n  <li><input type=\"checkbox\" class=\"btn btn-primary\"></li>\n  <li><span role=\"button\" class=\"queue_selected btn btn-primary\" tabindex=\"0\">Add to queue</span></li>\n</ul>\n";
  });
},{"handlebars/runtime":67}],108:[function(_dereq_,module,exports){
var templater = _dereq_("handlebars/runtime").default.template;module.exports = templater(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  
  return "current_track";
  }

  buffer += "<input type=\"checkbox\" data-track-id=\"";
  if (helper = helpers.uri) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.uri); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" tabindex=\"-1\">\n<span class=\"list-item-title ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.current), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\">";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</span> <span class=\"list-item-artist\">"
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = (depth0 && depth0.artists)),stack1 == null || stack1 === false ? stack1 : stack1[0])),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</span>\n";
  return buffer;
  });
},{"handlebars/runtime":67}],109:[function(_dereq_,module,exports){
var templater = _dereq_("handlebars/runtime").default.template;module.exports = templater(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, self=this;

function program1(depth0,data) {
  
  
  return "\n<li class=\"interactive-list-item empty-list\">No Songs in Queue</li>\n";
  }

  stack1 = helpers.unless.call(depth0, (depth0 && depth0.collection), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  });
},{"handlebars/runtime":67}],110:[function(_dereq_,module,exports){
var templater = _dereq_("handlebars/runtime").default.template;module.exports = templater(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "  <ul class=\"action-toolbar\">\n    <li><span role=\"button\" class=\"clear_queue btn btn-primary\" tabindex=\"0\">Clear Queue</span></li>\n    <li><span role=\"button\" class=\"delete_selected btn btn-primary\" tabindex=\"0\">Delete Selected</span></li>\n  </ul>\n";
  });
},{"handlebars/runtime":67}],111:[function(_dereq_,module,exports){
var templater = _dereq_("handlebars/runtime").default.template;module.exports = templater(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  
  return "current_track";
  }

  buffer += "<input type=\"checkbox\" data-tracklist-id=\"";
  if (helper = helpers.tlid) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.tlid); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" tabindex=\"-1\">\n<span class=\"list-item-title ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.current), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\">"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.track)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</span> <span class=\"list-item-artist\">"
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = ((stack1 = (depth0 && depth0.track)),stack1 == null || stack1 === false ? stack1 : stack1.artists)),stack1 == null || stack1 === false ? stack1 : stack1[0])),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</span>\n";
  return buffer;
  });
},{"handlebars/runtime":67}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9jb25ucnMvUHJvamVjdHMvanVrZXBpL2p1a2VwaS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL2xpYi9hcHAuanMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvbGliL2NvbGxlY3Rpb24vYWxidW0uanMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvbGliL2NvbGxlY3Rpb24vYXJ0aXN0LmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL2xpYi9jb2xsZWN0aW9uL2NvbGxlY3Rpb24uanMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvbGliL2NvbGxlY3Rpb24vdHJhY2suanMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvbGliL2NvbGxlY3Rpb24vdHJhY2tfbGlzdC5qcyIsIi9Vc2Vycy9jb25ucnMvUHJvamVjdHMvanVrZXBpL2p1a2VwaS9saWIvZW52Lmpzb24iLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvbGliL21vZGVsL2FsYnVtLmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL2xpYi9tb2RlbC9hcnRpc3QuanMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvbGliL21vZGVsL21vZGVsLmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL2xpYi9tb2RlbC9zZWFyY2guanMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvbGliL21vZGVsL3RyYWNrLmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL2xpYi9tb2RlbC90cmFja19saXN0X3RyYWNrLmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL2xpYi9yb3V0ZXIuanMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvbGliL3RlbXBsYXRlcy5qcyIsIi9Vc2Vycy9jb25ucnMvUHJvamVjdHMvanVrZXBpL2p1a2VwaS9saWIvdmlldy9jb2xsZWN0aW9uL2FsYnVtLmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL2xpYi92aWV3L2NvbGxlY3Rpb24vYXJ0aXN0LmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL2xpYi92aWV3L2NvbGxlY3Rpb24vdHJhY2suanMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvbGliL3ZpZXcvY29sbGVjdGlvbi90cmFja19saXN0LmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL2xpYi92aWV3L2NvbGxlY3Rpb24vdmlldy5qcyIsIi9Vc2Vycy9jb25ucnMvUHJvamVjdHMvanVrZXBpL2p1a2VwaS9saWIvdmlldy9saXN0L3RyYWNrLmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL2xpYi92aWV3L2xpc3QvdHJhY2tfbGlzdC5qcyIsIi9Vc2Vycy9jb25ucnMvUHJvamVjdHMvanVrZXBpL2p1a2VwaS9saWIvdmlldy9saXN0L3ZpZXcuanMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvbGliL3ZpZXcvbWlzYy9qb2luLmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL2xpYi92aWV3L21pc2MvbWFpbl9jb250cm9sLmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL2xpYi92aWV3L21pc2Mvbm93X3BsYXlpbmcuanMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvbGliL3ZpZXcvbWlzYy9wbGF5YmFja19jb250cm9scy5qcyIsIi9Vc2Vycy9jb25ucnMvUHJvamVjdHMvanVrZXBpL2p1a2VwaS9saWIvdmlldy9taXNjL3NlYXJjaF9jb250cm9sLmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL2xpYi92aWV3L21pc2Mvdm9sdW1lX2NvbnRyb2wuanMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvbGliL3ZpZXcvbW9kYWwvYWxlcnQuanMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvbGliL3ZpZXcvbW9kZWwvYWxidW0uanMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvbGliL3ZpZXcvbW9kZWwvYXJ0aXN0LmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL2xpYi92aWV3L21vZGVsL2FydGlzdF9saW5rLmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL2xpYi92aWV3L21vZGVsL3ZpZXcuanMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvbGliL3ZpZXcvbW9kZWxfaXRlbS9hbGJ1bS5qcyIsIi9Vc2Vycy9jb25ucnMvUHJvamVjdHMvanVrZXBpL2p1a2VwaS9saWIvdmlldy9tb2RlbF9pdGVtL2FydGlzdC5qcyIsIi9Vc2Vycy9jb25ucnMvUHJvamVjdHMvanVrZXBpL2p1a2VwaS9saWIvdmlldy9tb2RlbF9pdGVtL3RyYWNrLmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL2xpYi92aWV3L21vZGVsX2l0ZW0vdHJhY2tsaXN0X3RyYWNrLmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL2xpYi92aWV3L21vZGVsX2l0ZW0vdmlldy5qcyIsIi9Vc2Vycy9jb25ucnMvUHJvamVjdHMvanVrZXBpL2p1a2VwaS9saWIvdmlldy9wYWdlL25hdmlnYXRpb24uanMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvbGliL3ZpZXcvcGFnZS9yb290LmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL2xpYi92aWV3L3BhZ2Uvdmlldy5qcyIsIi9Vc2Vycy9jb25ucnMvUHJvamVjdHMvanVrZXBpL2p1a2VwaS9saWIvdmlldy90YWIvYWxidW0uanMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvbGliL3ZpZXcvdGFiL2FydGlzdC5qcyIsIi9Vc2Vycy9jb25ucnMvUHJvamVjdHMvanVrZXBpL2p1a2VwaS9saWIvdmlldy90YWIvc2VhcmNoLmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL2xpYi92aWV3L3RhYi92aWV3LmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL2xpYi92aWV3L3ZpZXcuanMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvbm9kZV9tb2R1bGVzL2JhY2tib25lL25vZGVfbW9kdWxlcy91bmRlcnNjb3JlL3VuZGVyc2NvcmUuanMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZmllZC1sYXN0Zm0tYXBpL2xpYi9jYWNoZS5qcyIsIi9Vc2Vycy9jb25ucnMvUHJvamVjdHMvanVrZXBpL2p1a2VwaS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmaWVkLWxhc3RmbS1hcGkvbGliL2xhc3RmbS5qcyIsIi9Vc2Vycy9jb25ucnMvUHJvamVjdHMvanVrZXBpL2p1a2VwaS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL2luZGV4LmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvbm9kZV9tb2R1bGVzL2Jhc2U2NC1qcy9saWIvYjY0LmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvbm9kZV9tb2R1bGVzL2llZWU3NTQvaW5kZXguanMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2NyeXB0by1icm93c2VyaWZ5L2hlbHBlcnMuanMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2NyeXB0by1icm93c2VyaWZ5L2luZGV4LmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9jcnlwdG8tYnJvd3NlcmlmeS9tZDUuanMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2NyeXB0by1icm93c2VyaWZ5L3JuZy5qcyIsIi9Vc2Vycy9jb25ucnMvUHJvamVjdHMvanVrZXBpL2p1a2VwaS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvY3J5cHRvLWJyb3dzZXJpZnkvc2hhLmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9jcnlwdG8tYnJvd3NlcmlmeS9zaGEyNTYuanMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi9Vc2Vycy9jb25ucnMvUHJvamVjdHMvanVrZXBpL2p1a2VwaS9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzLnJ1bnRpbWUuanMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9iYXNlLmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvZXhjZXB0aW9uLmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIi9Vc2Vycy9jb25ucnMvUHJvamVjdHMvanVrZXBpL2p1a2VwaS9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3NhZmUtc3RyaW5nLmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvdXRpbHMuanMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIi9Vc2Vycy9jb25ucnMvUHJvamVjdHMvanVrZXBpL2p1a2VwaS9ub2RlX21vZHVsZXMvbWFya2VkL2xpYi9tYXJrZWQuanMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvbm9kZV9tb2R1bGVzL21vcGlkeS9saWIvd2Vic29ja2V0L2Jyb3dzZXIuanMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvbm9kZV9tb2R1bGVzL21vcGlkeS9ub2RlX21vZHVsZXMvYmFuZS9saWIvYmFuZS5qcyIsIi9Vc2Vycy9jb25ucnMvUHJvamVjdHMvanVrZXBpL2p1a2VwaS9ub2RlX21vZHVsZXMvbW9waWR5L25vZGVfbW9kdWxlcy93aGVuL2xpYi9Qcm9taXNlLmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL25vZGVfbW9kdWxlcy9tb3BpZHkvbm9kZV9tb2R1bGVzL3doZW4vbGliL1F1ZXVlLmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL25vZGVfbW9kdWxlcy9tb3BpZHkvbm9kZV9tb2R1bGVzL3doZW4vbGliL1RpbWVvdXRFcnJvci5qcyIsIi9Vc2Vycy9jb25ucnMvUHJvamVjdHMvanVrZXBpL2p1a2VwaS9ub2RlX21vZHVsZXMvbW9waWR5L25vZGVfbW9kdWxlcy93aGVuL2xpYi9hc3luYy5qcyIsIi9Vc2Vycy9jb25ucnMvUHJvamVjdHMvanVrZXBpL2p1a2VwaS9ub2RlX21vZHVsZXMvbW9waWR5L25vZGVfbW9kdWxlcy93aGVuL2xpYi9kZWNvcmF0b3JzL2FycmF5LmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL25vZGVfbW9kdWxlcy9tb3BpZHkvbm9kZV9tb2R1bGVzL3doZW4vbGliL2RlY29yYXRvcnMvZmxvdy5qcyIsIi9Vc2Vycy9jb25ucnMvUHJvamVjdHMvanVrZXBpL2p1a2VwaS9ub2RlX21vZHVsZXMvbW9waWR5L25vZGVfbW9kdWxlcy93aGVuL2xpYi9kZWNvcmF0b3JzL2ZvbGQuanMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvbm9kZV9tb2R1bGVzL21vcGlkeS9ub2RlX21vZHVsZXMvd2hlbi9saWIvZGVjb3JhdG9ycy9pbnNwZWN0LmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL25vZGVfbW9kdWxlcy9tb3BpZHkvbm9kZV9tb2R1bGVzL3doZW4vbGliL2RlY29yYXRvcnMvaXRlcmF0ZS5qcyIsIi9Vc2Vycy9jb25ucnMvUHJvamVjdHMvanVrZXBpL2p1a2VwaS9ub2RlX21vZHVsZXMvbW9waWR5L25vZGVfbW9kdWxlcy93aGVuL2xpYi9kZWNvcmF0b3JzL3Byb2dyZXNzLmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL25vZGVfbW9kdWxlcy9tb3BpZHkvbm9kZV9tb2R1bGVzL3doZW4vbGliL2RlY29yYXRvcnMvdGltZWQuanMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvbm9kZV9tb2R1bGVzL21vcGlkeS9ub2RlX21vZHVsZXMvd2hlbi9saWIvZGVjb3JhdG9ycy91bmhhbmRsZWRSZWplY3Rpb24uanMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvbm9kZV9tb2R1bGVzL21vcGlkeS9ub2RlX21vZHVsZXMvd2hlbi9saWIvZGVjb3JhdG9ycy93aXRoLmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL25vZGVfbW9kdWxlcy9tb3BpZHkvbm9kZV9tb2R1bGVzL3doZW4vbGliL21ha2VQcm9taXNlLmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL25vZGVfbW9kdWxlcy9tb3BpZHkvbm9kZV9tb2R1bGVzL3doZW4vbGliL3NjaGVkdWxlci5qcyIsIi9Vc2Vycy9jb25ucnMvUHJvamVjdHMvanVrZXBpL2p1a2VwaS9ub2RlX21vZHVsZXMvbW9waWR5L25vZGVfbW9kdWxlcy93aGVuL2xpYi90aW1lci5qcyIsIi9Vc2Vycy9jb25ucnMvUHJvamVjdHMvanVrZXBpL2p1a2VwaS9ub2RlX21vZHVsZXMvbW9waWR5L25vZGVfbW9kdWxlcy93aGVuL3doZW4uanMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvbm9kZV9tb2R1bGVzL21vcGlkeS9zcmMvbW9waWR5LmpzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL3RlbXBsYXRlcy9hbGJ1bS9jb2xsZWN0aW9uLmhicyIsIi9Vc2Vycy9jb25ucnMvUHJvamVjdHMvanVrZXBpL2p1a2VwaS90ZW1wbGF0ZXMvYWxidW0vaXRlbV9tb2RlbC5oYnMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvdGVtcGxhdGVzL2FsYnVtL21vZGVsLmhicyIsIi9Vc2Vycy9jb25ucnMvUHJvamVjdHMvanVrZXBpL2p1a2VwaS90ZW1wbGF0ZXMvYWxidW0vcGFnZS5oYnMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvdGVtcGxhdGVzL2FydGlzdC9jb2xsZWN0aW9uLmhicyIsIi9Vc2Vycy9jb25ucnMvUHJvamVjdHMvanVrZXBpL2p1a2VwaS90ZW1wbGF0ZXMvYXJ0aXN0L2l0ZW1fbW9kZWwuaGJzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL3RlbXBsYXRlcy9hcnRpc3QvbGlua19tb2RlbC5oYnMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvdGVtcGxhdGVzL2FydGlzdC9tb2RlbC5oYnMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvdGVtcGxhdGVzL2hvbWUvcGxheWJhY2tfY29udHJvbC5oYnMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvdGVtcGxhdGVzL2hvbWUvc2VhcmNoX2NvbnRyb2wuaGJzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL3RlbXBsYXRlcy9ob21lL3ZvbHVtZV9jb250cm9sLmhicyIsIi9Vc2Vycy9jb25ucnMvUHJvamVjdHMvanVrZXBpL2p1a2VwaS90ZW1wbGF0ZXMvbW9kYWwvYWxlcnQuaGJzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL3RlbXBsYXRlcy9tb2RhbC9sb2FkaW5nLmhicyIsIi9Vc2Vycy9jb25ucnMvUHJvamVjdHMvanVrZXBpL2p1a2VwaS90ZW1wbGF0ZXMvbmF2aWdhdGlvbi9pbmRleC5oYnMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvdGVtcGxhdGVzL25vd3BsYXlpbmcvdmlldy5oYnMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvdGVtcGxhdGVzL3Jvb3QvaW5kZXguaGJzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL3RlbXBsYXRlcy90YWIvdmlldy5oYnMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvdGVtcGxhdGVzL3RyYWNrL2NvbGxlY3Rpb24uaGJzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL3RlbXBsYXRlcy90cmFjay9saXN0LmhicyIsIi9Vc2Vycy9jb25ucnMvUHJvamVjdHMvanVrZXBpL2p1a2VwaS90ZW1wbGF0ZXMvdHJhY2svbW9kZWxfaXRlbS5oYnMiLCIvVXNlcnMvY29ubnJzL1Byb2plY3RzL2p1a2VwaS9qdWtlcGkvdGVtcGxhdGVzL3RyYWNrbGlzdC9jb2xsZWN0aW9uLmhicyIsIi9Vc2Vycy9jb25ucnMvUHJvamVjdHMvanVrZXBpL2p1a2VwaS90ZW1wbGF0ZXMvdHJhY2tsaXN0L2xpc3QuaGJzIiwiL1VzZXJzL2Nvbm5ycy9Qcm9qZWN0cy9qdWtlcGkvanVrZXBpL3RlbXBsYXRlcy90cmFja2xpc3QvbW9kZWwuaGJzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdjRDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDLzJCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcmxDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25MQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL29DQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDak1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzkwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzVUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBNb3BpZHkgPSByZXF1aXJlKCdtb3BpZHknKTtcbnZhciBIYW5kbGViYXJzID0gcmVxdWlyZSgnaGFuZGxlYmFycy9ydW50aW1lJykuZGVmYXVsdDtcbnZhciBMYXN0Rk0gPSByZXF1aXJlKCdicm93c2VyaWZpZWQtbGFzdGZtLWFwaScpO1xudmFyIFJvdXRlciA9IHJlcXVpcmUoJy4vcm91dGVyLmpzJyk7XG52YXIgUm9vdFZpZXcgPSByZXF1aXJlKCcuL3ZpZXcvcGFnZS9yb290LmpzJyk7XG52YXIgTmF2aWdhdGlvblZpZXcgPSByZXF1aXJlKCcuL3ZpZXcvcGFnZS9uYXZpZ2F0aW9uLmpzJyk7XG52YXIgQWxlcnRWaWV3ID0gcmVxdWlyZSgnLi92aWV3L21vZGFsL2FsZXJ0LmpzJyk7XG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnYmFja2JvbmUvbm9kZV9tb2R1bGVzL3VuZGVyc2NvcmUnKS5leHRlbmQ7XG52YXIgaGlzdG9yeSA9IHJlcXVpcmUoJ2JhY2tib25lJykuaGlzdG9yeTtcbnZhciBlbnYgPSByZXF1aXJlKCcuL2Vudi5qc29uJyk7XG5cbmZ1bmN0aW9uIGp1a2VQaShjb25maWcsIGNhbGxiYWNrKSB7XG4gIHZhciBtb3BpZHk7XG4gIHZhciBsYXN0Zm07XG4gIHZhciByb3V0ZXI7XG4gIHZhciByb290VmlldztcbiAgdmFyIHJvb3RWaWV3RWw7XG4gIHZhciByb3V0ZXJWaWV3RWw7XG4gIHZhciBuYXZpZ2F0aW9uVmlld0VsO1xuICB2YXIgbG9hZGluZ0FsZXJ0O1xuXG4gIGNvbmZpZyA9IGV4dGVuZCh7fSwgZW52LCBjb25maWcpO1xuICBtb3BpZHkgPSAhY29uZmlnLm1vcGlkeVdlYlNvY2tldFVybCA/IG5ldyBNb3BpZHkoeyBjYWxsaW5nQ29udmVudGlvbjogJ2J5LXBvc2l0aW9uLW9ubHknIH0pIDogbmV3IE1vcGlkeSh7IHdlYlNvY2tldFVybDogY29uZmlnLm1vcGlkeVdlYlNvY2tldFVybCwgY2FsbGluZ0NvbnZlbnRpb246ICdieS1wb3NpdGlvbi1vbmx5JyB9KTtcbiAgbGFzdGZtID0gbmV3IExhc3RGTSh7XG4gICAgYXBpS2V5OiBjb25maWcubGFzdGZtLmtleSxcbiAgICBhcGlTZWNyZXQ6IGNvbmZpZy5sYXN0Zm0uc2VjcmV0XG4gIH0pO1xuICByb290Vmlld0VsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jvb3RfdmlldycpO1xuICByb3V0ZXJWaWV3RWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJpbWFyeV9yb3V0ZXJfdmlldycpO1xuICBuYXZpZ2F0aW9uVmlld0VsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ25hdmlnYXRpb25fdmlldycpO1xuICBtb3BpZHkub25jZSgnc3RhdGU6b25saW5lJywgZnVuY3Rpb24gKCkge1xuICAgIHZhciByb3V0ZXIgPSBuZXcgUm91dGVyKHtcbiAgICAgIG1vcGlkeTogbW9waWR5LFxuICAgICAgbGFzdGZtOiBsYXN0Zm0sXG4gICAgICBjb25maWc6IGNvbmZpZyxcbiAgICAgIHJvb3RFbGVtZW50OiByb3V0ZXJWaWV3RWxcbiAgICB9KTtcbiAgICB2YXIgbmF2aWdhdGlvbiA9IG5ldyBOYXZpZ2F0aW9uVmlldyh7XG4gICAgICByb3V0ZXI6IHJvdXRlcixcbiAgICAgIG1vcGlkeTogbW9waWR5LFxuICAgICAgY29uZmlnOiBjb25maWcsXG4gICAgICBsYXN0Zm06IGxhc3RmbVxuICAgIH0pO1xuICAgIHZhciB2aWV3ID0gbmV3IFJvb3RWaWV3KHtcbiAgICAgIHJvdXRlcjogcm91dGVyLFxuICAgICAgbW9waWR5OiBtb3BpZHksXG4gICAgICBjb25maWc6IGNvbmZpZyxcbiAgICAgIGxhc3RmbTogbGFzdGZtXG4gICAgfSk7XG4gICAgbG9hZGluZ0FsZXJ0ID0gbmV3IEFsZXJ0Vmlldyh7XG4gICAgICBoZWFkZXI6ICdMb2FkaW5nJyxcbiAgICAgIG1lc3NhZ2U6IG5ldyBIYW5kbGViYXJzLlNhZmVTdHJpbmcocmVxdWlyZSgnLi4vdGVtcGxhdGVzL21vZGFsL2xvYWRpbmcuaGJzJykoKSlcbiAgICB9KTtcblxuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQobG9hZGluZ0FsZXJ0LnJlbmRlcigpLmVsKTtcbiAgICBuYXZpZ2F0aW9uVmlld0VsLmFwcGVuZENoaWxkKG5hdmlnYXRpb24ucmVuZGVyKCkuZWwpO1xuICAgIHJvb3RWaWV3RWwuYXBwZW5kQ2hpbGQodmlldy5yZW5kZXIoKS5lbCk7XG4gICAgaGlzdG9yeS5zdGFydCh0cnVlKTtcblxuICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNhbGxiYWNrKG51bGwsIHsgbW9waWR5OiBtb3BpZHkgfSk7XG4gICAgfVxuICB9KTtcbiAgbW9waWR5Lm9uY2UoJ3N0YXRlOm9ubGluZScsIGZ1bmN0aW9uICgpIHtcbiAgICBsb2FkaW5nQWxlcnQucmVtb3ZlKCk7XG4gIH0pO1xuICBtb3BpZHkub24oJ3N0YXRlOm9mZmxpbmUnLCBmdW5jdGlvbiAoKSB7XG4gIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGp1a2VQaTtcbiIsInZhciBDb2xsZWN0aW9uID0gcmVxdWlyZSgnLi9jb2xsZWN0aW9uLmpzJyk7XG52YXIgQWxidW0gPSByZXF1aXJlKCcuLi9tb2RlbC9hbGJ1bS5qcycpO1xudmFyIEFsYnVtQ29sbGVjdGlvbiA9IENvbGxlY3Rpb24uZXh0ZW5kKHtcbiAgbW9kZWw6IEFsYnVtXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBBbGJ1bUNvbGxlY3Rpb247XG4iLCJ2YXIgQ29sbGVjdGlvbiA9IHJlcXVpcmUoJy4vY29sbGVjdGlvbi5qcycpO1xudmFyIEFydGlzdCA9IHJlcXVpcmUoJy4uL21vZGVsL2FydGlzdC5qcycpO1xudmFyIEFydGlzdENvbGxlY3Rpb24gPSBDb2xsZWN0aW9uLmV4dGVuZCh7XG4gIG1vZGVsOiBBcnRpc3Rcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFydGlzdENvbGxlY3Rpb247XG4iLCJ2YXIgQmFja2JvbmUgPSByZXF1aXJlKCdiYWNrYm9uZScpO1xudmFyIENvbGxlY3Rpb24gPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIChtb2RlbHMsIG9wdGlvbnMpIHtcbiAgICBCYWNrYm9uZS5Db2xsZWN0aW9uLnByb3RvdHlwZS5pbml0aWFsaXplLmNhbGwodGhpcywgbW9kZWxzLCBvcHRpb25zKTtcblxuICAgIGlmIChvcHRpb25zLm1vcGlkeSkge1xuICAgICAgdGhpcy5tb3BpZHkgPSBvcHRpb25zLm1vcGlkeTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5sYXN0Zm0pIHtcbiAgICAgIHRoaXMuX2xhc3RmbSA9IG9wdGlvbnMubGFzdGZtO1xuICAgIH1cbiAgfSxcbiAgbW92ZTogZnVuY3Rpb24gKG1vZGVsLCB0b0luZGV4KSB7XG4gICAgdmFyIGZyb21JbmRleCA9IHRoaXMuaW5kZXhPZihtb2RlbCk7XG5cbiAgICBpZiAoZnJvbUluZGV4ID09PSAtMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgbW92ZSBhIG1vZGVsIHRoYXQncyBub3QgaW4gdGhlIGNvbGxlY3Rpb25cIik7XG4gICAgfVxuICAgIGlmIChmcm9tSW5kZXggIT09IHRvSW5kZXgpIHtcbiAgICAgIHRoaXMubW9kZWxzLnNwbGljZSh0b0luZGV4LCAwLCB0aGlzLm1vZGVscy5zcGxpY2UoZnJvbUluZGV4LCAxKVswXSk7XG4gICAgfVxuXG4gICAgdGhpcy50cmlnZ2VyKCdzb3J0Jyk7XG4gIH0sXG4gIG1vZGVsQXR0cmlidXRlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLm1hcCh0aGlzLl9tb2RlbEF0dHJpYnV0ZXMuYmluZCh0aGlzKSk7XG4gIH0sXG4gIF9tb2RlbEF0dHJpYnV0ZXM6IGZ1bmN0aW9uIChtb2RlbCkge1xuICAgIHJldHVybiBtb2RlbEF0dHJpYnV0ZXM7XG4gIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbGxlY3Rpb247XG4iLCJ2YXIgQ29sbGVjdGlvbiA9IHJlcXVpcmUoJy4vY29sbGVjdGlvbi5qcycpO1xudmFyIFRyYWNrID0gcmVxdWlyZSgnLi4vbW9kZWwvdHJhY2suanMnKTtcbnZhciBUcmFja0NvbGxlY3Rpb24gPSBDb2xsZWN0aW9uLmV4dGVuZCh7XG4gIG1vZGVsOiBUcmFja1xufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gVHJhY2tDb2xsZWN0aW9uO1xuIiwidmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2JhY2tib25lL25vZGVfbW9kdWxlcy91bmRlcnNjb3JlJykuZXh0ZW5kO1xudmFyIENvbGxlY3Rpb24gPSByZXF1aXJlKCcuL2NvbGxlY3Rpb24uanMnKTtcbnZhciBUcmFja0xpc3RUcmFjayA9IHJlcXVpcmUoJy4uL21vZGVsL3RyYWNrX2xpc3RfdHJhY2suanMnKTtcbnZhciBUcmFja0xpc3RDb2xsZWN0aW9uID0gQ29sbGVjdGlvbi5leHRlbmQoe1xuICBtb2RlbDogVHJhY2tMaXN0VHJhY2ssXG4gIF9yZXN5bmNDb3VudGVyOiAwLFxuICBfcHJlcGFyZU1vZGVsOiBmdW5jdGlvbiAoYXR0cnMsIG9wdGlvbnMpIHtcbiAgICB2YXIgb3B0cyA9IGV4dGVuZCh7fSwgb3B0aW9ucywgeyBtb3BpZHk6IHRoaXMubW9waWR5IH0pO1xuICAgIHJldHVybiBDb2xsZWN0aW9uLnByb3RvdHlwZS5fcHJlcGFyZU1vZGVsLmNhbGwodGhpcywgYXR0cnMsIG9wdHMpO1xuICB9LFxuICBpbml0aWFsaXplOiBmdW5jdGlvbiAobW9kZWxzLCBvcHRpb25zKSB7XG4gICAgQ29sbGVjdGlvbi5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb3BpZHksICdldmVudDp0cmFja2xpc3RDaGFuZ2VkJywgdGhpcy5mZXRjaCk7XG4gIH0sXG4gIG1vdmU6IGZ1bmN0aW9uIChtb2RlbCwgdG9JbmRleCkge1xuICAgIHZhciBtb2RlbEluZGV4ID0gdGhpcy5pbmRleE9mKG1vZGVsKTtcbiAgICBDb2xsZWN0aW9uLnByb3RvdHlwZS5tb3ZlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgdGhpcy5tb3BpZHkudHJhY2tsaXN0Lm1vdmUobW9kZWxJbmRleCwgbW9kZWxJbmRleCArIDEsIHRvSW5kZXgpLnRoZW4obnVsbCwgQ29sbGVjdGlvbi5wcm90b3R5cGUubW92ZS5iaW5kKHRoaXMsIG1vZGVsLCBtb2RlbEluZGV4KSk7XG4gIH0sXG4gIHN5bmM6IGZ1bmN0aW9uIChtZXRob2QsIGNvbGxlY3Rpb24sIG9wdGlvbnMpIHtcbiAgICB2YXIgeGhyID0gdGhpcy5tb3BpZHkudHJhY2tsaXN0LmdldFRsVHJhY2tzKCk7XG5cbiAgICBmdW5jdGlvbiB0bFRyYWNrc1N1Y2Nlc3MocmVzcCkge1xuICAgICAgb3B0aW9ucy5zdWNjZXNzKHJlc3ApO1xuICAgIH1cblxuICAgIHRoaXMubW9waWR5LnBsYXliYWNrLmdldEN1cnJlbnRUbFRyYWNrKCkudGhlbihmdW5jdGlvbiAodHJhY2spIHtcbiAgICAgIHRyYWNrID0gdHJhY2sgfHwge307XG4gICAgICBvcHRpb25zLmFjdGl2ZVRsaWQgPSB0cmFjay50bGlkO1xuICAgICAgeGhyLnRoZW4odGxUcmFja3NTdWNjZXNzKTtcbiAgICB9KTtcblxuICAgIHJldHVybiB4aHI7XG4gIH0sXG4gIGN1cnJlbnQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmZpbHRlcihmdW5jdGlvbiAodGxUcmFjaykge1xuICAgICAgcmV0dXJuIHRsVHJhY2suY3VycmVudDtcbiAgICB9KVswXTtcbiAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gVHJhY2tMaXN0Q29sbGVjdGlvbjtcbiIsIm1vZHVsZS5leHBvcnRzPXtcbiAgXCJ0aXRsZVwiOiBcIkp1a2VQaVwiLFxuICBcIm1vcGlkeVdlYlNvY2tldFVybFwiOiBudWxsLFxuICBcImxhc3RmbVwiOiB7XG4gICAgXCJrZXlcIjogbnVsbCxcbiAgICBcInNlY3JldFwiOiBudWxsXG4gIH1cbn1cbiIsInZhciBleHRlbmQgPSByZXF1aXJlKCdiYWNrYm9uZS9ub2RlX21vZHVsZXMvdW5kZXJzY29yZScpLmV4dGVuZDtcbnZhciBNb2RlbCA9IHJlcXVpcmUoJy4vbW9kZWwuanMnKTtcbnZhciBBbGJ1bSA9IE1vZGVsLmV4dGVuZCh7XG4gIGlkQXR0cmlidXRlOiAndXJpJyxcbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKGF0dHJpYnV0ZXMsIG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMuY29sbGVjdGlvbikge1xuICAgICAgdmFyIFRyYWNrQ29sbGVjdGlvbiA9IHJlcXVpcmUoJy4uL2NvbGxlY3Rpb24vdHJhY2suanMnKTtcbiAgICAgIHZhciBBcnRpc3QgPSByZXF1aXJlKCcuL2FydGlzdC5qcycpO1xuICAgICAgTW9kZWwucHJvdG90eXBlLmluaXRpYWxpemUuY2FsbCh0aGlzLCBhdHRyaWJ1dGVzLCBvcHRpb25zKTtcbiAgICAgIHRoaXMudHJhY2tzID0gbmV3IFRyYWNrQ29sbGVjdGlvbihudWxsLCB7XG4gICAgICAgIG1vcGlkeTogdGhpcy5tb3BpZHksXG4gICAgICAgIGxhc3RmbTogdGhpcy5fbGFzdGZtXG4gICAgICB9KTtcbiAgICAgIHRoaXMuYXJ0aXN0ID0gbmV3IEFydGlzdChudWxsLCB7XG4gICAgICAgIG1vcGlkeTogdGhpcy5tb3BpZHksXG4gICAgICAgIGxhc3RmbTogdGhpcy5fbGFzdGZtXG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG4gIHRvSlNPTjogZnVuY3Rpb24gKCkge1xuICAgIHZhciBtb2RlbERhdGEgPSBNb2RlbC5wcm90b3R5cGUudG9KU09OLmNhbGwodGhpcyk7XG5cbiAgICBpZiAodGhpcy5hcnRpc3QpIHtcbiAgICAgIG1vZGVsRGF0YS5hcnRpc3QgPSB0aGlzLmFydGlzdC50b0pTT04oKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbW9kZWxEYXRhO1xuICB9LFxuICBzeW5jOiBmdW5jdGlvbiAobWV0aG9kLCBtb2RlbCwgb3B0aW9ucykge1xuICAgIGZ1bmN0aW9uIG1vZGVsU3VjY2VzcyhyZXNwKSB7XG4gICAgICBvcHRpb25zLnN1Y2Nlc3MocmVzcC5hbGJ1bSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdHJhY2tzU3VjY2VzcyhyZXNwKSB7XG4gICAgICB2YXIgdHJhY2tzO1xuICAgICAgdmFyIGFydGlzdDtcblxuICAgICAgaWYgKHJlc3BbMF0gJiYgcmVzcFswXS5hbGJ1bSkge1xuICAgICAgICB0cmFja3MgPSByZXNwO1xuICAgICAgICBhcnRpc3QgPSByZXNwWzBdLmFsYnVtLmFydGlzdHNbMF07XG5cbiAgICAgICAgbW9kZWwudHJhY2tzLnNldCh0cmFja3MpO1xuICAgICAgICBtb2RlbC5hcnRpc3Quc2V0KGFydGlzdCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5tb3BpZHkubGlicmFyeS5sb29rdXAodGhpcy5pZCkudGhlbih0cmFja3NTdWNjZXNzKTtcbiAgICB0aGlzLl9sYXN0Zm0uYWxidW0uZ2V0SW5mbyh7IGFydGlzdDogdGhpcy5nZXQoJ2FydGlzdCcpLCBhbGJ1bTogdGhpcy5nZXQoJ3RpdGxlJykgfSwgeyBzdWNjZXNzOiBtb2RlbFN1Y2Nlc3MgfSk7XG4gIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFsYnVtO1xuIiwidmFyIF8gPSByZXF1aXJlKCdiYWNrYm9uZS9ub2RlX21vZHVsZXMvdW5kZXJzY29yZScpO1xudmFyIE1vZGVsID0gcmVxdWlyZSgnLi9tb2RlbC5qcycpO1xudmFyIEFydGlzdCA9IE1vZGVsLmV4dGVuZCh7XG4gIGlkQXR0cmlidXRlOiAndXJpJyxcbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKGF0dHJpYnV0ZXMsIG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMuY29sbGVjdGlvbikge1xuICAgICAgdmFyIFRyYWNrQ29sbGVjdGlvbiA9IHJlcXVpcmUoJy4uL2NvbGxlY3Rpb24vdHJhY2suanMnKTtcbiAgICAgIHZhciBBbGJ1bUNvbGxlY3Rpb24gPSByZXF1aXJlKCcuLi9jb2xsZWN0aW9uL2FsYnVtLmpzJyk7XG4gICAgICBNb2RlbC5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgdGhpcy50cmFja3MgPSBuZXcgVHJhY2tDb2xsZWN0aW9uKG51bGwsIHtcbiAgICAgICAgbW9waWR5OiB0aGlzLm1vcGlkeSxcbiAgICAgICAgbGFzdGZtOiB0aGlzLl9sYXN0Zm1cbiAgICAgIH0pO1xuICAgICAgdGhpcy5hbGJ1bXMgPSBuZXcgQWxidW1Db2xsZWN0aW9uKG51bGwsIHtcbiAgICAgICAgbW9waWR5OiB0aGlzLm1vcGlkeSxcbiAgICAgICAgbGFzdGZtOiB0aGlzLl9sYXN0Zm1cbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcbiAgc3luYzogZnVuY3Rpb24gKG1ldGhvZCwgbW9kZWwsIG9wdGlvbnMpIHtcbiAgICB2YXIgYXJ0aXN0VXJpID0gdGhpcy5pZDtcbiAgICB2YXIgYXJ0aXN0TmFtZSA9IHRoaXMuZ2V0KCduYW1lJyk7XG5cbiAgICBmdW5jdGlvbiBsb29rdXBTdWNjZXNzKHRyYWNrcykge1xuICAgICAgdmFyIF90cmFja3M7XG5cbiAgICAgIHRyYWNrcyA9IHRyYWNrcyB8fCBbXTtcbiAgICAgIF90cmFja3MgPSBfKHRyYWNrcy5maWx0ZXIoZnVuY3Rpb24gKHRyYWNrKSB7IHJldHVybiAhdHJhY2submFtZS5tYXRjaCgvXlxcW3VucGxheWFibGVcXF0vKTsgfSkpO1xuXG4gICAgICB2YXIgYWxidW1zID0gX3RyYWNrcy5jaGFpbigpLnBsdWNrKCdhbGJ1bScpLnVuaXEoZmFsc2UsIGZ1bmN0aW9uIChhbGJ1bSkgeyByZXR1cm4gYWxidW0udXJpOyB9KS52YWx1ZSgpO1xuICAgICAgdmFyIGFydGlzdCA9IF90cmFja3MuY2hhaW4oKS5tYXAoZnVuY3Rpb24gKHRyYWNrKSB7IHJldHVybiB0cmFjay5hcnRpc3RzOyAgfSkuZmxhdHRlbigpLnVuaXEoZmFsc2UsIGZ1bmN0aW9uIChhcnRpc3QpIHsgcmV0dXJuIGFydGlzdC51cmk7ICB9KS5maW5kKGZ1bmN0aW9uIChhcnRpc3QpIHsgcmV0dXJuIGFydGlzdC51cmkgPT09IGFydGlzdFVyaTsgIH0pLnZhbHVlKCkgfHwgeyB1cmk6IGFydGlzdFVyaSwgbmFtZTogYXJ0aXN0TmFtZSB9O1xuXG4gICAgICBtb2RlbC50cmFja3Muc2V0KHRyYWNrcyk7XG4gICAgICBtb2RlbC5hbGJ1bXMuc2V0KGFsYnVtcyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGFzdGZtU3VjY2VzcyhyZXNwKSB7XG4gICAgICBvcHRpb25zLnN1Y2Nlc3MocmVzcC5hcnRpc3QpO1xuICAgIH1cblxuICAgIHRoaXMubW9waWR5LmxpYnJhcnkubG9va3VwKHRoaXMuaWQpLnRoZW4obG9va3VwU3VjY2Vzcyk7XG4gICAgdGhpcy5fbGFzdGZtLmFydGlzdC5nZXRJbmZvKHsgYXJ0aXN0OiBhcnRpc3ROYW1lIH0sIHsgc3VjY2VzczogbGFzdGZtU3VjY2VzcywgZXJyb3I6IG9wdGlvbnMuZXJyb3IgfSk7XG4gIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFydGlzdDtcbiIsInZhciBCYWNrYm9uZSA9IHJlcXVpcmUoJ2JhY2tib25lJyk7XG52YXIgTW9kZWwgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuICBpbml0aWFsaXplOiBmdW5jdGlvbiAoYXR0cmlidXRlcywgb3B0aW9ucykge1xuICAgIEJhY2tib25lLk1vZGVsLnByb3RvdHlwZS5pbml0aWFsaXplLmNhbGwodGhpcywgYXR0cmlidXRlcywgb3B0aW9ucyk7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdGhpcy5tb3BpZHkgPSBvcHRpb25zLm1vcGlkeTtcbiAgICB0aGlzLl9sYXN0Zm0gPSBvcHRpb25zLmxhc3RmbTtcbiAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gTW9kZWw7XG4iLCJ2YXIgTW9kZWwgPSByZXF1aXJlKCcuL21vZGVsLmpzJyk7XG52YXIgVHJhY2tDb2xsZWN0aW9uID0gcmVxdWlyZSgnLi4vY29sbGVjdGlvbi90cmFjay5qcycpO1xudmFyIEFsYnVtQ29sbGVjdGlvbiA9IHJlcXVpcmUoJy4uL2NvbGxlY3Rpb24vYWxidW0uanMnKTtcbnZhciBBcnRpc3RDb2xsZWN0aW9uID0gcmVxdWlyZSgnLi4vY29sbGVjdGlvbi9hcnRpc3QuanMnKTtcbnZhciBTZWFyY2ggPSBNb2RlbC5leHRlbmQoe1xuICBjb2xsZWN0aW9uczoge30sXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIChhdHRyaWJ1dGVzLCBvcHRpb25zKSB7XG4gICAgTW9kZWwucHJvdG90eXBlLmluaXRpYWxpemUuY2FsbCh0aGlzLCBhdHRyaWJ1dGVzLCBvcHRpb25zKTtcbiAgICB0aGlzLnRyYWNrcyA9IG5ldyBUcmFja0NvbGxlY3Rpb24obnVsbCwge1xuICAgICAgbW9waWR5OiB0aGlzLm1vcGlkeSxcbiAgICAgIGxhc3RmbTogdGhpcy5fbGFzdGZtXG4gICAgfSk7XG4gICAgdGhpcy5hbGJ1bXMgPSBuZXcgQWxidW1Db2xsZWN0aW9uKG51bGwsIHtcbiAgICAgIG1vcGlkeTogdGhpcy5tb3BpZHksXG4gICAgICBsYXN0Zm06IHRoaXMuX2xhc3RmbVxuICAgIH0pO1xuICAgIHRoaXMuYXJ0aXN0cyA9IG5ldyBBcnRpc3RDb2xsZWN0aW9uKG51bGwsIHtcbiAgICAgIG1vcGlkeTogdGhpcy5tb3BpZHksXG4gICAgICBsYXN0Zm06IHRoaXMuX2xhc3RmbVxuICAgIH0pO1xuICB9LFxuICBzeW5jOiBmdW5jdGlvbiAobWV0aG9kLCBtb2RlbCwgb3B0aW9ucykge1xuICAgIHZhciBzdWNjZXNzID0gb3B0aW9ucy5zdWNjZXNzO1xuICAgIHZhciB0aW1lc3RhbXAgPSBEYXRlLm5vdygpO1xuXG4gICAgdGhpcy5fc2VhcmNoVGltZXN0YW1wID0gdGltZXN0YW1wO1xuXG4gICAgb3B0aW9ucy5zdWNjZXNzID0gZnVuY3Rpb24ocmVzcCkge1xuICAgICAgaWYgKHRpbWVzdGFtcCA9PT0gdGhpcy5fc2VhcmNoVGltZXN0YW1wKSB7XG4gICAgICAgIHRoaXMuX3N5bmNSZXNwb25zZVRvQ29sbGVjdGlvbnMocmVzcCk7XG4gICAgICAgIHN1Y2Nlc3MobW9kZWwsIHJlc3AsIG9wdGlvbnMpO1xuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKTtcblxuICAgIHJldHVybiB0aGlzLm1vcGlkeS5saWJyYXJ5LnNlYXJjaCh7IGFueTogW29wdGlvbnMucXVlcnldIH0pLnRoZW4ob3B0aW9ucy5zdWNjZXNzLCBvcHRpb25zLmVycm9yKTtcbiAgfSxcbiAgX3NlYXJjaFRpbWVzdGFtcDogMCxcbiAgX3N5bmNSZXNwb25zZVRvQ29sbGVjdGlvbnM6IGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgZnVuY3Rpb24gZXh0cmFjdFJlc3VsdHNCeUtleShrZXksIHJlc3VsdHMpIHtcbiAgICAgIHJldHVybiByZXN1bHRzLm1hcChmdW5jdGlvbiAocikgeyByZXR1cm4gcltrZXldIHx8IFtdOyB9KS5yZWR1Y2UoZnVuY3Rpb24gKGEsIGIpIHsgcmV0dXJuIGEuY29uY2F0KGIpOyB9KTtcbiAgICB9XG4gICAgdmFyIHRyYWNrcyA9IGV4dHJhY3RSZXN1bHRzQnlLZXkoJ3RyYWNrcycsIHJlc3ApO1xuICAgIHZhciBhbGJ1bXMgPSBleHRyYWN0UmVzdWx0c0J5S2V5KCdhbGJ1bXMnLCByZXNwKTtcbiAgICB2YXIgYXJ0aXN0cyA9IGV4dHJhY3RSZXN1bHRzQnlLZXkoJ2FydGlzdHMnLCByZXNwKTtcblxuICAgIGlmICh0cmFja3MgJiYgdHJhY2tzLmxlbmd0aCkge1xuICAgICAgdGhpcy50cmFja3Muc2V0KHRyYWNrcyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy50cmFja3MucmVzZXQoKTtcbiAgICB9XG5cbiAgICBpZiAoYWxidW1zICYmIGFsYnVtcy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuYWxidW1zLnNldChhbGJ1bXMpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMuYWxidW1zLnJlc2V0KCk7XG4gICAgfVxuXG4gICAgaWYgKGFydGlzdHMgJiYgYXJ0aXN0cy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuYXJ0aXN0cy5zZXQoYXJ0aXN0cyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy5hcnRpc3RzLnJlc2V0KCk7XG4gICAgfVxuICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBTZWFyY2g7XG4iLCJ2YXIgZXh0ZW5kID0gcmVxdWlyZSgnYmFja2JvbmUvbm9kZV9tb2R1bGVzL3VuZGVyc2NvcmUnKS5leHRlbmQ7XG52YXIgTW9kZWwgPSByZXF1aXJlKCcuL21vZGVsLmpzJyk7XG52YXIgVHJhY2sgPSBNb2RlbC5leHRlbmQoe1xuICBpZEF0dHJpYnV0ZTogJ3VyaScsXG4gIHN5bmM6IGZ1bmN0aW9uIChtZXRob2QsIG1vZGVsLCBvcHRpb25zKSB7XG4gICAgZnVuY3Rpb24gbGFzdGZtU3VjY2VzcyhyZXNwKSB7XG4gICAgICB2YXIgZGF0YSA9IGV4dGVuZCh7fSwgdGhpcy5hdHRyaWJ1dGVzLCByZXNwKTtcbiAgICAgIG9wdGlvbnMuc3VjY2VzcyhkYXRhKTtcbiAgICB9XG5cbiAgICBpZiAobWV0aG9kID09PSAndXBkYXRlJykge1xuICAgICAgeGhyID0gdGhpcy5tb3BpZHkudHJhY2tsaXN0LmFkZChbIG1vZGVsIF0pO1xuICAgICAgeGhyLnRoZW4ob3B0aW9ucy5zdWNjZXNzLCBvcHRpb25zLmVycm9yKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBtb2RlbC5fbGFzdGZtLmFsYnVtLmdldEluZm8oe1xuICAgICAgICBhcnRpc3Q6IHRoaXMuYXR0cmlidXRlcy5hcnRpc3RzWzBdLm5hbWUsXG4gICAgICAgIGFsYnVtOiB0aGlzLmF0dHJpYnV0ZXMuYWxidW0ubmFtZVxuICAgICAgfSwgeyBzdWNjZXNzOiBsYXN0Zm1TdWNjZXNzLCBlcnJvcjogb3B0aW9ucy5lcnJvciB9KTtcbiAgICB9XG4gIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRyYWNrO1xuIiwidmFyIE1vZGVsID0gcmVxdWlyZSgnLi9tb2RlbC5qcycpO1xudmFyIFRyYWNrID0gcmVxdWlyZSgnLi90cmFjay5qcycpO1xudmFyIFRyYWNrTGlzdFRyYWNrID0gTW9kZWwuZXh0ZW5kKHtcbiAgaWRBdHRyaWJ1dGU6ICd0bGlkJyxcbiAgY3VycmVudDogZmFsc2UsXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIChhdHRyaWJ1dGVzLCBvcHRpb25zKSB7XG4gICAgTW9kZWwucHJvdG90eXBlLmluaXRpYWxpemUuY2FsbCh0aGlzLCBhdHRyaWJ1dGVzLCBvcHRpb25zKTtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB0aGlzLmN1cnJlbnQgPSBhdHRyaWJ1dGVzLnRsaWQgPT09IG9wdGlvbnMuYWN0aXZlVGxpZDtcbiAgICB0aGlzLnRyYWNrID0gbmV3IFRyYWNrKGF0dHJpYnV0ZXMudHJhY2ssIHtcbiAgICAgIG1vcGlkeTogdGhpcy5tb3BpZHksXG4gICAgICBsYXN0Zm06IHRoaXMuX2xhc3RmbVxuICAgIH0pO1xuICAgIHRoaXMuX2luaXRMaXN0ZW5lcnMoKTtcbiAgfSxcbiAgX2luaXRMaXN0ZW5lcnM6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdHJhY2tQbGF5YmFja1N0YXJ0ZWRDYWxsYmFjayA9IHRoaXMuX29uVHJhY2tQbGF5YmFja1N0YXJ0ZWQuYmluZCh0aGlzKTtcbiAgICB0aGlzLm1vcGlkeS5vbignZXZlbnQ6dHJhY2tQbGF5YmFja1N0YXJ0ZWQnLCB0cmFja1BsYXliYWNrU3RhcnRlZENhbGxiYWNrKTtcbiAgICB0aGlzLm9uKCdyZW1vdmUnLCB0aGlzLm1vcGlkeS5vZmYuYmluZCh0aGlzLm1vcGlkeSwgJ2V2ZW50OnRyYWNrUGxheWJhY2tTdGFydGVkJywgdHJhY2tQbGF5YmFja1N0YXJ0ZWRDYWxsYmFjaykpO1xuICB9LFxuICBfb25UcmFja1BsYXliYWNrU3RhcnRlZDogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgaWYgKHRoaXMuY3VycmVudCAhPT0gKHRoaXMuaWQgPT09IGV2ZW50LnRsX3RyYWNrLnRsaWQpKSB7XG4gICAgICB0aGlzLmN1cnJlbnQgPSAhdGhpcy5jdXJyZW50O1xuICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICB9XG4gIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRyYWNrTGlzdFRyYWNrO1xuIiwidmFyIEJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKTtcbnZhciBBbGJ1bVRhYlZpZXcgPSByZXF1aXJlKCcuL3ZpZXcvdGFiL2FsYnVtLmpzJyk7XG52YXIgQXJ0aXN0VGFiVmlldyA9IHJlcXVpcmUoJy4vdmlldy90YWIvYXJ0aXN0LmpzJyk7XG52YXIgU2VhcmNoVGFiVmlldyA9IHJlcXVpcmUoJy4vdmlldy90YWIvc2VhcmNoLmpzJyk7XG52YXIgU2VhcmNoID0gcmVxdWlyZSgnLi9tb2RlbC9zZWFyY2guanMnKTtcblxudmFyIFJvdXRlciA9IEJhY2tib25lLlJvdXRlci5leHRlbmQoe1xuICBpbml0aWFsaXplOiBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIEJhY2tib25lLlJvdXRlci5wcm90b3R5cGUuaW5pdGlhbGl6ZS5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuICAgIHRoaXMuX21vcGlkeSA9IG9wdGlvbnMubW9waWR5O1xuICAgIHRoaXMuX2xhc3RmbSA9IG9wdGlvbnMubGFzdGZtO1xuICAgIHRoaXMuX3Jvb3RFbGVtZW50ID0gb3B0aW9ucy5yb290RWxlbWVudDtcbiAgICB0aGlzLl9jb25maWcgPSBvcHRpb25zLmNvbmZpZztcbiAgfSxcbiAgcm91dGVzOiB7XG4gICAgJyc6ICdkYXNoYm9hcmQnLFxuICAgICdhbGJ1bXMvOmlkLzphcnRpc3QvOm5hbWUnOiAnYWxidW1zJyxcbiAgICAnYXJ0aXN0cy86dXJpLzpuYW1lJzogJ2FydGlzdHMnLFxuICAgICdzZWFyY2gvOnF1ZXJ5JzogJ3NlYXJjaCdcbiAgfSxcbiAgZGFzaGJvYXJkOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy50cmlnZ2VyKCdiZWZvcmVSb3V0ZScpO1xuICB9LFxuICBhbGJ1bXM6IGZ1bmN0aW9uIChpZCwgYXJ0aXN0LCBuYW1lKSB7XG4gICAgdGhpcy50cmlnZ2VyKCdiZWZvcmVSb3V0ZScpO1xuICAgIHZhciB2aWV3ID0gbmV3IEFsYnVtVGFiVmlldyh7XG4gICAgICByb3V0ZXI6IHRoaXMsXG4gICAgICBtb3BpZHk6IHRoaXMuX21vcGlkeSxcbiAgICAgIGxhc3RmbTogdGhpcy5fbGFzdGZtLFxuICAgICAgY29uZmlnOiB0aGlzLl9jb25maWcsXG4gICAgICBpZDogaWQsXG4gICAgICBuYW1lOiBuYW1lLFxuICAgICAgYXJ0aXN0OiBhcnRpc3RcbiAgICB9KTtcbiAgICB0aGlzLl9yb290RWxlbWVudC5hcHBlbmRDaGlsZCh2aWV3LnJlbmRlcigpLmVsKTtcbiAgfSxcbiAgYXJ0aXN0czogZnVuY3Rpb24gKHVyaSwgbmFtZSkge1xuICAgIHRoaXMudHJpZ2dlcignYmVmb3JlUm91dGUnKTtcbiAgICB2YXIgdmlldyA9IG5ldyBBcnRpc3RUYWJWaWV3KHtcbiAgICAgIHJvdXRlcjogdGhpcyxcbiAgICAgIG1vcGlkeTogdGhpcy5fbW9waWR5LFxuICAgICAgbGFzdGZtOiB0aGlzLl9sYXN0Zm0sXG4gICAgICBjb25maWc6IHRoaXMuX2NvbmZpZyxcbiAgICAgIHVyaTogdXJpLFxuICAgICAgbmFtZTogbmFtZVxuICAgIH0pO1xuICAgIHRoaXMuX3Jvb3RFbGVtZW50LmFwcGVuZENoaWxkKHZpZXcucmVuZGVyKCkuZWwpO1xuICB9LFxuICBzZWFyY2g6IGZ1bmN0aW9uIChxdWVyeSkge1xuICAgIHRoaXMudHJpZ2dlcignYmVmb3JlUm91dGUnKTtcbiAgICB2YXIgdmlldyA9IG5ldyBTZWFyY2hUYWJWaWV3KHtcbiAgICAgIHJvdXRlcjogdGhpcyxcbiAgICAgIG1vcGlkeTogdGhpcy5fbW9waWR5LFxuICAgICAgbGFzdGZtOiB0aGlzLl9sYXN0Zm0sXG4gICAgICBjb25maWc6IHRoaXMuX2NvbmZpZyxcbiAgICAgIHF1ZXJ5OiBxdWVyeSxcbiAgICAgIG1vZGVsOiBuZXcgU2VhcmNoKG51bGwsIHsgbW9waWR5OiB0aGlzLl9tb3BpZHkgfSlcbiAgICB9KTtcbiAgICB0aGlzLl9yb290RWxlbWVudC5hcHBlbmRDaGlsZCh2aWV3LnJlbmRlcigpLmVsKTtcbiAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gUm91dGVyO1xuIiwidmFyIEhhbmRsZWJhcnMgPSByZXF1aXJlKCdoYW5kbGViYXJzL3J1bnRpbWUnKS5kZWZhdWx0O1xudmFyIG1hcmtlZCA9IHJlcXVpcmUoJ21hcmtlZCcpO1xudmFyIHRlbXBsYXRlcyA9IHt9O1xuXG5tYXJrZWQuc2V0T3B0aW9ucyh7XG4gIGdmbTogdHJ1ZVxufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ21hcmtkb3duJywgZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgdmFyIGNvbnRlbnQgPSBvcHRpb25zLmZuKHRoaXMpO1xuICByZXR1cm4gbWFya2VkKGNvbnRlbnQpO1xufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2RlYnVnJywgZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgY29uc29sZS5sb2codGhpcyk7XG59KTtcblxudGVtcGxhdGVzLnRhYl92aWV3ID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3RhYi92aWV3LmhicycpO1xuXG50ZW1wbGF0ZXMuYWxidW1fY29sbGVjdGlvbiA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9hbGJ1bS9jb2xsZWN0aW9uLmhicycpO1xudGVtcGxhdGVzLmFsYnVtX2l0ZW1fbW9kZWwgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvYWxidW0vaXRlbV9tb2RlbC5oYnMnKTtcbnRlbXBsYXRlcy5hbGJ1bV9wYWdlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL2FsYnVtL3BhZ2UuaGJzJyk7XG50ZW1wbGF0ZXMuYWxidW1fbW9kZWwgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvYWxidW0vbW9kZWwuaGJzJyk7XG5cbnRlbXBsYXRlcy5hcnRpc3RfY29sbGVjdGlvbiA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9hcnRpc3QvY29sbGVjdGlvbi5oYnMnKTtcbnRlbXBsYXRlcy5hcnRpc3RfaXRlbV9tb2RlbCA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9hcnRpc3QvaXRlbV9tb2RlbC5oYnMnKTtcbnRlbXBsYXRlcy5hcnRpc3RfbGlua19tb2RlbCA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9hcnRpc3QvbGlua19tb2RlbC5oYnMnKTtcbnRlbXBsYXRlcy5hcnRpc3RfbW9kZWwgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvYXJ0aXN0L21vZGVsLmhicycpO1xuXG50ZW1wbGF0ZXMuaG9tZV92b2x1bWVfY29udHJvbCA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9ob21lL3ZvbHVtZV9jb250cm9sLmhicycpO1xudGVtcGxhdGVzLmhvbWVfc2VhcmNoX2NvbnRyb2wgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvaG9tZS9zZWFyY2hfY29udHJvbC5oYnMnKTtcbnRlbXBsYXRlcy5ob21lX3BsYXliYWNrX2NvbnRyb2wgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvaG9tZS9wbGF5YmFja19jb250cm9sLmhicycpO1xuXG50ZW1wbGF0ZXMubm93cGxheWluZ192aWV3ID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL25vd3BsYXlpbmcvdmlldy5oYnMnKTtcblxuXG50ZW1wbGF0ZXMudHJhY2tfbGlzdCA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy90cmFjay9saXN0LmhicycpO1xudGVtcGxhdGVzLnRyYWNrX2NvbGxlY3Rpb24gPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvdHJhY2svY29sbGVjdGlvbi5oYnMnKTtcbnRlbXBsYXRlcy50cmFja19tb2RlbF9pdGVtID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3RyYWNrL21vZGVsX2l0ZW0uaGJzJyk7XG5cbnRlbXBsYXRlcy50cmFja2xpc3RfbGlzdCA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy90cmFja2xpc3QvbGlzdC5oYnMnKTtcbnRlbXBsYXRlcy50cmFja2xpc3RfY29sbGVjdGlvbiA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy90cmFja2xpc3QvY29sbGVjdGlvbi5oYnMnKTtcbnRlbXBsYXRlcy50cmFja2xpc3RfbW9kZWwgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvdHJhY2tsaXN0L21vZGVsLmhicycpO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gdGVtcGxhdGVzO1xuIiwidmFyIENvbGxlY3Rpb25WaWV3ID0gcmVxdWlyZSgnLi92aWV3LmpzJyk7XG52YXIgQWxidW1Nb2RlbEl0ZW1WaWV3ID0gcmVxdWlyZSgnLi4vbW9kZWxfaXRlbS9hbGJ1bS5qcycpO1xudmFyIEFsYnVtQ29sbGVjdGlvblZpZXcgPSBDb2xsZWN0aW9uVmlldy5leHRlbmQoe1xuICB0ZW1wbGF0ZTogJ2FsYnVtX2NvbGxlY3Rpb24nLFxuICBpdGVtVmlld0NsYXNzOiBBbGJ1bU1vZGVsSXRlbVZpZXdcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFsYnVtQ29sbGVjdGlvblZpZXc7XG4iLCJ2YXIgQ29sbGVjdGlvblZpZXcgPSByZXF1aXJlKCcuL3ZpZXcuanMnKTtcbnZhciBBcnRpc3RNb2RlbEl0ZW1WaWV3ID0gcmVxdWlyZSgnLi4vbW9kZWxfaXRlbS9hcnRpc3QuanMnKTtcbnZhciBBcnRpc3RDb2xsZWN0aW9uVmlldyA9IENvbGxlY3Rpb25WaWV3LmV4dGVuZCh7XG4gIHRlbXBsYXRlOiAnYXJ0aXN0X2NvbGxlY3Rpb24nLFxuICBpdGVtVmlld0NsYXNzOiBBcnRpc3RNb2RlbEl0ZW1WaWV3XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBBcnRpc3RDb2xsZWN0aW9uVmlldztcbiIsInZhciBDb2xsZWN0aW9uVmlldyA9IHJlcXVpcmUoJy4vdmlldy5qcycpO1xudmFyIFRyYWNrTW9kZWxJdGVtVmlldyA9IHJlcXVpcmUoJy4uL21vZGVsX2l0ZW0vdHJhY2suanMnKTtcbnZhciBUcmFja0NvbGxlY3Rpb25WaWV3ID0gQ29sbGVjdGlvblZpZXcuZXh0ZW5kKHtcbiAgdGVtcGxhdGU6ICd0cmFja19jb2xsZWN0aW9uJyxcbiAgaXRlbVZpZXdDbGFzczogVHJhY2tNb2RlbEl0ZW1WaWV3XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBUcmFja0NvbGxlY3Rpb25WaWV3O1xuIiwidmFyIENvbGxlY3Rpb25WaWV3ID0gcmVxdWlyZSgnLi92aWV3LmpzJyk7XG52YXIgVHJhY2tsaXN0VHJhY2tWaWV3ID0gcmVxdWlyZSgnLi4vbW9kZWxfaXRlbS90cmFja2xpc3RfdHJhY2suanMnKTtcbnZhciBUcmFja2xpc3RDb2xsZWN0aW9uVmlldyA9IENvbGxlY3Rpb25WaWV3LmV4dGVuZCh7XG4gIHRlbXBsYXRlOiAndHJhY2tsaXN0X2NvbGxlY3Rpb24nLFxuICBpdGVtVmlld0NsYXNzOiBUcmFja2xpc3RUcmFja1ZpZXdcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRyYWNrbGlzdENvbGxlY3Rpb25WaWV3O1xuIiwidmFyIFZpZXcgPSByZXF1aXJlKCcuLi92aWV3LmpzJyk7XG52YXIgTW9kZWxWaWV3ID0gcmVxdWlyZSgnLi4vbW9kZWwvdmlldy5qcycpO1xudmFyIENvbGxlY3Rpb25WaWV3ID0gVmlldy5leHRlbmQoe1xuICB0YWdOYW1lOiAndWwnLFxuICBjbGFzc05hbWU6ICdpbnRlcmFjdGl2ZS1saXN0IGxvYWRpbmcnLFxuICBhdHRyaWJ1dGVzOiB7XG4gICAgJ3JvbGUnOiAnbGlzdGJveCdcbiAgfSxcbiAgaXRlbVZpZXdDbGFzczogTW9kZWxWaWV3LFxuICBpbml0aWFsaXplOiBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIFZpZXcucHJvdG90eXBlLmluaXRpYWxpemUuY2FsbCh0aGlzLCBvcHRpb25zKTtcbiAgICB0aGlzLl9jaGVja2FibGUgPSAhIW9wdGlvbnMuY2hlY2thYmxlO1xuICAgIHRoaXMudmlld3MgPSBbXTtcbiAgICB0aGlzLmNvbGxlY3Rpb24gPSBvcHRpb25zLmNvbGxlY3Rpb247XG4gICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbGxlY3Rpb24sICdhZGQnLCB0aGlzLl9hZGRNb2RlbFZpZXcpO1xuICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb2xsZWN0aW9uLCAnY2hhbmdlJywgdGhpcy5yZW5kZXIpO1xuICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb2xsZWN0aW9uLCAncmVzZXQnLCB0aGlzLnJlbmRlcik7XG4gICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbGxlY3Rpb24sICdzb3J0JywgdGhpcy5yZW5kZXIpO1xuICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb2xsZWN0aW9uLCAnc29ydCcsIHRoaXMuX2hpZGVMb2FkaW5nTWVzc2FnZSk7XG4gICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbGxlY3Rpb24sICdjaGFuZ2UnLCB0aGlzLl9oaWRlTG9hZGluZ01lc3NhZ2UpO1xuICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb2xsZWN0aW9uLCAncmVzZXQnLCB0aGlzLl9oaWRlTG9hZGluZ01lc3NhZ2UpO1xuICB9LFxuICByZW5kZXI6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnRyaWdnZXIoJ3JlbmRlcmluZycpO1xuICAgIHZhciBkYXRhID0ge1xuICAgICAgY29sbGVjdGlvbjogdGhpcy5jb2xsZWN0aW9uLnRvSlNPTigpXG4gICAgfTtcbiAgICBpZiAoIXRoaXMuY29sbGVjdGlvbi5sZW5ndGgpIHtcbiAgICAgIHRoaXMuJGVsLmh0bWwodGhpcy5fdGVtcGxhdGUoZGF0YSkpO1xuICAgICAgdGhpcy5faW5pdGlhbFJlbmRlciA9IHRydWU7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgaWYgKCF0aGlzLl9pbml0aWFsUmVuZGVyKSB7XG4gICAgICAgIHRoaXMuJGVsLmh0bWwodGhpcy5fdGVtcGxhdGUoZGF0YSkpO1xuICAgICAgICB0aGlzLl9pbml0aWFsUmVuZGVyID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX3JlbmRlclZpZXdzKCk7XG4gICAgICB0aGlzLiQoJy5lbXB0eS1saXN0JykucmVtb3ZlKCk7XG4gICAgfVxuICAgIHRoaXMudHJpZ2dlcigncmVuZGVyZWQnKTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICByZW1vdmU6IGZ1bmN0aW9uICgpIHtcbiAgICBWaWV3LnByb3RvdHlwZS5yZW1vdmUuYXBwbHkodGhpcyk7XG4gICAgdGhpcy5jb2xsZWN0aW9uLnN0b3BMaXN0ZW5pbmcoKTtcbiAgfSxcbiAgbmV4dDogZnVuY3Rpb24gKHZpZXcpIHtcbiAgICB2YXIgaW5kZXggPSB0aGlzLl92aWV3SW5kZXgodmlldyk7XG5cbiAgICBpZiAoaW5kZXggIT09IHVuZGVmaW5lZCAmJiBpbmRleCA8IHRoaXMudmlld3MubGVuZ3RoIC0gMSkge1xuICAgICAgdGhpcy51cGRhdGVTZWxlY3RlZCh0aGlzLnZpZXdzW2luZGV4ICsgMV0pO1xuICAgIH1cbiAgfSxcbiAgcHJldjogZnVuY3Rpb24gKHZpZXcpIHtcbiAgICB2YXIgaW5kZXggPSB0aGlzLl92aWV3SW5kZXgodmlldyk7XG5cbiAgICBpZiAoaW5kZXggIT09IHVuZGVmaW5lZCAmJiBpbmRleCA+IDApIHtcbiAgICAgIHRoaXMudXBkYXRlU2VsZWN0ZWQodGhpcy52aWV3c1tpbmRleCAtIDFdKTtcbiAgICB9XG4gIH0sXG4gIHVwZGF0ZVNlbGVjdGVkOiBmdW5jdGlvbiAodmlldykge1xuICAgIHZhciBsZW5ndGggPSB0aGlzLnZpZXdzLmxlbmd0aDtcbiAgICB2YXIgaTtcblxuICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgdGhpcy52aWV3c1tpXS5zZXRTZWxlY3RlZCh2aWV3Lm1vZGVsLmNpZCA9PT0gdGhpcy52aWV3c1tpXS5tb2RlbC5jaWQpO1xuICAgIH1cbiAgfSxcbiAgcmVtb3ZlU3ViVmlldzogZnVuY3Rpb24gKHZpZXcpIHtcbiAgICB2YXIgaW5kZXggPSB0aGlzLnZpZXdzLmluZGV4T2Yodmlldyk7XG5cbiAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICB0aGlzLnZpZXdzLnNwbGljZShpbmRleCwgMSk7XG4gICAgfVxuICB9LFxuICBfdmlld0luZGV4OiBmdW5jdGlvbiAodmlldykge1xuICAgIHJldHVybiB0aGlzLnZpZXdzLnJlZHVjZShmdW5jdGlvbiAocHJldmlvdXMsIGN1cnJlbnQsIGluZGV4KSB7XG4gICAgICBpZiAocHJldmlvdXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gcHJldmlvdXM7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB2aWV3Lm1vZGVsLmNpZCA9PT0gY3VycmVudC5tb2RlbC5jaWQgPyBpbmRleCA6IHVuZGVmaW5lZDtcbiAgICB9LCB1bmRlZmluZWQpO1xuICB9LFxuICBfaGlkZUxvYWRpbmdNZXNzYWdlOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kZWwucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgfSxcbiAgX3JlbW92ZVZpZXdzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGkgPSB0aGlzLnZpZXdzLmxlbmd0aDtcblxuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIHRoaXMudmlld3MucG9wKCkucmVtb3ZlKCk7XG4gICAgfVxuICB9LFxuICBfcmVuZGVyVmlld3M6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaTtcbiAgICB2YXIgY29sbGVjdGlvbiA9IHRoaXMuY29sbGVjdGlvbjtcblxuICAgIGlmICh0aGlzLnZpZXdzLmxlbmd0aCkge1xuICAgICAgdGhpcy52aWV3cy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHZhciBhaSA9IGNvbGxlY3Rpb24uaW5kZXhPZihhLm1vZGVsKTtcbiAgICAgICAgdmFyIGJpID0gY29sbGVjdGlvbi5pbmRleE9mKGIubW9kZWwpO1xuXG4gICAgICAgIHJldHVybiBhaSAtIGJpO1xuICAgICAgfSk7XG5cbiAgICAgIGZvciAoaSA9IDA7IGkgPCB0aGlzLnZpZXdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXMuZWwuYXBwZW5kQ2hpbGQodGhpcy52aWV3c1tpXS5lbCk7XG5cbiAgICAgICAgaWYgKGkgPT09IDApIHtcbiAgICAgICAgICB0aGlzLnZpZXdzW2ldLmVsLnNldEF0dHJpYnV0ZSgndGFiaW5kZXgnLCAwKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMuJCgnLmVtcHR5LWxpc3QnKS5yZW1vdmUoKTtcbiAgICB9XG4gIH0sXG4gIF9hZGRNb2RlbFZpZXc6IGZ1bmN0aW9uIChtb2RlbCwgaW5kZXgpIHtcbiAgICB2YXIgdmlldyA9IG5ldyB0aGlzLml0ZW1WaWV3Q2xhc3Moe1xuICAgICAgbW9waWR5OiB0aGlzLm1vcGlkeSxcbiAgICAgIHJvdXRlcjogdGhpcy5yb3V0ZXIsXG4gICAgICBtb2RlbDogbW9kZWwsXG4gICAgICBjb2xsZWN0aW9uVmlldzogdGhpcyxcbiAgICAgIGxhc3RmbTogdGhpcy5fbGFzdGZtLFxuICAgICAgY2hlY2thYmxlOiB0aGlzLl9jaGVja2FibGVcbiAgICB9KTtcbiAgICB0aGlzLnZpZXdzLnB1c2godmlldyk7XG4gICAgdGhpcy4kZWwuYXBwZW5kKHZpZXcucmVuZGVyKCkuZWwpO1xuICB9LFxuICBnZXRDaGVja2VkOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMudmlld3MuZmlsdGVyKGZ1bmN0aW9uICh2aWV3KSB7XG4gICAgICByZXR1cm4gdmlldy5pc0NoZWNrZWQoKTtcbiAgICB9KTtcbiAgfSxcbiAgYWxsQ2hlY2tlZDogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLmdldENoZWNrZWQoKS5sZW5ndGggPT09IHRoaXMuY29sbGVjdGlvbi5sZW5ndGg7XG4gIH0sXG4gIGNoZWNrQWxsOiBmdW5jdGlvbiAoY2hlY2tlZCkge1xuICAgIHRoaXMudmlld3MuZm9yRWFjaChmdW5jdGlvbiAodmlldykge1xuICAgICAgdmlldy5zZXRDaGVja2VkKGNoZWNrZWQpO1xuICAgIH0pO1xuICB9LFxuICBfaGlkZU9uUmVuZGVyOiBmYWxzZSxcbiAgX3VwZGF0ZUxpc3RJdGVtczogZnVuY3Rpb24gKCRjdXJyZW50KSB7XG4gICAgdGhpcy4kKCcuaW50ZXJhY3RpdmUtbGlzdC1pdGVtJykuZWFjaChmdW5jdGlvbiAoaSkge1xuICAgICAgdmFyICRpdGVtID0gJCh0aGlzKTtcbiAgICAgIGlmICgkaXRlbS5pcygkY3VycmVudCkpIHtcbiAgICAgICAgJGl0ZW0uYXR0cigndGFiaW5kZXgnLCAwKTtcbiAgICAgICAgJGl0ZW0uYXR0cignYXJpYS1zZWxlY3RlZCcsICd0cnVlJyk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgJGl0ZW0uYXR0cigndGFiaW5kZXgnLCAtMSk7XG4gICAgICAgICRpdGVtLmF0dHIoJ2FyaWEtc2VsZWN0ZWQnLCAnZmFsc2UnKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29sbGVjdGlvblZpZXc7XG4iLCJ2YXIgTGlzdFZpZXcgPSByZXF1aXJlKCcuL3ZpZXcuanMnKTtcbnZhciBUcmFja0NvbGxlY3Rpb25WaWV3ID0gcmVxdWlyZSgnLi4vY29sbGVjdGlvbi90cmFjay5qcycpO1xudmFyIFRyYWNrTGlzdFZpZXcgPSBMaXN0Vmlldy5leHRlbmQoe1xuICBfY29sbGVjdGlvblZpZXdDbGFzczogVHJhY2tDb2xsZWN0aW9uVmlldyxcbiAgdGVtcGxhdGU6ICd0cmFja19saXN0JyxcbiAgZXZlbnRzOiB7XG4gICAgJ2NsaWNrIC5xdWV1ZV9hbGwnOiAnX3F1ZXVlQWxsJyxcbiAgICAnY2xpY2sgLnF1ZXVlX3NlbGVjdGVkJzogJ19xdWV1ZVNlbGVjdGVkJyxcbiAgICAnY2hhbmdlIC5hY3Rpb24tdG9vbGJhciBpbnB1dFt0eXBlPWNoZWNrYm94XSc6ICdfdG9nZ2xlQ2hlY2tlZCdcbiAgfSxcbiAgX3F1ZXVlU2VsZWN0ZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZWN0ZWRNb2RlbFZpZXdzID0gdGhpcy5fY29sbGVjdGlvblZpZXcuZ2V0Q2hlY2tlZCgpO1xuICAgIHZhciB0cmFja3M7XG5cbiAgICBpZiAoc2VsZWN0ZWRNb2RlbFZpZXdzLmxlbmd0aCkge1xuICAgICAgdHJhY2tzID0gc2VsZWN0ZWRNb2RlbFZpZXdzLm1hcChmdW5jdGlvbiAodmlldykge1xuICAgICAgICByZXR1cm4gdmlldy5tb2RlbC50b0pTT04oKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5tb3BpZHkudHJhY2tsaXN0LmFkZCh0cmFja3MpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICBzZWxlY3RlZE1vZGVsVmlld3MuZm9yRWFjaChmdW5jdGlvbiAodmlldykge1xuICAgICAgICAgIHZpZXcuc2V0Q2hlY2tlZChmYWxzZSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuICB9LFxuICBfdG9nZ2xlQ2hlY2tlZDogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdGhpcy5fY29sbGVjdGlvblZpZXcuY2hlY2tBbGwoIXRoaXMuX2NvbGxlY3Rpb25WaWV3LmFsbENoZWNrZWQoKSk7XG4gIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRyYWNrTGlzdFZpZXc7XG4iLCJ2YXIgTGlzdFZpZXcgPSByZXF1aXJlKCcuL3ZpZXcuanMnKTtcbnZhciBUcmFja0xpc3RDb2xsZWN0aW9uVmlldyA9IHJlcXVpcmUoJy4uL2NvbGxlY3Rpb24vdHJhY2tfbGlzdC5qcycpO1xudmFyIFRyYWNrTGlzdExpc3RWaWV3ID0gTGlzdFZpZXcuZXh0ZW5kKHtcbiAgX2NvbGxlY3Rpb25WaWV3Q2xhc3M6IFRyYWNrTGlzdENvbGxlY3Rpb25WaWV3LFxuICBpbml0aWFsaXplOiBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIExpc3RWaWV3LnByb3RvdHlwZS5pbml0aWFsaXplLmNhbGwodGhpcywgb3B0aW9ucyk7XG4gICAgdGhpcy5vbigncmVuZGVyZWQnLCB0aGlzLl9mZXRjaFRyYWNrTGlzdC5iaW5kKHRoaXMpKTtcbiAgfSxcbiAgdGVtcGxhdGU6ICd0cmFja2xpc3RfbGlzdCcsXG4gIGV2ZW50czoge1xuICAgICdjbGljayAuY2xlYXJfcXVldWUnOiAnX2NsZWFyUXVldWUnLFxuICAgICdjbGljayAuZGVsZXRlX3NlbGVjdGVkJzogJ19kZWxldGVDaGVja2VkJ1xuICB9LFxuICBfY2xlYXJRdWV1ZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBtZXNzYWdlMSA9ICdJZiB5b3UgY2xpY2sgT0sgdG8gdGhpcywgeW91IFdJTEwgd2lwZSB0aGUgcXVldWUuIEFyZSB5b3Ugc3VyZT8nLFxuICAgICAgICBtZXNzYWdlMiA9ICdSZWFsbHkgU3VyZT8gV2l0aCBncmVhdCBwb3dlciwgY29tZXMgZ3JlYXQgcmVzcG9uc2liaWxpdHkuJztcblxuICAgIGlmIChjb25maXJtKG1lc3NhZ2UxKSAmJiBjb25maXJtKG1lc3NhZ2UyKSkge1xuICAgICAgdGhpcy5tb3BpZHkudHJhY2tsaXN0LmNsZWFyKCk7XG4gICAgfVxuICB9LFxuICBfZGVsZXRlQ2hlY2tlZDogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdGhpcy5fZGVsZXRlQ2hlY2tlZFRyYWNrcyh0aGlzLl9jb2xsZWN0aW9uVmlldy5nZXRDaGVja2VkKCkubWFwKGZ1bmN0aW9uICh2aWV3KSB7XG4gICAgICByZXR1cm4gdmlldy5tb2RlbC5nZXQoJ3RsaWQnKTtcbiAgICB9KSk7XG4gIH0sXG4gIF9kZWxldGVDaGVja2VkVHJhY2tzOiBmdW5jdGlvbiAodGxpZHMpIHtcbiAgICB0aGlzLm1vcGlkeS50cmFja2xpc3QucmVtb3ZlKHsgdGxpZDogdGxpZHMgfSk7XG4gIH0sXG4gIF9mZXRjaFRyYWNrTGlzdDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uZmV0Y2goKTtcbiAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gVHJhY2tMaXN0TGlzdFZpZXc7XG4iLCJ2YXIgVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXcuanMnKTtcbnZhciBMaXN0VmlldyA9IFZpZXcuZXh0ZW5kKHtcbiAgdGFnTmFtZTogJ2RpdicsIFxuICBjbGFzc05hbWU6ICd2aWV3LWxpc3QnLFxuICBfY29sbGVjdGlvblZpZXdDbGFzczogbnVsbCxcbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICBWaWV3LnByb3RvdHlwZS5pbml0aWFsaXplLmNhbGwodGhpcywgb3B0aW9ucyk7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICB0aGlzLl9jb2xsZWN0aW9uID0gb3B0aW9ucy5jb2xsZWN0aW9uO1xuICAgIHRoaXMuX2luaXRTdWJWaWV3KCk7XG4gIH0sXG4gIHJlbmRlcjogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMudHJpZ2dlcigncmVuZGVyaW5nJyk7XG4gICAgdGhpcy4kZWwuaHRtbCh0aGlzLl90ZW1wbGF0ZSgpKTtcbiAgICB0aGlzLmVsLmFwcGVuZENoaWxkKHRoaXMuX2NvbGxlY3Rpb25WaWV3LnJlbmRlcigpLmVsKTtcbiAgICB0aGlzLnRyaWdnZXIoJ3JlbmRlcmVkJyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIF9pbml0U3ViVmlldzogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2NvbGxlY3Rpb25WaWV3ID0gbmV3IHRoaXMuX2NvbGxlY3Rpb25WaWV3Q2xhc3Moe1xuICAgICAgbW9waWR5OiB0aGlzLm1vcGlkeSxcbiAgICAgIHJvdXRlcjogdGhpcy5yb3V0ZXIsXG4gICAgICBjb2xsZWN0aW9uOiB0aGlzLl9jb2xsZWN0aW9uLFxuICAgICAgbGFzdGZtOiB0aGlzLl9sYXN0Zm1cbiAgICB9KTtcbiAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gTGlzdFZpZXc7XG4iLCJ2YXIgJCA9IHJlcXVpcmUoJ2pxdWVyeScpO1xudmFyIFZpZXcgPSByZXF1aXJlKCcuLi92aWV3LmpzJyk7XG52YXIgSm9pblZpZXcgPSBWaWV3LmV4dGVuZCh7XG4gIHRhZ05hbWU6ICdkaXYnLFxuICBpbml0aWFsaXplOiBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIFZpZXcucHJvdG90eXBlLmluaXRpYWxpemUuY2FsbCh0aGlzLCBvcHRpb25zKTtcbiAgICB0aGlzLnZpZXdzID0gb3B0aW9ucy52aWV3cyB8fCBbXTtcbiAgfSxcbiAgcmVuZGVyOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGk7XG4gICAgdmFyIHdyYXA7XG5cbiAgICB0aGlzLnRyaWdnZXIoJ3JlbmRlcmluZycpO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IHRoaXMudmlld3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICh0aGlzLnZpZXdzW2ldLndyYXApIHtcbiAgICAgICAgd3JhcCA9ICQodGhpcy52aWV3c1tpXS53cmFwKS5hcHBlbmRUbyh0aGlzLmVsKTtcbiAgICAgICAgdGhpcy52aWV3c1tpXS52aWV3LnJlbmRlcigpLiRlbC5hcHBlbmRUbyh3cmFwKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB0aGlzLmVsLmFwcGVuZENoaWxkKHRoaXMudmlld3NbaV0udmlldy5yZW5kZXIoKS5lbCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy50cmlnZ2VyKCdyZW5kZXJlZCcpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBKb2luVmlldztcbiIsInZhciAkID0gcmVxdWlyZSgnanF1ZXJ5Jyk7XG52YXIgVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXcuanMnKTtcbnZhciBQbGF5YmFja0NvbnRyb2xWaWV3ID0gcmVxdWlyZSgnLi9wbGF5YmFja19jb250cm9scy5qcycpO1xudmFyIFZvbHVtZUNvbnRyb2xWaWV3ID0gcmVxdWlyZSgnLi92b2x1bWVfY29udHJvbC5qcycpO1xudmFyIE1haW5Db250cm9sVmlldyA9IFZpZXcuZXh0ZW5kKHtcbiAgdGFnTmFtZTogJ2RpdicsXG4gIGNsYXNzTmFtZTogJ3JvdycsXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgVmlldy5wcm90b3R5cGUuaW5pdGlhbGl6ZS5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuICAgIHRoaXMuX2luaXRTdWJWaWV3cygpO1xuICB9LFxuICByZW5kZXI6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaTtcbiAgICB2YXIgY29sO1xuXG4gICAgdGhpcy50cmlnZ2VyKCdyZW5kZXJpbmcnKTtcbiAgICBcbiAgICBmb3IgKGkgPSAwOyBpIDwgdGhpcy52aWV3cy5sZW5ndGg7IGkrKykge1xuICAgICAgY29sID0gJCgnPGRpdiBjbGFzcz1cImNvbC14cy02XCI+PC9kaXY+JykuYXBwZW5kVG8odGhpcy5lbCk7XG4gICAgICB0aGlzLnZpZXdzW2ldLnZpZXcucmVuZGVyKCkuJGVsLmFwcGVuZFRvKGNvbCk7XG4gICAgfVxuXG4gICAgdGhpcy50cmlnZ2VyKCdyZW5kZXJlZCcpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBfaW5pdFN1YlZpZXdzOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy52aWV3cyA9IFtcbiAgICAgIHtcbiAgICAgICAgbmFtZTogJ1BsYXliYWNrJyxcbiAgICAgICAgdmlldzogbmV3IFBsYXliYWNrQ29udHJvbFZpZXcoe1xuICAgICAgICAgIHJvdXRlcjogdGhpcy5yb3V0ZXIsXG4gICAgICAgICAgbW9waWR5OiB0aGlzLm1vcGlkeSxcbiAgICAgICAgICBjb25maWc6IHRoaXMuX2NvbmZpZyxcbiAgICAgICAgICBsYXN0Zm06IHRoaXMuX2xhc3RmbVxuICAgICAgICB9KVxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbmFtZTogJ1ZvbHVtZScsXG4gICAgICAgIHZpZXc6IG5ldyBWb2x1bWVDb250cm9sVmlldyh7XG4gICAgICAgICAgcm91dGVyOiB0aGlzLnJvdXRlcixcbiAgICAgICAgICBtb3BpZHk6IHRoaXMubW9waWR5LFxuICAgICAgICAgIGNvbmZpZzogdGhpcy5fY29uZmlnLFxuICAgICAgICAgIGxhc3RmbTogdGhpcy5fbGFzdGZtXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgXTtcbiAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gTWFpbkNvbnRyb2xWaWV3O1xuIiwidmFyIFZpZXcgPSByZXF1aXJlKCcuLi92aWV3Jyk7XG52YXIgVHJhY2sgPSByZXF1aXJlKCcuLi8uLi9tb2RlbC90cmFjay5qcycpO1xudmFyIF8gPSByZXF1aXJlKCdiYWNrYm9uZS9ub2RlX21vZHVsZXMvdW5kZXJzY29yZScpO1xudmFyIE5vd1BsYXlpbmdWaWV3ID0gVmlldy5leHRlbmQoe1xuICB0YWdOYW1lOiAnZGl2JyxcbiAgY2xhc3NOYW1lOiAndmlldy1tb2RlbCcsXG4gIHRlbXBsYXRlOiAnbm93cGxheWluZ192aWV3JyxcbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICBWaWV3LnByb3RvdHlwZS5pbml0aWFsaXplLmNhbGwodGhpcywgb3B0aW9ucyk7XG4gICAgdGhpcy5saXN0ZW5Ubyh0aGlzLm1vcGlkeSwgJ2V2ZW50OnRyYWNrUGxheWJhY2tTdGFydGVkJywgdGhpcy5fdXBkYXRlVHJhY2spO1xuICAgIHRoaXMubW9waWR5LnBsYXliYWNrLmdldEN1cnJlbnRUbFRyYWNrKCkudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdGhpcy5fdXBkYXRlVHJhY2soe1xuICAgICAgICB0bF90cmFjazogZGF0YVxuICAgICAgfSk7XG4gICAgfS5iaW5kKHRoaXMpKTtcbiAgfSxcbiAgcmVtb3ZlOiBmdW5jdGlvbiAoKSB7XG4gICAgVmlldy5wcm90b3R5cGUucmVtb3ZlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgLy90aGlzLnN0b3BMaXN0ZW5pbmcoKTtcbiAgfSxcbiAgcmVuZGVyOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGRhdGEgPSB0aGlzLl90cmFjayAmJiB0aGlzLl90cmFjay50b0pTT04gPyB0aGlzLl90cmFjay50b0pTT04oKSA6IHt9O1xuICAgIHRoaXMudHJpZ2dlcigncmVuZGVyaW5nJyk7XG4gICAgdGhpcy4kZWwuaHRtbCh0aGlzLl90ZW1wbGF0ZShkYXRhKSk7XG4gICAgdGhpcy50cmlnZ2VyKCdyZW5kZXJlZCcpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBfdXBkYXRlVHJhY2s6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgaWYgKGRhdGEpIHtcbiAgICAgIHRoaXMuX3RyYWNrID0gbmV3IFRyYWNrKGRhdGEudGxfdHJhY2sudHJhY2ssIHtcbiAgICAgICAgbW9waWR5OiB0aGlzLm1vcGlkeSxcbiAgICAgICAgbGFzdGZtOiB0aGlzLl9sYXN0Zm1cbiAgICAgIH0pO1xuICAgICAgdGhpcy5fdHJhY2sub25jZSgnc3luYycsIHRoaXMucmVuZGVyLmJpbmQodGhpcykpO1xuICAgICAgdGhpcy5fdHJhY2suZmV0Y2goKTtcbiAgICB9XG4gIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE5vd1BsYXlpbmdWaWV3O1xuIiwidmFyIFZpZXcgPSByZXF1aXJlKCcuLi92aWV3LmpzJyk7XG52YXIgUGxheWJhY2tDb250cm9sVmlldyA9IFZpZXcuZXh0ZW5kKHtcbiAgdGFnTmFtZTogJ25hdicsXG4gIGNsYXNzTmFtZTogJ3BsYXliYWNrLWNvbnRyb2xzJyxcbiAgdGVtcGxhdGU6ICdob21lX3BsYXliYWNrX2NvbnRyb2wnLFxuICBldmVudHM6IHtcbiAgICAnY2xpY2sgLnBsYXliYWNrLWNvbnRyb2xzLWJhY2snOiAncHJldmlvdXMnLFxuICAgICdjbGljayAucGxheWJhY2stY29udHJvbHMtbmV4dCc6ICduZXh0JyxcbiAgICAnY2xpY2sgLnBsYXliYWNrLWNvbnRyb2xzLXBsYXknOiAncGxheScsXG4gICAgJ2NsaWNrIC5wbGF5YmFjay1jb250cm9scy1wYXVzZSc6ICdwYXVzZSdcbiAgfSxcbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICBWaWV3LnByb3RvdHlwZS5pbml0aWFsaXplLmNhbGwodGhpcywgb3B0aW9ucyk7XG4gICAgdGhpcy5vbigncmVuZGVyZWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLm1vcGlkeS5wbGF5YmFjay5nZXRTdGF0ZSgpLnRoZW4odGhpcy5fY2hhbmdlUGxheWJhY2tTdGF0ZS5iaW5kKHRoaXMpKTtcbiAgICB9LmJpbmQodGhpcykpO1xuICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb3BpZHksICdldmVudDpwbGF5YmFja1N0YXRlQ2hhbmdlZCcsIHRoaXMuX29uUGxheWJhY2tTdGF0ZUNoYW5nZWQuYmluZCh0aGlzKSk7XG4gIH0sXG4gIHBsYXk6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLm1vcGlkeS5wbGF5YmFjay5wbGF5KCk7XG4gIH0sXG4gIHBhdXNlOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5tb3BpZHkucGxheWJhY2sucGF1c2UoKTtcbiAgfSxcbiAgbmV4dDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMubW9waWR5LnBsYXliYWNrLm5leHQoKTtcbiAgfSxcbiAgcHJldmlvdXM6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLm1vcGlkeS5wbGF5YmFjay5wcmV2aW91cygpO1xuICB9LFxuICBfb25QbGF5YmFja1N0YXRlQ2hhbmdlZDogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdGhpcy5fY2hhbmdlUGxheWJhY2tTdGF0ZShldmVudC5uZXdfc3RhdGUpO1xuICB9LFxuICBfY2hhbmdlUGxheWJhY2tTdGF0ZTogZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgaWYgKHN0YXRlID09PSAncGxheWluZycpIHtcbiAgICAgIHRoaXMuJGVsLmFkZENsYXNzKCdwbGF5aW5nJyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy4kZWwucmVtb3ZlQ2xhc3MoJ3BsYXlpbmcnKTtcbiAgICB9XG4gIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBsYXliYWNrQ29udHJvbFZpZXc7XG4iLCJ2YXIgVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXcuanMnKTtcbnZhciBTZWFyY2hDb250cm9sVmlldyA9IFZpZXcuZXh0ZW5kKHtcbiAgdGFnTmFtZTogJ25hdicsXG4gIGNsYXNzTmFtZTogJ3NlYXJjaC1jb250cm9scycsXG4gIHRlbXBsYXRlOiAnaG9tZV9zZWFyY2hfY29udHJvbCcsXG4gIGV2ZW50czoge1xuICAgICdrZXl1cCBbdHlwZT1zZWFyY2hdJzogJ3NlYXJjaCdcbiAgfSxcbiAgc2VhcmNoOiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB2YXIgcXVlcnkgPSBlbmNvZGVVUklDb21wb25lbnQoZXZlbnQuY3VycmVudFRhcmdldC52YWx1ZSk7XG5cbiAgICBpZiAoZXZlbnQud2hpY2ggPT09IDEzICYmIHF1ZXJ5ICE9PSAnJykge1xuICAgICAgdGhpcy5yb3V0ZXIubmF2aWdhdGUoJ3NlYXJjaC8nICsgcXVlcnksIHsgdHJpZ2dlcjogdHJ1ZSB9KTtcbiAgICB9XG4gICAgXG4gIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNlYXJjaENvbnRyb2xWaWV3O1xuIiwidmFyIFZpZXcgPSByZXF1aXJlKCcuLi92aWV3LmpzJyk7XG52YXIgVm9sdW1lQ29udHJvbFZpZXcgPSBWaWV3LmV4dGVuZCh7XG4gIHRhZ05hbWU6ICduYXYnLFxuICBjbGFzc05hbWU6ICd2b2x1bWUtY29udHJvbHMnLFxuICB0ZW1wbGF0ZTogJ2hvbWVfdm9sdW1lX2NvbnRyb2wnLFxuICBldmVudHM6IHtcbiAgICAnY2xpY2sgLnZvbHVtZS1kb3duJzogJ19kZWNyZW1lbnRWb2x1bWUnLFxuICAgICdjbGljayAudm9sdW1lLXVwJzogJ19pbmNyZW1lbnRWb2x1bWUnXG4gIH0sXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgVmlldy5wcm90b3R5cGUuaW5pdGlhbGl6ZS5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb3BpZHksICdldmVudDp2b2x1bWVDaGFuZ2VkJywgdGhpcy5fb25Wb2x1bWVDaGFuZ2VkLmJpbmQodGhpcykpO1xuICAgIHRoaXMub25jZSgncmVuZGVyZWQnLCB0aGlzLl9pbml0aWFsaXplVm9sdW1lLmJpbmQodGhpcykpO1xuICB9LFxuICByZW5kZXI6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiRlbC5odG1sKHRoaXMuX3RlbXBsYXRlKHsgdm9sdW1lOiB0aGlzLl92b2x1bWVMZXZlbCB9KSk7XG4gICAgdGhpcy50cmlnZ2VyKCdyZW5kZXJlZCcpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICByZW1vdmU6IGZ1bmN0aW9uICgpIHtcbiAgICBWaWV3LnByb3RvdHlwZS5yZW1vdmUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAvL3RoaXMuc3RvcExpc3RlbmluZygpO1xuICB9LFxuICBfdm9sdW1lQ2hhbmdlVGltZW91dDogbnVsbCxcbiAgX3ZvbHVtZUNoYW5nZVRpbWVvdXREZWxheTogMTAwMCxcbiAgX3ZvbHVtZUxldmVsOiBudWxsLFxuICBfb25Wb2x1bWVDb250cm9sQ2hhbmdlOiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBldmVudC5zcmNFbGVtZW50LnZhbHVlID0gZXZlbnQuc3JjRWxlbWVudC52YWx1ZS5yZXBsYWNlKC9bXjAtOV0rLywgJycpO1xuICAgIHRoaXMuX3ZvbHVtZUxldmVsID0gZXZlbnQuc3JjRWxlbWVudC52YWx1ZTtcbiAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHRoaXMuX3ZvbHVtZUNoYW5nZVRpbWVvdXQpO1xuICAgIHRoaXMuX3ZvbHVtZUNoYW5nZVRpbWVvdXQgPSB3aW5kb3cuc2V0VGltZW91dCh0aGlzLl91cGRhdGVWb2x1bWUuYmluZCh0aGlzLCArdGhpcy5fdm9sdW1lTGV2ZWwpLCB0aGlzLl92b2x1bWVDaGFuZ2VUaW1lb3V0RGVsYXkpO1xuICB9LFxuICBfb25Wb2x1bWVDaGFuZ2VkOiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB0aGlzLl92b2x1bWVMZXZlbCA9IGV2ZW50LnZvbHVtZTtcbiAgICB0aGlzLl91cGRhdGVWb2x1bWVDb250cm9sKCk7XG4gIH0sXG4gIF91cGRhdGVWb2x1bWU6IGZ1bmN0aW9uICh2b2x1bWUpIHtcbiAgICB0aGlzLm1vcGlkeS5wbGF5YmFjay5zZXRWb2x1bWUodm9sdW1lKTtcbiAgfSxcbiAgX3VwZGF0ZVZvbHVtZUNvbnRyb2w6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQoJy52b2x1bWUtbGV2ZWwnKS50ZXh0KHRoaXMuX3ZvbHVtZUxldmVsKTtcbiAgfSxcbiAgX2RlY3JlbWVudFZvbHVtZTogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3ZvbHVtZUxldmVsLS07XG4gICAgdGhpcy5fdXBkYXRlVm9sdW1lKHRoaXMuX3ZvbHVtZUxldmVsKTtcbiAgfSxcbiAgX2luY3JlbWVudFZvbHVtZTogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3ZvbHVtZUxldmVsKys7XG4gICAgdGhpcy5fdXBkYXRlVm9sdW1lKHRoaXMuX3ZvbHVtZUxldmVsKTtcbiAgfSxcbiAgX2luaXRpYWxpemVWb2x1bWU6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMubW9waWR5LnBsYXliYWNrLmdldFZvbHVtZSgpLnRoZW4odGhpcy5fb25HZXRWb2x1bWUuYmluZCh0aGlzKSk7XG4gIH0sXG4gIF9vbkdldFZvbHVtZTogZnVuY3Rpb24gKHZvbHVtZSkge1xuICAgIHRoaXMuX3ZvbHVtZUxldmVsID0gdm9sdW1lO1xuICAgIHRoaXMucmVuZGVyKCk7XG4gIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZvbHVtZUNvbnRyb2xWaWV3O1xuIiwidmFyIFZpZXcgPSByZXF1aXJlKCcuLi92aWV3LmpzJyk7XG52YXIgQWxlcnRWaWV3ID0gVmlldy5leHRlbmQoe1xuICBjbGFzc05hbWU6ICdtb2RhbCBpbicsXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgVmlldy5wcm90b3R5cGUuaW5pdGlhbGl6ZS5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHRoaXMuX2RhdGEgPSB7XG4gICAgICBoZWFkZXI6IG9wdGlvbnMuaGVhZGVyLFxuICAgICAgbWVzc2FnZTogb3B0aW9ucy5tZXNzYWdlXG4gICAgfTtcbiAgfSxcbiAgcmVuZGVyOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fb3ZlcmxheUVsZW1lbnQgPSB0aGlzLl9jcmVhdGVPdmVybGF5KCk7XG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLl9vdmVybGF5RWxlbWVudCk7XG4gICAgdGhpcy5lbC5pbm5lckhUTUwgPSB0aGlzLl90ZW1wbGF0ZSh0aGlzLl9kYXRhKTtcbiAgICB0aGlzLmVsLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICByZW1vdmU6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiRlbC5mYWRlT3V0KCdmYXN0JywgVmlldy5wcm90b3R5cGUucmVtb3ZlLmJpbmQodGhpcykpO1xuICAgIHRoaXMuX292ZXJsYXlFbGVtZW50LnBhcmVudEVsZW1lbnQucmVtb3ZlQ2hpbGQodGhpcy5fb3ZlcmxheUVsZW1lbnQpO1xuICB9LFxuICBfdGVtcGxhdGU6IHJlcXVpcmUoJy4uLy4uLy4uL3RlbXBsYXRlcy9tb2RhbC9hbGVydC5oYnMnKSxcbiAgX2NyZWF0ZU92ZXJsYXk6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgb3ZlcmxheSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIG92ZXJsYXkuY2xhc3NOYW1lID0gJ21vZGFsLWJhY2tkcm9wIGluJztcbiAgICByZXR1cm4gb3ZlcmxheTtcbiAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQWxlcnRWaWV3O1xuIiwidmFyIE1vZGVsVmlldyA9IHJlcXVpcmUoJy4vdmlldy5qcycpO1xudmFyIEFsYnVtVmlldyA9IE1vZGVsVmlldy5leHRlbmQoe1xuICB0YWdOYW1lOiAnYXJ0aWNsZScsXG4gIHRlbXBsYXRlOiAnYWxidW1fbW9kZWwnXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBBbGJ1bVZpZXc7XG4iLCJ2YXIgTW9kZWxWaWV3ID0gcmVxdWlyZSgnLi92aWV3LmpzJyk7XG52YXIgQXJ0aXN0VmlldyA9IE1vZGVsVmlldy5leHRlbmQoe1xuICB0YWdOYW1lOiAnYXJ0aWNsZScsXG4gIHRlbXBsYXRlOiAnYXJ0aXN0X21vZGVsJ1xufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQXJ0aXN0VmlldztcbiIsInZhciBNb2RlbFZpZXcgPSByZXF1aXJlKCcuL3ZpZXcuanMnKTtcbnZhciBBcnRpc3RMaW5rVmlldyA9IE1vZGVsVmlldy5leHRlbmQoe1xuICB0YWdOYW1lOiAnZGl2JyxcbiAgY2xhc3NOYW1lOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIE1vZGVsVmlldy5wcm90b3R5cGUuY2xhc3NOYW1lICsgJyB2aWV3LW1vZGVsLWxpbmsnO1xuICB9LFxuICB0ZW1wbGF0ZTogJ2FydGlzdF9saW5rX21vZGVsJyxcbiAgZXZlbnRzOiB7XG4gICAgJ2NsaWNrIGEnOiAnX3ZpZXdBcnRpc3QnXG4gIH0sXG4gIF92aWV3QXJ0aXN0OiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHRoaXMucm91dGVyLm5hdmlnYXRlKCcvYXJ0aXN0cy8nICsgdGhpcy5tb2RlbC5pZCArICcvJyArIGVuY29kZVVSSUNvbXBvbmVudCh0aGlzLm1vZGVsLmdldCgnbmFtZScpKSwgeyB0cmlnZ2VyOiB0cnVlIH0pO1xuICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBBcnRpc3RMaW5rVmlldztcbiIsInZhciBWaWV3ID0gcmVxdWlyZSgnLi4vdmlldy5qcycpO1xudmFyIE1vZGVsVmlldyA9IFZpZXcuZXh0ZW5kKHtcbiAgY2xhc3NOYW1lOiAndmlldy1tb2RlbCcsXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgVmlldy5wcm90b3R5cGUuaW5pdGlhbGl6ZS5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuICAgIGlmIChvcHRpb25zLmV4dGVuZGVkKSB7XG4gICAgICB0aGlzLl9leHRlbmRlZCA9ICEhb3B0aW9ucy5leHRlbmRlZDtcbiAgICB9XG4gICAgdGhpcy5tb2RlbCA9IG9wdGlvbnMubW9kZWw7XG4gICAgdGhpcy5saXN0ZW5Ubyh0aGlzLm1vZGVsLCAnY2hhbmdlJywgdGhpcy5yZW5kZXIpO1xuICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgJ3JlbW92ZScsIHRoaXMucmVtb3ZlKTtcbiAgfSxcbiAgcmVuZGVyOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG1vZGVsID0gdGhpcy5tb2RlbC50b0pTT04oKTtcbiAgICB0aGlzLnRyaWdnZXIoJ3JlbmRlcmluZycpO1xuICAgIHRoaXMuJGVsLmh0bWwodGhpcy5fdGVtcGxhdGUobW9kZWwpKTtcbiAgICB0aGlzLnRyaWdnZXIoJ3JlbmRlcmVkJyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIHJlbW92ZTogZnVuY3Rpb24gKCkge1xuICAgIFZpZXcucHJvdG90eXBlLnJlbW92ZS5hcHBseSh0aGlzKTtcbiAgfSxcbiAgX2hpZGVPblJlbmRlcjogZmFsc2Vcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1vZGVsVmlldztcbiIsInZhciBNb2RlbFZpZXcgPSByZXF1aXJlKCcuL3ZpZXcuanMnKTtcbnZhciBBbGJ1bUl0ZW1WaWV3ID0gTW9kZWxWaWV3LmV4dGVuZCh7XG4gIHRhZ05hbWU6ICdsaScsXG4gIHRlbXBsYXRlOiAnYWxidW1faXRlbV9tb2RlbCcsXG4gIGNsYXNzTmFtZTogJ2ludGVyYWN0aXZlLWxpc3QtaXRlbScsXG4gIF92aWV3QWxidW06IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnJvdXRlci5uYXZpZ2F0ZSgnL2FsYnVtcy8nICsgdGhpcy5tb2RlbC5pZCArICcvJyArIGVuY29kZVVSSUNvbXBvbmVudCh0aGlzLm1vZGVsLmdldCgnYXJ0aXN0cycpWzBdLm5hbWUpICsgJy8nICsgZW5jb2RlVVJJQ29tcG9uZW50KHRoaXMubW9kZWwuZ2V0KCduYW1lJykpLCB7XG4gICAgICB0cmlnZ2VyOiB0cnVlXG4gICAgfSk7XG4gIH0sXG4gIF9vbkNsaWNrOiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB0aGlzLl92aWV3QWxidW0oKTtcbiAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQWxidW1JdGVtVmlldztcbiIsInZhciBleHRlbmQgPSByZXF1aXJlKCdiYWNrYm9uZS9ub2RlX21vZHVsZXMvdW5kZXJzY29yZScpLmV4dGVuZDtcbnZhciBNb2RlbEl0ZW1WaWV3ID0gcmVxdWlyZSgnLi92aWV3LmpzJyk7XG52YXIgQXJ0aXN0TW9kZWxJdGVtVmlldyA9IE1vZGVsSXRlbVZpZXcuZXh0ZW5kKHtcbiAgdGFnTmFtZTogJ2xpJyxcbiAgdGVtcGxhdGU6ICdhcnRpc3RfaXRlbV9tb2RlbCcsXG4gIGNsYXNzTmFtZTogJ2ludGVyYWN0aXZlLWxpc3QtaXRlbScsXG4gIF9vbkNsaWNrOiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBNb2RlbEl0ZW1WaWV3LnByb3RvdHlwZS5fb25DbGljay5jYWxsKHRoaXMsIGV2ZW50KTtcbiAgICB0aGlzLl92aWV3QXJ0aXN0KCk7XG4gIH0sXG4gIF9vbktleURvd246IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHZhciBlbnRlciA9IDEzO1xuXG4gICAgaWYgKGV2ZW50LndoaWNoID09PSAxMykge1xuICAgICAgdGhpcy5fdmlld0FydGlzdCgpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIE1vZGVsSXRlbVZpZXcucHJvdG90eXBlLl9vbktleURvd24uY2FsbCh0aGlzLCBldmVudCk7XG4gICAgfVxuICB9LFxuICBfdmlld0FydGlzdDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMucm91dGVyLm5hdmlnYXRlKCcvYXJ0aXN0cy8nICsgdGhpcy5tb2RlbC5pZCArICcvJyArIGVuY29kZVVSSUNvbXBvbmVudCh0aGlzLm1vZGVsLmdldCgnbmFtZScpKSwgeyB0cmlnZ2VyOiB0cnVlIH0pO1xuICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBBcnRpc3RNb2RlbEl0ZW1WaWV3O1xuIiwidmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2JhY2tib25lL25vZGVfbW9kdWxlcy91bmRlcnNjb3JlJykuZXh0ZW5kO1xudmFyIE1vZGVsSXRlbVZpZXcgPSByZXF1aXJlKCcuL3ZpZXcuanMnKTtcbnZhciBUcmFja1ZpZXcgPSBNb2RlbEl0ZW1WaWV3LmV4dGVuZCh7XG4gIHRhZ05hbWU6ICdsaScsXG4gIGV2ZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBleHRlbmQoe30sIE1vZGVsSXRlbVZpZXcucHJvdG90eXBlLmV2ZW50cywge1xuICAgICAgJ2RibGNsaWNrIGxpJzogJ19hZGRUb1RyYWNrbGlzdCdcbiAgICB9KTtcbiAgfSxcbiAgdGVtcGxhdGU6ICd0cmFja19tb2RlbF9pdGVtJyxcbiAgY2xhc3NOYW1lOiAnaW50ZXJhY3RpdmUtbGlzdC1pdGVtJyxcbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICBNb2RlbEl0ZW1WaWV3LnByb3RvdHlwZS5pbml0aWFsaXplLmNhbGwodGhpcywgb3B0aW9ucyk7XG4gIH0sXG4gIF9jaGVja2FibGU6IHRydWUsXG4gIF9hZGRUb1RyYWNrbGlzdDogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdGhpcy5tb2RlbC5zYXZlKCk7XG4gIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRyYWNrVmlldztcbiIsInZhciBleHRlbmQgPSByZXF1aXJlKCdiYWNrYm9uZS9ub2RlX21vZHVsZXMvdW5kZXJzY29yZScpLmV4dGVuZDtcbnZhciBNb2RlbEl0ZW1WaWV3ID0gcmVxdWlyZSgnLi92aWV3LmpzJyk7XG52YXIgVHJhY2tsaXN0VHJhY2tNb2RlbEl0ZW1WaWV3ID0gTW9kZWxJdGVtVmlldy5leHRlbmQoe1xuICB0YWdOYW1lOiAnbGknLFxuICBjbGFzc05hbWU6ICdpbnRlcmFjdGl2ZS1saXN0LWl0ZW0nLFxuICB0ZW1wbGF0ZTogJ3RyYWNrbGlzdF9tb2RlbCcsXG4gIGV2ZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBleHRlbmQoe30sIE1vZGVsSXRlbVZpZXcucHJvdG90eXBlLmV2ZW50cywge1xuICAgICAgJ2RibGNsaWNrJzogJ3BsYXknLFxuICAgICAgJ2RyYWdzdGFydCc6ICdfb25EcmFnU3RhcnQnLFxuICAgICAgJ2RyYWdlbmQnOiAnX29uRHJhZ0VuZCcsXG4gICAgICAnZHJvcCc6ICdfb25Ecm9wJyxcbiAgICAgICdkcmFnZW50ZXInOiAnX29uRHJhZ0VudGVyJyxcbiAgICAgICdkcmFnb3Zlcic6ICdfb25EcmFnT3ZlcicsXG4gICAgICAnZHJhZ2xlYXZlJzogJ19vbkRyYWdMZWF2ZSdcbiAgICB9KTtcbiAgfSxcbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICBNb2RlbEl0ZW1WaWV3LnByb3RvdHlwZS5pbml0aWFsaXplLmNhbGwodGhpcywgb3B0aW9ucyk7XG4gICAgdGhpcy5vbigncmVuZGVyZWQnLCB0aGlzLl9vblJlbmRlcmVkLmJpbmQodGhpcykpO1xuICB9LFxuICBwbGF5OiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB2YXIgaXNLZXlEb3duUGxheSA9IGV2ZW50LnR5cGUgPT09ICdrZXlkb3duJyAmJiBldmVudC53aGljaCA9PT0gMTM7XG4gICAgdmFyIGlzRG91YmxlQ2xpY2sgPSBldmVudC50eXBlID09PSAnZGJsY2xpY2snO1xuXG4gICAgaWYgKGlzS2V5RG93blBsYXkgfHwgaXNEb3VibGVDbGljaykge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIHRoaXMubW9waWR5LnBsYXliYWNrLnBsYXkodGhpcy5tb2RlbC5hdHRyaWJ1dGVzKTtcbiAgICB9XG4gIH0sXG4gIF9jaGVja2FibGU6IHRydWUsXG4gIF9vbktleWRvd246IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHZhciBlbnRlcktleSA9IGV2ZW50LndoaWNoID09PSAxMztcbiAgICB2YXIgc3BhY2VLZXkgPSBldmVudC53aGljaCA9PT0gMzI7XG5cbiAgICBpZiAoZW50ZXJLZXkpIHtcbiAgICAgIHRoaXMuX3BsYXkoZXZlbnQpO1xuICAgIH1cbiAgICBlbHNlIGlmIChzcGFjZUtleSkge1xuICAgICAgdGhpcy5fdG9nZ2xlU2VsZWN0ZWQoZXZlbnQpO1xuICAgIH1cbiAgfSxcbiAgX29uUmVuZGVyZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9lbmFibGVEcmFnZ2FibGVPbkVsZW1lbnQoKTtcbiAgICB0aGlzLl90b2dnbGVDdXJyZW50VHJhY2tJZkN1cnJlbnQoKTtcbiAgfSxcbiAgX2VuYWJsZURyYWdnYWJsZU9uRWxlbWVudDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuJGVsLmF0dHIoJ2RyYWdnYWJsZScsICd0cnVlJyk7XG4gIH0sXG4gIF90b2dnbGVDdXJyZW50VHJhY2tJZkN1cnJlbnQ6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5tb2RlbC5jdXJyZW50KSB7XG4gICAgICB0aGlzLiRlbC5hZGRDbGFzcygnY3VycmVudF90cmFjaycpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMuJGVsLnJlbW92ZUNsYXNzKCdjdXJyZW50X3RyYWNrJyk7XG4gICAgfVxuICB9LFxuICBfdG9nZ2xlU2VsZWN0ZWQ6IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHZhciBjaGVja2JveCA9IHRoaXMuJCgnaW5wdXRbdHlwZT1jaGVja2JveF0nKVswXTtcbiAgICBjaGVja2JveC5jaGVja2VkID0gIWNoZWNrYm94LmNoZWNrZWQ7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgfSxcbiAgX29uRHJhZ1N0YXJ0OiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBldmVudC5vcmlnaW5hbEV2ZW50LmRhdGFUcmFuc2Zlci5zZXREYXRhKCd0cmFja19pbmRleCcsIHRoaXMubW9kZWwuY29sbGVjdGlvbi5pbmRleE9mKHRoaXMubW9kZWwpKTtcbiAgfSxcbiAgX29uRHJhZ0VuZDogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdGhpcy4kZWwucmVtb3ZlQ2xhc3MoJ2RyYWdvdmVyJyk7XG4gIH0sXG4gIF9vbkRyb3A6IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHZhciBpbmRleCwgc291cmNlVHJhY2ssIHRhcmdldEluZGV4LCBuZXdJbmRleDtcblxuICAgIGlmICh0aGlzLm1vZGVsICYmIHRoaXMubW9kZWwuY29sbGVjdGlvbikge1xuICAgICAgaW5kZXggPSArZXZlbnQub3JpZ2luYWxFdmVudC5kYXRhVHJhbnNmZXIuZ2V0RGF0YSgndHJhY2tfaW5kZXgnKTtcbiAgICAgIHNvdXJjZVRyYWNrID0gdGhpcy5tb2RlbC5jb2xsZWN0aW9uLmF0KGluZGV4KTtcbiAgICAgIHRhcmdldEluZGV4ID0gdGhpcy5tb2RlbC5jb2xsZWN0aW9uLmluZGV4T2YodGhpcy5tb2RlbCk7XG4gICAgICBuZXdJbmRleCA9IHRhcmdldEluZGV4ICsgKHRhcmdldEluZGV4IDwgaW5kZXggPyAxIDogMCk7XG5cbiAgICAgIHRoaXMuJGVsLnJlbW92ZUNsYXNzKCdkcmFnb3ZlcicpO1xuXG4gICAgICBpZiAoaW5kZXggIT09IHRhcmdldEluZGV4KSB7XG4gICAgICAgIHRoaXMubW9kZWwuY29sbGVjdGlvbi5tb3ZlKHNvdXJjZVRyYWNrLCBuZXdJbmRleCk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBfb25EcmFnRW50ZXI6IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHRoaXMuJGVsLmFkZENsYXNzKCdkcmFnb3ZlcicpO1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gIH0sXG4gIF9vbkRyYWdPdmVyOiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICB9LFxuICBfb25EcmFnTGVhdmU6IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHRoaXMuJGVsLnJlbW92ZUNsYXNzKCdkcmFnb3ZlcicpO1xuICB9LFxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gVHJhY2tsaXN0VHJhY2tNb2RlbEl0ZW1WaWV3O1xuIiwidmFyIE1vZGVsVmlldyA9IHJlcXVpcmUoJy4uL21vZGVsL3ZpZXcuanMnKTtcbnZhciBNb2RlbEl0ZW1WaWV3ID0gTW9kZWxWaWV3LmV4dGVuZCh7XG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgTW9kZWxWaWV3LnByb3RvdHlwZS5pbml0aWFsaXplLmNhbGwodGhpcywgb3B0aW9ucyk7XG4gICAgdGhpcy5fY29sbGVjdGlvblZpZXcgPSBvcHRpb25zLmNvbGxlY3Rpb25WaWV3O1xuICAgIHRoaXMuX3NlbGVjdGVkID0gZmFsc2U7XG4gICAgdGhpcy5fY2hlY2tlZCA9IGZhbHNlO1xuICB9LFxuICBhdHRyaWJ1dGVzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGF0dHJzID0ge1xuICAgICAgJ3JvbGUnOiAnb3B0aW9uJyxcbiAgICAgICdhcmlhLXNlbGVjdGVkJzogJ2ZhbHNlJyxcbiAgICAgICd0YWJpbmRleCc6ICctMSdcbiAgICB9O1xuXG4gICAgaWYgKHRoaXMuX2NoZWNrYWJsZSkge1xuICAgICAgYXR0cnNbJ2FyaWEtY2hlY2tlZCddID0gJ2ZhbHNlJztcbiAgICB9XG5cbiAgICByZXR1cm4gYXR0cnM7XG4gIH0sXG4gIHJlbW92ZTogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2NvbGxlY3Rpb25WaWV3LnJlbW92ZVN1YlZpZXcodGhpcyk7XG4gICAgcmV0dXJuIE1vZGVsVmlldy5wcm90b3R5cGUucmVtb3ZlLmNhbGwodGhpcyk7XG4gIH0sXG4gIGV2ZW50czoge1xuICAgICdrZXlkb3duJzogJ19vbktleURvd24nLFxuICAgICdjbGljayc6ICdfb25DbGljaycsXG4gICAgJ2NsaWNrIGlucHV0W3R5cGU9Y2hlY2tib3hdJzogJ19vbkNsaWNrQ2hlY2tib3gnLFxuICAgICdmb2N1cyc6ICdfb25Gb2N1cydcbiAgfSxcbiAgaXNTZWxlY3RlZDogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9zZWxlY3RlZDtcbiAgfSxcbiAgaXNDaGVja2VkOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NoZWNrZWQ7XG4gIH0sXG4gIHNldFNlbGVjdGVkOiBmdW5jdGlvbiAoc2VsZWN0ZWQpIHtcbiAgICB2YXIgYWxyZWFkeVNlbGVjdGVkID0gdGhpcy5pc1NlbGVjdGVkKCk7XG4gICAgaWYgKHNlbGVjdGVkKSB7XG4gICAgICB0aGlzLl9zZWxlY3RlZCA9IHRydWU7XG4gICAgICB0aGlzLmVsLnNldEF0dHJpYnV0ZSgnYXJpYS1zZWxlY3RlZCcsICd0cnVlJyk7XG4gICAgICB0aGlzLmVsLnNldEF0dHJpYnV0ZSgndGFiaW5kZXgnLCAwKTtcblxuICAgICAgaWYgKCFhbHJlYWR5U2VsZWN0ZWQpIHtcbiAgICAgICAgdGhpcy4kZWwuZm9jdXMoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLl9zZWxlY3RlZCA9IGZhbHNlO1xuICAgICAgdGhpcy5lbC5zZXRBdHRyaWJ1dGUoJ2FyaWEtc2VsZWN0ZWQnLCAnZmFsc2UnKTtcbiAgICAgIHRoaXMuZWwuc2V0QXR0cmlidXRlKCd0YWJpbmRleCcsIC0xKTtcbiAgICB9XG4gIH0sXG4gIHNldENoZWNrZWQ6IGZ1bmN0aW9uIChjaGVja2VkKSB7XG4gICAgaWYgKGNoZWNrZWQpIHtcbiAgICAgIHRoaXMuX2NoZWNrZWQgPSB0cnVlO1xuICAgICAgdGhpcy5lbC5zZXRBdHRyaWJ1dGUoJ2FyaWEtY2hlY2tlZCcsICd0cnVlJyk7XG4gICAgICB0aGlzLiQoJ2lucHV0W3R5cGU9Y2hlY2tib3hdJykucHJvcCgnY2hlY2tlZCcsIHRydWUpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMuX2NoZWNrZWQgPSBmYWxzZTtcbiAgICAgIHRoaXMuZWwuc2V0QXR0cmlidXRlKCdhcmlhLWNoZWNrZWQnLCAnZmFsc2UnKTtcbiAgICAgIHRoaXMuJCgnaW5wdXRbdHlwZT1jaGVja2JveF0nKS5wcm9wKCdjaGVja2VkJywgZmFsc2UpO1xuICAgIH1cbiAgfSxcbiAgdG9nZ2xlQ2hlY2tlZDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc2V0Q2hlY2tlZCghdGhpcy5pc0NoZWNrZWQoKSk7XG4gIH0sXG4gIF9vbktleURvd246IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHZhciBqID0gNzQsIGsgPSA3NSwgdXAgPSAzOCwgZG93biA9IDQwLCBzcGFjZSA9IDMyO1xuXG4gICAgaWYgKGV2ZW50LndoaWNoID09PSBqIHx8IGV2ZW50LndoaWNoID09PSBkb3duKSB7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgdGhpcy5fY29sbGVjdGlvblZpZXcubmV4dCh0aGlzKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoZXZlbnQud2hpY2ggPT09IGsgfHwgZXZlbnQud2hpY2ggPT09IHVwKSB7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgdGhpcy5fY29sbGVjdGlvblZpZXcucHJldih0aGlzKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodGhpcy5fY2hlY2thYmxlICYmIGV2ZW50LndoaWNoID09PSBzcGFjZSkge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIHRoaXMudG9nZ2xlQ2hlY2tlZCgpO1xuICAgIH1cbiAgfSxcbiAgX29uQ2xpY2s6IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHRoaXMuX2NvbGxlY3Rpb25WaWV3LnVwZGF0ZVNlbGVjdGVkKHRoaXMpO1xuICB9LFxuICBfb25DbGlja0NoZWNrYm94OiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB0aGlzLnRvZ2dsZUNoZWNrZWQoKTtcbiAgfSxcbiAgX29uRm9jdXM6IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHRoaXMuX2NvbGxlY3Rpb25WaWV3LnVwZGF0ZVNlbGVjdGVkKHRoaXMpO1xuICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBNb2RlbEl0ZW1WaWV3O1xuIiwidmFyICQgPSByZXF1aXJlKCdqcXVlcnknKTtcbnZhciBWaWV3ID0gcmVxdWlyZSgnLi4vdmlldy5qcycpO1xudmFyIFBhZ2VWaWV3ID0gcmVxdWlyZSgnLi92aWV3LmpzJyk7XG52YXIgSm9pblZpZXcgPSByZXF1aXJlKCcuLi9taXNjL2pvaW4uanMnKTtcbnZhciBTZWFyY2hDb250cm9sVmlldyA9IHJlcXVpcmUoJy4uL21pc2Mvc2VhcmNoX2NvbnRyb2wuanMnKTtcbnZhciBNYWluQ29udHJvbFZpZXcgPSByZXF1aXJlKCcuLi9taXNjL21haW5fY29udHJvbC5qcycpO1xudmFyIE5hdmlnYXRpb25WaWV3ID0gUGFnZVZpZXcuZXh0ZW5kKHtcbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICBWaWV3LnByb3RvdHlwZS5pbml0aWFsaXplLmNhbGwodGhpcywgb3B0aW9ucyk7XG4gICAgdGhpcy5faW5pdFN1YlZpZXdzKCk7XG4gIH0sXG4gIF90ZW1wbGF0ZTogcmVxdWlyZSgnLi4vLi4vLi4vdGVtcGxhdGVzL25hdmlnYXRpb24vaW5kZXguaGJzJyksXG4gIF9pbml0U3ViVmlld3M6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnZpZXdzID0gW1xuICAgICAge1xuICAgICAgICBuYW1lOiAnU2VhcmNoJyxcbiAgICAgICAgdmlldzogbmV3IFNlYXJjaENvbnRyb2xWaWV3KHtcbiAgICAgICAgICByb3V0ZXI6IHRoaXMucm91dGVyLFxuICAgICAgICAgIG1vcGlkeTogdGhpcy5tb3BpZHksXG4gICAgICAgICAgY29uZmlnOiB0aGlzLl9jb25maWcsXG4gICAgICAgICAgbGFzdGZtOiB0aGlzLl9sYXN0Zm1cbiAgICAgICAgfSlcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICdDb250cm9scycsXG4gICAgICAgIHZpZXc6IG5ldyBNYWluQ29udHJvbFZpZXcoe1xuICAgICAgICAgIHJvdXRlcjogdGhpcy5yb3V0ZXIsXG4gICAgICAgICAgbW9waWR5OiB0aGlzLm1vcGlkeSxcbiAgICAgICAgICBjb25maWc6IHRoaXMuX2NvbmZpZyxcbiAgICAgICAgICBsYXN0Zm06IHRoaXMuX2xhc3RmbVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIF07XG4gIH0sXG4gIHJlbmRlcjogZnVuY3Rpb24gKCkge1xuICAgIHZhciBpO1xuICAgIHZhciBjb2w7XG5cbiAgICB0aGlzLnRyaWdnZXIoJ3JlbmRlcmluZycpO1xuICAgIHRoaXMuJGVsLmh0bWwodGhpcy5fdGVtcGxhdGUoKSk7XG5cbiAgICBjb2wgPSAkKCc8ZGl2IGNsYXNzPVwidmlldy1zZWN0aW9uXCI+PC9kaXY+JykuYXBwZW5kVG8odGhpcy5lbCk7XG4gICAgdGhpcy52aWV3c1swXS52aWV3LnJlbmRlcigpLiRlbC5hcHBlbmRUbyhjb2wpO1xuICAgIGNvbCA9ICQoJzxkaXYgY2xhc3M9XCJ2aWV3LXNlY3Rpb25cIj48L2Rpdj4nKS5hcHBlbmRUbyh0aGlzLmVsKTtcbiAgICB0aGlzLnZpZXdzWzFdLnZpZXcucmVuZGVyKCkuJGVsLmFwcGVuZFRvKGNvbCk7XG5cbiAgICB0aGlzLnRyaWdnZXIoJ3JlbmRlcmVkJyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE5hdmlnYXRpb25WaWV3O1xuIiwidmFyICQgPSByZXF1aXJlKCdqcXVlcnknKTtcbnZhciBWaWV3ID0gcmVxdWlyZSgnLi4vdmlldy5qcycpO1xudmFyIFBhZ2VWaWV3ID0gcmVxdWlyZSgnLi92aWV3LmpzJyk7XG52YXIgSm9pblZpZXcgPSByZXF1aXJlKCcuLi9taXNjL2pvaW4uanMnKTtcbnZhciBTZWFyY2hDb250cm9sVmlldyA9IHJlcXVpcmUoJy4uL21pc2Mvc2VhcmNoX2NvbnRyb2wuanMnKTtcbnZhciBNYWluQ29udHJvbFZpZXcgPSByZXF1aXJlKCcuLi9taXNjL21haW5fY29udHJvbC5qcycpO1xudmFyIE5vd1BsYXlpbmdWaWV3ID0gcmVxdWlyZSgnLi4vbWlzYy9ub3dfcGxheWluZy5qcycpO1xudmFyIFRyYWNrTGlzdExpc3RWaWV3ID0gcmVxdWlyZSgnLi4vbGlzdC90cmFja19saXN0LmpzJyk7XG52YXIgVHJhY2tMaXN0Q29sbGVjdGlvbiA9IHJlcXVpcmUoJy4uLy4uL2NvbGxlY3Rpb24vdHJhY2tfbGlzdC5qcycpO1xudmFyIFJvb3RWaWV3ID0gUGFnZVZpZXcuZXh0ZW5kKHtcbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICBWaWV3LnByb3RvdHlwZS5pbml0aWFsaXplLmNhbGwodGhpcywgb3B0aW9ucyk7XG4gICAgdGhpcy5faW5pdFN1YlZpZXdzKCk7XG4gIH0sXG4gIF90ZW1wbGF0ZTogcmVxdWlyZSgnLi4vLi4vLi4vdGVtcGxhdGVzL3Jvb3QvaW5kZXguaGJzJyksXG4gIF9pbml0U3ViVmlld3M6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnZpZXdzID0gW1xuICAgICAge1xuICAgICAgICBuYW1lOiAnTWFpbkNvbnRlbnQnLFxuICAgICAgICB2aWV3OiBuZXcgSm9pblZpZXcoe1xuICAgICAgICAgIHJvdXRlcjogdGhpcy5yb3V0ZXIsXG4gICAgICAgICAgbW9waWR5OiB0aGlzLm1vcGlkeSxcbiAgICAgICAgICBjb25maWc6IHRoaXMuX2NvbmZpZyxcbiAgICAgICAgICBsYXN0Zm06IHRoaXMuX2xhc3RmbSxcbiAgICAgICAgICB2aWV3czogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBuYW1lOiAnTm93UGxheWluZycsXG4gICAgICAgICAgICAgIHZpZXc6IG5ldyBOb3dQbGF5aW5nVmlldyh7XG4gICAgICAgICAgICAgICAgcm91dGVyOiB0aGlzLnJvdXRlcixcbiAgICAgICAgICAgICAgICBtb3BpZHk6IHRoaXMubW9waWR5LFxuICAgICAgICAgICAgICAgIGNvbmZpZzogdGhpcy5fY29uZmlnLFxuICAgICAgICAgICAgICAgIGxhc3RmbTogdGhpcy5fbGFzdGZtXG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBuYW1lOiAnUXVldWUnLFxuICAgICAgICAgICAgICB2aWV3OiBuZXcgVHJhY2tMaXN0TGlzdFZpZXcoe1xuICAgICAgICAgICAgICAgIHJvdXRlcjogdGhpcy5yb3V0ZXIsXG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbjogbmV3IFRyYWNrTGlzdENvbGxlY3Rpb24obnVsbCwge1xuICAgICAgICAgICAgICAgICAgbW9waWR5OiB0aGlzLm1vcGlkeVxuICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgIG1vcGlkeTogdGhpcy5tb3BpZHksXG4gICAgICAgICAgICAgICAgY29uZmlnOiB0aGlzLl9jb25maWcsXG4gICAgICAgICAgICAgICAgbGFzdGZtOiB0aGlzLl9sYXN0Zm1cbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgXTtcbiAgfSxcbiAgcmVuZGVyOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGk7XG4gICAgdmFyIGNvbDtcblxuICAgIHRoaXMudHJpZ2dlcigncmVuZGVyaW5nJyk7XG4gICAgdGhpcy4kZWwuaHRtbCh0aGlzLl90ZW1wbGF0ZSgpKTtcblxuICAgIGNvbCA9ICQoJzxkaXYgY2xhc3M9XCJ2aWV3LXNlY3Rpb25cIj48L2Rpdj4nKS5hcHBlbmRUbyh0aGlzLmVsKTtcbiAgICB0aGlzLnZpZXdzWzBdLnZpZXcucmVuZGVyKCkuJGVsLmFwcGVuZFRvKGNvbCk7XG5cbiAgICB0aGlzLnRyaWdnZXIoJ3JlbmRlcmVkJyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJvb3RWaWV3O1xuIiwidmFyIFZpZXcgPSByZXF1aXJlKCcuLi92aWV3LmpzJyk7XG52YXIgUGFnZVZpZXcgPSBWaWV3LmV4dGVuZCh7XG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgVmlldy5wcm90b3R5cGUuaW5pdGlhbGl6ZS5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuICAgIHRoaXMuX2luaXRTdWJWaWV3cygpO1xuICAgIHRoaXMubGlzdGVuVG8odGhpcy5yb3V0ZXIsICdiZWZvcmVSb3V0ZScsIHRoaXMucmVtb3ZlKTtcbiAgfSxcbiAgcmVuZGVyOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGk7XG5cbiAgICB0aGlzLnRyaWdnZXIoJ3JlbmRlcmluZycpO1xuICAgIHRoaXMuJGVsLmh0bWwodGhpcy5fdGVtcGxhdGUoKSk7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgdGhpcy52aWV3cy5sZW5ndGg7IGkrKykge1xuICAgICAgdGhpcy5lbC5hcHBlbmRDaGlsZCh0aGlzLnZpZXdzW2ldLnZpZXcucmVuZGVyKCkuZWwpO1xuICAgIH1cblxuICAgIHRoaXMuX3NldFRpdGxlKHRoaXMudGl0bGUpO1xuICAgIHRoaXMudHJpZ2dlcigncmVuZGVyZWQnKTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICByZW1vdmU6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnN0b3BMaXN0ZW5pbmcoKTtcbiAgICBWaWV3LnByb3RvdHlwZS5yZW1vdmUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfSxcbiAgX3NldFRpdGxlOiBmdW5jdGlvbiAodGl0bGUpIHtcbiAgICAkKCd0aXRsZScpLnRleHQodGl0bGUgKyAnOiAnICsgdGhpcy5fY29uZmlnLnRpdGxlKTtcbiAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gUGFnZVZpZXc7XG4iLCJ2YXIgVGFiVmlldyA9IHJlcXVpcmUoJy4vdmlldy5qcycpO1xudmFyIEpvaW5WaWV3ID0gcmVxdWlyZSgnLi4vbWlzYy9qb2luLmpzJyk7XG52YXIgQWxidW1WaWV3ID0gcmVxdWlyZSgnLi4vbW9kZWwvYWxidW0uanMnKTtcbnZhciBBcnRpc3RMaW5rVmlldyA9IHJlcXVpcmUoJy4uL21vZGVsL2FydGlzdF9saW5rLmpzJyk7XG52YXIgVHJhY2tMaXN0VmlldyA9IHJlcXVpcmUoJy4uL2xpc3QvdHJhY2suanMnKTtcbnZhciBBbGJ1bSA9IHJlcXVpcmUoJy4uLy4uL21vZGVsL2FsYnVtLmpzJyk7XG52YXIgQWxidW1UYWJWaWV3ID0gVGFiVmlldy5leHRlbmQoe1xuICB0YWdOYW1lOiAnZGl2JyxcbiAgY2xhc3NOYW1lOiAndmlldycsXG4gIHRpdGxlOiAnQWxidW1zJyxcbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICB0aGlzLmFsYnVtID0gbmV3IEFsYnVtKHsgdXJpOiBvcHRpb25zLmlkLCB0aXRsZTogb3B0aW9ucy5uYW1lLCBhcnRpc3Q6IG9wdGlvbnMuYXJ0aXN0IH0sIHtcbiAgICAgIG1vcGlkeTogb3B0aW9ucy5tb3BpZHksXG4gICAgICByb3V0ZXI6IG9wdGlvbnMucm91dGVyLFxuICAgICAgbGFzdGZtOiBvcHRpb25zLmxhc3RmbVxuICAgIH0pO1xuICAgIFRhYlZpZXcucHJvdG90eXBlLmluaXRpYWxpemUuY2FsbCh0aGlzLCBvcHRpb25zKTtcbiAgICB0aGlzLmFsYnVtLmZldGNoKCk7XG4gIH0sXG4gIHF1ZXVlQWxsOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5tb3BpZHkudHJhY2tsaXN0LmFkZCh0aGlzLmFsYnVtLnRyYWNrcy50b0pTT04oKSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgfSk7XG4gIH0sXG4gIHF1ZXVlU2VsZWN0ZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZWN0ZWRJbnB1dHMgPSB0aGlzLiQoJ2xpIGlucHV0W3R5cGU9Y2hlY2tib3hdOmNoZWNrZWQnKTtcbiAgICB2YXIgc2VsZWN0ZWRUcmFja3MgPSBzZWxlY3RlZElucHV0cy5tYXAoZnVuY3Rpb24gKGksIHRyYWNrKSB7XG4gICAgICByZXR1cm4gdGhpcy5hbGJ1bS50cmFja3MuZ2V0KHRyYWNrLmdldEF0dHJpYnV0ZSgnZGF0YS10cmFjay1pZCcpKS50b0pTT04oKTtcbiAgICB9LmJpbmQodGhpcykpO1xuICAgIHRoaXMubW9waWR5LnRyYWNrbGlzdC5hZGQoc2VsZWN0ZWRUcmFja3MpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZWN0ZWRJbnB1dHMuZWFjaChmdW5jdGlvbiAoaSwgaW5wdXQpIHtcbiAgICAgICAgaW5wdXQuY2hlY2tlZCA9IGZhbHNlO1xuICAgICAgfSk7XG4gICAgfS5iaW5kKHRoaXMpKTtcbiAgfSxcbiAgX2luaXRTdWJWaWV3czogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMudmlld3MgPSBbXG4gICAgICB7XG4gICAgICAgIG5hbWU6IHRoaXMuYWxidW0uZ2V0KCd0aXRsZScpLFxuICAgICAgICB2aWV3OiBuZXcgSm9pblZpZXcoe1xuICAgICAgICAgIG1vcGlkeTogdGhpcy5tb3BpZHksXG4gICAgICAgICAgcm91dGVyOiB0aGlzLnJvdXRlcixcbiAgICAgICAgICBsYXN0Zm06IHRoaXMuX2xhc3RmbSxcbiAgICAgICAgICB2aWV3czogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB2aWV3OiBuZXcgQWxidW1WaWV3KHtcbiAgICAgICAgICAgICAgICBtb2RlbDogdGhpcy5hbGJ1bSxcbiAgICAgICAgICAgICAgICBtb3BpZHk6IHRoaXMubW9waWR5LFxuICAgICAgICAgICAgICAgIHJvdXRlcjogdGhpcy5yb3V0ZXIsXG4gICAgICAgICAgICAgICAgbGFzdGZtOiB0aGlzLl9sYXN0Zm1cbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHZpZXc6IG5ldyBBcnRpc3RMaW5rVmlldyh7XG4gICAgICAgICAgICAgICAgbW9kZWw6IHRoaXMuYWxidW0uYXJ0aXN0LFxuICAgICAgICAgICAgICAgIG1vcGlkeTogdGhpcy5tb3BpZHksXG4gICAgICAgICAgICAgICAgcm91dGVyOiB0aGlzLnJvdXRlcixcbiAgICAgICAgICAgICAgICBsYXN0Zm06IHRoaXMuX2xhc3RmbVxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdmlldzogbmV3IFRyYWNrTGlzdFZpZXcoe1xuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMuYWxidW0udHJhY2tzLFxuICAgICAgICAgICAgICAgIG1vcGlkeTogdGhpcy5tb3BpZHksXG4gICAgICAgICAgICAgICAgcm91dGVyOiB0aGlzLnJvdXRlcixcbiAgICAgICAgICAgICAgICBsYXN0Zm06IHRoaXMuX2xhc3RmbVxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICBdO1xuICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBBbGJ1bVRhYlZpZXc7XG4iLCJ2YXIgUGFnZVZpZXcgPSByZXF1aXJlKCcuL3ZpZXcuanMnKTtcbnZhciBBbGJ1bUNvbGxlY3Rpb25WaWV3ID0gcmVxdWlyZSgnLi4vY29sbGVjdGlvbi9hbGJ1bS5qcycpO1xudmFyIFRyYWNrTGlzdFZpZXcgPSByZXF1aXJlKCcuLi9saXN0L3RyYWNrLmpzJyk7XG52YXIgQXJ0aXN0VmlldyA9IHJlcXVpcmUoJy4uL21vZGVsL2FydGlzdC5qcycpO1xudmFyIEpvaW5WaWV3ID0gcmVxdWlyZSgnLi4vbWlzYy9qb2luLmpzJyk7XG52YXIgQXJ0aXN0ID0gcmVxdWlyZSgnLi4vLi4vbW9kZWwvYXJ0aXN0LmpzJyk7XG52YXIgQXJ0aXN0VGFiVmlldyA9IFBhZ2VWaWV3LmV4dGVuZCh7XG4gIHRhZ05hbWU6ICdkaXYnLFxuICB0aXRsZTogJ0FydGlzdHMnLFxuICBpbml0aWFsaXplOiBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIHRoaXMuYXJ0aXN0ID0gbmV3IEFydGlzdCh7IHVyaTogb3B0aW9ucy51cmksIG5hbWU6IG9wdGlvbnMubmFtZSB9LCB7XG4gICAgICBtb3BpZHk6IG9wdGlvbnMubW9waWR5LFxuICAgICAgcm91dGVyOiBvcHRpb25zLnJvdXRlcixcbiAgICAgIGxhc3RmbTogb3B0aW9ucy5sYXN0Zm1cbiAgICB9KTtcbiAgICBQYWdlVmlldy5wcm90b3R5cGUuaW5pdGlhbGl6ZS5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuICAgIHRoaXMuYXJ0aXN0LmZldGNoKCk7XG4gIH0sXG4gIF9pbml0U3ViVmlld3M6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnZpZXdzID0gW1xuICAgICAge1xuICAgICAgICBuYW1lOiB0aGlzLmFydGlzdC5nZXQoJ25hbWUnKSxcbiAgICAgICAgdmlldzogbmV3IEpvaW5WaWV3KHtcbiAgICAgICAgICB2aWV3czogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBuYW1lOiB0aGlzLmFydGlzdC5nZXQoJ25hbWUnKSxcbiAgICAgICAgICAgICAgdmlldzogbmV3IEFydGlzdFZpZXcoe1xuICAgICAgICAgICAgICAgIG1vcGlkeTogdGhpcy5tb3BpZHksXG4gICAgICAgICAgICAgICAgcm91dGVyOiB0aGlzLnJvdXRlcixcbiAgICAgICAgICAgICAgICBsYXN0Zm06IHRoaXMuX2xhc3RmbSxcbiAgICAgICAgICAgICAgICBtb2RlbDogdGhpcy5hcnRpc3RcbiAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBuYW1lOiAnQWxidW1zJyxcbiAgICAgICAgICAgICAgdmlldzogbmV3IEFsYnVtQ29sbGVjdGlvblZpZXcoe1xuICAgICAgICAgICAgICAgIG1vcGlkeTogdGhpcy5tb3BpZHksXG4gICAgICAgICAgICAgICAgcm91dGVyOiB0aGlzLnJvdXRlcixcbiAgICAgICAgICAgICAgICBsYXN0Zm06IHRoaXMuX2xhc3RmbSxcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLmFydGlzdC5hbGJ1bXNcbiAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9KVxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbmFtZTogJ1RyYWNrcycsXG4gICAgICAgIHZpZXc6IG5ldyBUcmFja0xpc3RWaWV3KHtcbiAgICAgICAgICBtb3BpZHk6IHRoaXMubW9waWR5LFxuICAgICAgICAgIHJvdXRlcjogdGhpcy5yb3V0ZXIsXG4gICAgICAgICAgbGFzdGZtOiB0aGlzLl9sYXN0Zm0sXG4gICAgICAgICAgY29sbGVjdGlvbjogdGhpcy5hcnRpc3QudHJhY2tzLFxuICAgICAgICAgIGV4dGVuZGVkOiB0cnVlXG4gICAgICAgIH0pLFxuICAgICAgfVxuICAgIF07XG4gIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFydGlzdFRhYlZpZXc7XG4iLCJ2YXIgVGFiVmlldyA9IHJlcXVpcmUoJy4vdmlldy5qcycpO1xudmFyIFRyYWNrTGlzdFZpZXcgPSByZXF1aXJlKCcuLi9saXN0L3RyYWNrLmpzJyk7XG52YXIgQWxidW1Db2xsZWN0aW9uVmlldyA9IHJlcXVpcmUoJy4uL2NvbGxlY3Rpb24vYWxidW0uanMnKTtcbnZhciBBcnRpc3RDb2xsZWN0aW9uVmlldyA9IHJlcXVpcmUoJy4uL2NvbGxlY3Rpb24vYXJ0aXN0LmpzJyk7XG52YXIgU2VhcmNoVGFiVmlldyA9IFRhYlZpZXcuZXh0ZW5kKHtcbiAgdGFnTmFtZTogJ2RpdicsXG4gIGNsYXNzTmFtZTogJ3ZpZXctc2VjdGlvbicsXG4gIHRpdGxlOiAnU2VhcmNoJyxcbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICB0aGlzLm1vZGVsID0gb3B0aW9ucy5tb2RlbDtcbiAgICBUYWJWaWV3LnByb3RvdHlwZS5pbml0aWFsaXplLmNhbGwodGhpcywgb3B0aW9ucyk7XG4gICAgdGhpcy5tb2RlbC5mZXRjaCh7IHF1ZXJ5OiBvcHRpb25zLnF1ZXJ5IH0pO1xuICB9LFxuICByZXNldFJlc3VsdHM6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnZpZXdzLmFsYnVtcy5yZXNldFJlc3VsdHMoKTtcbiAgICB0aGlzLnZpZXdzLmFydGlzdHMucmVzZXRSZXN1bHRzKCk7XG4gICAgdGhpcy52aWV3cy50cmFja3MucmVzZXRSZXN1bHRzKCk7XG4gIH0sXG4gIF9pbml0U3ViVmlld3M6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnZpZXdzID0gW1xuICAgICAge1xuICAgICAgICBuYW1lOiAnQXJ0aXN0cycsXG4gICAgICAgIHZpZXc6IG5ldyBBcnRpc3RDb2xsZWN0aW9uVmlldyh7XG4gICAgICAgICAgY29sbGVjdGlvbjogdGhpcy5tb2RlbC5hcnRpc3RzLFxuICAgICAgICAgIG1vcGlkeTogdGhpcy5tb3BpZHksXG4gICAgICAgICAgcm91dGVyOiB0aGlzLnJvdXRlcixcbiAgICAgICAgICBsYXN0Zm06IHRoaXMuX2xhc3RmbVxuICAgICAgICB9KVxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbmFtZTogJ0FsYnVtcycsXG4gICAgICAgIHZpZXc6IG5ldyBBbGJ1bUNvbGxlY3Rpb25WaWV3KHtcbiAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLm1vZGVsLmFsYnVtcyxcbiAgICAgICAgICBtb3BpZHk6IHRoaXMubW9waWR5LFxuICAgICAgICAgIHJvdXRlcjogdGhpcy5yb3V0ZXIsXG4gICAgICAgICAgbGFzdGZtOiB0aGlzLl9sYXN0Zm1cbiAgICAgICAgfSlcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICdUcmFja3MnLFxuICAgICAgICB2aWV3OiBuZXcgVHJhY2tMaXN0Vmlldyh7XG4gICAgICAgICAgY29sbGVjdGlvbjogdGhpcy5tb2RlbC50cmFja3MsXG4gICAgICAgICAgbW9waWR5OiB0aGlzLm1vcGlkeSxcbiAgICAgICAgICByb3V0ZXI6IHRoaXMucm91dGVyLFxuICAgICAgICAgIGxhc3RmbTogdGhpcy5fbGFzdGZtXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgXTtcbiAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gU2VhcmNoVGFiVmlldztcbiIsInZhciAkID0gcmVxdWlyZSgnanF1ZXJ5Jyk7XG52YXIgUGFnZVZpZXcgPSByZXF1aXJlKCcuLi9wYWdlL3ZpZXcuanMnKTtcbnZhciBUYWJWaWV3ID0gUGFnZVZpZXcuZXh0ZW5kKHtcbiAgY2xhc3NOYW1lOiAndGFiLXZpZXctc2VjdGlvbicsXG4gIHRlbXBsYXRlOiAndGFiX3ZpZXcnLFxuICBldmVudHM6IHtcbiAgICAnY2xpY2sgW3JvbGU9dGFiXSc6ICdfY2xpY2tUYWInLFxuICAgICdrZXlkb3duIFtyb2xlPXRhYl0nOiAnX3N3aXRjaFRhYidcbiAgfSxcbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICBQYWdlVmlldy5wcm90b3R5cGUuaW5pdGlhbGl6ZS5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuICB9LFxuICByZW5kZXI6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaTtcbiAgICB2YXIgYmFzZU5hbWUgPSBEYXRlLm5vdygpO1xuICAgIHZhciBwYW5lbDtcblxuICAgIHRoaXMudHJpZ2dlcigncmVuZGVyaW5nJyk7XG4gICAgdGhpcy4kZWwuaHRtbCh0aGlzLl90ZW1wbGF0ZSh7XG4gICAgICBiYXNlTmFtZTogYmFzZU5hbWUsXG4gICAgICB0YWJzOiB0aGlzLl9nZXRUYWJzKClcbiAgICB9KSk7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgdGhpcy52aWV3cy5sZW5ndGg7IGkrKykge1xuICAgICAgcGFuZWwgPSAkKHRoaXMuX2dlbmVyYXRlVGFiSFRNTChpLCBiYXNlTmFtZSkpLmFwcGVuZFRvKHRoaXMuZWwpO1xuICAgICAgJCh0aGlzLnZpZXdzW2ldLnZpZXcucmVuZGVyKCkuZWwpLmFwcGVuZFRvKHBhbmVsKTtcbiAgICB9XG5cbiAgICB0aGlzLnRyaWdnZXIoJ3JlbmRlcmVkJyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIF9nZXRUYWJzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMudmlld3MubWFwKGZ1bmN0aW9uICh2LCBpbmRleCkge1xuICAgICAgcmV0dXJuIHYubmFtZTtcbiAgICB9LmJpbmQodGhpcykpO1xuICB9LFxuICBfZ2VuZXJhdGVUYWJIVE1MOiBmdW5jdGlvbiAoaW5kZXgsIGJhc2VOYW1lKSB7XG4gICAgdmFyIGN1cnJlbnRUYWJDbGFzcyA9ICcnO1xuICAgIHZhciBhcmlhSGlkZGVuQXR0cmlidXRlID0gJ3RydWUnO1xuXG4gICAgaWYgKGluZGV4ID09PSAwKSB7XG4gICAgICBhcmlhSGlkZGVuQXR0cmlidXRlID0gJ2ZhbHNlJztcbiAgICB9XG5cbiAgICByZXR1cm4gJzxkaXYgY2xhc3M9XFxcInRhYi12aWV3LXNlY3Rpb24tdGFiIG9wYXF1ZVxcXCIgaWQ9XFxcInBhbmVsLScgKyBiYXNlTmFtZSArICctJyArIGluZGV4ICsgJ1xcXCIgYXJpYS1sYWJlbGVkYnk9XFxcInRhYi0nICsgYmFzZU5hbWUgKyAnLScgKyBpbmRleCArICdcXFwiIHJvbGU9XFxcInRhYnBhbmVsXFxcIiBhcmlhLWhpZGRlbj1cIicgKyBhcmlhSGlkZGVuQXR0cmlidXRlICsgJ1wiPjwvZGl2Pic7XG4gIH0sXG4gIF9jbGlja1RhYjogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdmFyIHNlbGVjdGVkID0gZXZlbnQudGFyZ2V0LmdldEF0dHJpYnV0ZSgnYXJpYS1jb250cm9scycpO1xuICAgIHRoaXMuX3VwZGF0ZVRhYnMoc2VsZWN0ZWQpO1xuICB9LFxuICBfdXBkYXRlVGFiczogZnVuY3Rpb24gKHNlbGVjdGVkKSB7XG4gICAgdGhpcy4kKCdbcm9sZT10YWJdJykuZWFjaChmdW5jdGlvbiAoaSkge1xuICAgICAgdmFyICR0YWIgPSAkKHRoaXMpO1xuICAgICAgdmFyIGlkID0gJHRhYi5hdHRyKCdhcmlhLWNvbnRyb2xzJyk7XG5cbiAgICAgIGlmIChpZCA9PT0gc2VsZWN0ZWQpIHtcbiAgICAgICAgJHRhYi5hdHRyKCd0YWJpbmRleCcsIDApO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgICR0YWIuYXR0cigndGFiaW5kZXgnLCAtMSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy4kKCdbcm9sZT10YWJwYW5lbF0nKS5lYWNoKGZ1bmN0aW9uIChpKSB7XG4gICAgICB2YXIgJHBhbmVsID0gJCh0aGlzKTtcbiAgICAgIHZhciBpZCA9ICRwYW5lbC5hdHRyKCdpZCcpO1xuXG4gICAgICBpZiAoaWQgPT09IHNlbGVjdGVkKSB7XG4gICAgICAgICRwYW5lbC5hZGRDbGFzcygnY3VycmVudC10YWInKTtcbiAgICAgICAgJHBhbmVsLmF0dHIoJ2FyaWEtaGlkZGVuJywgJ2ZhbHNlJyk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgJHBhbmVsLnJlbW92ZUNsYXNzKCdjdXJyZW50LXRhYicpO1xuICAgICAgICAkcGFuZWwuYXR0cignYXJpYS1oaWRkZW4nLCAndHJ1ZScpO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuICBfc3dpdGNoVGFiOiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB2YXIgc2VsZWN0ZWQ7XG4gICAgdmFyIHJpZ2h0ID0gMzksIGwgPSA3NiwgaCA9IDcyLCBsZWZ0ID0gMzc7XG5cbiAgICAvLyBSaWdodFxuICAgIGlmIChldmVudC53aGljaCA9PT0gcmlnaHQgfHwgZXZlbnQud2hpY2ggPT09IGwpIHtcbiAgICAgIHNlbGVjdGVkID0gJChldmVudC50YXJnZXQpLm5leHQoJ1tyb2xlPXRhYl0nKS5lcSgwKTtcbiAgICAgIGlmIChzZWxlY3RlZC5sZW5ndGgpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgc2VsZWN0ZWQuZm9jdXMoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlVGFicyhzZWxlY3RlZC5hdHRyKCdhcmlhLWNvbnRyb2xzJykpO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBMZWZ0XG4gICAgZWxzZSBpZiAoZXZlbnQud2hpY2ggPT09IGxlZnQgfHwgZXZlbnQud2hpY2ggPT09IGgpIHtcbiAgICAgIHNlbGVjdGVkID0gJChldmVudC50YXJnZXQpLnByZXYoJ1tyb2xlPXRhYl0nKS5lcSgwKTtcbiAgICAgIGlmIChzZWxlY3RlZC5sZW5ndGgpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgc2VsZWN0ZWQuZm9jdXMoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlVGFicyhzZWxlY3RlZC5hdHRyKCdhcmlhLWNvbnRyb2xzJykpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gVGFiVmlldztcbiIsInZhciB0ZW1wbGF0ZXMgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMuanMnKTtcbnZhciBCYWNrYm9uZSA9IHJlcXVpcmUoJ2JhY2tib25lJyk7XG52YXIgVmlldyA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICBCYWNrYm9uZS5WaWV3LnByb3RvdHlwZS5pbml0aWFsaXplLmNhbGwodGhpcywgb3B0aW9ucyk7XG5cbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIG9wdGlvbnMudGVtcGxhdGVzID0gb3B0aW9ucy50ZW1wbGF0ZXMgfHwgdGVtcGxhdGVzO1xuXG4gICAgaWYgKHRoaXMudGVtcGxhdGUpIHtcbiAgICAgIHRoaXMuX3NldFRlbXBsYXRlKHRlbXBsYXRlcyk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMubW9waWR5KSB7XG4gICAgICB0aGlzLm1vcGlkeSA9IG9wdGlvbnMubW9waWR5O1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLnJvdXRlcikge1xuICAgICAgdGhpcy5yb3V0ZXIgPSBvcHRpb25zLnJvdXRlcjtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5jb25maWcpIHtcbiAgICAgIHRoaXMuX2NvbmZpZyA9IG9wdGlvbnMuY29uZmlnO1xuICAgIH1cblxuICAgIHRoaXMuX2xhc3RmbSA9IG9wdGlvbnMubGFzdGZtO1xuXG4gICAgdGhpcy5vbigncmVuZGVyaW5nJywgdGhpcy5fcmVuZGVyaW5nLCB0aGlzKTtcbiAgICB0aGlzLm9uKCdyZW5kZXJlZCcsIHRoaXMuX3JlbmRlcmVkLCB0aGlzKTtcbiAgfSxcbiAgcmVtb3ZlOiBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICB0aGlzLiRlbC50b2dnbGVDbGFzcygnaGlkZGVuJyk7XG4gICAgQmFja2JvbmUuVmlldy5wcm90b3R5cGUucmVtb3ZlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH0sXG4gIHJlbmRlcjogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMudHJpZ2dlcigncmVuZGVyaW5nJyk7XG4gICAgdGhpcy4kZWwuaHRtbCh0aGlzLl90ZW1wbGF0ZSgpKTtcbiAgICB0aGlzLnRyaWdnZXIoJ3JlbmRlcmVkJyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIF9zZXRUZW1wbGF0ZTogZnVuY3Rpb24gKHRlbXBsYXRlcykge1xuICAgIHRoaXMuX3RlbXBsYXRlID0gdGVtcGxhdGVzW3RoaXMudGVtcGxhdGVdO1xuICB9LFxuICBfcmVuZGVyaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuX2hpZGVPblJlbmRlcikge1xuICAgICAgdGhpcy4kZWwuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgIH1cbiAgfSxcbiAgX3JlbmRlcmVkOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuX2hpZGVPblJlbmRlcikge1xuICAgICAgdGhpcy4kZWwucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpO1xuICAgIH1cbiAgfSxcbiAgX2hpZGVPblJlbmRlcjogZmFsc2Vcbn0pO1xuXG5CYWNrYm9uZS4kID0gcmVxdWlyZSgnanF1ZXJ5Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0gVmlldztcbiIsIi8vICAgICBVbmRlcnNjb3JlLmpzIDEuNy4wXG4vLyAgICAgaHR0cDovL3VuZGVyc2NvcmVqcy5vcmdcbi8vICAgICAoYykgMjAwOS0yMDE0IEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4vLyAgICAgVW5kZXJzY29yZSBtYXkgYmUgZnJlZWx5IGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cblxuKGZ1bmN0aW9uKCkge1xuXG4gIC8vIEJhc2VsaW5lIHNldHVwXG4gIC8vIC0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gRXN0YWJsaXNoIHRoZSByb290IG9iamVjdCwgYHdpbmRvd2AgaW4gdGhlIGJyb3dzZXIsIG9yIGBleHBvcnRzYCBvbiB0aGUgc2VydmVyLlxuICB2YXIgcm9vdCA9IHRoaXM7XG5cbiAgLy8gU2F2ZSB0aGUgcHJldmlvdXMgdmFsdWUgb2YgdGhlIGBfYCB2YXJpYWJsZS5cbiAgdmFyIHByZXZpb3VzVW5kZXJzY29yZSA9IHJvb3QuXztcblxuICAvLyBTYXZlIGJ5dGVzIGluIHRoZSBtaW5pZmllZCAoYnV0IG5vdCBnemlwcGVkKSB2ZXJzaW9uOlxuICB2YXIgQXJyYXlQcm90byA9IEFycmF5LnByb3RvdHlwZSwgT2JqUHJvdG8gPSBPYmplY3QucHJvdG90eXBlLCBGdW5jUHJvdG8gPSBGdW5jdGlvbi5wcm90b3R5cGU7XG5cbiAgLy8gQ3JlYXRlIHF1aWNrIHJlZmVyZW5jZSB2YXJpYWJsZXMgZm9yIHNwZWVkIGFjY2VzcyB0byBjb3JlIHByb3RvdHlwZXMuXG4gIHZhclxuICAgIHB1c2ggICAgICAgICAgICAgPSBBcnJheVByb3RvLnB1c2gsXG4gICAgc2xpY2UgICAgICAgICAgICA9IEFycmF5UHJvdG8uc2xpY2UsXG4gICAgY29uY2F0ICAgICAgICAgICA9IEFycmF5UHJvdG8uY29uY2F0LFxuICAgIHRvU3RyaW5nICAgICAgICAgPSBPYmpQcm90by50b1N0cmluZyxcbiAgICBoYXNPd25Qcm9wZXJ0eSAgID0gT2JqUHJvdG8uaGFzT3duUHJvcGVydHk7XG5cbiAgLy8gQWxsICoqRUNNQVNjcmlwdCA1KiogbmF0aXZlIGZ1bmN0aW9uIGltcGxlbWVudGF0aW9ucyB0aGF0IHdlIGhvcGUgdG8gdXNlXG4gIC8vIGFyZSBkZWNsYXJlZCBoZXJlLlxuICB2YXJcbiAgICBuYXRpdmVJc0FycmF5ICAgICAgPSBBcnJheS5pc0FycmF5LFxuICAgIG5hdGl2ZUtleXMgICAgICAgICA9IE9iamVjdC5rZXlzLFxuICAgIG5hdGl2ZUJpbmQgICAgICAgICA9IEZ1bmNQcm90by5iaW5kO1xuXG4gIC8vIENyZWF0ZSBhIHNhZmUgcmVmZXJlbmNlIHRvIHRoZSBVbmRlcnNjb3JlIG9iamVjdCBmb3IgdXNlIGJlbG93LlxuICB2YXIgXyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmIChvYmogaW5zdGFuY2VvZiBfKSByZXR1cm4gb2JqO1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBfKSkgcmV0dXJuIG5ldyBfKG9iaik7XG4gICAgdGhpcy5fd3JhcHBlZCA9IG9iajtcbiAgfTtcblxuICAvLyBFeHBvcnQgdGhlIFVuZGVyc2NvcmUgb2JqZWN0IGZvciAqKk5vZGUuanMqKiwgd2l0aFxuICAvLyBiYWNrd2FyZHMtY29tcGF0aWJpbGl0eSBmb3IgdGhlIG9sZCBgcmVxdWlyZSgpYCBBUEkuIElmIHdlJ3JlIGluXG4gIC8vIHRoZSBicm93c2VyLCBhZGQgYF9gIGFzIGEgZ2xvYmFsIG9iamVjdC5cbiAgaWYgKHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgICAgZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gXztcbiAgICB9XG4gICAgZXhwb3J0cy5fID0gXztcbiAgfSBlbHNlIHtcbiAgICByb290Ll8gPSBfO1xuICB9XG5cbiAgLy8gQ3VycmVudCB2ZXJzaW9uLlxuICBfLlZFUlNJT04gPSAnMS43LjAnO1xuXG4gIC8vIEludGVybmFsIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhbiBlZmZpY2llbnQgKGZvciBjdXJyZW50IGVuZ2luZXMpIHZlcnNpb25cbiAgLy8gb2YgdGhlIHBhc3NlZC1pbiBjYWxsYmFjaywgdG8gYmUgcmVwZWF0ZWRseSBhcHBsaWVkIGluIG90aGVyIFVuZGVyc2NvcmVcbiAgLy8gZnVuY3Rpb25zLlxuICB2YXIgY3JlYXRlQ2FsbGJhY2sgPSBmdW5jdGlvbihmdW5jLCBjb250ZXh0LCBhcmdDb3VudCkge1xuICAgIGlmIChjb250ZXh0ID09PSB2b2lkIDApIHJldHVybiBmdW5jO1xuICAgIHN3aXRjaCAoYXJnQ291bnQgPT0gbnVsbCA/IDMgOiBhcmdDb3VudCkge1xuICAgICAgY2FzZSAxOiByZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmMuY2FsbChjb250ZXh0LCB2YWx1ZSk7XG4gICAgICB9O1xuICAgICAgY2FzZSAyOiByZXR1cm4gZnVuY3Rpb24odmFsdWUsIG90aGVyKSB7XG4gICAgICAgIHJldHVybiBmdW5jLmNhbGwoY29udGV4dCwgdmFsdWUsIG90aGVyKTtcbiAgICAgIH07XG4gICAgICBjYXNlIDM6IHJldHVybiBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmMuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pO1xuICAgICAgfTtcbiAgICAgIGNhc2UgNDogcmV0dXJuIGZ1bmN0aW9uKGFjY3VtdWxhdG9yLCB2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmMuY2FsbChjb250ZXh0LCBhY2N1bXVsYXRvciwgdmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKTtcbiAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfTtcblxuICAvLyBBIG1vc3RseS1pbnRlcm5hbCBmdW5jdGlvbiB0byBnZW5lcmF0ZSBjYWxsYmFja3MgdGhhdCBjYW4gYmUgYXBwbGllZFxuICAvLyB0byBlYWNoIGVsZW1lbnQgaW4gYSBjb2xsZWN0aW9uLCByZXR1cm5pbmcgdGhlIGRlc2lyZWQgcmVzdWx0IOKAlCBlaXRoZXJcbiAgLy8gaWRlbnRpdHksIGFuIGFyYml0cmFyeSBjYWxsYmFjaywgYSBwcm9wZXJ0eSBtYXRjaGVyLCBvciBhIHByb3BlcnR5IGFjY2Vzc29yLlxuICBfLml0ZXJhdGVlID0gZnVuY3Rpb24odmFsdWUsIGNvbnRleHQsIGFyZ0NvdW50KSB7XG4gICAgaWYgKHZhbHVlID09IG51bGwpIHJldHVybiBfLmlkZW50aXR5O1xuICAgIGlmIChfLmlzRnVuY3Rpb24odmFsdWUpKSByZXR1cm4gY3JlYXRlQ2FsbGJhY2sodmFsdWUsIGNvbnRleHQsIGFyZ0NvdW50KTtcbiAgICBpZiAoXy5pc09iamVjdCh2YWx1ZSkpIHJldHVybiBfLm1hdGNoZXModmFsdWUpO1xuICAgIHJldHVybiBfLnByb3BlcnR5KHZhbHVlKTtcbiAgfTtcblxuICAvLyBDb2xsZWN0aW9uIEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIFRoZSBjb3JuZXJzdG9uZSwgYW4gYGVhY2hgIGltcGxlbWVudGF0aW9uLCBha2EgYGZvckVhY2hgLlxuICAvLyBIYW5kbGVzIHJhdyBvYmplY3RzIGluIGFkZGl0aW9uIHRvIGFycmF5LWxpa2VzLiBUcmVhdHMgYWxsXG4gIC8vIHNwYXJzZSBhcnJheS1saWtlcyBhcyBpZiB0aGV5IHdlcmUgZGVuc2UuXG4gIF8uZWFjaCA9IF8uZm9yRWFjaCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiBvYmo7XG4gICAgaXRlcmF0ZWUgPSBjcmVhdGVDYWxsYmFjayhpdGVyYXRlZSwgY29udGV4dCk7XG4gICAgdmFyIGksIGxlbmd0aCA9IG9iai5sZW5ndGg7XG4gICAgaWYgKGxlbmd0aCA9PT0gK2xlbmd0aCkge1xuICAgICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGl0ZXJhdGVlKG9ialtpXSwgaSwgb2JqKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICAgIGZvciAoaSA9IDAsIGxlbmd0aCA9IGtleXMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaXRlcmF0ZWUob2JqW2tleXNbaV1dLCBrZXlzW2ldLCBvYmopO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgcmVzdWx0cyBvZiBhcHBseWluZyB0aGUgaXRlcmF0ZWUgdG8gZWFjaCBlbGVtZW50LlxuICBfLm1hcCA9IF8uY29sbGVjdCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiBbXTtcbiAgICBpdGVyYXRlZSA9IF8uaXRlcmF0ZWUoaXRlcmF0ZWUsIGNvbnRleHQpO1xuICAgIHZhciBrZXlzID0gb2JqLmxlbmd0aCAhPT0gK29iai5sZW5ndGggJiYgXy5rZXlzKG9iaiksXG4gICAgICAgIGxlbmd0aCA9IChrZXlzIHx8IG9iaikubGVuZ3RoLFxuICAgICAgICByZXN1bHRzID0gQXJyYXkobGVuZ3RoKSxcbiAgICAgICAgY3VycmVudEtleTtcbiAgICBmb3IgKHZhciBpbmRleCA9IDA7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICBjdXJyZW50S2V5ID0ga2V5cyA/IGtleXNbaW5kZXhdIDogaW5kZXg7XG4gICAgICByZXN1bHRzW2luZGV4XSA9IGl0ZXJhdGVlKG9ialtjdXJyZW50S2V5XSwgY3VycmVudEtleSwgb2JqKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgdmFyIHJlZHVjZUVycm9yID0gJ1JlZHVjZSBvZiBlbXB0eSBhcnJheSB3aXRoIG5vIGluaXRpYWwgdmFsdWUnO1xuXG4gIC8vICoqUmVkdWNlKiogYnVpbGRzIHVwIGEgc2luZ2xlIHJlc3VsdCBmcm9tIGEgbGlzdCBvZiB2YWx1ZXMsIGFrYSBgaW5qZWN0YCxcbiAgLy8gb3IgYGZvbGRsYC5cbiAgXy5yZWR1Y2UgPSBfLmZvbGRsID0gXy5pbmplY3QgPSBmdW5jdGlvbihvYmosIGl0ZXJhdGVlLCBtZW1vLCBjb250ZXh0KSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSBvYmogPSBbXTtcbiAgICBpdGVyYXRlZSA9IGNyZWF0ZUNhbGxiYWNrKGl0ZXJhdGVlLCBjb250ZXh0LCA0KTtcbiAgICB2YXIga2V5cyA9IG9iai5sZW5ndGggIT09ICtvYmoubGVuZ3RoICYmIF8ua2V5cyhvYmopLFxuICAgICAgICBsZW5ndGggPSAoa2V5cyB8fCBvYmopLmxlbmd0aCxcbiAgICAgICAgaW5kZXggPSAwLCBjdXJyZW50S2V5O1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMykge1xuICAgICAgaWYgKCFsZW5ndGgpIHRocm93IG5ldyBUeXBlRXJyb3IocmVkdWNlRXJyb3IpO1xuICAgICAgbWVtbyA9IG9ialtrZXlzID8ga2V5c1tpbmRleCsrXSA6IGluZGV4KytdO1xuICAgIH1cbiAgICBmb3IgKDsgaW5kZXggPCBsZW5ndGg7IGluZGV4KyspIHtcbiAgICAgIGN1cnJlbnRLZXkgPSBrZXlzID8ga2V5c1tpbmRleF0gOiBpbmRleDtcbiAgICAgIG1lbW8gPSBpdGVyYXRlZShtZW1vLCBvYmpbY3VycmVudEtleV0sIGN1cnJlbnRLZXksIG9iaik7XG4gICAgfVxuICAgIHJldHVybiBtZW1vO1xuICB9O1xuXG4gIC8vIFRoZSByaWdodC1hc3NvY2lhdGl2ZSB2ZXJzaW9uIG9mIHJlZHVjZSwgYWxzbyBrbm93biBhcyBgZm9sZHJgLlxuICBfLnJlZHVjZVJpZ2h0ID0gXy5mb2xkciA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0ZWUsIG1lbW8sIGNvbnRleHQpIHtcbiAgICBpZiAob2JqID09IG51bGwpIG9iaiA9IFtdO1xuICAgIGl0ZXJhdGVlID0gY3JlYXRlQ2FsbGJhY2soaXRlcmF0ZWUsIGNvbnRleHQsIDQpO1xuICAgIHZhciBrZXlzID0gb2JqLmxlbmd0aCAhPT0gKyBvYmoubGVuZ3RoICYmIF8ua2V5cyhvYmopLFxuICAgICAgICBpbmRleCA9IChrZXlzIHx8IG9iaikubGVuZ3RoLFxuICAgICAgICBjdXJyZW50S2V5O1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMykge1xuICAgICAgaWYgKCFpbmRleCkgdGhyb3cgbmV3IFR5cGVFcnJvcihyZWR1Y2VFcnJvcik7XG4gICAgICBtZW1vID0gb2JqW2tleXMgPyBrZXlzWy0taW5kZXhdIDogLS1pbmRleF07XG4gICAgfVxuICAgIHdoaWxlIChpbmRleC0tKSB7XG4gICAgICBjdXJyZW50S2V5ID0ga2V5cyA/IGtleXNbaW5kZXhdIDogaW5kZXg7XG4gICAgICBtZW1vID0gaXRlcmF0ZWUobWVtbywgb2JqW2N1cnJlbnRLZXldLCBjdXJyZW50S2V5LCBvYmopO1xuICAgIH1cbiAgICByZXR1cm4gbWVtbztcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIGZpcnN0IHZhbHVlIHdoaWNoIHBhc3NlcyBhIHRydXRoIHRlc3QuIEFsaWFzZWQgYXMgYGRldGVjdGAuXG4gIF8uZmluZCA9IF8uZGV0ZWN0ID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0O1xuICAgIHByZWRpY2F0ZSA9IF8uaXRlcmF0ZWUocHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICBfLnNvbWUob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGlmIChwcmVkaWNhdGUodmFsdWUsIGluZGV4LCBsaXN0KSkge1xuICAgICAgICByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBSZXR1cm4gYWxsIHRoZSBlbGVtZW50cyB0aGF0IHBhc3MgYSB0cnV0aCB0ZXN0LlxuICAvLyBBbGlhc2VkIGFzIGBzZWxlY3RgLlxuICBfLmZpbHRlciA9IF8uc2VsZWN0ID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIHJlc3VsdHM7XG4gICAgcHJlZGljYXRlID0gXy5pdGVyYXRlZShwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIF8uZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaWYgKHByZWRpY2F0ZSh2YWx1ZSwgaW5kZXgsIGxpc3QpKSByZXN1bHRzLnB1c2godmFsdWUpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9O1xuXG4gIC8vIFJldHVybiBhbGwgdGhlIGVsZW1lbnRzIGZvciB3aGljaCBhIHRydXRoIHRlc3QgZmFpbHMuXG4gIF8ucmVqZWN0ID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gXy5maWx0ZXIob2JqLCBfLm5lZ2F0ZShfLml0ZXJhdGVlKHByZWRpY2F0ZSkpLCBjb250ZXh0KTtcbiAgfTtcblxuICAvLyBEZXRlcm1pbmUgd2hldGhlciBhbGwgb2YgdGhlIGVsZW1lbnRzIG1hdGNoIGEgdHJ1dGggdGVzdC5cbiAgLy8gQWxpYXNlZCBhcyBgYWxsYC5cbiAgXy5ldmVyeSA9IF8uYWxsID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiB0cnVlO1xuICAgIHByZWRpY2F0ZSA9IF8uaXRlcmF0ZWUocHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICB2YXIga2V5cyA9IG9iai5sZW5ndGggIT09ICtvYmoubGVuZ3RoICYmIF8ua2V5cyhvYmopLFxuICAgICAgICBsZW5ndGggPSAoa2V5cyB8fCBvYmopLmxlbmd0aCxcbiAgICAgICAgaW5kZXgsIGN1cnJlbnRLZXk7XG4gICAgZm9yIChpbmRleCA9IDA7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICBjdXJyZW50S2V5ID0ga2V5cyA/IGtleXNbaW5kZXhdIDogaW5kZXg7XG4gICAgICBpZiAoIXByZWRpY2F0ZShvYmpbY3VycmVudEtleV0sIGN1cnJlbnRLZXksIG9iaikpIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIGlmIGF0IGxlYXN0IG9uZSBlbGVtZW50IGluIHRoZSBvYmplY3QgbWF0Y2hlcyBhIHRydXRoIHRlc3QuXG4gIC8vIEFsaWFzZWQgYXMgYGFueWAuXG4gIF8uc29tZSA9IF8uYW55ID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiBmYWxzZTtcbiAgICBwcmVkaWNhdGUgPSBfLml0ZXJhdGVlKHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgdmFyIGtleXMgPSBvYmoubGVuZ3RoICE9PSArb2JqLmxlbmd0aCAmJiBfLmtleXMob2JqKSxcbiAgICAgICAgbGVuZ3RoID0gKGtleXMgfHwgb2JqKS5sZW5ndGgsXG4gICAgICAgIGluZGV4LCBjdXJyZW50S2V5O1xuICAgIGZvciAoaW5kZXggPSAwOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgY3VycmVudEtleSA9IGtleXMgPyBrZXlzW2luZGV4XSA6IGluZGV4O1xuICAgICAgaWYgKHByZWRpY2F0ZShvYmpbY3VycmVudEtleV0sIGN1cnJlbnRLZXksIG9iaikpIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIGlmIHRoZSBhcnJheSBvciBvYmplY3QgY29udGFpbnMgYSBnaXZlbiB2YWx1ZSAodXNpbmcgYD09PWApLlxuICAvLyBBbGlhc2VkIGFzIGBpbmNsdWRlYC5cbiAgXy5jb250YWlucyA9IF8uaW5jbHVkZSA9IGZ1bmN0aW9uKG9iaiwgdGFyZ2V0KSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKG9iai5sZW5ndGggIT09ICtvYmoubGVuZ3RoKSBvYmogPSBfLnZhbHVlcyhvYmopO1xuICAgIHJldHVybiBfLmluZGV4T2Yob2JqLCB0YXJnZXQpID49IDA7XG4gIH07XG5cbiAgLy8gSW52b2tlIGEgbWV0aG9kICh3aXRoIGFyZ3VtZW50cykgb24gZXZlcnkgaXRlbSBpbiBhIGNvbGxlY3Rpb24uXG4gIF8uaW52b2tlID0gZnVuY3Rpb24ob2JqLCBtZXRob2QpIHtcbiAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICB2YXIgaXNGdW5jID0gXy5pc0Z1bmN0aW9uKG1ldGhvZCk7XG4gICAgcmV0dXJuIF8ubWFwKG9iaiwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJldHVybiAoaXNGdW5jID8gbWV0aG9kIDogdmFsdWVbbWV0aG9kXSkuYXBwbHkodmFsdWUsIGFyZ3MpO1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIENvbnZlbmllbmNlIHZlcnNpb24gb2YgYSBjb21tb24gdXNlIGNhc2Ugb2YgYG1hcGA6IGZldGNoaW5nIGEgcHJvcGVydHkuXG4gIF8ucGx1Y2sgPSBmdW5jdGlvbihvYmosIGtleSkge1xuICAgIHJldHVybiBfLm1hcChvYmosIF8ucHJvcGVydHkoa2V5KSk7XG4gIH07XG5cbiAgLy8gQ29udmVuaWVuY2UgdmVyc2lvbiBvZiBhIGNvbW1vbiB1c2UgY2FzZSBvZiBgZmlsdGVyYDogc2VsZWN0aW5nIG9ubHkgb2JqZWN0c1xuICAvLyBjb250YWluaW5nIHNwZWNpZmljIGBrZXk6dmFsdWVgIHBhaXJzLlxuICBfLndoZXJlID0gZnVuY3Rpb24ob2JqLCBhdHRycykge1xuICAgIHJldHVybiBfLmZpbHRlcihvYmosIF8ubWF0Y2hlcyhhdHRycykpO1xuICB9O1xuXG4gIC8vIENvbnZlbmllbmNlIHZlcnNpb24gb2YgYSBjb21tb24gdXNlIGNhc2Ugb2YgYGZpbmRgOiBnZXR0aW5nIHRoZSBmaXJzdCBvYmplY3RcbiAgLy8gY29udGFpbmluZyBzcGVjaWZpYyBga2V5OnZhbHVlYCBwYWlycy5cbiAgXy5maW5kV2hlcmUgPSBmdW5jdGlvbihvYmosIGF0dHJzKSB7XG4gICAgcmV0dXJuIF8uZmluZChvYmosIF8ubWF0Y2hlcyhhdHRycykpO1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgbWF4aW11bSBlbGVtZW50IChvciBlbGVtZW50LWJhc2VkIGNvbXB1dGF0aW9uKS5cbiAgXy5tYXggPSBmdW5jdGlvbihvYmosIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgdmFyIHJlc3VsdCA9IC1JbmZpbml0eSwgbGFzdENvbXB1dGVkID0gLUluZmluaXR5LFxuICAgICAgICB2YWx1ZSwgY29tcHV0ZWQ7XG4gICAgaWYgKGl0ZXJhdGVlID09IG51bGwgJiYgb2JqICE9IG51bGwpIHtcbiAgICAgIG9iaiA9IG9iai5sZW5ndGggPT09ICtvYmoubGVuZ3RoID8gb2JqIDogXy52YWx1ZXMob2JqKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBvYmoubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFsdWUgPSBvYmpbaV07XG4gICAgICAgIGlmICh2YWx1ZSA+IHJlc3VsdCkge1xuICAgICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGl0ZXJhdGVlID0gXy5pdGVyYXRlZShpdGVyYXRlZSwgY29udGV4dCk7XG4gICAgICBfLmVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgICAgY29tcHV0ZWQgPSBpdGVyYXRlZSh2YWx1ZSwgaW5kZXgsIGxpc3QpO1xuICAgICAgICBpZiAoY29tcHV0ZWQgPiBsYXN0Q29tcHV0ZWQgfHwgY29tcHV0ZWQgPT09IC1JbmZpbml0eSAmJiByZXN1bHQgPT09IC1JbmZpbml0eSkge1xuICAgICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICAgIGxhc3RDb21wdXRlZCA9IGNvbXB1dGVkO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIG1pbmltdW0gZWxlbWVudCAob3IgZWxlbWVudC1iYXNlZCBjb21wdXRhdGlvbikuXG4gIF8ubWluID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRlZSwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHQgPSBJbmZpbml0eSwgbGFzdENvbXB1dGVkID0gSW5maW5pdHksXG4gICAgICAgIHZhbHVlLCBjb21wdXRlZDtcbiAgICBpZiAoaXRlcmF0ZWUgPT0gbnVsbCAmJiBvYmogIT0gbnVsbCkge1xuICAgICAgb2JqID0gb2JqLmxlbmd0aCA9PT0gK29iai5sZW5ndGggPyBvYmogOiBfLnZhbHVlcyhvYmopO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IG9iai5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICB2YWx1ZSA9IG9ialtpXTtcbiAgICAgICAgaWYgKHZhbHVlIDwgcmVzdWx0KSB7XG4gICAgICAgICAgcmVzdWx0ID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaXRlcmF0ZWUgPSBfLml0ZXJhdGVlKGl0ZXJhdGVlLCBjb250ZXh0KTtcbiAgICAgIF8uZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgICBjb21wdXRlZCA9IGl0ZXJhdGVlKHZhbHVlLCBpbmRleCwgbGlzdCk7XG4gICAgICAgIGlmIChjb21wdXRlZCA8IGxhc3RDb21wdXRlZCB8fCBjb21wdXRlZCA9PT0gSW5maW5pdHkgJiYgcmVzdWx0ID09PSBJbmZpbml0eSkge1xuICAgICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICAgIGxhc3RDb21wdXRlZCA9IGNvbXB1dGVkO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBTaHVmZmxlIGEgY29sbGVjdGlvbiwgdXNpbmcgdGhlIG1vZGVybiB2ZXJzaW9uIG9mIHRoZVxuICAvLyBbRmlzaGVyLVlhdGVzIHNodWZmbGVdKGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvRmlzaGVy4oCTWWF0ZXNfc2h1ZmZsZSkuXG4gIF8uc2h1ZmZsZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBzZXQgPSBvYmogJiYgb2JqLmxlbmd0aCA9PT0gK29iai5sZW5ndGggPyBvYmogOiBfLnZhbHVlcyhvYmopO1xuICAgIHZhciBsZW5ndGggPSBzZXQubGVuZ3RoO1xuICAgIHZhciBzaHVmZmxlZCA9IEFycmF5KGxlbmd0aCk7XG4gICAgZm9yICh2YXIgaW5kZXggPSAwLCByYW5kOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgcmFuZCA9IF8ucmFuZG9tKDAsIGluZGV4KTtcbiAgICAgIGlmIChyYW5kICE9PSBpbmRleCkgc2h1ZmZsZWRbaW5kZXhdID0gc2h1ZmZsZWRbcmFuZF07XG4gICAgICBzaHVmZmxlZFtyYW5kXSA9IHNldFtpbmRleF07XG4gICAgfVxuICAgIHJldHVybiBzaHVmZmxlZDtcbiAgfTtcblxuICAvLyBTYW1wbGUgKipuKiogcmFuZG9tIHZhbHVlcyBmcm9tIGEgY29sbGVjdGlvbi5cbiAgLy8gSWYgKipuKiogaXMgbm90IHNwZWNpZmllZCwgcmV0dXJucyBhIHNpbmdsZSByYW5kb20gZWxlbWVudC5cbiAgLy8gVGhlIGludGVybmFsIGBndWFyZGAgYXJndW1lbnQgYWxsb3dzIGl0IHRvIHdvcmsgd2l0aCBgbWFwYC5cbiAgXy5zYW1wbGUgPSBmdW5jdGlvbihvYmosIG4sIGd1YXJkKSB7XG4gICAgaWYgKG4gPT0gbnVsbCB8fCBndWFyZCkge1xuICAgICAgaWYgKG9iai5sZW5ndGggIT09ICtvYmoubGVuZ3RoKSBvYmogPSBfLnZhbHVlcyhvYmopO1xuICAgICAgcmV0dXJuIG9ialtfLnJhbmRvbShvYmoubGVuZ3RoIC0gMSldO1xuICAgIH1cbiAgICByZXR1cm4gXy5zaHVmZmxlKG9iaikuc2xpY2UoMCwgTWF0aC5tYXgoMCwgbikpO1xuICB9O1xuXG4gIC8vIFNvcnQgdGhlIG9iamVjdCdzIHZhbHVlcyBieSBhIGNyaXRlcmlvbiBwcm9kdWNlZCBieSBhbiBpdGVyYXRlZS5cbiAgXy5zb3J0QnkgPSBmdW5jdGlvbihvYmosIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgaXRlcmF0ZWUgPSBfLml0ZXJhdGVlKGl0ZXJhdGVlLCBjb250ZXh0KTtcbiAgICByZXR1cm4gXy5wbHVjayhfLm1hcChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICBpbmRleDogaW5kZXgsXG4gICAgICAgIGNyaXRlcmlhOiBpdGVyYXRlZSh2YWx1ZSwgaW5kZXgsIGxpc3QpXG4gICAgICB9O1xuICAgIH0pLnNvcnQoZnVuY3Rpb24obGVmdCwgcmlnaHQpIHtcbiAgICAgIHZhciBhID0gbGVmdC5jcml0ZXJpYTtcbiAgICAgIHZhciBiID0gcmlnaHQuY3JpdGVyaWE7XG4gICAgICBpZiAoYSAhPT0gYikge1xuICAgICAgICBpZiAoYSA+IGIgfHwgYSA9PT0gdm9pZCAwKSByZXR1cm4gMTtcbiAgICAgICAgaWYgKGEgPCBiIHx8IGIgPT09IHZvaWQgMCkgcmV0dXJuIC0xO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGxlZnQuaW5kZXggLSByaWdodC5pbmRleDtcbiAgICB9KSwgJ3ZhbHVlJyk7XG4gIH07XG5cbiAgLy8gQW4gaW50ZXJuYWwgZnVuY3Rpb24gdXNlZCBmb3IgYWdncmVnYXRlIFwiZ3JvdXAgYnlcIiBvcGVyYXRpb25zLlxuICB2YXIgZ3JvdXAgPSBmdW5jdGlvbihiZWhhdmlvcikge1xuICAgIHJldHVybiBmdW5jdGlvbihvYmosIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgICBpdGVyYXRlZSA9IF8uaXRlcmF0ZWUoaXRlcmF0ZWUsIGNvbnRleHQpO1xuICAgICAgXy5lYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4KSB7XG4gICAgICAgIHZhciBrZXkgPSBpdGVyYXRlZSh2YWx1ZSwgaW5kZXgsIG9iaik7XG4gICAgICAgIGJlaGF2aW9yKHJlc3VsdCwgdmFsdWUsIGtleSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfTtcblxuICAvLyBHcm91cHMgdGhlIG9iamVjdCdzIHZhbHVlcyBieSBhIGNyaXRlcmlvbi4gUGFzcyBlaXRoZXIgYSBzdHJpbmcgYXR0cmlidXRlXG4gIC8vIHRvIGdyb3VwIGJ5LCBvciBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGUgY3JpdGVyaW9uLlxuICBfLmdyb3VwQnkgPSBncm91cChmdW5jdGlvbihyZXN1bHQsIHZhbHVlLCBrZXkpIHtcbiAgICBpZiAoXy5oYXMocmVzdWx0LCBrZXkpKSByZXN1bHRba2V5XS5wdXNoKHZhbHVlKTsgZWxzZSByZXN1bHRba2V5XSA9IFt2YWx1ZV07XG4gIH0pO1xuXG4gIC8vIEluZGV4ZXMgdGhlIG9iamVjdCdzIHZhbHVlcyBieSBhIGNyaXRlcmlvbiwgc2ltaWxhciB0byBgZ3JvdXBCeWAsIGJ1dCBmb3JcbiAgLy8gd2hlbiB5b3Uga25vdyB0aGF0IHlvdXIgaW5kZXggdmFsdWVzIHdpbGwgYmUgdW5pcXVlLlxuICBfLmluZGV4QnkgPSBncm91cChmdW5jdGlvbihyZXN1bHQsIHZhbHVlLCBrZXkpIHtcbiAgICByZXN1bHRba2V5XSA9IHZhbHVlO1xuICB9KTtcblxuICAvLyBDb3VudHMgaW5zdGFuY2VzIG9mIGFuIG9iamVjdCB0aGF0IGdyb3VwIGJ5IGEgY2VydGFpbiBjcml0ZXJpb24uIFBhc3NcbiAgLy8gZWl0aGVyIGEgc3RyaW5nIGF0dHJpYnV0ZSB0byBjb3VudCBieSwgb3IgYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGhlXG4gIC8vIGNyaXRlcmlvbi5cbiAgXy5jb3VudEJ5ID0gZ3JvdXAoZnVuY3Rpb24ocmVzdWx0LCB2YWx1ZSwga2V5KSB7XG4gICAgaWYgKF8uaGFzKHJlc3VsdCwga2V5KSkgcmVzdWx0W2tleV0rKzsgZWxzZSByZXN1bHRba2V5XSA9IDE7XG4gIH0pO1xuXG4gIC8vIFVzZSBhIGNvbXBhcmF0b3IgZnVuY3Rpb24gdG8gZmlndXJlIG91dCB0aGUgc21hbGxlc3QgaW5kZXggYXQgd2hpY2hcbiAgLy8gYW4gb2JqZWN0IHNob3VsZCBiZSBpbnNlcnRlZCBzbyBhcyB0byBtYWludGFpbiBvcmRlci4gVXNlcyBiaW5hcnkgc2VhcmNoLlxuICBfLnNvcnRlZEluZGV4ID0gZnVuY3Rpb24oYXJyYXksIG9iaiwgaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICBpdGVyYXRlZSA9IF8uaXRlcmF0ZWUoaXRlcmF0ZWUsIGNvbnRleHQsIDEpO1xuICAgIHZhciB2YWx1ZSA9IGl0ZXJhdGVlKG9iaik7XG4gICAgdmFyIGxvdyA9IDAsIGhpZ2ggPSBhcnJheS5sZW5ndGg7XG4gICAgd2hpbGUgKGxvdyA8IGhpZ2gpIHtcbiAgICAgIHZhciBtaWQgPSBsb3cgKyBoaWdoID4+PiAxO1xuICAgICAgaWYgKGl0ZXJhdGVlKGFycmF5W21pZF0pIDwgdmFsdWUpIGxvdyA9IG1pZCArIDE7IGVsc2UgaGlnaCA9IG1pZDtcbiAgICB9XG4gICAgcmV0dXJuIGxvdztcbiAgfTtcblxuICAvLyBTYWZlbHkgY3JlYXRlIGEgcmVhbCwgbGl2ZSBhcnJheSBmcm9tIGFueXRoaW5nIGl0ZXJhYmxlLlxuICBfLnRvQXJyYXkgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIW9iaikgcmV0dXJuIFtdO1xuICAgIGlmIChfLmlzQXJyYXkob2JqKSkgcmV0dXJuIHNsaWNlLmNhbGwob2JqKTtcbiAgICBpZiAob2JqLmxlbmd0aCA9PT0gK29iai5sZW5ndGgpIHJldHVybiBfLm1hcChvYmosIF8uaWRlbnRpdHkpO1xuICAgIHJldHVybiBfLnZhbHVlcyhvYmopO1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgbnVtYmVyIG9mIGVsZW1lbnRzIGluIGFuIG9iamVjdC5cbiAgXy5zaXplID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gMDtcbiAgICByZXR1cm4gb2JqLmxlbmd0aCA9PT0gK29iai5sZW5ndGggPyBvYmoubGVuZ3RoIDogXy5rZXlzKG9iaikubGVuZ3RoO1xuICB9O1xuXG4gIC8vIFNwbGl0IGEgY29sbGVjdGlvbiBpbnRvIHR3byBhcnJheXM6IG9uZSB3aG9zZSBlbGVtZW50cyBhbGwgc2F0aXNmeSB0aGUgZ2l2ZW5cbiAgLy8gcHJlZGljYXRlLCBhbmQgb25lIHdob3NlIGVsZW1lbnRzIGFsbCBkbyBub3Qgc2F0aXNmeSB0aGUgcHJlZGljYXRlLlxuICBfLnBhcnRpdGlvbiA9IGZ1bmN0aW9uKG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgcHJlZGljYXRlID0gXy5pdGVyYXRlZShwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIHZhciBwYXNzID0gW10sIGZhaWwgPSBbXTtcbiAgICBfLmVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwga2V5LCBvYmopIHtcbiAgICAgIChwcmVkaWNhdGUodmFsdWUsIGtleSwgb2JqKSA/IHBhc3MgOiBmYWlsKS5wdXNoKHZhbHVlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gW3Bhc3MsIGZhaWxdO1xuICB9O1xuXG4gIC8vIEFycmF5IEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS1cblxuICAvLyBHZXQgdGhlIGZpcnN0IGVsZW1lbnQgb2YgYW4gYXJyYXkuIFBhc3NpbmcgKipuKiogd2lsbCByZXR1cm4gdGhlIGZpcnN0IE5cbiAgLy8gdmFsdWVzIGluIHRoZSBhcnJheS4gQWxpYXNlZCBhcyBgaGVhZGAgYW5kIGB0YWtlYC4gVGhlICoqZ3VhcmQqKiBjaGVja1xuICAvLyBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBfLm1hcGAuXG4gIF8uZmlyc3QgPSBfLmhlYWQgPSBfLnRha2UgPSBmdW5jdGlvbihhcnJheSwgbiwgZ3VhcmQpIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIHZvaWQgMDtcbiAgICBpZiAobiA9PSBudWxsIHx8IGd1YXJkKSByZXR1cm4gYXJyYXlbMF07XG4gICAgaWYgKG4gPCAwKSByZXR1cm4gW107XG4gICAgcmV0dXJuIHNsaWNlLmNhbGwoYXJyYXksIDAsIG4pO1xuICB9O1xuXG4gIC8vIFJldHVybnMgZXZlcnl0aGluZyBidXQgdGhlIGxhc3QgZW50cnkgb2YgdGhlIGFycmF5LiBFc3BlY2lhbGx5IHVzZWZ1bCBvblxuICAvLyB0aGUgYXJndW1lbnRzIG9iamVjdC4gUGFzc2luZyAqKm4qKiB3aWxsIHJldHVybiBhbGwgdGhlIHZhbHVlcyBpblxuICAvLyB0aGUgYXJyYXksIGV4Y2x1ZGluZyB0aGUgbGFzdCBOLiBUaGUgKipndWFyZCoqIGNoZWNrIGFsbG93cyBpdCB0byB3b3JrIHdpdGhcbiAgLy8gYF8ubWFwYC5cbiAgXy5pbml0aWFsID0gZnVuY3Rpb24oYXJyYXksIG4sIGd1YXJkKSB7XG4gICAgcmV0dXJuIHNsaWNlLmNhbGwoYXJyYXksIDAsIE1hdGgubWF4KDAsIGFycmF5Lmxlbmd0aCAtIChuID09IG51bGwgfHwgZ3VhcmQgPyAxIDogbikpKTtcbiAgfTtcblxuICAvLyBHZXQgdGhlIGxhc3QgZWxlbWVudCBvZiBhbiBhcnJheS4gUGFzc2luZyAqKm4qKiB3aWxsIHJldHVybiB0aGUgbGFzdCBOXG4gIC8vIHZhbHVlcyBpbiB0aGUgYXJyYXkuIFRoZSAqKmd1YXJkKiogY2hlY2sgYWxsb3dzIGl0IHRvIHdvcmsgd2l0aCBgXy5tYXBgLlxuICBfLmxhc3QgPSBmdW5jdGlvbihhcnJheSwgbiwgZ3VhcmQpIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIHZvaWQgMDtcbiAgICBpZiAobiA9PSBudWxsIHx8IGd1YXJkKSByZXR1cm4gYXJyYXlbYXJyYXkubGVuZ3RoIC0gMV07XG4gICAgcmV0dXJuIHNsaWNlLmNhbGwoYXJyYXksIE1hdGgubWF4KGFycmF5Lmxlbmd0aCAtIG4sIDApKTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGV2ZXJ5dGhpbmcgYnV0IHRoZSBmaXJzdCBlbnRyeSBvZiB0aGUgYXJyYXkuIEFsaWFzZWQgYXMgYHRhaWxgIGFuZCBgZHJvcGAuXG4gIC8vIEVzcGVjaWFsbHkgdXNlZnVsIG9uIHRoZSBhcmd1bWVudHMgb2JqZWN0LiBQYXNzaW5nIGFuICoqbioqIHdpbGwgcmV0dXJuXG4gIC8vIHRoZSByZXN0IE4gdmFsdWVzIGluIHRoZSBhcnJheS4gVGhlICoqZ3VhcmQqKlxuICAvLyBjaGVjayBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBfLm1hcGAuXG4gIF8ucmVzdCA9IF8udGFpbCA9IF8uZHJvcCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCBuID09IG51bGwgfHwgZ3VhcmQgPyAxIDogbik7XG4gIH07XG5cbiAgLy8gVHJpbSBvdXQgYWxsIGZhbHN5IHZhbHVlcyBmcm9tIGFuIGFycmF5LlxuICBfLmNvbXBhY3QgPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHJldHVybiBfLmZpbHRlcihhcnJheSwgXy5pZGVudGl0eSk7XG4gIH07XG5cbiAgLy8gSW50ZXJuYWwgaW1wbGVtZW50YXRpb24gb2YgYSByZWN1cnNpdmUgYGZsYXR0ZW5gIGZ1bmN0aW9uLlxuICB2YXIgZmxhdHRlbiA9IGZ1bmN0aW9uKGlucHV0LCBzaGFsbG93LCBzdHJpY3QsIG91dHB1dCkge1xuICAgIGlmIChzaGFsbG93ICYmIF8uZXZlcnkoaW5wdXQsIF8uaXNBcnJheSkpIHtcbiAgICAgIHJldHVybiBjb25jYXQuYXBwbHkob3V0cHV0LCBpbnB1dCk7XG4gICAgfVxuICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBpbnB1dC5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHZhbHVlID0gaW5wdXRbaV07XG4gICAgICBpZiAoIV8uaXNBcnJheSh2YWx1ZSkgJiYgIV8uaXNBcmd1bWVudHModmFsdWUpKSB7XG4gICAgICAgIGlmICghc3RyaWN0KSBvdXRwdXQucHVzaCh2YWx1ZSk7XG4gICAgICB9IGVsc2UgaWYgKHNoYWxsb3cpIHtcbiAgICAgICAgcHVzaC5hcHBseShvdXRwdXQsIHZhbHVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZsYXR0ZW4odmFsdWUsIHNoYWxsb3csIHN0cmljdCwgb3V0cHV0KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG91dHB1dDtcbiAgfTtcblxuICAvLyBGbGF0dGVuIG91dCBhbiBhcnJheSwgZWl0aGVyIHJlY3Vyc2l2ZWx5IChieSBkZWZhdWx0KSwgb3IganVzdCBvbmUgbGV2ZWwuXG4gIF8uZmxhdHRlbiA9IGZ1bmN0aW9uKGFycmF5LCBzaGFsbG93KSB7XG4gICAgcmV0dXJuIGZsYXR0ZW4oYXJyYXksIHNoYWxsb3csIGZhbHNlLCBbXSk7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgdmVyc2lvbiBvZiB0aGUgYXJyYXkgdGhhdCBkb2VzIG5vdCBjb250YWluIHRoZSBzcGVjaWZpZWQgdmFsdWUocykuXG4gIF8ud2l0aG91dCA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgcmV0dXJuIF8uZGlmZmVyZW5jZShhcnJheSwgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgfTtcblxuICAvLyBQcm9kdWNlIGEgZHVwbGljYXRlLWZyZWUgdmVyc2lvbiBvZiB0aGUgYXJyYXkuIElmIHRoZSBhcnJheSBoYXMgYWxyZWFkeVxuICAvLyBiZWVuIHNvcnRlZCwgeW91IGhhdmUgdGhlIG9wdGlvbiBvZiB1c2luZyBhIGZhc3RlciBhbGdvcml0aG0uXG4gIC8vIEFsaWFzZWQgYXMgYHVuaXF1ZWAuXG4gIF8udW5pcSA9IF8udW5pcXVlID0gZnVuY3Rpb24oYXJyYXksIGlzU29ydGVkLCBpdGVyYXRlZSwgY29udGV4dCkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gW107XG4gICAgaWYgKCFfLmlzQm9vbGVhbihpc1NvcnRlZCkpIHtcbiAgICAgIGNvbnRleHQgPSBpdGVyYXRlZTtcbiAgICAgIGl0ZXJhdGVlID0gaXNTb3J0ZWQ7XG4gICAgICBpc1NvcnRlZCA9IGZhbHNlO1xuICAgIH1cbiAgICBpZiAoaXRlcmF0ZWUgIT0gbnVsbCkgaXRlcmF0ZWUgPSBfLml0ZXJhdGVlKGl0ZXJhdGVlLCBjb250ZXh0KTtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgdmFyIHNlZW4gPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gYXJyYXkubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciB2YWx1ZSA9IGFycmF5W2ldO1xuICAgICAgaWYgKGlzU29ydGVkKSB7XG4gICAgICAgIGlmICghaSB8fCBzZWVuICE9PSB2YWx1ZSkgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgICAgICBzZWVuID0gdmFsdWU7XG4gICAgICB9IGVsc2UgaWYgKGl0ZXJhdGVlKSB7XG4gICAgICAgIHZhciBjb21wdXRlZCA9IGl0ZXJhdGVlKHZhbHVlLCBpLCBhcnJheSk7XG4gICAgICAgIGlmIChfLmluZGV4T2Yoc2VlbiwgY29tcHV0ZWQpIDwgMCkge1xuICAgICAgICAgIHNlZW4ucHVzaChjb21wdXRlZCk7XG4gICAgICAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKF8uaW5kZXhPZihyZXN1bHQsIHZhbHVlKSA8IDApIHtcbiAgICAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFByb2R1Y2UgYW4gYXJyYXkgdGhhdCBjb250YWlucyB0aGUgdW5pb246IGVhY2ggZGlzdGluY3QgZWxlbWVudCBmcm9tIGFsbCBvZlxuICAvLyB0aGUgcGFzc2VkLWluIGFycmF5cy5cbiAgXy51bmlvbiA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBfLnVuaXEoZmxhdHRlbihhcmd1bWVudHMsIHRydWUsIHRydWUsIFtdKSk7XG4gIH07XG5cbiAgLy8gUHJvZHVjZSBhbiBhcnJheSB0aGF0IGNvbnRhaW5zIGV2ZXJ5IGl0ZW0gc2hhcmVkIGJldHdlZW4gYWxsIHRoZVxuICAvLyBwYXNzZWQtaW4gYXJyYXlzLlxuICBfLmludGVyc2VjdGlvbiA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgaWYgKGFycmF5ID09IG51bGwpIHJldHVybiBbXTtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgdmFyIGFyZ3NMZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBhcnJheS5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGl0ZW0gPSBhcnJheVtpXTtcbiAgICAgIGlmIChfLmNvbnRhaW5zKHJlc3VsdCwgaXRlbSkpIGNvbnRpbnVlO1xuICAgICAgZm9yICh2YXIgaiA9IDE7IGogPCBhcmdzTGVuZ3RoOyBqKyspIHtcbiAgICAgICAgaWYgKCFfLmNvbnRhaW5zKGFyZ3VtZW50c1tqXSwgaXRlbSkpIGJyZWFrO1xuICAgICAgfVxuICAgICAgaWYgKGogPT09IGFyZ3NMZW5ndGgpIHJlc3VsdC5wdXNoKGl0ZW0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFRha2UgdGhlIGRpZmZlcmVuY2UgYmV0d2VlbiBvbmUgYXJyYXkgYW5kIGEgbnVtYmVyIG9mIG90aGVyIGFycmF5cy5cbiAgLy8gT25seSB0aGUgZWxlbWVudHMgcHJlc2VudCBpbiBqdXN0IHRoZSBmaXJzdCBhcnJheSB3aWxsIHJlbWFpbi5cbiAgXy5kaWZmZXJlbmNlID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICB2YXIgcmVzdCA9IGZsYXR0ZW4oc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLCB0cnVlLCB0cnVlLCBbXSk7XG4gICAgcmV0dXJuIF8uZmlsdGVyKGFycmF5LCBmdW5jdGlvbih2YWx1ZSl7XG4gICAgICByZXR1cm4gIV8uY29udGFpbnMocmVzdCwgdmFsdWUpO1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIFppcCB0b2dldGhlciBtdWx0aXBsZSBsaXN0cyBpbnRvIGEgc2luZ2xlIGFycmF5IC0tIGVsZW1lbnRzIHRoYXQgc2hhcmVcbiAgLy8gYW4gaW5kZXggZ28gdG9nZXRoZXIuXG4gIF8uemlwID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIFtdO1xuICAgIHZhciBsZW5ndGggPSBfLm1heChhcmd1bWVudHMsICdsZW5ndGgnKS5sZW5ndGg7XG4gICAgdmFyIHJlc3VsdHMgPSBBcnJheShsZW5ndGgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHJlc3VsdHNbaV0gPSBfLnBsdWNrKGFyZ3VtZW50cywgaSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHRzO1xuICB9O1xuXG4gIC8vIENvbnZlcnRzIGxpc3RzIGludG8gb2JqZWN0cy4gUGFzcyBlaXRoZXIgYSBzaW5nbGUgYXJyYXkgb2YgYFtrZXksIHZhbHVlXWBcbiAgLy8gcGFpcnMsIG9yIHR3byBwYXJhbGxlbCBhcnJheXMgb2YgdGhlIHNhbWUgbGVuZ3RoIC0tIG9uZSBvZiBrZXlzLCBhbmQgb25lIG9mXG4gIC8vIHRoZSBjb3JyZXNwb25kaW5nIHZhbHVlcy5cbiAgXy5vYmplY3QgPSBmdW5jdGlvbihsaXN0LCB2YWx1ZXMpIHtcbiAgICBpZiAobGlzdCA9PSBudWxsKSByZXR1cm4ge307XG4gICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBsaXN0Lmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAodmFsdWVzKSB7XG4gICAgICAgIHJlc3VsdFtsaXN0W2ldXSA9IHZhbHVlc1tpXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdFtsaXN0W2ldWzBdXSA9IGxpc3RbaV1bMV07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSBwb3NpdGlvbiBvZiB0aGUgZmlyc3Qgb2NjdXJyZW5jZSBvZiBhbiBpdGVtIGluIGFuIGFycmF5LFxuICAvLyBvciAtMSBpZiB0aGUgaXRlbSBpcyBub3QgaW5jbHVkZWQgaW4gdGhlIGFycmF5LlxuICAvLyBJZiB0aGUgYXJyYXkgaXMgbGFyZ2UgYW5kIGFscmVhZHkgaW4gc29ydCBvcmRlciwgcGFzcyBgdHJ1ZWBcbiAgLy8gZm9yICoqaXNTb3J0ZWQqKiB0byB1c2UgYmluYXJ5IHNlYXJjaC5cbiAgXy5pbmRleE9mID0gZnVuY3Rpb24oYXJyYXksIGl0ZW0sIGlzU29ydGVkKSB7XG4gICAgaWYgKGFycmF5ID09IG51bGwpIHJldHVybiAtMTtcbiAgICB2YXIgaSA9IDAsIGxlbmd0aCA9IGFycmF5Lmxlbmd0aDtcbiAgICBpZiAoaXNTb3J0ZWQpIHtcbiAgICAgIGlmICh0eXBlb2YgaXNTb3J0ZWQgPT0gJ251bWJlcicpIHtcbiAgICAgICAgaSA9IGlzU29ydGVkIDwgMCA/IE1hdGgubWF4KDAsIGxlbmd0aCArIGlzU29ydGVkKSA6IGlzU29ydGVkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaSA9IF8uc29ydGVkSW5kZXgoYXJyYXksIGl0ZW0pO1xuICAgICAgICByZXR1cm4gYXJyYXlbaV0gPT09IGl0ZW0gPyBpIDogLTE7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoOyBpIDwgbGVuZ3RoOyBpKyspIGlmIChhcnJheVtpXSA9PT0gaXRlbSkgcmV0dXJuIGk7XG4gICAgcmV0dXJuIC0xO1xuICB9O1xuXG4gIF8ubGFzdEluZGV4T2YgPSBmdW5jdGlvbihhcnJheSwgaXRlbSwgZnJvbSkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gLTE7XG4gICAgdmFyIGlkeCA9IGFycmF5Lmxlbmd0aDtcbiAgICBpZiAodHlwZW9mIGZyb20gPT0gJ251bWJlcicpIHtcbiAgICAgIGlkeCA9IGZyb20gPCAwID8gaWR4ICsgZnJvbSArIDEgOiBNYXRoLm1pbihpZHgsIGZyb20gKyAxKTtcbiAgICB9XG4gICAgd2hpbGUgKC0taWR4ID49IDApIGlmIChhcnJheVtpZHhdID09PSBpdGVtKSByZXR1cm4gaWR4O1xuICAgIHJldHVybiAtMTtcbiAgfTtcblxuICAvLyBHZW5lcmF0ZSBhbiBpbnRlZ2VyIEFycmF5IGNvbnRhaW5pbmcgYW4gYXJpdGhtZXRpYyBwcm9ncmVzc2lvbi4gQSBwb3J0IG9mXG4gIC8vIHRoZSBuYXRpdmUgUHl0aG9uIGByYW5nZSgpYCBmdW5jdGlvbi4gU2VlXG4gIC8vIFt0aGUgUHl0aG9uIGRvY3VtZW50YXRpb25dKGh0dHA6Ly9kb2NzLnB5dGhvbi5vcmcvbGlicmFyeS9mdW5jdGlvbnMuaHRtbCNyYW5nZSkuXG4gIF8ucmFuZ2UgPSBmdW5jdGlvbihzdGFydCwgc3RvcCwgc3RlcCkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDw9IDEpIHtcbiAgICAgIHN0b3AgPSBzdGFydCB8fCAwO1xuICAgICAgc3RhcnQgPSAwO1xuICAgIH1cbiAgICBzdGVwID0gc3RlcCB8fCAxO1xuXG4gICAgdmFyIGxlbmd0aCA9IE1hdGgubWF4KE1hdGguY2VpbCgoc3RvcCAtIHN0YXJ0KSAvIHN0ZXApLCAwKTtcbiAgICB2YXIgcmFuZ2UgPSBBcnJheShsZW5ndGgpO1xuXG4gICAgZm9yICh2YXIgaWR4ID0gMDsgaWR4IDwgbGVuZ3RoOyBpZHgrKywgc3RhcnQgKz0gc3RlcCkge1xuICAgICAgcmFuZ2VbaWR4XSA9IHN0YXJ0O1xuICAgIH1cblxuICAgIHJldHVybiByYW5nZTtcbiAgfTtcblxuICAvLyBGdW5jdGlvbiAoYWhlbSkgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIFJldXNhYmxlIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIGZvciBwcm90b3R5cGUgc2V0dGluZy5cbiAgdmFyIEN0b3IgPSBmdW5jdGlvbigpe307XG5cbiAgLy8gQ3JlYXRlIGEgZnVuY3Rpb24gYm91bmQgdG8gYSBnaXZlbiBvYmplY3QgKGFzc2lnbmluZyBgdGhpc2AsIGFuZCBhcmd1bWVudHMsXG4gIC8vIG9wdGlvbmFsbHkpLiBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgRnVuY3Rpb24uYmluZGAgaWZcbiAgLy8gYXZhaWxhYmxlLlxuICBfLmJpbmQgPSBmdW5jdGlvbihmdW5jLCBjb250ZXh0KSB7XG4gICAgdmFyIGFyZ3MsIGJvdW5kO1xuICAgIGlmIChuYXRpdmVCaW5kICYmIGZ1bmMuYmluZCA9PT0gbmF0aXZlQmluZCkgcmV0dXJuIG5hdGl2ZUJpbmQuYXBwbHkoZnVuYywgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICBpZiAoIV8uaXNGdW5jdGlvbihmdW5jKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignQmluZCBtdXN0IGJlIGNhbGxlZCBvbiBhIGZ1bmN0aW9uJyk7XG4gICAgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICBib3VuZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIGJvdW5kKSkgcmV0dXJuIGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncy5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG4gICAgICBDdG9yLnByb3RvdHlwZSA9IGZ1bmMucHJvdG90eXBlO1xuICAgICAgdmFyIHNlbGYgPSBuZXcgQ3RvcjtcbiAgICAgIEN0b3IucHJvdG90eXBlID0gbnVsbDtcbiAgICAgIHZhciByZXN1bHQgPSBmdW5jLmFwcGx5KHNlbGYsIGFyZ3MuY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICAgICAgaWYgKF8uaXNPYmplY3QocmVzdWx0KSkgcmV0dXJuIHJlc3VsdDtcbiAgICAgIHJldHVybiBzZWxmO1xuICAgIH07XG4gICAgcmV0dXJuIGJvdW5kO1xuICB9O1xuXG4gIC8vIFBhcnRpYWxseSBhcHBseSBhIGZ1bmN0aW9uIGJ5IGNyZWF0aW5nIGEgdmVyc2lvbiB0aGF0IGhhcyBoYWQgc29tZSBvZiBpdHNcbiAgLy8gYXJndW1lbnRzIHByZS1maWxsZWQsIHdpdGhvdXQgY2hhbmdpbmcgaXRzIGR5bmFtaWMgYHRoaXNgIGNvbnRleHQuIF8gYWN0c1xuICAvLyBhcyBhIHBsYWNlaG9sZGVyLCBhbGxvd2luZyBhbnkgY29tYmluYXRpb24gb2YgYXJndW1lbnRzIHRvIGJlIHByZS1maWxsZWQuXG4gIF8ucGFydGlhbCA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICB2YXIgYm91bmRBcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBwb3NpdGlvbiA9IDA7XG4gICAgICB2YXIgYXJncyA9IGJvdW5kQXJncy5zbGljZSgpO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGFyZ3MubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGFyZ3NbaV0gPT09IF8pIGFyZ3NbaV0gPSBhcmd1bWVudHNbcG9zaXRpb24rK107XG4gICAgICB9XG4gICAgICB3aGlsZSAocG9zaXRpb24gPCBhcmd1bWVudHMubGVuZ3RoKSBhcmdzLnB1c2goYXJndW1lbnRzW3Bvc2l0aW9uKytdKTtcbiAgICAgIHJldHVybiBmdW5jLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH07XG4gIH07XG5cbiAgLy8gQmluZCBhIG51bWJlciBvZiBhbiBvYmplY3QncyBtZXRob2RzIHRvIHRoYXQgb2JqZWN0LiBSZW1haW5pbmcgYXJndW1lbnRzXG4gIC8vIGFyZSB0aGUgbWV0aG9kIG5hbWVzIHRvIGJlIGJvdW5kLiBVc2VmdWwgZm9yIGVuc3VyaW5nIHRoYXQgYWxsIGNhbGxiYWNrc1xuICAvLyBkZWZpbmVkIG9uIGFuIG9iamVjdCBiZWxvbmcgdG8gaXQuXG4gIF8uYmluZEFsbCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBpLCBsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoLCBrZXk7XG4gICAgaWYgKGxlbmd0aCA8PSAxKSB0aHJvdyBuZXcgRXJyb3IoJ2JpbmRBbGwgbXVzdCBiZSBwYXNzZWQgZnVuY3Rpb24gbmFtZXMnKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGtleSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgIG9ialtrZXldID0gXy5iaW5kKG9ialtrZXldLCBvYmopO1xuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIC8vIE1lbW9pemUgYW4gZXhwZW5zaXZlIGZ1bmN0aW9uIGJ5IHN0b3JpbmcgaXRzIHJlc3VsdHMuXG4gIF8ubWVtb2l6ZSA9IGZ1bmN0aW9uKGZ1bmMsIGhhc2hlcikge1xuICAgIHZhciBtZW1vaXplID0gZnVuY3Rpb24oa2V5KSB7XG4gICAgICB2YXIgY2FjaGUgPSBtZW1vaXplLmNhY2hlO1xuICAgICAgdmFyIGFkZHJlc3MgPSBoYXNoZXIgPyBoYXNoZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKSA6IGtleTtcbiAgICAgIGlmICghXy5oYXMoY2FjaGUsIGFkZHJlc3MpKSBjYWNoZVthZGRyZXNzXSA9IGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIHJldHVybiBjYWNoZVthZGRyZXNzXTtcbiAgICB9O1xuICAgIG1lbW9pemUuY2FjaGUgPSB7fTtcbiAgICByZXR1cm4gbWVtb2l6ZTtcbiAgfTtcblxuICAvLyBEZWxheXMgYSBmdW5jdGlvbiBmb3IgdGhlIGdpdmVuIG51bWJlciBvZiBtaWxsaXNlY29uZHMsIGFuZCB0aGVuIGNhbGxzXG4gIC8vIGl0IHdpdGggdGhlIGFyZ3VtZW50cyBzdXBwbGllZC5cbiAgXy5kZWxheSA9IGZ1bmN0aW9uKGZ1bmMsIHdhaXQpIHtcbiAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkobnVsbCwgYXJncyk7XG4gICAgfSwgd2FpdCk7XG4gIH07XG5cbiAgLy8gRGVmZXJzIGEgZnVuY3Rpb24sIHNjaGVkdWxpbmcgaXQgdG8gcnVuIGFmdGVyIHRoZSBjdXJyZW50IGNhbGwgc3RhY2sgaGFzXG4gIC8vIGNsZWFyZWQuXG4gIF8uZGVmZXIgPSBmdW5jdGlvbihmdW5jKSB7XG4gICAgcmV0dXJuIF8uZGVsYXkuYXBwbHkoXywgW2Z1bmMsIDFdLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpKTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24sIHRoYXQsIHdoZW4gaW52b2tlZCwgd2lsbCBvbmx5IGJlIHRyaWdnZXJlZCBhdCBtb3N0IG9uY2VcbiAgLy8gZHVyaW5nIGEgZ2l2ZW4gd2luZG93IG9mIHRpbWUuIE5vcm1hbGx5LCB0aGUgdGhyb3R0bGVkIGZ1bmN0aW9uIHdpbGwgcnVuXG4gIC8vIGFzIG11Y2ggYXMgaXQgY2FuLCB3aXRob3V0IGV2ZXIgZ29pbmcgbW9yZSB0aGFuIG9uY2UgcGVyIGB3YWl0YCBkdXJhdGlvbjtcbiAgLy8gYnV0IGlmIHlvdSdkIGxpa2UgdG8gZGlzYWJsZSB0aGUgZXhlY3V0aW9uIG9uIHRoZSBsZWFkaW5nIGVkZ2UsIHBhc3NcbiAgLy8gYHtsZWFkaW5nOiBmYWxzZX1gLiBUbyBkaXNhYmxlIGV4ZWN1dGlvbiBvbiB0aGUgdHJhaWxpbmcgZWRnZSwgZGl0dG8uXG4gIF8udGhyb3R0bGUgPSBmdW5jdGlvbihmdW5jLCB3YWl0LCBvcHRpb25zKSB7XG4gICAgdmFyIGNvbnRleHQsIGFyZ3MsIHJlc3VsdDtcbiAgICB2YXIgdGltZW91dCA9IG51bGw7XG4gICAgdmFyIHByZXZpb3VzID0gMDtcbiAgICBpZiAoIW9wdGlvbnMpIG9wdGlvbnMgPSB7fTtcbiAgICB2YXIgbGF0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgIHByZXZpb3VzID0gb3B0aW9ucy5sZWFkaW5nID09PSBmYWxzZSA/IDAgOiBfLm5vdygpO1xuICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgaWYgKCF0aW1lb3V0KSBjb250ZXh0ID0gYXJncyA9IG51bGw7XG4gICAgfTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbm93ID0gXy5ub3coKTtcbiAgICAgIGlmICghcHJldmlvdXMgJiYgb3B0aW9ucy5sZWFkaW5nID09PSBmYWxzZSkgcHJldmlvdXMgPSBub3c7XG4gICAgICB2YXIgcmVtYWluaW5nID0gd2FpdCAtIChub3cgLSBwcmV2aW91cyk7XG4gICAgICBjb250ZXh0ID0gdGhpcztcbiAgICAgIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICBpZiAocmVtYWluaW5nIDw9IDAgfHwgcmVtYWluaW5nID4gd2FpdCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgICBwcmV2aW91cyA9IG5vdztcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgaWYgKCF0aW1lb3V0KSBjb250ZXh0ID0gYXJncyA9IG51bGw7XG4gICAgICB9IGVsc2UgaWYgKCF0aW1lb3V0ICYmIG9wdGlvbnMudHJhaWxpbmcgIT09IGZhbHNlKSB7XG4gICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCByZW1haW5pbmcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiwgdGhhdCwgYXMgbG9uZyBhcyBpdCBjb250aW51ZXMgdG8gYmUgaW52b2tlZCwgd2lsbCBub3RcbiAgLy8gYmUgdHJpZ2dlcmVkLiBUaGUgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgYWZ0ZXIgaXQgc3RvcHMgYmVpbmcgY2FsbGVkIGZvclxuICAvLyBOIG1pbGxpc2Vjb25kcy4gSWYgYGltbWVkaWF0ZWAgaXMgcGFzc2VkLCB0cmlnZ2VyIHRoZSBmdW5jdGlvbiBvbiB0aGVcbiAgLy8gbGVhZGluZyBlZGdlLCBpbnN0ZWFkIG9mIHRoZSB0cmFpbGluZy5cbiAgXy5kZWJvdW5jZSA9IGZ1bmN0aW9uKGZ1bmMsIHdhaXQsIGltbWVkaWF0ZSkge1xuICAgIHZhciB0aW1lb3V0LCBhcmdzLCBjb250ZXh0LCB0aW1lc3RhbXAsIHJlc3VsdDtcblxuICAgIHZhciBsYXRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGxhc3QgPSBfLm5vdygpIC0gdGltZXN0YW1wO1xuXG4gICAgICBpZiAobGFzdCA8IHdhaXQgJiYgbGFzdCA+IDApIHtcbiAgICAgICAgdGltZW91dCA9IHNldFRpbWVvdXQobGF0ZXIsIHdhaXQgLSBsYXN0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgICBpZiAoIWltbWVkaWF0ZSkge1xuICAgICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICAgICAgaWYgKCF0aW1lb3V0KSBjb250ZXh0ID0gYXJncyA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgY29udGV4dCA9IHRoaXM7XG4gICAgICBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgdGltZXN0YW1wID0gXy5ub3coKTtcbiAgICAgIHZhciBjYWxsTm93ID0gaW1tZWRpYXRlICYmICF0aW1lb3V0O1xuICAgICAgaWYgKCF0aW1lb3V0KSB0aW1lb3V0ID0gc2V0VGltZW91dChsYXRlciwgd2FpdCk7XG4gICAgICBpZiAoY2FsbE5vdykge1xuICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICBjb250ZXh0ID0gYXJncyA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIHRoZSBmaXJzdCBmdW5jdGlvbiBwYXNzZWQgYXMgYW4gYXJndW1lbnQgdG8gdGhlIHNlY29uZCxcbiAgLy8gYWxsb3dpbmcgeW91IHRvIGFkanVzdCBhcmd1bWVudHMsIHJ1biBjb2RlIGJlZm9yZSBhbmQgYWZ0ZXIsIGFuZFxuICAvLyBjb25kaXRpb25hbGx5IGV4ZWN1dGUgdGhlIG9yaWdpbmFsIGZ1bmN0aW9uLlxuICBfLndyYXAgPSBmdW5jdGlvbihmdW5jLCB3cmFwcGVyKSB7XG4gICAgcmV0dXJuIF8ucGFydGlhbCh3cmFwcGVyLCBmdW5jKTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgbmVnYXRlZCB2ZXJzaW9uIG9mIHRoZSBwYXNzZWQtaW4gcHJlZGljYXRlLlxuICBfLm5lZ2F0ZSA9IGZ1bmN0aW9uKHByZWRpY2F0ZSkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAhcHJlZGljYXRlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCBpcyB0aGUgY29tcG9zaXRpb24gb2YgYSBsaXN0IG9mIGZ1bmN0aW9ucywgZWFjaFxuICAvLyBjb25zdW1pbmcgdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgZnVuY3Rpb24gdGhhdCBmb2xsb3dzLlxuICBfLmNvbXBvc2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICB2YXIgc3RhcnQgPSBhcmdzLmxlbmd0aCAtIDE7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGkgPSBzdGFydDtcbiAgICAgIHZhciByZXN1bHQgPSBhcmdzW3N0YXJ0XS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgd2hpbGUgKGktLSkgcmVzdWx0ID0gYXJnc1tpXS5jYWxsKHRoaXMsIHJlc3VsdCk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgd2lsbCBvbmx5IGJlIGV4ZWN1dGVkIGFmdGVyIGJlaW5nIGNhbGxlZCBOIHRpbWVzLlxuICBfLmFmdGVyID0gZnVuY3Rpb24odGltZXMsIGZ1bmMpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoLS10aW1lcyA8IDEpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIH1cbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHdpbGwgb25seSBiZSBleGVjdXRlZCBiZWZvcmUgYmVpbmcgY2FsbGVkIE4gdGltZXMuXG4gIF8uYmVmb3JlID0gZnVuY3Rpb24odGltZXMsIGZ1bmMpIHtcbiAgICB2YXIgbWVtbztcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoLS10aW1lcyA+IDApIHtcbiAgICAgICAgbWVtbyA9IGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZ1bmMgPSBudWxsO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG1lbW87XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB3aWxsIGJlIGV4ZWN1dGVkIGF0IG1vc3Qgb25lIHRpbWUsIG5vIG1hdHRlciBob3dcbiAgLy8gb2Z0ZW4geW91IGNhbGwgaXQuIFVzZWZ1bCBmb3IgbGF6eSBpbml0aWFsaXphdGlvbi5cbiAgXy5vbmNlID0gXy5wYXJ0aWFsKF8uYmVmb3JlLCAyKTtcblxuICAvLyBPYmplY3QgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBSZXRyaWV2ZSB0aGUgbmFtZXMgb2YgYW4gb2JqZWN0J3MgcHJvcGVydGllcy5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYE9iamVjdC5rZXlzYFxuICBfLmtleXMgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIV8uaXNPYmplY3Qob2JqKSkgcmV0dXJuIFtdO1xuICAgIGlmIChuYXRpdmVLZXlzKSByZXR1cm4gbmF0aXZlS2V5cyhvYmopO1xuICAgIHZhciBrZXlzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikgaWYgKF8uaGFzKG9iaiwga2V5KSkga2V5cy5wdXNoKGtleSk7XG4gICAgcmV0dXJuIGtleXM7XG4gIH07XG5cbiAgLy8gUmV0cmlldmUgdGhlIHZhbHVlcyBvZiBhbiBvYmplY3QncyBwcm9wZXJ0aWVzLlxuICBfLnZhbHVlcyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgdmFyIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgIHZhciB2YWx1ZXMgPSBBcnJheShsZW5ndGgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhbHVlc1tpXSA9IG9ialtrZXlzW2ldXTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlcztcbiAgfTtcblxuICAvLyBDb252ZXJ0IGFuIG9iamVjdCBpbnRvIGEgbGlzdCBvZiBgW2tleSwgdmFsdWVdYCBwYWlycy5cbiAgXy5wYWlycyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgdmFyIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgIHZhciBwYWlycyA9IEFycmF5KGxlbmd0aCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgcGFpcnNbaV0gPSBba2V5c1tpXSwgb2JqW2tleXNbaV1dXTtcbiAgICB9XG4gICAgcmV0dXJuIHBhaXJzO1xuICB9O1xuXG4gIC8vIEludmVydCB0aGUga2V5cyBhbmQgdmFsdWVzIG9mIGFuIG9iamVjdC4gVGhlIHZhbHVlcyBtdXN0IGJlIHNlcmlhbGl6YWJsZS5cbiAgXy5pbnZlcnQgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0ga2V5cy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgcmVzdWx0W29ialtrZXlzW2ldXV0gPSBrZXlzW2ldO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFJldHVybiBhIHNvcnRlZCBsaXN0IG9mIHRoZSBmdW5jdGlvbiBuYW1lcyBhdmFpbGFibGUgb24gdGhlIG9iamVjdC5cbiAgLy8gQWxpYXNlZCBhcyBgbWV0aG9kc2BcbiAgXy5mdW5jdGlvbnMgPSBfLm1ldGhvZHMgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgbmFtZXMgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICBpZiAoXy5pc0Z1bmN0aW9uKG9ialtrZXldKSkgbmFtZXMucHVzaChrZXkpO1xuICAgIH1cbiAgICByZXR1cm4gbmFtZXMuc29ydCgpO1xuICB9O1xuXG4gIC8vIEV4dGVuZCBhIGdpdmVuIG9iamVjdCB3aXRoIGFsbCB0aGUgcHJvcGVydGllcyBpbiBwYXNzZWQtaW4gb2JqZWN0KHMpLlxuICBfLmV4dGVuZCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmICghXy5pc09iamVjdChvYmopKSByZXR1cm4gb2JqO1xuICAgIHZhciBzb3VyY2UsIHByb3A7XG4gICAgZm9yICh2YXIgaSA9IDEsIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgc291cmNlID0gYXJndW1lbnRzW2ldO1xuICAgICAgZm9yIChwcm9wIGluIHNvdXJjZSkge1xuICAgICAgICBpZiAoaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIHByb3ApKSB7XG4gICAgICAgICAgICBvYmpbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBSZXR1cm4gYSBjb3B5IG9mIHRoZSBvYmplY3Qgb25seSBjb250YWluaW5nIHRoZSB3aGl0ZWxpc3RlZCBwcm9wZXJ0aWVzLlxuICBfLnBpY2sgPSBmdW5jdGlvbihvYmosIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgdmFyIHJlc3VsdCA9IHt9LCBrZXk7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gcmVzdWx0O1xuICAgIGlmIChfLmlzRnVuY3Rpb24oaXRlcmF0ZWUpKSB7XG4gICAgICBpdGVyYXRlZSA9IGNyZWF0ZUNhbGxiYWNrKGl0ZXJhdGVlLCBjb250ZXh0KTtcbiAgICAgIGZvciAoa2V5IGluIG9iaikge1xuICAgICAgICB2YXIgdmFsdWUgPSBvYmpba2V5XTtcbiAgICAgICAgaWYgKGl0ZXJhdGVlKHZhbHVlLCBrZXksIG9iaikpIHJlc3VsdFtrZXldID0gdmFsdWU7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBrZXlzID0gY29uY2F0LmFwcGx5KFtdLCBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICAgICAgb2JqID0gbmV3IE9iamVjdChvYmopO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGtleXMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAga2V5ID0ga2V5c1tpXTtcbiAgICAgICAgaWYgKGtleSBpbiBvYmopIHJlc3VsdFtrZXldID0gb2JqW2tleV07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgIC8vIFJldHVybiBhIGNvcHkgb2YgdGhlIG9iamVjdCB3aXRob3V0IHRoZSBibGFja2xpc3RlZCBwcm9wZXJ0aWVzLlxuICBfLm9taXQgPSBmdW5jdGlvbihvYmosIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihpdGVyYXRlZSkpIHtcbiAgICAgIGl0ZXJhdGVlID0gXy5uZWdhdGUoaXRlcmF0ZWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIga2V5cyA9IF8ubWFwKGNvbmNhdC5hcHBseShbXSwgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKSwgU3RyaW5nKTtcbiAgICAgIGl0ZXJhdGVlID0gZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICByZXR1cm4gIV8uY29udGFpbnMoa2V5cywga2V5KTtcbiAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiBfLnBpY2sob2JqLCBpdGVyYXRlZSwgY29udGV4dCk7XG4gIH07XG5cbiAgLy8gRmlsbCBpbiBhIGdpdmVuIG9iamVjdCB3aXRoIGRlZmF1bHQgcHJvcGVydGllcy5cbiAgXy5kZWZhdWx0cyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmICghXy5pc09iamVjdChvYmopKSByZXR1cm4gb2JqO1xuICAgIGZvciAodmFyIGkgPSAxLCBsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV07XG4gICAgICBmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuICAgICAgICBpZiAob2JqW3Byb3BdID09PSB2b2lkIDApIG9ialtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBDcmVhdGUgYSAoc2hhbGxvdy1jbG9uZWQpIGR1cGxpY2F0ZSBvZiBhbiBvYmplY3QuXG4gIF8uY2xvbmUgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIV8uaXNPYmplY3Qob2JqKSkgcmV0dXJuIG9iajtcbiAgICByZXR1cm4gXy5pc0FycmF5KG9iaikgPyBvYmouc2xpY2UoKSA6IF8uZXh0ZW5kKHt9LCBvYmopO1xuICB9O1xuXG4gIC8vIEludm9rZXMgaW50ZXJjZXB0b3Igd2l0aCB0aGUgb2JqLCBhbmQgdGhlbiByZXR1cm5zIG9iai5cbiAgLy8gVGhlIHByaW1hcnkgcHVycG9zZSBvZiB0aGlzIG1ldGhvZCBpcyB0byBcInRhcCBpbnRvXCIgYSBtZXRob2QgY2hhaW4sIGluXG4gIC8vIG9yZGVyIHRvIHBlcmZvcm0gb3BlcmF0aW9ucyBvbiBpbnRlcm1lZGlhdGUgcmVzdWx0cyB3aXRoaW4gdGhlIGNoYWluLlxuICBfLnRhcCA9IGZ1bmN0aW9uKG9iaiwgaW50ZXJjZXB0b3IpIHtcbiAgICBpbnRlcmNlcHRvcihvYmopO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gSW50ZXJuYWwgcmVjdXJzaXZlIGNvbXBhcmlzb24gZnVuY3Rpb24gZm9yIGBpc0VxdWFsYC5cbiAgdmFyIGVxID0gZnVuY3Rpb24oYSwgYiwgYVN0YWNrLCBiU3RhY2spIHtcbiAgICAvLyBJZGVudGljYWwgb2JqZWN0cyBhcmUgZXF1YWwuIGAwID09PSAtMGAsIGJ1dCB0aGV5IGFyZW4ndCBpZGVudGljYWwuXG4gICAgLy8gU2VlIHRoZSBbSGFybW9ueSBgZWdhbGAgcHJvcG9zYWxdKGh0dHA6Ly93aWtpLmVjbWFzY3JpcHQub3JnL2Rva3UucGhwP2lkPWhhcm1vbnk6ZWdhbCkuXG4gICAgaWYgKGEgPT09IGIpIHJldHVybiBhICE9PSAwIHx8IDEgLyBhID09PSAxIC8gYjtcbiAgICAvLyBBIHN0cmljdCBjb21wYXJpc29uIGlzIG5lY2Vzc2FyeSBiZWNhdXNlIGBudWxsID09IHVuZGVmaW5lZGAuXG4gICAgaWYgKGEgPT0gbnVsbCB8fCBiID09IG51bGwpIHJldHVybiBhID09PSBiO1xuICAgIC8vIFVud3JhcCBhbnkgd3JhcHBlZCBvYmplY3RzLlxuICAgIGlmIChhIGluc3RhbmNlb2YgXykgYSA9IGEuX3dyYXBwZWQ7XG4gICAgaWYgKGIgaW5zdGFuY2VvZiBfKSBiID0gYi5fd3JhcHBlZDtcbiAgICAvLyBDb21wYXJlIGBbW0NsYXNzXV1gIG5hbWVzLlxuICAgIHZhciBjbGFzc05hbWUgPSB0b1N0cmluZy5jYWxsKGEpO1xuICAgIGlmIChjbGFzc05hbWUgIT09IHRvU3RyaW5nLmNhbGwoYikpIHJldHVybiBmYWxzZTtcbiAgICBzd2l0Y2ggKGNsYXNzTmFtZSkge1xuICAgICAgLy8gU3RyaW5ncywgbnVtYmVycywgcmVndWxhciBleHByZXNzaW9ucywgZGF0ZXMsIGFuZCBib29sZWFucyBhcmUgY29tcGFyZWQgYnkgdmFsdWUuXG4gICAgICBjYXNlICdbb2JqZWN0IFJlZ0V4cF0nOlxuICAgICAgLy8gUmVnRXhwcyBhcmUgY29lcmNlZCB0byBzdHJpbmdzIGZvciBjb21wYXJpc29uIChOb3RlOiAnJyArIC9hL2kgPT09ICcvYS9pJylcbiAgICAgIGNhc2UgJ1tvYmplY3QgU3RyaW5nXSc6XG4gICAgICAgIC8vIFByaW1pdGl2ZXMgYW5kIHRoZWlyIGNvcnJlc3BvbmRpbmcgb2JqZWN0IHdyYXBwZXJzIGFyZSBlcXVpdmFsZW50OyB0aHVzLCBgXCI1XCJgIGlzXG4gICAgICAgIC8vIGVxdWl2YWxlbnQgdG8gYG5ldyBTdHJpbmcoXCI1XCIpYC5cbiAgICAgICAgcmV0dXJuICcnICsgYSA9PT0gJycgKyBiO1xuICAgICAgY2FzZSAnW29iamVjdCBOdW1iZXJdJzpcbiAgICAgICAgLy8gYE5hTmBzIGFyZSBlcXVpdmFsZW50LCBidXQgbm9uLXJlZmxleGl2ZS5cbiAgICAgICAgLy8gT2JqZWN0KE5hTikgaXMgZXF1aXZhbGVudCB0byBOYU5cbiAgICAgICAgaWYgKCthICE9PSArYSkgcmV0dXJuICtiICE9PSArYjtcbiAgICAgICAgLy8gQW4gYGVnYWxgIGNvbXBhcmlzb24gaXMgcGVyZm9ybWVkIGZvciBvdGhlciBudW1lcmljIHZhbHVlcy5cbiAgICAgICAgcmV0dXJuICthID09PSAwID8gMSAvICthID09PSAxIC8gYiA6ICthID09PSArYjtcbiAgICAgIGNhc2UgJ1tvYmplY3QgRGF0ZV0nOlxuICAgICAgY2FzZSAnW29iamVjdCBCb29sZWFuXSc6XG4gICAgICAgIC8vIENvZXJjZSBkYXRlcyBhbmQgYm9vbGVhbnMgdG8gbnVtZXJpYyBwcmltaXRpdmUgdmFsdWVzLiBEYXRlcyBhcmUgY29tcGFyZWQgYnkgdGhlaXJcbiAgICAgICAgLy8gbWlsbGlzZWNvbmQgcmVwcmVzZW50YXRpb25zLiBOb3RlIHRoYXQgaW52YWxpZCBkYXRlcyB3aXRoIG1pbGxpc2Vjb25kIHJlcHJlc2VudGF0aW9uc1xuICAgICAgICAvLyBvZiBgTmFOYCBhcmUgbm90IGVxdWl2YWxlbnQuXG4gICAgICAgIHJldHVybiArYSA9PT0gK2I7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgYSAhPSAnb2JqZWN0JyB8fCB0eXBlb2YgYiAhPSAnb2JqZWN0JykgcmV0dXJuIGZhbHNlO1xuICAgIC8vIEFzc3VtZSBlcXVhbGl0eSBmb3IgY3ljbGljIHN0cnVjdHVyZXMuIFRoZSBhbGdvcml0aG0gZm9yIGRldGVjdGluZyBjeWNsaWNcbiAgICAvLyBzdHJ1Y3R1cmVzIGlzIGFkYXB0ZWQgZnJvbSBFUyA1LjEgc2VjdGlvbiAxNS4xMi4zLCBhYnN0cmFjdCBvcGVyYXRpb24gYEpPYC5cbiAgICB2YXIgbGVuZ3RoID0gYVN0YWNrLmxlbmd0aDtcbiAgICB3aGlsZSAobGVuZ3RoLS0pIHtcbiAgICAgIC8vIExpbmVhciBzZWFyY2guIFBlcmZvcm1hbmNlIGlzIGludmVyc2VseSBwcm9wb3J0aW9uYWwgdG8gdGhlIG51bWJlciBvZlxuICAgICAgLy8gdW5pcXVlIG5lc3RlZCBzdHJ1Y3R1cmVzLlxuICAgICAgaWYgKGFTdGFja1tsZW5ndGhdID09PSBhKSByZXR1cm4gYlN0YWNrW2xlbmd0aF0gPT09IGI7XG4gICAgfVxuICAgIC8vIE9iamVjdHMgd2l0aCBkaWZmZXJlbnQgY29uc3RydWN0b3JzIGFyZSBub3QgZXF1aXZhbGVudCwgYnV0IGBPYmplY3Rgc1xuICAgIC8vIGZyb20gZGlmZmVyZW50IGZyYW1lcyBhcmUuXG4gICAgdmFyIGFDdG9yID0gYS5jb25zdHJ1Y3RvciwgYkN0b3IgPSBiLmNvbnN0cnVjdG9yO1xuICAgIGlmIChcbiAgICAgIGFDdG9yICE9PSBiQ3RvciAmJlxuICAgICAgLy8gSGFuZGxlIE9iamVjdC5jcmVhdGUoeCkgY2FzZXNcbiAgICAgICdjb25zdHJ1Y3RvcicgaW4gYSAmJiAnY29uc3RydWN0b3InIGluIGIgJiZcbiAgICAgICEoXy5pc0Z1bmN0aW9uKGFDdG9yKSAmJiBhQ3RvciBpbnN0YW5jZW9mIGFDdG9yICYmXG4gICAgICAgIF8uaXNGdW5jdGlvbihiQ3RvcikgJiYgYkN0b3IgaW5zdGFuY2VvZiBiQ3RvcilcbiAgICApIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gQWRkIHRoZSBmaXJzdCBvYmplY3QgdG8gdGhlIHN0YWNrIG9mIHRyYXZlcnNlZCBvYmplY3RzLlxuICAgIGFTdGFjay5wdXNoKGEpO1xuICAgIGJTdGFjay5wdXNoKGIpO1xuICAgIHZhciBzaXplLCByZXN1bHQ7XG4gICAgLy8gUmVjdXJzaXZlbHkgY29tcGFyZSBvYmplY3RzIGFuZCBhcnJheXMuXG4gICAgaWYgKGNsYXNzTmFtZSA9PT0gJ1tvYmplY3QgQXJyYXldJykge1xuICAgICAgLy8gQ29tcGFyZSBhcnJheSBsZW5ndGhzIHRvIGRldGVybWluZSBpZiBhIGRlZXAgY29tcGFyaXNvbiBpcyBuZWNlc3NhcnkuXG4gICAgICBzaXplID0gYS5sZW5ndGg7XG4gICAgICByZXN1bHQgPSBzaXplID09PSBiLmxlbmd0aDtcbiAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgLy8gRGVlcCBjb21wYXJlIHRoZSBjb250ZW50cywgaWdub3Jpbmcgbm9uLW51bWVyaWMgcHJvcGVydGllcy5cbiAgICAgICAgd2hpbGUgKHNpemUtLSkge1xuICAgICAgICAgIGlmICghKHJlc3VsdCA9IGVxKGFbc2l6ZV0sIGJbc2l6ZV0sIGFTdGFjaywgYlN0YWNrKSkpIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIERlZXAgY29tcGFyZSBvYmplY3RzLlxuICAgICAgdmFyIGtleXMgPSBfLmtleXMoYSksIGtleTtcbiAgICAgIHNpemUgPSBrZXlzLmxlbmd0aDtcbiAgICAgIC8vIEVuc3VyZSB0aGF0IGJvdGggb2JqZWN0cyBjb250YWluIHRoZSBzYW1lIG51bWJlciBvZiBwcm9wZXJ0aWVzIGJlZm9yZSBjb21wYXJpbmcgZGVlcCBlcXVhbGl0eS5cbiAgICAgIHJlc3VsdCA9IF8ua2V5cyhiKS5sZW5ndGggPT09IHNpemU7XG4gICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgIHdoaWxlIChzaXplLS0pIHtcbiAgICAgICAgICAvLyBEZWVwIGNvbXBhcmUgZWFjaCBtZW1iZXJcbiAgICAgICAgICBrZXkgPSBrZXlzW3NpemVdO1xuICAgICAgICAgIGlmICghKHJlc3VsdCA9IF8uaGFzKGIsIGtleSkgJiYgZXEoYVtrZXldLCBiW2tleV0sIGFTdGFjaywgYlN0YWNrKSkpIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vIFJlbW92ZSB0aGUgZmlyc3Qgb2JqZWN0IGZyb20gdGhlIHN0YWNrIG9mIHRyYXZlcnNlZCBvYmplY3RzLlxuICAgIGFTdGFjay5wb3AoKTtcbiAgICBiU3RhY2sucG9wKCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBQZXJmb3JtIGEgZGVlcCBjb21wYXJpc29uIHRvIGNoZWNrIGlmIHR3byBvYmplY3RzIGFyZSBlcXVhbC5cbiAgXy5pc0VxdWFsID0gZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBlcShhLCBiLCBbXSwgW10pO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gYXJyYXksIHN0cmluZywgb3Igb2JqZWN0IGVtcHR5P1xuICAvLyBBbiBcImVtcHR5XCIgb2JqZWN0IGhhcyBubyBlbnVtZXJhYmxlIG93bi1wcm9wZXJ0aWVzLlxuICBfLmlzRW1wdHkgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiB0cnVlO1xuICAgIGlmIChfLmlzQXJyYXkob2JqKSB8fCBfLmlzU3RyaW5nKG9iaikgfHwgXy5pc0FyZ3VtZW50cyhvYmopKSByZXR1cm4gb2JqLmxlbmd0aCA9PT0gMDtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSBpZiAoXy5oYXMob2JqLCBrZXkpKSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBhIERPTSBlbGVtZW50P1xuICBfLmlzRWxlbWVudCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiAhIShvYmogJiYgb2JqLm5vZGVUeXBlID09PSAxKTtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGFuIGFycmF5P1xuICAvLyBEZWxlZ2F0ZXMgdG8gRUNNQTUncyBuYXRpdmUgQXJyYXkuaXNBcnJheVxuICBfLmlzQXJyYXkgPSBuYXRpdmVJc0FycmF5IHx8IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YXJpYWJsZSBhbiBvYmplY3Q/XG4gIF8uaXNPYmplY3QgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgdHlwZSA9IHR5cGVvZiBvYmo7XG4gICAgcmV0dXJuIHR5cGUgPT09ICdmdW5jdGlvbicgfHwgdHlwZSA9PT0gJ29iamVjdCcgJiYgISFvYmo7XG4gIH07XG5cbiAgLy8gQWRkIHNvbWUgaXNUeXBlIG1ldGhvZHM6IGlzQXJndW1lbnRzLCBpc0Z1bmN0aW9uLCBpc1N0cmluZywgaXNOdW1iZXIsIGlzRGF0ZSwgaXNSZWdFeHAuXG4gIF8uZWFjaChbJ0FyZ3VtZW50cycsICdGdW5jdGlvbicsICdTdHJpbmcnLCAnTnVtYmVyJywgJ0RhdGUnLCAnUmVnRXhwJ10sIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBfWydpcycgKyBuYW1lXSA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgJyArIG5hbWUgKyAnXSc7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gRGVmaW5lIGEgZmFsbGJhY2sgdmVyc2lvbiBvZiB0aGUgbWV0aG9kIGluIGJyb3dzZXJzIChhaGVtLCBJRSksIHdoZXJlXG4gIC8vIHRoZXJlIGlzbid0IGFueSBpbnNwZWN0YWJsZSBcIkFyZ3VtZW50c1wiIHR5cGUuXG4gIGlmICghXy5pc0FyZ3VtZW50cyhhcmd1bWVudHMpKSB7XG4gICAgXy5pc0FyZ3VtZW50cyA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIF8uaGFzKG9iaiwgJ2NhbGxlZScpO1xuICAgIH07XG4gIH1cblxuICAvLyBPcHRpbWl6ZSBgaXNGdW5jdGlvbmAgaWYgYXBwcm9wcmlhdGUuIFdvcmsgYXJvdW5kIGFuIElFIDExIGJ1Zy5cbiAgaWYgKHR5cGVvZiAvLi8gIT09ICdmdW5jdGlvbicpIHtcbiAgICBfLmlzRnVuY3Rpb24gPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiB0eXBlb2Ygb2JqID09ICdmdW5jdGlvbicgfHwgZmFsc2U7XG4gICAgfTtcbiAgfVxuXG4gIC8vIElzIGEgZ2l2ZW4gb2JqZWN0IGEgZmluaXRlIG51bWJlcj9cbiAgXy5pc0Zpbml0ZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBpc0Zpbml0ZShvYmopICYmICFpc05hTihwYXJzZUZsb2F0KG9iaikpO1xuICB9O1xuXG4gIC8vIElzIHRoZSBnaXZlbiB2YWx1ZSBgTmFOYD8gKE5hTiBpcyB0aGUgb25seSBudW1iZXIgd2hpY2ggZG9lcyBub3QgZXF1YWwgaXRzZWxmKS5cbiAgXy5pc05hTiA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBfLmlzTnVtYmVyKG9iaikgJiYgb2JqICE9PSArb2JqO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgYSBib29sZWFuP1xuICBfLmlzQm9vbGVhbiA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IHRydWUgfHwgb2JqID09PSBmYWxzZSB8fCB0b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IEJvb2xlYW5dJztcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGVxdWFsIHRvIG51bGw/XG4gIF8uaXNOdWxsID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gbnVsbDtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhcmlhYmxlIHVuZGVmaW5lZD9cbiAgXy5pc1VuZGVmaW5lZCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IHZvaWQgMDtcbiAgfTtcblxuICAvLyBTaG9ydGN1dCBmdW5jdGlvbiBmb3IgY2hlY2tpbmcgaWYgYW4gb2JqZWN0IGhhcyBhIGdpdmVuIHByb3BlcnR5IGRpcmVjdGx5XG4gIC8vIG9uIGl0c2VsZiAoaW4gb3RoZXIgd29yZHMsIG5vdCBvbiBhIHByb3RvdHlwZSkuXG4gIF8uaGFzID0gZnVuY3Rpb24ob2JqLCBrZXkpIHtcbiAgICByZXR1cm4gb2JqICE9IG51bGwgJiYgaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSk7XG4gIH07XG5cbiAgLy8gVXRpbGl0eSBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBSdW4gVW5kZXJzY29yZS5qcyBpbiAqbm9Db25mbGljdCogbW9kZSwgcmV0dXJuaW5nIHRoZSBgX2AgdmFyaWFibGUgdG8gaXRzXG4gIC8vIHByZXZpb3VzIG93bmVyLiBSZXR1cm5zIGEgcmVmZXJlbmNlIHRvIHRoZSBVbmRlcnNjb3JlIG9iamVjdC5cbiAgXy5ub0NvbmZsaWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgcm9vdC5fID0gcHJldmlvdXNVbmRlcnNjb3JlO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIC8vIEtlZXAgdGhlIGlkZW50aXR5IGZ1bmN0aW9uIGFyb3VuZCBmb3IgZGVmYXVsdCBpdGVyYXRlZXMuXG4gIF8uaWRlbnRpdHkgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfTtcblxuICBfLmNvbnN0YW50ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfTtcbiAgfTtcblxuICBfLm5vb3AgPSBmdW5jdGlvbigpe307XG5cbiAgXy5wcm9wZXJ0eSA9IGZ1bmN0aW9uKGtleSkge1xuICAgIHJldHVybiBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBvYmpba2V5XTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBwcmVkaWNhdGUgZm9yIGNoZWNraW5nIHdoZXRoZXIgYW4gb2JqZWN0IGhhcyBhIGdpdmVuIHNldCBvZiBga2V5OnZhbHVlYCBwYWlycy5cbiAgXy5tYXRjaGVzID0gZnVuY3Rpb24oYXR0cnMpIHtcbiAgICB2YXIgcGFpcnMgPSBfLnBhaXJzKGF0dHJzKSwgbGVuZ3RoID0gcGFpcnMubGVuZ3RoO1xuICAgIHJldHVybiBmdW5jdGlvbihvYmopIHtcbiAgICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuICFsZW5ndGg7XG4gICAgICBvYmogPSBuZXcgT2JqZWN0KG9iaik7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBwYWlyID0gcGFpcnNbaV0sIGtleSA9IHBhaXJbMF07XG4gICAgICAgIGlmIChwYWlyWzFdICE9PSBvYmpba2V5XSB8fCAhKGtleSBpbiBvYmopKSByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJ1biBhIGZ1bmN0aW9uICoqbioqIHRpbWVzLlxuICBfLnRpbWVzID0gZnVuY3Rpb24obiwgaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICB2YXIgYWNjdW0gPSBBcnJheShNYXRoLm1heCgwLCBuKSk7XG4gICAgaXRlcmF0ZWUgPSBjcmVhdGVDYWxsYmFjayhpdGVyYXRlZSwgY29udGV4dCwgMSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpKyspIGFjY3VtW2ldID0gaXRlcmF0ZWUoaSk7XG4gICAgcmV0dXJuIGFjY3VtO1xuICB9O1xuXG4gIC8vIFJldHVybiBhIHJhbmRvbSBpbnRlZ2VyIGJldHdlZW4gbWluIGFuZCBtYXggKGluY2x1c2l2ZSkuXG4gIF8ucmFuZG9tID0gZnVuY3Rpb24obWluLCBtYXgpIHtcbiAgICBpZiAobWF4ID09IG51bGwpIHtcbiAgICAgIG1heCA9IG1pbjtcbiAgICAgIG1pbiA9IDA7XG4gICAgfVxuICAgIHJldHVybiBtaW4gKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpO1xuICB9O1xuXG4gIC8vIEEgKHBvc3NpYmx5IGZhc3Rlcikgd2F5IHRvIGdldCB0aGUgY3VycmVudCB0aW1lc3RhbXAgYXMgYW4gaW50ZWdlci5cbiAgXy5ub3cgPSBEYXRlLm5vdyB8fCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gIH07XG5cbiAgIC8vIExpc3Qgb2YgSFRNTCBlbnRpdGllcyBmb3IgZXNjYXBpbmcuXG4gIHZhciBlc2NhcGVNYXAgPSB7XG4gICAgJyYnOiAnJmFtcDsnLFxuICAgICc8JzogJyZsdDsnLFxuICAgICc+JzogJyZndDsnLFxuICAgICdcIic6ICcmcXVvdDsnLFxuICAgIFwiJ1wiOiAnJiN4Mjc7JyxcbiAgICAnYCc6ICcmI3g2MDsnXG4gIH07XG4gIHZhciB1bmVzY2FwZU1hcCA9IF8uaW52ZXJ0KGVzY2FwZU1hcCk7XG5cbiAgLy8gRnVuY3Rpb25zIGZvciBlc2NhcGluZyBhbmQgdW5lc2NhcGluZyBzdHJpbmdzIHRvL2Zyb20gSFRNTCBpbnRlcnBvbGF0aW9uLlxuICB2YXIgY3JlYXRlRXNjYXBlciA9IGZ1bmN0aW9uKG1hcCkge1xuICAgIHZhciBlc2NhcGVyID0gZnVuY3Rpb24obWF0Y2gpIHtcbiAgICAgIHJldHVybiBtYXBbbWF0Y2hdO1xuICAgIH07XG4gICAgLy8gUmVnZXhlcyBmb3IgaWRlbnRpZnlpbmcgYSBrZXkgdGhhdCBuZWVkcyB0byBiZSBlc2NhcGVkXG4gICAgdmFyIHNvdXJjZSA9ICcoPzonICsgXy5rZXlzKG1hcCkuam9pbignfCcpICsgJyknO1xuICAgIHZhciB0ZXN0UmVnZXhwID0gUmVnRXhwKHNvdXJjZSk7XG4gICAgdmFyIHJlcGxhY2VSZWdleHAgPSBSZWdFeHAoc291cmNlLCAnZycpO1xuICAgIHJldHVybiBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICAgIHN0cmluZyA9IHN0cmluZyA9PSBudWxsID8gJycgOiAnJyArIHN0cmluZztcbiAgICAgIHJldHVybiB0ZXN0UmVnZXhwLnRlc3Qoc3RyaW5nKSA/IHN0cmluZy5yZXBsYWNlKHJlcGxhY2VSZWdleHAsIGVzY2FwZXIpIDogc3RyaW5nO1xuICAgIH07XG4gIH07XG4gIF8uZXNjYXBlID0gY3JlYXRlRXNjYXBlcihlc2NhcGVNYXApO1xuICBfLnVuZXNjYXBlID0gY3JlYXRlRXNjYXBlcih1bmVzY2FwZU1hcCk7XG5cbiAgLy8gSWYgdGhlIHZhbHVlIG9mIHRoZSBuYW1lZCBgcHJvcGVydHlgIGlzIGEgZnVuY3Rpb24gdGhlbiBpbnZva2UgaXQgd2l0aCB0aGVcbiAgLy8gYG9iamVjdGAgYXMgY29udGV4dDsgb3RoZXJ3aXNlLCByZXR1cm4gaXQuXG4gIF8ucmVzdWx0ID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkge1xuICAgIGlmIChvYmplY3QgPT0gbnVsbCkgcmV0dXJuIHZvaWQgMDtcbiAgICB2YXIgdmFsdWUgPSBvYmplY3RbcHJvcGVydHldO1xuICAgIHJldHVybiBfLmlzRnVuY3Rpb24odmFsdWUpID8gb2JqZWN0W3Byb3BlcnR5XSgpIDogdmFsdWU7XG4gIH07XG5cbiAgLy8gR2VuZXJhdGUgYSB1bmlxdWUgaW50ZWdlciBpZCAodW5pcXVlIHdpdGhpbiB0aGUgZW50aXJlIGNsaWVudCBzZXNzaW9uKS5cbiAgLy8gVXNlZnVsIGZvciB0ZW1wb3JhcnkgRE9NIGlkcy5cbiAgdmFyIGlkQ291bnRlciA9IDA7XG4gIF8udW5pcXVlSWQgPSBmdW5jdGlvbihwcmVmaXgpIHtcbiAgICB2YXIgaWQgPSArK2lkQ291bnRlciArICcnO1xuICAgIHJldHVybiBwcmVmaXggPyBwcmVmaXggKyBpZCA6IGlkO1xuICB9O1xuXG4gIC8vIEJ5IGRlZmF1bHQsIFVuZGVyc2NvcmUgdXNlcyBFUkItc3R5bGUgdGVtcGxhdGUgZGVsaW1pdGVycywgY2hhbmdlIHRoZVxuICAvLyBmb2xsb3dpbmcgdGVtcGxhdGUgc2V0dGluZ3MgdG8gdXNlIGFsdGVybmF0aXZlIGRlbGltaXRlcnMuXG4gIF8udGVtcGxhdGVTZXR0aW5ncyA9IHtcbiAgICBldmFsdWF0ZSAgICA6IC88JShbXFxzXFxTXSs/KSU+L2csXG4gICAgaW50ZXJwb2xhdGUgOiAvPCU9KFtcXHNcXFNdKz8pJT4vZyxcbiAgICBlc2NhcGUgICAgICA6IC88JS0oW1xcc1xcU10rPyklPi9nXG4gIH07XG5cbiAgLy8gV2hlbiBjdXN0b21pemluZyBgdGVtcGxhdGVTZXR0aW5nc2AsIGlmIHlvdSBkb24ndCB3YW50IHRvIGRlZmluZSBhblxuICAvLyBpbnRlcnBvbGF0aW9uLCBldmFsdWF0aW9uIG9yIGVzY2FwaW5nIHJlZ2V4LCB3ZSBuZWVkIG9uZSB0aGF0IGlzXG4gIC8vIGd1YXJhbnRlZWQgbm90IHRvIG1hdGNoLlxuICB2YXIgbm9NYXRjaCA9IC8oLileLztcblxuICAvLyBDZXJ0YWluIGNoYXJhY3RlcnMgbmVlZCB0byBiZSBlc2NhcGVkIHNvIHRoYXQgdGhleSBjYW4gYmUgcHV0IGludG8gYVxuICAvLyBzdHJpbmcgbGl0ZXJhbC5cbiAgdmFyIGVzY2FwZXMgPSB7XG4gICAgXCInXCI6ICAgICAgXCInXCIsXG4gICAgJ1xcXFwnOiAgICAgJ1xcXFwnLFxuICAgICdcXHInOiAgICAgJ3InLFxuICAgICdcXG4nOiAgICAgJ24nLFxuICAgICdcXHUyMDI4JzogJ3UyMDI4JyxcbiAgICAnXFx1MjAyOSc6ICd1MjAyOSdcbiAgfTtcblxuICB2YXIgZXNjYXBlciA9IC9cXFxcfCd8XFxyfFxcbnxcXHUyMDI4fFxcdTIwMjkvZztcblxuICB2YXIgZXNjYXBlQ2hhciA9IGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgcmV0dXJuICdcXFxcJyArIGVzY2FwZXNbbWF0Y2hdO1xuICB9O1xuXG4gIC8vIEphdmFTY3JpcHQgbWljcm8tdGVtcGxhdGluZywgc2ltaWxhciB0byBKb2huIFJlc2lnJ3MgaW1wbGVtZW50YXRpb24uXG4gIC8vIFVuZGVyc2NvcmUgdGVtcGxhdGluZyBoYW5kbGVzIGFyYml0cmFyeSBkZWxpbWl0ZXJzLCBwcmVzZXJ2ZXMgd2hpdGVzcGFjZSxcbiAgLy8gYW5kIGNvcnJlY3RseSBlc2NhcGVzIHF1b3RlcyB3aXRoaW4gaW50ZXJwb2xhdGVkIGNvZGUuXG4gIC8vIE5COiBgb2xkU2V0dGluZ3NgIG9ubHkgZXhpc3RzIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eS5cbiAgXy50ZW1wbGF0ZSA9IGZ1bmN0aW9uKHRleHQsIHNldHRpbmdzLCBvbGRTZXR0aW5ncykge1xuICAgIGlmICghc2V0dGluZ3MgJiYgb2xkU2V0dGluZ3MpIHNldHRpbmdzID0gb2xkU2V0dGluZ3M7XG4gICAgc2V0dGluZ3MgPSBfLmRlZmF1bHRzKHt9LCBzZXR0aW5ncywgXy50ZW1wbGF0ZVNldHRpbmdzKTtcblxuICAgIC8vIENvbWJpbmUgZGVsaW1pdGVycyBpbnRvIG9uZSByZWd1bGFyIGV4cHJlc3Npb24gdmlhIGFsdGVybmF0aW9uLlxuICAgIHZhciBtYXRjaGVyID0gUmVnRXhwKFtcbiAgICAgIChzZXR0aW5ncy5lc2NhcGUgfHwgbm9NYXRjaCkuc291cmNlLFxuICAgICAgKHNldHRpbmdzLmludGVycG9sYXRlIHx8IG5vTWF0Y2gpLnNvdXJjZSxcbiAgICAgIChzZXR0aW5ncy5ldmFsdWF0ZSB8fCBub01hdGNoKS5zb3VyY2VcbiAgICBdLmpvaW4oJ3wnKSArICd8JCcsICdnJyk7XG5cbiAgICAvLyBDb21waWxlIHRoZSB0ZW1wbGF0ZSBzb3VyY2UsIGVzY2FwaW5nIHN0cmluZyBsaXRlcmFscyBhcHByb3ByaWF0ZWx5LlxuICAgIHZhciBpbmRleCA9IDA7XG4gICAgdmFyIHNvdXJjZSA9IFwiX19wKz0nXCI7XG4gICAgdGV4dC5yZXBsYWNlKG1hdGNoZXIsIGZ1bmN0aW9uKG1hdGNoLCBlc2NhcGUsIGludGVycG9sYXRlLCBldmFsdWF0ZSwgb2Zmc2V0KSB7XG4gICAgICBzb3VyY2UgKz0gdGV4dC5zbGljZShpbmRleCwgb2Zmc2V0KS5yZXBsYWNlKGVzY2FwZXIsIGVzY2FwZUNoYXIpO1xuICAgICAgaW5kZXggPSBvZmZzZXQgKyBtYXRjaC5sZW5ndGg7XG5cbiAgICAgIGlmIChlc2NhcGUpIHtcbiAgICAgICAgc291cmNlICs9IFwiJytcXG4oKF9fdD0oXCIgKyBlc2NhcGUgKyBcIikpPT1udWxsPycnOl8uZXNjYXBlKF9fdCkpK1xcbidcIjtcbiAgICAgIH0gZWxzZSBpZiAoaW50ZXJwb2xhdGUpIHtcbiAgICAgICAgc291cmNlICs9IFwiJytcXG4oKF9fdD0oXCIgKyBpbnRlcnBvbGF0ZSArIFwiKSk9PW51bGw/Jyc6X190KStcXG4nXCI7XG4gICAgICB9IGVsc2UgaWYgKGV2YWx1YXRlKSB7XG4gICAgICAgIHNvdXJjZSArPSBcIic7XFxuXCIgKyBldmFsdWF0ZSArIFwiXFxuX19wKz0nXCI7XG4gICAgICB9XG5cbiAgICAgIC8vIEFkb2JlIFZNcyBuZWVkIHRoZSBtYXRjaCByZXR1cm5lZCB0byBwcm9kdWNlIHRoZSBjb3JyZWN0IG9mZmVzdC5cbiAgICAgIHJldHVybiBtYXRjaDtcbiAgICB9KTtcbiAgICBzb3VyY2UgKz0gXCInO1xcblwiO1xuXG4gICAgLy8gSWYgYSB2YXJpYWJsZSBpcyBub3Qgc3BlY2lmaWVkLCBwbGFjZSBkYXRhIHZhbHVlcyBpbiBsb2NhbCBzY29wZS5cbiAgICBpZiAoIXNldHRpbmdzLnZhcmlhYmxlKSBzb3VyY2UgPSAnd2l0aChvYmp8fHt9KXtcXG4nICsgc291cmNlICsgJ31cXG4nO1xuXG4gICAgc291cmNlID0gXCJ2YXIgX190LF9fcD0nJyxfX2o9QXJyYXkucHJvdG90eXBlLmpvaW4sXCIgK1xuICAgICAgXCJwcmludD1mdW5jdGlvbigpe19fcCs9X19qLmNhbGwoYXJndW1lbnRzLCcnKTt9O1xcblwiICtcbiAgICAgIHNvdXJjZSArICdyZXR1cm4gX19wO1xcbic7XG5cbiAgICB0cnkge1xuICAgICAgdmFyIHJlbmRlciA9IG5ldyBGdW5jdGlvbihzZXR0aW5ncy52YXJpYWJsZSB8fCAnb2JqJywgJ18nLCBzb3VyY2UpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGUuc291cmNlID0gc291cmNlO1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG5cbiAgICB2YXIgdGVtcGxhdGUgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgICByZXR1cm4gcmVuZGVyLmNhbGwodGhpcywgZGF0YSwgXyk7XG4gICAgfTtcblxuICAgIC8vIFByb3ZpZGUgdGhlIGNvbXBpbGVkIHNvdXJjZSBhcyBhIGNvbnZlbmllbmNlIGZvciBwcmVjb21waWxhdGlvbi5cbiAgICB2YXIgYXJndW1lbnQgPSBzZXR0aW5ncy52YXJpYWJsZSB8fCAnb2JqJztcbiAgICB0ZW1wbGF0ZS5zb3VyY2UgPSAnZnVuY3Rpb24oJyArIGFyZ3VtZW50ICsgJyl7XFxuJyArIHNvdXJjZSArICd9JztcblxuICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgfTtcblxuICAvLyBBZGQgYSBcImNoYWluXCIgZnVuY3Rpb24uIFN0YXJ0IGNoYWluaW5nIGEgd3JhcHBlZCBVbmRlcnNjb3JlIG9iamVjdC5cbiAgXy5jaGFpbiA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBpbnN0YW5jZSA9IF8ob2JqKTtcbiAgICBpbnN0YW5jZS5fY2hhaW4gPSB0cnVlO1xuICAgIHJldHVybiBpbnN0YW5jZTtcbiAgfTtcblxuICAvLyBPT1BcbiAgLy8gLS0tLS0tLS0tLS0tLS0tXG4gIC8vIElmIFVuZGVyc2NvcmUgaXMgY2FsbGVkIGFzIGEgZnVuY3Rpb24sIGl0IHJldHVybnMgYSB3cmFwcGVkIG9iamVjdCB0aGF0XG4gIC8vIGNhbiBiZSB1c2VkIE9PLXN0eWxlLiBUaGlzIHdyYXBwZXIgaG9sZHMgYWx0ZXJlZCB2ZXJzaW9ucyBvZiBhbGwgdGhlXG4gIC8vIHVuZGVyc2NvcmUgZnVuY3Rpb25zLiBXcmFwcGVkIG9iamVjdHMgbWF5IGJlIGNoYWluZWQuXG5cbiAgLy8gSGVscGVyIGZ1bmN0aW9uIHRvIGNvbnRpbnVlIGNoYWluaW5nIGludGVybWVkaWF0ZSByZXN1bHRzLlxuICB2YXIgcmVzdWx0ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NoYWluID8gXyhvYmopLmNoYWluKCkgOiBvYmo7XG4gIH07XG5cbiAgLy8gQWRkIHlvdXIgb3duIGN1c3RvbSBmdW5jdGlvbnMgdG8gdGhlIFVuZGVyc2NvcmUgb2JqZWN0LlxuICBfLm1peGluID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgXy5lYWNoKF8uZnVuY3Rpb25zKG9iaiksIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHZhciBmdW5jID0gX1tuYW1lXSA9IG9ialtuYW1lXTtcbiAgICAgIF8ucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBhcmdzID0gW3RoaXMuX3dyYXBwZWRdO1xuICAgICAgICBwdXNoLmFwcGx5KGFyZ3MsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiByZXN1bHQuY2FsbCh0aGlzLCBmdW5jLmFwcGx5KF8sIGFyZ3MpKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gQWRkIGFsbCBvZiB0aGUgVW5kZXJzY29yZSBmdW5jdGlvbnMgdG8gdGhlIHdyYXBwZXIgb2JqZWN0LlxuICBfLm1peGluKF8pO1xuXG4gIC8vIEFkZCBhbGwgbXV0YXRvciBBcnJheSBmdW5jdGlvbnMgdG8gdGhlIHdyYXBwZXIuXG4gIF8uZWFjaChbJ3BvcCcsICdwdXNoJywgJ3JldmVyc2UnLCAnc2hpZnQnLCAnc29ydCcsICdzcGxpY2UnLCAndW5zaGlmdCddLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIG1ldGhvZCA9IEFycmF5UHJvdG9bbmFtZV07XG4gICAgXy5wcm90b3R5cGVbbmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBvYmogPSB0aGlzLl93cmFwcGVkO1xuICAgICAgbWV0aG9kLmFwcGx5KG9iaiwgYXJndW1lbnRzKTtcbiAgICAgIGlmICgobmFtZSA9PT0gJ3NoaWZ0JyB8fCBuYW1lID09PSAnc3BsaWNlJykgJiYgb2JqLmxlbmd0aCA9PT0gMCkgZGVsZXRlIG9ialswXTtcbiAgICAgIHJldHVybiByZXN1bHQuY2FsbCh0aGlzLCBvYmopO1xuICAgIH07XG4gIH0pO1xuXG4gIC8vIEFkZCBhbGwgYWNjZXNzb3IgQXJyYXkgZnVuY3Rpb25zIHRvIHRoZSB3cmFwcGVyLlxuICBfLmVhY2goWydjb25jYXQnLCAnam9pbicsICdzbGljZSddLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIG1ldGhvZCA9IEFycmF5UHJvdG9bbmFtZV07XG4gICAgXy5wcm90b3R5cGVbbmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiByZXN1bHQuY2FsbCh0aGlzLCBtZXRob2QuYXBwbHkodGhpcy5fd3JhcHBlZCwgYXJndW1lbnRzKSk7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gRXh0cmFjdHMgdGhlIHJlc3VsdCBmcm9tIGEgd3JhcHBlZCBhbmQgY2hhaW5lZCBvYmplY3QuXG4gIF8ucHJvdG90eXBlLnZhbHVlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3dyYXBwZWQ7XG4gIH07XG5cbiAgLy8gQU1EIHJlZ2lzdHJhdGlvbiBoYXBwZW5zIGF0IHRoZSBlbmQgZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBBTUQgbG9hZGVyc1xuICAvLyB0aGF0IG1heSBub3QgZW5mb3JjZSBuZXh0LXR1cm4gc2VtYW50aWNzIG9uIG1vZHVsZXMuIEV2ZW4gdGhvdWdoIGdlbmVyYWxcbiAgLy8gcHJhY3RpY2UgZm9yIEFNRCByZWdpc3RyYXRpb24gaXMgdG8gYmUgYW5vbnltb3VzLCB1bmRlcnNjb3JlIHJlZ2lzdGVyc1xuICAvLyBhcyBhIG5hbWVkIG1vZHVsZSBiZWNhdXNlLCBsaWtlIGpRdWVyeSwgaXQgaXMgYSBiYXNlIGxpYnJhcnkgdGhhdCBpc1xuICAvLyBwb3B1bGFyIGVub3VnaCB0byBiZSBidW5kbGVkIGluIGEgdGhpcmQgcGFydHkgbGliLCBidXQgbm90IGJlIHBhcnQgb2ZcbiAgLy8gYW4gQU1EIGxvYWQgcmVxdWVzdC4gVGhvc2UgY2FzZXMgY291bGQgZ2VuZXJhdGUgYW4gZXJyb3Igd2hlbiBhblxuICAvLyBhbm9ueW1vdXMgZGVmaW5lKCkgaXMgY2FsbGVkIG91dHNpZGUgb2YgYSBsb2FkZXIgcmVxdWVzdC5cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIGRlZmluZSgndW5kZXJzY29yZScsIFtdLCBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBfO1xuICAgIH0pO1xuICB9XG59LmNhbGwodGhpcykpO1xuIiwiLypcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMDgtMjAwOSwgRmVsaXggQnJ1bnMgPGZlbGl4YnJ1bnNAd2ViLmRlPlxuICpcbiAqL1xuXG4vKiBTZXQgYW4gb2JqZWN0IG9uIGEgU3RvcmFnZSBvYmplY3QuICovXG5TdG9yYWdlLnByb3RvdHlwZS5zZXRPYmplY3QgPSBmdW5jdGlvbihrZXksIHZhbHVlKXtcblx0dGhpcy5zZXRJdGVtKGtleSwgSlNPTi5zdHJpbmdpZnkodmFsdWUpKTtcbn1cblxuLyogR2V0IGFuIG9iamVjdCBmcm9tIGEgU3RvcmFnZSBvYmplY3QuICovXG5TdG9yYWdlLnByb3RvdHlwZS5nZXRPYmplY3QgPSBmdW5jdGlvbihrZXkpe1xuXHR2YXIgaXRlbSA9IHRoaXMuZ2V0SXRlbShrZXkpO1xuXG5cdHJldHVybiBKU09OLnBhcnNlKGl0ZW0pO1xufVxuXG4vKiBDcmVhdGVzIGEgbmV3IGNhY2hlIG9iamVjdC4gKi9cbmZ1bmN0aW9uIExhc3RGTUNhY2hlKCl7XG5cdC8qIEV4cGlyYXRpb24gdGltZXMuICovXG5cdHZhciBNSU5VVEUgPSAgICAgICAgICA2MDtcblx0dmFyIEhPVVIgICA9IE1JTlVURSAqIDYwO1xuXHR2YXIgREFZICAgID0gSE9VUiAgICogMjQ7XG5cdHZhciBXRUVLICAgPSBEQVkgICAgKiAgNztcblx0dmFyIE1PTlRIICA9IFdFRUsgICAqICA0LjM0ODEyMTQxO1xuXHR2YXIgWUVBUiAgID0gTU9OVEggICogMTI7XG5cblx0LyogTWV0aG9kcyB3aXRoIHdlZWtseSBleHBpcmF0aW9uLiAqL1xuXHR2YXIgd2Vla2x5TWV0aG9kcyA9IFtcblx0XHQnYXJ0aXN0LmdldFNpbWlsYXInLFxuXHRcdCd0YWcuZ2V0U2ltaWxhcicsXG5cdFx0J3RyYWNrLmdldFNpbWlsYXInLFxuXHRcdCdhcnRpc3QuZ2V0VG9wQWxidW1zJyxcblx0XHQnYXJ0aXN0LmdldFRvcFRyYWNrcycsXG5cdFx0J2dlby5nZXRUb3BBcnRpc3RzJyxcblx0XHQnZ2VvLmdldFRvcFRyYWNrcycsXG5cdFx0J3RhZy5nZXRUb3BBbGJ1bXMnLFxuXHRcdCd0YWcuZ2V0VG9wQXJ0aXN0cycsXG5cdFx0J3RhZy5nZXRUb3BUYWdzJyxcblx0XHQndGFnLmdldFRvcFRyYWNrcycsXG5cdFx0J3VzZXIuZ2V0VG9wQWxidW1zJyxcblx0XHQndXNlci5nZXRUb3BBcnRpc3RzJyxcblx0XHQndXNlci5nZXRUb3BUYWdzJyxcblx0XHQndXNlci5nZXRUb3BUcmFja3MnXG5cdF07XG5cblx0LyogTmFtZSBmb3IgdGhpcyBjYWNoZS4gKi9cblx0dmFyIG5hbWUgPSAnbGFzdGZtJztcblxuXHQvKiBDcmVhdGUgY2FjaGUgaWYgaXQgZG9lc24ndCBleGlzdCB5ZXQuICovXG5cdGlmKGxvY2FsU3RvcmFnZS5nZXRPYmplY3QobmFtZSkgPT0gbnVsbCl7XG5cdFx0bG9jYWxTdG9yYWdlLnNldE9iamVjdChuYW1lLCB7fSk7XG5cdH1cblxuXHQvKiBHZXQgZXhwaXJhdGlvbiB0aW1lIGZvciBnaXZlbiBwYXJhbWV0ZXJzLiAqL1xuXHR0aGlzLmdldEV4cGlyYXRpb25UaW1lID0gZnVuY3Rpb24ocGFyYW1zKXtcblx0XHR2YXIgbWV0aG9kID0gcGFyYW1zLm1ldGhvZDtcblxuXHRcdGlmKCgvV2Vla2x5LykudGVzdChtZXRob2QpICYmICEoL0xpc3QvKS50ZXN0KG1ldGhvZCkpe1xuXHRcdFx0aWYodHlwZW9mKHBhcmFtcy50bykgIT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mKHBhcmFtcy5mcm9tKSAhPSAndW5kZWZpbmVkJyl7XG5cdFx0XHRcdHJldHVybiBZRUFSO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZXtcblx0XHRcdFx0cmV0dXJuIFdFRUs7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Zm9yKHZhciBrZXkgaW4gdGhpcy53ZWVrbHlNZXRob2RzKXtcblx0XHRcdGlmKG1ldGhvZCA9PSB0aGlzLndlZWtseU1ldGhvZHNba2V5XSl7XG5cdFx0XHRcdHJldHVybiBXRUVLO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiAtMTtcblx0fTtcblxuXHQvKiBDaGVjayBpZiB0aGlzIGNhY2hlIGNvbnRhaW5zIHNwZWNpZmljIGRhdGEuICovXG5cdHRoaXMuY29udGFpbnMgPSBmdW5jdGlvbihoYXNoKXtcblx0XHRyZXR1cm4gdHlwZW9mKGxvY2FsU3RvcmFnZS5nZXRPYmplY3QobmFtZSlbaGFzaF0pICE9ICd1bmRlZmluZWQnICYmXG5cdFx0XHR0eXBlb2YobG9jYWxTdG9yYWdlLmdldE9iamVjdChuYW1lKVtoYXNoXS5kYXRhKSAhPSAndW5kZWZpbmVkJztcblx0fTtcblxuXHQvKiBMb2FkIGRhdGEgZnJvbSB0aGlzIGNhY2hlLiAqL1xuXHR0aGlzLmxvYWQgPSBmdW5jdGlvbihoYXNoKXtcblx0XHRyZXR1cm4gbG9jYWxTdG9yYWdlLmdldE9iamVjdChuYW1lKVtoYXNoXS5kYXRhO1xuXHR9O1xuXG5cdC8qIFJlbW92ZSBkYXRhIGZyb20gdGhpcyBjYWNoZS4gKi9cblx0dGhpcy5yZW1vdmUgPSBmdW5jdGlvbihoYXNoKXtcblx0XHR2YXIgb2JqZWN0ID0gbG9jYWxTdG9yYWdlLmdldE9iamVjdChuYW1lKTtcblxuXHRcdG9iamVjdFtoYXNoXSA9IHVuZGVmaW5lZDtcblxuXHRcdGxvY2FsU3RvcmFnZS5zZXRPYmplY3QobmFtZSwgb2JqZWN0KTtcblx0fTtcblxuXHQvKiBTdG9yZSBkYXRhIGluIHRoaXMgY2FjaGUgd2l0aCBhIGdpdmVuIGV4cGlyYXRpb24gdGltZS4gKi9cblx0dGhpcy5zdG9yZSA9IGZ1bmN0aW9uKGhhc2gsIGRhdGEsIGV4cGlyYXRpb24pe1xuXHRcdHZhciBvYmplY3QgPSBsb2NhbFN0b3JhZ2UuZ2V0T2JqZWN0KG5hbWUpO1xuXHRcdHZhciB0aW1lICAgPSBNYXRoLnJvdW5kKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC8gMTAwMCk7XG5cblx0XHRvYmplY3RbaGFzaF0gPSB7XG5cdFx0XHRkYXRhICAgICAgIDogZGF0YSxcblx0XHRcdGV4cGlyYXRpb24gOiB0aW1lICsgZXhwaXJhdGlvblxuXHRcdH07XG5cblx0XHRsb2NhbFN0b3JhZ2Uuc2V0T2JqZWN0KG5hbWUsIG9iamVjdCk7XG5cdH07XG5cblx0LyogQ2hlY2sgaWYgc29tZSBzcGVjaWZpYyBkYXRhIGV4cGlyZWQuICovXG5cdHRoaXMuaXNFeHBpcmVkID0gZnVuY3Rpb24oaGFzaCl7XG5cdFx0dmFyIG9iamVjdCA9IGxvY2FsU3RvcmFnZS5nZXRPYmplY3QobmFtZSk7XG5cdFx0dmFyIHRpbWUgICA9IE1hdGgucm91bmQobmV3IERhdGUoKS5nZXRUaW1lKCkgLyAxMDAwKTtcblxuXHRcdGlmKHRpbWUgPiBvYmplY3RbaGFzaF0uZXhwaXJhdGlvbil7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH07XG5cblx0LyogQ2xlYXIgdGhpcyBjYWNoZS4gKi9cblx0dGhpcy5jbGVhciA9IGZ1bmN0aW9uKCl7XG5cdFx0bG9jYWxTdG9yYWdlLnNldE9iamVjdChuYW1lLCB7fSk7XG5cdH07XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IExhc3RGTUNhY2hlO1xuIiwiLypcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMDgtMjAxMCwgRmVsaXggQnJ1bnMgPGZlbGl4YnJ1bnNAd2ViLmRlPlxuICpcbiAqL1xuXG52YXIgY3J5cHRvID0gcmVxdWlyZSgnY3J5cHRvJyk7XG52YXIgQ2FjaGUgPSByZXF1aXJlKCcuL2NhY2hlLmpzJyk7XG5cbmZ1bmN0aW9uIG1kNShkYXRhKSB7XG4gICAgcmV0dXJuIGNyeXB0by5jcmVhdGVIYXNoKCdtZDUnKS51cGRhdGUoZGF0YSkuZGlnZXN0KCdoZXgnKTtcbn1cblxuZnVuY3Rpb24gTGFzdEZNKG9wdGlvbnMpe1xuICAgIC8qIFNldCBkZWZhdWx0IHZhbHVlcyBmb3IgcmVxdWlyZWQgb3B0aW9ucy4gKi9cbiAgICB2YXIgYXBpS2V5ICAgID0gb3B0aW9ucy5hcGlLZXkgICAgfHwgJyc7XG4gICAgdmFyIGFwaVNlY3JldCA9IG9wdGlvbnMuYXBpU2VjcmV0IHx8ICcnO1xuICAgIHZhciBhcGlVcmwgICAgPSBvcHRpb25zLmFwaVVybCAgICB8fCAnaHR0cDovL3dzLmF1ZGlvc2Nyb2JibGVyLmNvbS8yLjAvJztcbiAgICB2YXIgY2FjaGUgICAgID0gb3B0aW9ucy5jYWNoZSAgICAgfHwgdW5kZWZpbmVkO1xuXG4gICAgLyogU2V0IEFQSSBrZXkuICovXG4gICAgdGhpcy5zZXRBcGlLZXkgPSBmdW5jdGlvbihfYXBpS2V5KXtcbiAgICAgICAgYXBpS2V5ID0gX2FwaUtleTtcbiAgICB9O1xuXG4gICAgLyogU2V0IEFQSSBrZXkuICovXG4gICAgdGhpcy5zZXRBcGlTZWNyZXQgPSBmdW5jdGlvbihfYXBpU2VjcmV0KXtcbiAgICAgICAgYXBpU2VjcmV0ID0gX2FwaVNlY3JldDtcbiAgICB9O1xuXG4gICAgLyogU2V0IEFQSSBVUkwuICovXG4gICAgdGhpcy5zZXRBcGlVcmwgPSBmdW5jdGlvbihfYXBpVXJsKXtcbiAgICAgICAgYXBpVXJsID0gX2FwaVVybDtcbiAgICB9O1xuXG4gICAgLyogU2V0IGNhY2hlLiAqL1xuICAgIHRoaXMuc2V0Q2FjaGUgPSBmdW5jdGlvbihfY2FjaGUpe1xuICAgICAgICBjYWNoZSA9IF9jYWNoZTtcbiAgICB9O1xuXG4gICAgLyogU2V0IHRoZSBKU09OUCBjYWxsYmFjayBpZGVudGlmaWVyIGNvdW50ZXIuIFRoaXMgaXMgdXNlZCB0byBlbnN1cmUgdGhlIGNhbGxiYWNrcyBhcmUgdW5pcXVlICovXG4gICAgdmFyIGpzb25wQ291bnRlciA9IDA7XG5cbiAgICAvKiBJbnRlcm5hbCBjYWxsIChQT1NULCBHRVQpLiAqL1xuICAgIHZhciBpbnRlcm5hbENhbGwgPSBmdW5jdGlvbihwYXJhbXMsIGNhbGxiYWNrcywgcmVxdWVzdE1ldGhvZCl7XG4gICAgICAgIC8qIENyb3NzLWRvbWFpbiBQT1NUIHJlcXVlc3QgKGRvZXNuJ3QgcmV0dXJuIGFueSBkYXRhLCBhbHdheXMgc3VjY2Vzc2Z1bCkuICovXG4gICAgICAgIGlmKHJlcXVlc3RNZXRob2QgPT09ICdQT1NUJyl7XG4gICAgICAgICAgICAvKiBDcmVhdGUgaWZyYW1lIGVsZW1lbnQgdG8gcG9zdCBkYXRhLiAqL1xuICAgICAgICAgICAgdmFyIGh0bWwgICA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdodG1sJylbMF07XG4gICAgICAgICAgICB2YXIgaWZyYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaWZyYW1lJyk7XG4gICAgICAgICAgICB2YXIgZG9jO1xuXG4gICAgICAgICAgICAvKiBTZXQgaWZyYW1lIGF0dHJpYnV0ZXMuICovXG4gICAgICAgICAgICBpZnJhbWUud2lkdGggICAgICAgID0gMTtcbiAgICAgICAgICAgIGlmcmFtZS5oZWlnaHQgICAgICAgPSAxO1xuICAgICAgICAgICAgaWZyYW1lLnN0eWxlLmJvcmRlciA9ICdub25lJztcbiAgICAgICAgICAgIGlmcmFtZS5vbmxvYWQgICAgICAgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIC8qIFJlbW92ZSBpZnJhbWUgZWxlbWVudC4gKi9cbiAgICAgICAgICAgICAgICAvL2h0bWwucmVtb3ZlQ2hpbGQoaWZyYW1lKTtcblxuICAgICAgICAgICAgICAgIC8qIENhbGwgdXNlciBjYWxsYmFjay4gKi9cbiAgICAgICAgICAgICAgICBpZih0eXBlb2YoY2FsbGJhY2tzLnN1Y2Nlc3MpICE9PSAndW5kZWZpbmVkJyl7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrcy5zdWNjZXNzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyogQXBwZW5kIGlmcmFtZS4gKi9cbiAgICAgICAgICAgIGh0bWwuYXBwZW5kQ2hpbGQoaWZyYW1lKTtcblxuICAgICAgICAgICAgLyogR2V0IGlmcmFtZSBkb2N1bWVudC4gKi9cbiAgICAgICAgICAgIGlmKHR5cGVvZihpZnJhbWUuY29udGVudFdpbmRvdykgIT09ICd1bmRlZmluZWQnKXtcbiAgICAgICAgICAgICAgICBkb2MgPSBpZnJhbWUuY29udGVudFdpbmRvdy5kb2N1bWVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYodHlwZW9mKGlmcmFtZS5jb250ZW50RG9jdW1lbnQuZG9jdW1lbnQpICE9PSAndW5kZWZpbmVkJyl7XG4gICAgICAgICAgICAgICAgZG9jID0gaWZyYW1lLmNvbnRlbnREb2N1bWVudC5kb2N1bWVudC5kb2N1bWVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgZG9jID0gaWZyYW1lLmNvbnRlbnREb2N1bWVudC5kb2N1bWVudDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLyogT3BlbiBpZnJhbWUgZG9jdW1lbnQgYW5kIHdyaXRlIGEgZm9ybS4gKi9cbiAgICAgICAgICAgIGRvYy5vcGVuKCk7XG4gICAgICAgICAgICBkb2MuY2xlYXIoKTtcbiAgICAgICAgICAgIGRvYy53cml0ZSgnPGZvcm0gbWV0aG9kPVwicG9zdFwiIGFjdGlvbj1cIicgKyBhcGlVcmwgKyAnXCIgaWQ9XCJmb3JtXCI+Jyk7XG5cbiAgICAgICAgICAgIC8qIFdyaXRlIFBPU1QgcGFyYW1ldGVycyBhcyBpbnB1dCBmaWVsZHMuICovXG4gICAgICAgICAgICB2YXIgcGFyYW07XG4gICAgICAgICAgICBmb3IocGFyYW0gaW4gcGFyYW1zKXtcbiAgICAgICAgICAgICAgICBpZiAocGFyYW1zLmhhc093blByb3BlcnR5KHBhcmFtKSkge1xuICAgICAgICAgICAgICAgICAgICBkb2Mud3JpdGUoJzxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCInICsgcGFyYW0gKyAnXCIgdmFsdWU9XCInICsgcGFyYW1zW3BhcmFtXSArICdcIj4nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8qIFdyaXRlIGF1dG9tYXRpYyBmb3JtIHN1Ym1pc3Npb24gY29kZS4gKi9cbiAgICAgICAgICAgIGRvYy53cml0ZSgnPC9mb3JtPicpO1xuICAgICAgICAgICAgZG9jLndyaXRlKCc8c2NyaXB0IHR5cGU9XCJhcHBsaWNhdGlvbi94LWphdmFzY3JpcHRcIj4nKTtcbiAgICAgICAgICAgIGRvYy53cml0ZSgnZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJmb3JtXCIpLnN1Ym1pdCgpOycpO1xuICAgICAgICAgICAgZG9jLndyaXRlKCc8L3NjcmlwdD4nKTtcblxuICAgICAgICAgICAgLyogQ2xvc2UgaWZyYW1lIGRvY3VtZW50LiAqL1xuICAgICAgICAgICAgZG9jLmNsb3NlKCk7XG4gICAgICAgIH1cbiAgICAgICAgLyogQ3Jvc3MtZG9tYWluIEdFVCByZXF1ZXN0IChKU09OUCkuICovXG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICAvKiBHZXQgSlNPTlAgY2FsbGJhY2sgbmFtZS4gKi9cbiAgICAgICAgICAgIHZhciBqc29ucCA9ICdqc29ucCcgKyBuZXcgRGF0ZSgpLmdldFRpbWUoKSArIGpzb25wQ291bnRlcjtcblxuICAgICAgICAgICAgLyogVXBkYXRlIHRoZSB1bmlxdWUgSlNPTlAgY2FsbGJhY2sgY291bnRlciAqL1xuICAgICAgICAgICAganNvbnBDb3VudGVyICs9IDE7XG5cbiAgICAgICAgICAgIC8qIENhbGN1bGF0ZSBjYWNoZSBoYXNoLiAqL1xuICAgICAgICAgICAgdmFyIGhhc2ggPSBhdXRoLmdldEFwaVNpZ25hdHVyZShwYXJhbXMpO1xuXG4gICAgICAgICAgICAvKiBDaGVjayBjYWNoZS4gKi9cbiAgICAgICAgICAgIGlmKHR5cGVvZihjYWNoZSkgIT09ICd1bmRlZmluZWQnICYmIGNhY2hlLmNvbnRhaW5zKGhhc2gpICYmICFjYWNoZS5pc0V4cGlyZWQoaGFzaCkpe1xuICAgICAgICAgICAgICAgIGlmKHR5cGVvZihjYWxsYmFja3Muc3VjY2VzcykgIT09ICd1bmRlZmluZWQnKXtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tzLnN1Y2Nlc3MoY2FjaGUubG9hZChoYXNoKSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvKiBTZXQgY2FsbGJhY2sgbmFtZSBhbmQgcmVzcG9uc2UgZm9ybWF0LiAqL1xuICAgICAgICAgICAgcGFyYW1zLmNhbGxiYWNrID0ganNvbnA7XG4gICAgICAgICAgICBwYXJhbXMuZm9ybWF0ICAgPSAnanNvbic7XG5cbiAgICAgICAgICAgIC8qIENyZWF0ZSBKU09OUCBjYWxsYmFjayBmdW5jdGlvbi4gKi9cbiAgICAgICAgICAgIHdpbmRvd1tqc29ucF0gPSBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAvKiBJcyBhIGNhY2hlIGF2YWlsYWJsZT8uICovXG4gICAgICAgICAgICAgICAgaWYodHlwZW9mKGNhY2hlKSAhPT0gJ3VuZGVmaW5lZCcpe1xuICAgICAgICAgICAgICAgICAgICB2YXIgZXhwaXJhdGlvbiA9IGNhY2hlLmdldEV4cGlyYXRpb25UaW1lKHBhcmFtcyk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoZXhwaXJhdGlvbiA+IDApe1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FjaGUuc3RvcmUoaGFzaCwgZGF0YSwgZXhwaXJhdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvKiBDYWxsIHVzZXIgY2FsbGJhY2suICovXG4gICAgICAgICAgICAgICAgaWYodHlwZW9mKGRhdGEuZXJyb3IpICE9PSAndW5kZWZpbmVkJyl7XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZihjYWxsYmFja3MuZXJyb3IpICE9PSAndW5kZWZpbmVkJyl7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFja3MuZXJyb3IoZGF0YS5lcnJvciwgZGF0YS5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmKHR5cGVvZihjYWxsYmFja3Muc3VjY2VzcykgIT09ICd1bmRlZmluZWQnKXtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tzLnN1Y2Nlc3MoZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLyogR2FyYmFnZSBjb2xsZWN0LiAqL1xuICAgICAgICAgICAgICAgIHdpbmRvd1tqc29ucF0gPSB1bmRlZmluZWQ7XG5cbiAgICAgICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB3aW5kb3dbanNvbnBdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXRjaChlKXtcbiAgICAgICAgICAgICAgICAgICAgLyogTm90aGluZy4gKi9cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvKiBSZW1vdmUgc2NyaXB0IGVsZW1lbnQuICovXG4gICAgICAgICAgICAgICAgaWYoaGVhZCl7XG4gICAgICAgICAgICAgICAgICAgIGhlYWQucmVtb3ZlQ2hpbGQoc2NyaXB0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKiBDcmVhdGUgc2NyaXB0IGVsZW1lbnQgdG8gbG9hZCBKU09OIGRhdGEuICovXG4gICAgICAgICAgICB2YXIgaGVhZCAgID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJoZWFkXCIpWzBdO1xuICAgICAgICAgICAgdmFyIHNjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzY3JpcHRcIik7XG5cbiAgICAgICAgICAgIC8qIEJ1aWxkIHBhcmFtZXRlciBzdHJpbmcuICovXG4gICAgICAgICAgICB2YXIgYXJyYXkgPSBbXTtcblxuICAgICAgICAgICAgdmFyIHBhcmFtMjtcbiAgICAgICAgICAgIGZvcihwYXJhbTIgaW4gcGFyYW1zKXtcbiAgICAgICAgICAgICAgICBpZiAocGFyYW1zLmhhc093blByb3BlcnR5KHBhcmFtMikpIHtcbiAgICAgICAgICAgICAgICAgICAgYXJyYXkucHVzaChlbmNvZGVVUklDb21wb25lbnQocGFyYW0yKSArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KHBhcmFtc1twYXJhbTJdKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvKiBTZXQgc2NyaXB0IHNvdXJjZS4gKi9cbiAgICAgICAgICAgIHNjcmlwdC5zcmMgPSBhcGlVcmwgKyAnPycgKyBhcnJheS5qb2luKCcmJykucmVwbGFjZSgvJTIwL2csICcrJyk7XG5cbiAgICAgICAgICAgIC8qIEFwcGVuZCBzY3JpcHQgZWxlbWVudC4gKi9cbiAgICAgICAgICAgIGhlYWQuYXBwZW5kQ2hpbGQoc2NyaXB0KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKiBOb3JtYWwgbWV0aG9kIGNhbGwuICovXG4gICAgdmFyIGNhbGwgPSBmdW5jdGlvbihtZXRob2QsIHBhcmFtcywgY2FsbGJhY2tzLCByZXF1ZXN0TWV0aG9kKXtcbiAgICAgICAgLyogU2V0IGRlZmF1bHQgdmFsdWVzLiAqL1xuICAgICAgICBwYXJhbXMgICAgICAgID0gcGFyYW1zICAgICAgICB8fCB7fTtcbiAgICAgICAgY2FsbGJhY2tzICAgICA9IGNhbGxiYWNrcyAgICAgfHwge307XG4gICAgICAgIHJlcXVlc3RNZXRob2QgPSByZXF1ZXN0TWV0aG9kIHx8ICdHRVQnO1xuXG4gICAgICAgIC8qIEFkZCBwYXJhbWV0ZXJzLiAqL1xuICAgICAgICBwYXJhbXMubWV0aG9kICA9IG1ldGhvZDtcbiAgICAgICAgcGFyYW1zLmFwaV9rZXkgPSBhcGlLZXk7XG5cbiAgICAgICAgLyogQ2FsbCBtZXRob2QuICovXG4gICAgICAgIGludGVybmFsQ2FsbChwYXJhbXMsIGNhbGxiYWNrcywgcmVxdWVzdE1ldGhvZCk7XG4gICAgfTtcblxuICAgIC8qIFNpZ25lZCBtZXRob2QgY2FsbC4gKi9cbiAgICB2YXIgc2lnbmVkQ2FsbCA9IGZ1bmN0aW9uKG1ldGhvZCwgcGFyYW1zLCBzZXNzaW9uLCBjYWxsYmFja3MsIHJlcXVlc3RNZXRob2Qpe1xuICAgICAgICAvKiBTZXQgZGVmYXVsdCB2YWx1ZXMuICovXG4gICAgICAgIHBhcmFtcyAgICAgICAgPSBwYXJhbXMgICAgICAgIHx8IHt9O1xuICAgICAgICBjYWxsYmFja3MgICAgID0gY2FsbGJhY2tzICAgICB8fCB7fTtcbiAgICAgICAgcmVxdWVzdE1ldGhvZCA9IHJlcXVlc3RNZXRob2QgfHwgJ0dFVCc7XG5cbiAgICAgICAgLyogQWRkIHBhcmFtZXRlcnMuICovXG4gICAgICAgIHBhcmFtcy5tZXRob2QgID0gbWV0aG9kO1xuICAgICAgICBwYXJhbXMuYXBpX2tleSA9IGFwaUtleTtcblxuICAgICAgICAvKiBBZGQgc2Vzc2lvbiBrZXkuICovXG4gICAgICAgIGlmKHNlc3Npb24gJiYgdHlwZW9mKHNlc3Npb24ua2V5KSAhPT0gJ3VuZGVmaW5lZCcpe1xuICAgICAgICAgICAgcGFyYW1zLnNrID0gc2Vzc2lvbi5rZXk7XG4gICAgICAgIH1cblxuICAgICAgICAvKiBHZXQgQVBJIHNpZ25hdHVyZS4gKi9cbiAgICAgICAgcGFyYW1zLmFwaV9zaWcgPSBhdXRoLmdldEFwaVNpZ25hdHVyZShwYXJhbXMpO1xuXG4gICAgICAgIC8qIENhbGwgbWV0aG9kLiAqL1xuICAgICAgICBpbnRlcm5hbENhbGwocGFyYW1zLCBjYWxsYmFja3MsIHJlcXVlc3RNZXRob2QpO1xuICAgIH07XG5cbiAgICAvKiBBbGJ1bSBtZXRob2RzLiAqL1xuICAgIHRoaXMuYWxidW0gPSB7XG4gICAgICAgIGFkZFRhZ3MgOiBmdW5jdGlvbihwYXJhbXMsIHNlc3Npb24sIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICAvKiBCdWlsZCBjb21tYSBzZXBhcmF0ZWQgdGFncyBzdHJpbmcuICovXG4gICAgICAgICAgICBpZih0eXBlb2YocGFyYW1zLnRhZ3MpID09PSAnb2JqZWN0Jyl7XG4gICAgICAgICAgICAgICAgcGFyYW1zLnRhZ3MgPSBwYXJhbXMudGFncy5qb2luKCcsJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNpZ25lZENhbGwoJ2FsYnVtLmFkZFRhZ3MnLCBwYXJhbXMsIHNlc3Npb24sIGNhbGxiYWNrcywgJ1BPU1QnKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRCdXlsaW5rcyA6IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIGNhbGwoJ2FsYnVtLmdldEJ1eWxpbmtzJywgcGFyYW1zLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldEluZm8gOiBmdW5jdGlvbihwYXJhbXMsIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICBjYWxsKCdhbGJ1bS5nZXRJbmZvJywgcGFyYW1zLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFRhZ3MgOiBmdW5jdGlvbihwYXJhbXMsIHNlc3Npb24sIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICBzaWduZWRDYWxsKCdhbGJ1bS5nZXRUYWdzJywgcGFyYW1zLCBzZXNzaW9uLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHJlbW92ZVRhZyA6IGZ1bmN0aW9uKHBhcmFtcywgc2Vzc2lvbiwgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIHNpZ25lZENhbGwoJ2FsYnVtLnJlbW92ZVRhZycsIHBhcmFtcywgc2Vzc2lvbiwgY2FsbGJhY2tzLCAnUE9TVCcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHNlYXJjaCA6IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIGNhbGwoJ2FsYnVtLnNlYXJjaCcsIHBhcmFtcywgY2FsbGJhY2tzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBzaGFyZSA6IGZ1bmN0aW9uKHBhcmFtcywgc2Vzc2lvbiwgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIC8qIEJ1aWxkIGNvbW1hIHNlcGFyYXRlZCByZWNpcGllbnRzIHN0cmluZy4gKi9cbiAgICAgICAgICAgIGlmKHR5cGVvZihwYXJhbXMucmVjaXBpZW50KSA9PT0gJ29iamVjdCcpe1xuICAgICAgICAgICAgICAgIHBhcmFtcy5yZWNpcGllbnQgPSBwYXJhbXMucmVjaXBpZW50LmpvaW4oJywnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2lnbmVkQ2FsbCgnYWxidW0uc2hhcmUnLCBwYXJhbXMsIGNhbGxiYWNrcyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyogQXJ0aXN0IG1ldGhvZHMuICovXG4gICAgdGhpcy5hcnRpc3QgPSB7XG4gICAgICAgIGFkZFRhZ3MgOiBmdW5jdGlvbihwYXJhbXMsIHNlc3Npb24sIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICAvKiBCdWlsZCBjb21tYSBzZXBhcmF0ZWQgdGFncyBzdHJpbmcuICovXG4gICAgICAgICAgICBpZih0eXBlb2YocGFyYW1zLnRhZ3MpID09PSAnb2JqZWN0Jyl7XG4gICAgICAgICAgICAgICAgcGFyYW1zLnRhZ3MgPSBwYXJhbXMudGFncy5qb2luKCcsJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNpZ25lZENhbGwoJ2FydGlzdC5hZGRUYWdzJywgcGFyYW1zLCBzZXNzaW9uLCBjYWxsYmFja3MsICdQT1NUJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0Q29ycmVjdGlvbiA6IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIGNhbGwoJ2FydGlzdC5nZXRDb3JyZWN0aW9uJywgcGFyYW1zLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldEV2ZW50cyA6IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIGNhbGwoJ2FydGlzdC5nZXRFdmVudHMnLCBwYXJhbXMsIGNhbGxiYWNrcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0SW1hZ2VzIDogZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgY2FsbCgnYXJ0aXN0LmdldEltYWdlcycsIHBhcmFtcywgY2FsbGJhY2tzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRJbmZvIDogZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgY2FsbCgnYXJ0aXN0LmdldEluZm8nLCBwYXJhbXMsIGNhbGxiYWNrcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0UGFzdEV2ZW50cyA6IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIGNhbGwoJ2FydGlzdC5nZXRQYXN0RXZlbnRzJywgcGFyYW1zLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFBvZGNhc3QgOiBmdW5jdGlvbihwYXJhbXMsIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICBjYWxsKCdhcnRpc3QuZ2V0UG9kY2FzdCcsIHBhcmFtcywgY2FsbGJhY2tzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRTaG91dHMgOiBmdW5jdGlvbihwYXJhbXMsIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICBjYWxsKCdhcnRpc3QuZ2V0U2hvdXRzJywgcGFyYW1zLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFNpbWlsYXIgOiBmdW5jdGlvbihwYXJhbXMsIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICBjYWxsKCdhcnRpc3QuZ2V0U2ltaWxhcicsIHBhcmFtcywgY2FsbGJhY2tzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRUYWdzIDogZnVuY3Rpb24ocGFyYW1zLCBzZXNzaW9uLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgc2lnbmVkQ2FsbCgnYXJ0aXN0LmdldFRhZ3MnLCBwYXJhbXMsIHNlc3Npb24sIGNhbGxiYWNrcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0VG9wQWxidW1zIDogZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgY2FsbCgnYXJ0aXN0LmdldFRvcEFsYnVtcycsIHBhcmFtcywgY2FsbGJhY2tzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRUb3BGYW5zIDogZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgY2FsbCgnYXJ0aXN0LmdldFRvcEZhbnMnLCBwYXJhbXMsIGNhbGxiYWNrcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0VG9wVGFncyA6IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIGNhbGwoJ2FydGlzdC5nZXRUb3BUYWdzJywgcGFyYW1zLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFRvcFRyYWNrcyA6IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIGNhbGwoJ2FydGlzdC5nZXRUb3BUcmFja3MnLCBwYXJhbXMsIGNhbGxiYWNrcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcmVtb3ZlVGFnIDogZnVuY3Rpb24ocGFyYW1zLCBzZXNzaW9uLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgc2lnbmVkQ2FsbCgnYXJ0aXN0LnJlbW92ZVRhZycsIHBhcmFtcywgc2Vzc2lvbiwgY2FsbGJhY2tzLCAnUE9TVCcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHNlYXJjaCA6IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIGNhbGwoJ2FydGlzdC5zZWFyY2gnLCBwYXJhbXMsIGNhbGxiYWNrcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2hhcmUgOiBmdW5jdGlvbihwYXJhbXMsIHNlc3Npb24sIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICAvKiBCdWlsZCBjb21tYSBzZXBhcmF0ZWQgcmVjaXBpZW50cyBzdHJpbmcuICovXG4gICAgICAgICAgICBpZih0eXBlb2YocGFyYW1zLnJlY2lwaWVudCkgPT09ICdvYmplY3QnKXtcbiAgICAgICAgICAgICAgICBwYXJhbXMucmVjaXBpZW50ID0gcGFyYW1zLnJlY2lwaWVudC5qb2luKCcsJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNpZ25lZENhbGwoJ2FydGlzdC5zaGFyZScsIHBhcmFtcywgc2Vzc2lvbiwgY2FsbGJhY2tzLCAnUE9TVCcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHNob3V0IDogZnVuY3Rpb24ocGFyYW1zLCBzZXNzaW9uLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgc2lnbmVkQ2FsbCgnYXJ0aXN0LnNob3V0JywgcGFyYW1zLCBzZXNzaW9uLCBjYWxsYmFja3MsICdQT1NUJyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyogQXV0aCBtZXRob2RzLiAqL1xuICAgIHRoaXMuYXV0aCA9IHtcbiAgICAgICAgZ2V0TW9iaWxlU2Vzc2lvbiA6IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIC8qIFNldCBuZXcgcGFyYW1zIG9iamVjdCB3aXRoIGF1dGhUb2tlbi4gKi9cbiAgICAgICAgICAgIHBhcmFtcyA9IHtcbiAgICAgICAgICAgICAgICB1c2VybmFtZSAgOiBwYXJhbXMudXNlcm5hbWUsXG4gICAgICAgICAgICAgICAgYXV0aFRva2VuIDogbWQ1KHBhcmFtcy51c2VybmFtZSArIG1kNShwYXJhbXMucGFzc3dvcmQpKVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2lnbmVkQ2FsbCgnYXV0aC5nZXRNb2JpbGVTZXNzaW9uJywgcGFyYW1zLCBudWxsLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFNlc3Npb24gOiBmdW5jdGlvbihwYXJhbXMsIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICBzaWduZWRDYWxsKCdhdXRoLmdldFNlc3Npb24nLCBwYXJhbXMsIG51bGwsIGNhbGxiYWNrcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0VG9rZW4gOiBmdW5jdGlvbihjYWxsYmFja3Mpe1xuICAgICAgICAgICAgc2lnbmVkQ2FsbCgnYXV0aC5nZXRUb2tlbicsIG51bGwsIG51bGwsIGNhbGxiYWNrcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyogRGVwcmVjYXRlZC4gU2VjdXJpdHkgaG9sZSB3YXMgZml4ZWQuICovXG4gICAgICAgIGdldFdlYlNlc3Npb24gOiBmdW5jdGlvbihjYWxsYmFja3Mpe1xuICAgICAgICAgICAgLyogU2F2ZSBBUEkgVVJMIGFuZCBzZXQgbmV3IG9uZSAobmVlZHMgdG8gYmUgZG9uZSBkdWUgdG8gYSBjb29raWUhKS4gKi9cbiAgICAgICAgICAgIHZhciBwcmV2aXVvdXNBcGlVcmwgPSBhcGlVcmw7XG5cbiAgICAgICAgICAgIGFwaVVybCA9ICdodHRwOi8vZXh0Lmxhc3QuZm0vMi4wLyc7XG5cbiAgICAgICAgICAgIHNpZ25lZENhbGwoJ2F1dGguZ2V0V2ViU2Vzc2lvbicsIG51bGwsIG51bGwsIGNhbGxiYWNrcyk7XG5cbiAgICAgICAgICAgIC8qIFJlc3RvcmUgQVBJIFVSTC4gKi9cbiAgICAgICAgICAgIGFwaVVybCA9IHByZXZpdW91c0FwaVVybDtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKiBDaGFydCBtZXRob2RzLiAqL1xuICAgIHRoaXMuY2hhcnQgPSB7XG4gICAgICAgIGdldEh5cGVkQXJ0aXN0cyA6IGZ1bmN0aW9uKHBhcmFtcywgc2Vzc2lvbiwgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIGNhbGwoJ2NoYXJ0LmdldEh5cGVkQXJ0aXN0cycsIHBhcmFtcywgY2FsbGJhY2tzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRIeXBlZFRyYWNrcyA6IGZ1bmN0aW9uKHBhcmFtcywgc2Vzc2lvbiwgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIGNhbGwoJ2NoYXJ0LmdldEh5cGVkVHJhY2tzJywgcGFyYW1zLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldExvdmVkVHJhY2tzIDogZnVuY3Rpb24ocGFyYW1zLCBzZXNzaW9uLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgY2FsbCgnY2hhcnQuZ2V0TG92ZWRUcmFja3MnLCBwYXJhbXMsIGNhbGxiYWNrcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0VG9wQXJ0aXN0cyA6IGZ1bmN0aW9uKHBhcmFtcywgc2Vzc2lvbiwgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIGNhbGwoJ2NoYXJ0LmdldFRvcEFydGlzdHMnLCBwYXJhbXMsIGNhbGxiYWNrcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0VG9wVGFncyA6IGZ1bmN0aW9uKHBhcmFtcywgc2Vzc2lvbiwgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIGNhbGwoJ2NoYXJ0LmdldFRvcFRhZ3MnLCBwYXJhbXMsIGNhbGxiYWNrcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0VG9wVHJhY2tzIDogZnVuY3Rpb24ocGFyYW1zLCBzZXNzaW9uLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgY2FsbCgnY2hhcnQuZ2V0VG9wVHJhY2tzJywgcGFyYW1zLCBjYWxsYmFja3MpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qIEV2ZW50IG1ldGhvZHMuICovXG4gICAgdGhpcy5ldmVudCA9IHtcbiAgICAgICAgYXR0ZW5kIDogZnVuY3Rpb24ocGFyYW1zLCBzZXNzaW9uLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgc2lnbmVkQ2FsbCgnZXZlbnQuYXR0ZW5kJywgcGFyYW1zLCBzZXNzaW9uLCBjYWxsYmFja3MsICdQT1NUJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0QXR0ZW5kZWVzIDogZnVuY3Rpb24ocGFyYW1zLCBzZXNzaW9uLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgY2FsbCgnZXZlbnQuZ2V0QXR0ZW5kZWVzJywgcGFyYW1zLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldEluZm8gOiBmdW5jdGlvbihwYXJhbXMsIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICBjYWxsKCdldmVudC5nZXRJbmZvJywgcGFyYW1zLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFNob3V0cyA6IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIGNhbGwoJ2V2ZW50LmdldFNob3V0cycsIHBhcmFtcywgY2FsbGJhY2tzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBzaGFyZSA6IGZ1bmN0aW9uKHBhcmFtcywgc2Vzc2lvbiwgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIC8qIEJ1aWxkIGNvbW1hIHNlcGFyYXRlZCByZWNpcGllbnRzIHN0cmluZy4gKi9cbiAgICAgICAgICAgIGlmKHR5cGVvZihwYXJhbXMucmVjaXBpZW50KSA9PT0gJ29iamVjdCcpe1xuICAgICAgICAgICAgICAgIHBhcmFtcy5yZWNpcGllbnQgPSBwYXJhbXMucmVjaXBpZW50LmpvaW4oJywnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2lnbmVkQ2FsbCgnZXZlbnQuc2hhcmUnLCBwYXJhbXMsIHNlc3Npb24sIGNhbGxiYWNrcywgJ1BPU1QnKTtcbiAgICAgICAgfSxcblxuICAgICAgICBzaG91dCA6IGZ1bmN0aW9uKHBhcmFtcywgc2Vzc2lvbiwgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIHNpZ25lZENhbGwoJ2V2ZW50LnNob3V0JywgcGFyYW1zLCBzZXNzaW9uLCBjYWxsYmFja3MsICdQT1NUJyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyogR2VvIG1ldGhvZHMuICovXG4gICAgdGhpcy5nZW8gPSB7XG4gICAgICAgIGdldEV2ZW50cyA6IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIGNhbGwoJ2dlby5nZXRFdmVudHMnLCBwYXJhbXMsIGNhbGxiYWNrcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0TWV0cm9BcnRpc3RDaGFydCA6IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIGNhbGwoJ2dlby5nZXRNZXRyb0FydGlzdENoYXJ0JywgcGFyYW1zLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldE1ldHJvSHlwZUFydGlzdENoYXJ0IDogZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgY2FsbCgnZ2VvLmdldE1ldHJvSHlwZUFydGlzdENoYXJ0JywgcGFyYW1zLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldE1ldHJvSHlwZVRyYWNrQ2hhcnQgOiBmdW5jdGlvbihwYXJhbXMsIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICBjYWxsKCdnZW8uZ2V0TWV0cm9IeXBlVHJhY2tDaGFydCcsIHBhcmFtcywgY2FsbGJhY2tzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRNZXRyb1RyYWNrQ2hhcnQgOiBmdW5jdGlvbihwYXJhbXMsIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICBjYWxsKCdnZW8uZ2V0TWV0cm9UcmFja0NoYXJ0JywgcGFyYW1zLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldE1ldHJvVW5pcXVlQXJ0aXN0Q2hhcnQgOiBmdW5jdGlvbihwYXJhbXMsIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICBjYWxsKCdnZW8uZ2V0TWV0cm9VbmlxdWVBcnRpc3RDaGFydCcsIHBhcmFtcywgY2FsbGJhY2tzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRNZXRyb1VuaXF1ZVRyYWNrQ2hhcnQgOiBmdW5jdGlvbihwYXJhbXMsIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICBjYWxsKCdnZW8uZ2V0TWV0cm9VbmlxdWVUcmFja0NoYXJ0JywgcGFyYW1zLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldE1ldHJvV2Vla2x5Q2hhcnRsaXN0IDogZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgY2FsbCgnZ2VvLmdldE1ldHJvV2Vla2x5Q2hhcnRsaXN0JywgcGFyYW1zLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldE1ldHJvcyA6IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIGNhbGwoJ2dlby5nZXRNZXRyb3MnLCBwYXJhbXMsIGNhbGxiYWNrcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0VG9wQXJ0aXN0cyA6IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIGNhbGwoJ2dlby5nZXRUb3BBcnRpc3RzJywgcGFyYW1zLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFRvcFRyYWNrcyA6IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIGNhbGwoJ2dlby5nZXRUb3BUcmFja3MnLCBwYXJhbXMsIGNhbGxiYWNrcyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyogR3JvdXAgbWV0aG9kcy4gKi9cbiAgICB0aGlzLmdyb3VwID0ge1xuICAgICAgICBnZXRIeXBlIDogZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgY2FsbCgnZ3JvdXAuZ2V0SHlwZScsIHBhcmFtcywgY2FsbGJhY2tzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRNZW1iZXJzIDogZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgY2FsbCgnZ3JvdXAuZ2V0TWVtYmVycycsIHBhcmFtcywgY2FsbGJhY2tzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRXZWVrbHlBbGJ1bUNoYXJ0IDogZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgY2FsbCgnZ3JvdXAuZ2V0V2Vla2x5QWxidW1DaGFydCcsIHBhcmFtcywgY2FsbGJhY2tzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRXZWVrbHlBcnRpc3RDaGFydCA6IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIGNhbGwoJ2dyb3VwLmdldFdlZWtseUFydGlzdENoYXJ0JywgcGFyYW1zLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFdlZWtseUNoYXJ0TGlzdCA6IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIGNhbGwoJ2dyb3VwLmdldFdlZWtseUNoYXJ0TGlzdCcsIHBhcmFtcywgY2FsbGJhY2tzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRXZWVrbHlUcmFja0NoYXJ0IDogZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgY2FsbCgnZ3JvdXAuZ2V0V2Vla2x5VHJhY2tDaGFydCcsIHBhcmFtcywgY2FsbGJhY2tzKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKiBMaWJyYXJ5IG1ldGhvZHMuICovXG4gICAgdGhpcy5saWJyYXJ5ID0ge1xuICAgICAgICBhZGRBbGJ1bSA6IGZ1bmN0aW9uKHBhcmFtcywgc2Vzc2lvbiwgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIHNpZ25lZENhbGwoJ2xpYnJhcnkuYWRkQWxidW0nLCBwYXJhbXMsIHNlc3Npb24sIGNhbGxiYWNrcywgJ1BPU1QnKTtcbiAgICAgICAgfSxcblxuICAgICAgICBhZGRBcnRpc3QgOiBmdW5jdGlvbihwYXJhbXMsIHNlc3Npb24sIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICBzaWduZWRDYWxsKCdsaWJyYXJ5LmFkZEFydGlzdCcsIHBhcmFtcywgc2Vzc2lvbiwgY2FsbGJhY2tzLCAnUE9TVCcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGFkZFRyYWNrIDogZnVuY3Rpb24ocGFyYW1zLCBzZXNzaW9uLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgc2lnbmVkQ2FsbCgnbGlicmFyeS5hZGRUcmFjaycsIHBhcmFtcywgc2Vzc2lvbiwgY2FsbGJhY2tzLCAnUE9TVCcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldEFsYnVtcyA6IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIGNhbGwoJ2xpYnJhcnkuZ2V0QWxidW1zJywgcGFyYW1zLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldEFydGlzdHMgOiBmdW5jdGlvbihwYXJhbXMsIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICBjYWxsKCdsaWJyYXJ5LmdldEFydGlzdHMnLCBwYXJhbXMsIGNhbGxiYWNrcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0VHJhY2tzIDogZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgY2FsbCgnbGlicmFyeS5nZXRUcmFja3MnLCBwYXJhbXMsIGNhbGxiYWNrcyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyogUGxheWxpc3QgbWV0aG9kcy4gKi9cbiAgICB0aGlzLnBsYXlsaXN0ID0ge1xuICAgICAgICBhZGRUcmFjayA6IGZ1bmN0aW9uKHBhcmFtcywgc2Vzc2lvbiwgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIHNpZ25lZENhbGwoJ3BsYXlsaXN0LmFkZFRyYWNrJywgcGFyYW1zLCBzZXNzaW9uLCBjYWxsYmFja3MsICdQT1NUJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY3JlYXRlIDogZnVuY3Rpb24ocGFyYW1zLCBzZXNzaW9uLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgc2lnbmVkQ2FsbCgncGxheWxpc3QuY3JlYXRlJywgcGFyYW1zLCBzZXNzaW9uLCBjYWxsYmFja3MsICdQT1NUJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZmV0Y2ggOiBmdW5jdGlvbihwYXJhbXMsIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICBjYWxsKCdwbGF5bGlzdC5mZXRjaCcsIHBhcmFtcywgY2FsbGJhY2tzKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKiBSYWRpbyBtZXRob2RzLiAqL1xuICAgIHRoaXMucmFkaW8gPSB7XG4gICAgICAgIGdldFBsYXlsaXN0IDogZnVuY3Rpb24ocGFyYW1zLCBzZXNzaW9uLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgc2lnbmVkQ2FsbCgncmFkaW8uZ2V0UGxheWxpc3QnLCBwYXJhbXMsIHNlc3Npb24sIGNhbGxiYWNrcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2VhcmNoIDogZnVuY3Rpb24ocGFyYW1zLCBzZXNzaW9uLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgc2lnbmVkQ2FsbCgncmFkaW8uc2VhcmNoJywgcGFyYW1zLCBzZXNzaW9uLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHR1bmUgOiBmdW5jdGlvbihwYXJhbXMsIHNlc3Npb24sIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICBzaWduZWRDYWxsKCdyYWRpby50dW5lJywgcGFyYW1zLCBzZXNzaW9uLCBjYWxsYmFja3MpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qIFRhZyBtZXRob2RzLiAqL1xuICAgIHRoaXMudGFnID0ge1xuICAgICAgICBnZXRJbmZvIDogZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgY2FsbCgndGFnLmdldEluZm8nLCBwYXJhbXMsIGNhbGxiYWNrcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0U2ltaWxhciA6IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIGNhbGwoJ3RhZy5nZXRTaW1pbGFyJywgcGFyYW1zLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFRvcEFsYnVtcyA6IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIGNhbGwoJ3RhZy5nZXRUb3BBbGJ1bXMnLCBwYXJhbXMsIGNhbGxiYWNrcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0VG9wQXJ0aXN0cyA6IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIGNhbGwoJ3RhZy5nZXRUb3BBcnRpc3RzJywgcGFyYW1zLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFRvcFRhZ3MgOiBmdW5jdGlvbihjYWxsYmFja3Mpe1xuICAgICAgICAgICAgY2FsbCgndGFnLmdldFRvcFRhZ3MnLCBudWxsLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFRvcFRyYWNrcyA6IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIGNhbGwoJ3RhZy5nZXRUb3BUcmFja3MnLCBwYXJhbXMsIGNhbGxiYWNrcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0V2Vla2x5QXJ0aXN0Q2hhcnQgOiBmdW5jdGlvbihwYXJhbXMsIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICBjYWxsKCd0YWcuZ2V0V2Vla2x5QXJ0aXN0Q2hhcnQnLCBwYXJhbXMsIGNhbGxiYWNrcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0V2Vla2x5Q2hhcnRMaXN0IDogZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgY2FsbCgndGFnLmdldFdlZWtseUNoYXJ0TGlzdCcsIHBhcmFtcywgY2FsbGJhY2tzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBzZWFyY2ggOiBmdW5jdGlvbihwYXJhbXMsIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICBjYWxsKCd0YWcuc2VhcmNoJywgcGFyYW1zLCBjYWxsYmFja3MpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qIFRhc3Rlb21ldGVyIG1ldGhvZC4gKi9cbiAgICB0aGlzLnRhc3Rlb21ldGVyID0ge1xuICAgICAgICBjb21wYXJlIDogZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgY2FsbCgndGFzdGVvbWV0ZXIuY29tcGFyZScsIHBhcmFtcywgY2FsbGJhY2tzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBjb21wYXJlR3JvdXAgOiBmdW5jdGlvbihwYXJhbXMsIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICBjYWxsKCd0YXN0ZW9tZXRlci5jb21wYXJlR3JvdXAnLCBwYXJhbXMsIGNhbGxiYWNrcyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyogVHJhY2sgbWV0aG9kcy4gKi9cbiAgICB0aGlzLnRyYWNrID0ge1xuICAgICAgICBhZGRUYWdzIDogZnVuY3Rpb24ocGFyYW1zLCBzZXNzaW9uLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgc2lnbmVkQ2FsbCgndHJhY2suYWRkVGFncycsIHBhcmFtcywgc2Vzc2lvbiwgY2FsbGJhY2tzLCAnUE9TVCcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGJhbiA6IGZ1bmN0aW9uKHBhcmFtcywgc2Vzc2lvbiwgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIHNpZ25lZENhbGwoJ3RyYWNrLmJhbicsIHBhcmFtcywgc2Vzc2lvbiwgY2FsbGJhY2tzLCAnUE9TVCcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldEJ1eWxpbmtzIDogZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgY2FsbCgndHJhY2suZ2V0QnV5bGlua3MnLCBwYXJhbXMsIGNhbGxiYWNrcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0Q29ycmVjdGlvbiA6IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIGNhbGwoJ3RyYWNrLmdldENvcnJlY3Rpb24nLCBwYXJhbXMsIGNhbGxiYWNrcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0RmluZ2VycHJpbnRNZXRhZGF0YSA6IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIGNhbGwoJ3RyYWNrLmdldEZpbmdlcnByaW50TWV0YWRhdGEnLCBwYXJhbXMsIGNhbGxiYWNrcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0SW5mbyA6IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIGNhbGwoJ3RyYWNrLmdldEluZm8nLCBwYXJhbXMsIGNhbGxiYWNrcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0U2hvdXRzIDogZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgY2FsbCgndHJhY2suZ2V0U2hvdXRzJywgcGFyYW1zLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFNpbWlsYXIgOiBmdW5jdGlvbihwYXJhbXMsIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICBjYWxsKCd0cmFjay5nZXRTaW1pbGFyJywgcGFyYW1zLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFRhZ3MgOiBmdW5jdGlvbihwYXJhbXMsIHNlc3Npb24sIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICBzaWduZWRDYWxsKCd0cmFjay5nZXRUYWdzJywgcGFyYW1zLCBzZXNzaW9uLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFRvcEZhbnMgOiBmdW5jdGlvbihwYXJhbXMsIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICBjYWxsKCd0cmFjay5nZXRUb3BGYW5zJywgcGFyYW1zLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFRvcFRhZ3MgOiBmdW5jdGlvbihwYXJhbXMsIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICBjYWxsKCd0cmFjay5nZXRUb3BUYWdzJywgcGFyYW1zLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGxvdmUgOiBmdW5jdGlvbihwYXJhbXMsIHNlc3Npb24sIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICBzaWduZWRDYWxsKCd0cmFjay5sb3ZlJywgcGFyYW1zLCBzZXNzaW9uLCBjYWxsYmFja3MsICdQT1NUJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcmVtb3ZlVGFnIDogZnVuY3Rpb24ocGFyYW1zLCBzZXNzaW9uLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgc2lnbmVkQ2FsbCgndHJhY2sucmVtb3ZlVGFnJywgcGFyYW1zLCBzZXNzaW9uLCBjYWxsYmFja3MsICdQT1NUJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2Nyb2JibGUgOiBmdW5jdGlvbihwYXJhbXMsIHNlc3Npb24sIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICAvKiBGbGF0dGVuIGFuIGFycmF5IG9mIG11bHRpcGxlIHRyYWNrcyBpbnRvIGFuIG9iamVjdCB3aXRoIFwiYXJyYXkgbm90YXRpb25cIi4gKi9cbiAgICAgICAgICAgIGlmKHBhcmFtcy5jb25zdHJ1Y3Rvci50b1N0cmluZygpLmluZGV4T2YoXCJBcnJheVwiKSAhPT0gLTEpe1xuICAgICAgICAgICAgICAgIHZhciBwID0ge307XG4gICAgICAgICAgICAgICAgdmFyIGk7XG4gICAgICAgICAgICAgICAgdmFyIGo7XG5cbiAgICAgICAgICAgICAgICBmb3IoaSBpbiBwYXJhbXMpe1xuICAgICAgICAgICAgICAgICAgICBpZiAocGFyYW1zLmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IoaiBpbiBwYXJhbXNbaV0pe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYXJhbXNbaV0uaGFzT3duUHJvcGVydHkoaikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcFtqICsgJ1snICsgaSArICddJ10gPSBwYXJhbXNbaV1bal07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcGFyYW1zID0gcDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2lnbmVkQ2FsbCgndHJhY2suc2Nyb2JibGUnLCBwYXJhbXMsIHNlc3Npb24sIGNhbGxiYWNrcywgJ1BPU1QnKTtcbiAgICAgICAgfSxcblxuICAgICAgICBzZWFyY2ggOiBmdW5jdGlvbihwYXJhbXMsIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICBjYWxsKCd0cmFjay5zZWFyY2gnLCBwYXJhbXMsIGNhbGxiYWNrcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2hhcmUgOiBmdW5jdGlvbihwYXJhbXMsIHNlc3Npb24sIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICAvKiBCdWlsZCBjb21tYSBzZXBhcmF0ZWQgcmVjaXBpZW50cyBzdHJpbmcuICovXG4gICAgICAgICAgICBpZih0eXBlb2YocGFyYW1zLnJlY2lwaWVudCkgPT09ICdvYmplY3QnKXtcbiAgICAgICAgICAgICAgICBwYXJhbXMucmVjaXBpZW50ID0gcGFyYW1zLnJlY2lwaWVudC5qb2luKCcsJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNpZ25lZENhbGwoJ3RyYWNrLnNoYXJlJywgcGFyYW1zLCBzZXNzaW9uLCBjYWxsYmFja3MsICdQT1NUJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdW5iYW4gOiBmdW5jdGlvbihwYXJhbXMsIHNlc3Npb24sIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICBzaWduZWRDYWxsKCd0cmFjay51bmJhbicsIHBhcmFtcywgc2Vzc2lvbiwgY2FsbGJhY2tzLCAnUE9TVCcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHVubG92ZSA6IGZ1bmN0aW9uKHBhcmFtcywgc2Vzc2lvbiwgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIHNpZ25lZENhbGwoJ3RyYWNrLnVubG92ZScsIHBhcmFtcywgc2Vzc2lvbiwgY2FsbGJhY2tzLCAnUE9TVCcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHVwZGF0ZU5vd1BsYXlpbmcgOiBmdW5jdGlvbihwYXJhbXMsIHNlc3Npb24sIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICBzaWduZWRDYWxsKCd0cmFjay51cGRhdGVOb3dQbGF5aW5nJywgcGFyYW1zLCBzZXNzaW9uLCBjYWxsYmFja3MsICdQT1NUJyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyogVXNlciBtZXRob2RzLiAqL1xuICAgIHRoaXMudXNlciA9IHtcbiAgICAgICAgZ2V0QXJ0aXN0VHJhY2tzIDogZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgY2FsbCgndXNlci5nZXRBcnRpc3RUcmFja3MnLCBwYXJhbXMsIGNhbGxiYWNrcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0QmFubmVkVHJhY2tzIDogZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgY2FsbCgndXNlci5nZXRCYW5uZWRUcmFja3MnLCBwYXJhbXMsIGNhbGxiYWNrcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0RXZlbnRzIDogZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgY2FsbCgndXNlci5nZXRFdmVudHMnLCBwYXJhbXMsIGNhbGxiYWNrcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0RnJpZW5kcyA6IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIGNhbGwoJ3VzZXIuZ2V0RnJpZW5kcycsIHBhcmFtcywgY2FsbGJhY2tzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRJbmZvIDogZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgY2FsbCgndXNlci5nZXRJbmZvJywgcGFyYW1zLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldExvdmVkVHJhY2tzIDogZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgY2FsbCgndXNlci5nZXRMb3ZlZFRyYWNrcycsIHBhcmFtcywgY2FsbGJhY2tzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXROZWlnaGJvdXJzIDogZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgY2FsbCgndXNlci5nZXROZWlnaGJvdXJzJywgcGFyYW1zLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldE5ld1JlbGVhc2VzIDogZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgY2FsbCgndXNlci5nZXROZXdSZWxlYXNlcycsIHBhcmFtcywgY2FsbGJhY2tzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRQYXN0RXZlbnRzIDogZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgY2FsbCgndXNlci5nZXRQYXN0RXZlbnRzJywgcGFyYW1zLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFBlcnNvbmFsVHJhY2tzIDogZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgY2FsbCgndXNlci5nZXRQZXJzb25hbFRyYWNrcycsIHBhcmFtcywgY2FsbGJhY2tzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRQbGF5bGlzdHMgOiBmdW5jdGlvbihwYXJhbXMsIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICBjYWxsKCd1c2VyLmdldFBsYXlsaXN0cycsIHBhcmFtcywgY2FsbGJhY2tzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRSZWNlbnRTdGF0aW9ucyA6IGZ1bmN0aW9uKHBhcmFtcywgc2Vzc2lvbiwgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIHNpZ25lZENhbGwoJ3VzZXIuZ2V0UmVjZW50U3RhdGlvbnMnLCBwYXJhbXMsIHNlc3Npb24sIGNhbGxiYWNrcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0UmVjZW50VHJhY2tzIDogZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgY2FsbCgndXNlci5nZXRSZWNlbnRUcmFja3MnLCBwYXJhbXMsIGNhbGxiYWNrcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0UmVjb21tZW5kZWRBcnRpc3RzIDogZnVuY3Rpb24ocGFyYW1zLCBzZXNzaW9uLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgc2lnbmVkQ2FsbCgndXNlci5nZXRSZWNvbW1lbmRlZEFydGlzdHMnLCBwYXJhbXMsIHNlc3Npb24sIGNhbGxiYWNrcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0UmVjb21tZW5kZWRFdmVudHMgOiBmdW5jdGlvbihwYXJhbXMsIHNlc3Npb24sIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICBzaWduZWRDYWxsKCd1c2VyLmdldFJlY29tbWVuZGVkRXZlbnRzJywgcGFyYW1zLCBzZXNzaW9uLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFNob3V0cyA6IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIGNhbGwoJ3VzZXIuZ2V0U2hvdXRzJywgcGFyYW1zLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFRvcEFsYnVtcyA6IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIGNhbGwoJ3VzZXIuZ2V0VG9wQWxidW1zJywgcGFyYW1zLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFRvcEFydGlzdHMgOiBmdW5jdGlvbihwYXJhbXMsIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICBjYWxsKCd1c2VyLmdldFRvcEFydGlzdHMnLCBwYXJhbXMsIGNhbGxiYWNrcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0VG9wVGFncyA6IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIGNhbGwoJ3VzZXIuZ2V0VG9wVGFncycsIHBhcmFtcywgY2FsbGJhY2tzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRUb3BUcmFja3MgOiBmdW5jdGlvbihwYXJhbXMsIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICBjYWxsKCd1c2VyLmdldFRvcFRyYWNrcycsIHBhcmFtcywgY2FsbGJhY2tzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRXZWVrbHlBbGJ1bUNoYXJ0IDogZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgY2FsbCgndXNlci5nZXRXZWVrbHlBbGJ1bUNoYXJ0JywgcGFyYW1zLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFdlZWtseUFydGlzdENoYXJ0IDogZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgY2FsbCgndXNlci5nZXRXZWVrbHlBcnRpc3RDaGFydCcsIHBhcmFtcywgY2FsbGJhY2tzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRXZWVrbHlDaGFydExpc3QgOiBmdW5jdGlvbihwYXJhbXMsIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICBjYWxsKCd1c2VyLmdldFdlZWtseUNoYXJ0TGlzdCcsIHBhcmFtcywgY2FsbGJhY2tzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRXZWVrbHlUcmFja0NoYXJ0IDogZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgY2FsbCgndXNlci5nZXRXZWVrbHlUcmFja0NoYXJ0JywgcGFyYW1zLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHNob3V0IDogZnVuY3Rpb24ocGFyYW1zLCBzZXNzaW9uLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgc2lnbmVkQ2FsbCgndXNlci5zaG91dCcsIHBhcmFtcywgc2Vzc2lvbiwgY2FsbGJhY2tzLCAnUE9TVCcpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qIFZlbnVlIG1ldGhvZHMuICovXG4gICAgdGhpcy52ZW51ZSA9IHtcbiAgICAgICAgZ2V0RXZlbnRzIDogZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFja3Mpe1xuICAgICAgICAgICAgY2FsbCgndmVudWUuZ2V0RXZlbnRzJywgcGFyYW1zLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFBhc3RFdmVudHMgOiBmdW5jdGlvbihwYXJhbXMsIGNhbGxiYWNrcyl7XG4gICAgICAgICAgICBjYWxsKCd2ZW51ZS5nZXRQYXN0RXZlbnRzJywgcGFyYW1zLCBjYWxsYmFja3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHNlYXJjaCA6IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2tzKXtcbiAgICAgICAgICAgIGNhbGwoJ3ZlbnVlLnNlYXJjaCcsIHBhcmFtcywgY2FsbGJhY2tzKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKiBQcml2YXRlIGF1dGggbWV0aG9kcy4gKi9cbiAgICB2YXIgYXV0aCA9IHtcbiAgICAgICAgZ2V0QXBpU2lnbmF0dXJlIDogZnVuY3Rpb24ocGFyYW1zKXtcbiAgICAgICAgICAgIHZhciBrZXlzICAgPSBbXTtcbiAgICAgICAgICAgIHZhciBzdHJpbmcgPSAnJztcbiAgICAgICAgICAgIHZhciBrZXk7XG4gICAgICAgICAgICB2YXIgaW5kZXg7XG5cbiAgICAgICAgICAgIGZvcihrZXkgaW4gcGFyYW1zKXtcbiAgICAgICAgICAgICAgICBpZiAocGFyYW1zLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAga2V5cy5wdXNoKGtleSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBrZXlzLnNvcnQoKTtcblxuICAgICAgICAgICAgZm9yKGluZGV4IGluIGtleXMpe1xuICAgICAgICAgICAgICAgIGlmIChrZXlzLmhhc093blByb3BlcnR5KGluZGV4KSkge1xuICAgICAgICAgICAgICAgICAgICBrZXkgPSBrZXlzW2luZGV4XTtcblxuICAgICAgICAgICAgICAgICAgICBzdHJpbmcgKz0ga2V5ICsgcGFyYW1zW2tleV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzdHJpbmcgKz0gYXBpU2VjcmV0O1xuXG4gICAgICAgICAgICAvKiBOZWVkcyBsYXN0Zm0uYXBpLm1kNS5qcy4gKi9cbiAgICAgICAgICAgIHJldHVybiBtZDUoc3RyaW5nKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbkxhc3RGTS5DYWNoZSA9IENhY2hlO1xuXG5tb2R1bGUuZXhwb3J0cyA9IExhc3RGTTtcbiIsIi8qIVxuICogVGhlIGJ1ZmZlciBtb2R1bGUgZnJvbSBub2RlLmpzLCBmb3IgdGhlIGJyb3dzZXIuXG4gKlxuICogQGF1dGhvciAgIEZlcm9zcyBBYm91a2hhZGlqZWggPGZlcm9zc0BmZXJvc3Mub3JnPiA8aHR0cDovL2Zlcm9zcy5vcmc+XG4gKiBAbGljZW5zZSAgTUlUXG4gKi9cblxudmFyIGJhc2U2NCA9IHJlcXVpcmUoJ2Jhc2U2NC1qcycpXG52YXIgaWVlZTc1NCA9IHJlcXVpcmUoJ2llZWU3NTQnKVxuXG5leHBvcnRzLkJ1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5TbG93QnVmZmVyID0gQnVmZmVyXG5leHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTID0gNTBcbkJ1ZmZlci5wb29sU2l6ZSA9IDgxOTJcblxuLyoqXG4gKiBJZiBgQnVmZmVyLl91c2VUeXBlZEFycmF5c2A6XG4gKiAgID09PSB0cnVlICAgIFVzZSBVaW50OEFycmF5IGltcGxlbWVudGF0aW9uIChmYXN0ZXN0KVxuICogICA9PT0gZmFsc2UgICBVc2UgT2JqZWN0IGltcGxlbWVudGF0aW9uIChjb21wYXRpYmxlIGRvd24gdG8gSUU2KVxuICovXG5CdWZmZXIuX3VzZVR5cGVkQXJyYXlzID0gKGZ1bmN0aW9uICgpIHtcbiAgLy8gRGV0ZWN0IGlmIGJyb3dzZXIgc3VwcG9ydHMgVHlwZWQgQXJyYXlzLiBTdXBwb3J0ZWQgYnJvd3NlcnMgYXJlIElFIDEwKywgRmlyZWZveCA0KyxcbiAgLy8gQ2hyb21lIDcrLCBTYWZhcmkgNS4xKywgT3BlcmEgMTEuNissIGlPUyA0LjIrLiBJZiB0aGUgYnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IGFkZGluZ1xuICAvLyBwcm9wZXJ0aWVzIHRvIGBVaW50OEFycmF5YCBpbnN0YW5jZXMsIHRoZW4gdGhhdCdzIHRoZSBzYW1lIGFzIG5vIGBVaW50OEFycmF5YCBzdXBwb3J0XG4gIC8vIGJlY2F1c2Ugd2UgbmVlZCB0byBiZSBhYmxlIHRvIGFkZCBhbGwgdGhlIG5vZGUgQnVmZmVyIEFQSSBtZXRob2RzLiBUaGlzIGlzIGFuIGlzc3VlXG4gIC8vIGluIEZpcmVmb3ggNC0yOS4gTm93IGZpeGVkOiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD02OTU0MzhcbiAgdHJ5IHtcbiAgICB2YXIgYnVmID0gbmV3IEFycmF5QnVmZmVyKDApXG4gICAgdmFyIGFyciA9IG5ldyBVaW50OEFycmF5KGJ1ZilcbiAgICBhcnIuZm9vID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gNDIgfVxuICAgIHJldHVybiA0MiA9PT0gYXJyLmZvbygpICYmXG4gICAgICAgIHR5cGVvZiBhcnIuc3ViYXJyYXkgPT09ICdmdW5jdGlvbicgLy8gQ2hyb21lIDktMTAgbGFjayBgc3ViYXJyYXlgXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufSkoKVxuXG4vKipcbiAqIENsYXNzOiBCdWZmZXJcbiAqID09PT09PT09PT09PT1cbiAqXG4gKiBUaGUgQnVmZmVyIGNvbnN0cnVjdG9yIHJldHVybnMgaW5zdGFuY2VzIG9mIGBVaW50OEFycmF5YCB0aGF0IGFyZSBhdWdtZW50ZWRcbiAqIHdpdGggZnVuY3Rpb24gcHJvcGVydGllcyBmb3IgYWxsIHRoZSBub2RlIGBCdWZmZXJgIEFQSSBmdW5jdGlvbnMuIFdlIHVzZVxuICogYFVpbnQ4QXJyYXlgIHNvIHRoYXQgc3F1YXJlIGJyYWNrZXQgbm90YXRpb24gd29ya3MgYXMgZXhwZWN0ZWQgLS0gaXQgcmV0dXJuc1xuICogYSBzaW5nbGUgb2N0ZXQuXG4gKlxuICogQnkgYXVnbWVudGluZyB0aGUgaW5zdGFuY2VzLCB3ZSBjYW4gYXZvaWQgbW9kaWZ5aW5nIHRoZSBgVWludDhBcnJheWBcbiAqIHByb3RvdHlwZS5cbiAqL1xuZnVuY3Rpb24gQnVmZmVyIChzdWJqZWN0LCBlbmNvZGluZywgbm9aZXJvKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBCdWZmZXIpKVxuICAgIHJldHVybiBuZXcgQnVmZmVyKHN1YmplY3QsIGVuY29kaW5nLCBub1plcm8pXG5cbiAgdmFyIHR5cGUgPSB0eXBlb2Ygc3ViamVjdFxuXG4gIC8vIFdvcmthcm91bmQ6IG5vZGUncyBiYXNlNjQgaW1wbGVtZW50YXRpb24gYWxsb3dzIGZvciBub24tcGFkZGVkIHN0cmluZ3NcbiAgLy8gd2hpbGUgYmFzZTY0LWpzIGRvZXMgbm90LlxuICBpZiAoZW5jb2RpbmcgPT09ICdiYXNlNjQnICYmIHR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgc3ViamVjdCA9IHN0cmluZ3RyaW0oc3ViamVjdClcbiAgICB3aGlsZSAoc3ViamVjdC5sZW5ndGggJSA0ICE9PSAwKSB7XG4gICAgICBzdWJqZWN0ID0gc3ViamVjdCArICc9J1xuICAgIH1cbiAgfVxuXG4gIC8vIEZpbmQgdGhlIGxlbmd0aFxuICB2YXIgbGVuZ3RoXG4gIGlmICh0eXBlID09PSAnbnVtYmVyJylcbiAgICBsZW5ndGggPSBjb2VyY2Uoc3ViamVjdClcbiAgZWxzZSBpZiAodHlwZSA9PT0gJ3N0cmluZycpXG4gICAgbGVuZ3RoID0gQnVmZmVyLmJ5dGVMZW5ndGgoc3ViamVjdCwgZW5jb2RpbmcpXG4gIGVsc2UgaWYgKHR5cGUgPT09ICdvYmplY3QnKVxuICAgIGxlbmd0aCA9IGNvZXJjZShzdWJqZWN0Lmxlbmd0aCkgLy8gYXNzdW1lIHRoYXQgb2JqZWN0IGlzIGFycmF5LWxpa2VcbiAgZWxzZVxuICAgIHRocm93IG5ldyBFcnJvcignRmlyc3QgYXJndW1lbnQgbmVlZHMgdG8gYmUgYSBudW1iZXIsIGFycmF5IG9yIHN0cmluZy4nKVxuXG4gIHZhciBidWZcbiAgaWYgKEJ1ZmZlci5fdXNlVHlwZWRBcnJheXMpIHtcbiAgICAvLyBQcmVmZXJyZWQ6IFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlIGZvciBiZXN0IHBlcmZvcm1hbmNlXG4gICAgYnVmID0gQnVmZmVyLl9hdWdtZW50KG5ldyBVaW50OEFycmF5KGxlbmd0aCkpXG4gIH0gZWxzZSB7XG4gICAgLy8gRmFsbGJhY2s6IFJldHVybiBUSElTIGluc3RhbmNlIG9mIEJ1ZmZlciAoY3JlYXRlZCBieSBgbmV3YClcbiAgICBidWYgPSB0aGlzXG4gICAgYnVmLmxlbmd0aCA9IGxlbmd0aFxuICAgIGJ1Zi5faXNCdWZmZXIgPSB0cnVlXG4gIH1cblxuICB2YXIgaVxuICBpZiAoQnVmZmVyLl91c2VUeXBlZEFycmF5cyAmJiB0eXBlb2Ygc3ViamVjdC5ieXRlTGVuZ3RoID09PSAnbnVtYmVyJykge1xuICAgIC8vIFNwZWVkIG9wdGltaXphdGlvbiAtLSB1c2Ugc2V0IGlmIHdlJ3JlIGNvcHlpbmcgZnJvbSBhIHR5cGVkIGFycmF5XG4gICAgYnVmLl9zZXQoc3ViamVjdClcbiAgfSBlbHNlIGlmIChpc0FycmF5aXNoKHN1YmplY3QpKSB7XG4gICAgLy8gVHJlYXQgYXJyYXktaXNoIG9iamVjdHMgYXMgYSBieXRlIGFycmF5XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoQnVmZmVyLmlzQnVmZmVyKHN1YmplY3QpKVxuICAgICAgICBidWZbaV0gPSBzdWJqZWN0LnJlYWRVSW50OChpKVxuICAgICAgZWxzZVxuICAgICAgICBidWZbaV0gPSBzdWJqZWN0W2ldXG4gICAgfVxuICB9IGVsc2UgaWYgKHR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgYnVmLndyaXRlKHN1YmplY3QsIDAsIGVuY29kaW5nKVxuICB9IGVsc2UgaWYgKHR5cGUgPT09ICdudW1iZXInICYmICFCdWZmZXIuX3VzZVR5cGVkQXJyYXlzICYmICFub1plcm8pIHtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGJ1ZltpXSA9IDBcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnVmXG59XG5cbi8vIFNUQVRJQyBNRVRIT0RTXG4vLyA9PT09PT09PT09PT09PVxuXG5CdWZmZXIuaXNFbmNvZGluZyA9IGZ1bmN0aW9uIChlbmNvZGluZykge1xuICBzd2l0Y2ggKFN0cmluZyhlbmNvZGluZykudG9Mb3dlckNhc2UoKSkge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICBjYXNlICdiaW5hcnknOlxuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgY2FzZSAncmF3JzpcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0dXJuIHRydWVcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuQnVmZmVyLmlzQnVmZmVyID0gZnVuY3Rpb24gKGIpIHtcbiAgcmV0dXJuICEhKGIgIT09IG51bGwgJiYgYiAhPT0gdW5kZWZpbmVkICYmIGIuX2lzQnVmZmVyKVxufVxuXG5CdWZmZXIuYnl0ZUxlbmd0aCA9IGZ1bmN0aW9uIChzdHIsIGVuY29kaW5nKSB7XG4gIHZhciByZXRcbiAgc3RyID0gc3RyICsgJydcbiAgc3dpdGNoIChlbmNvZGluZyB8fCAndXRmOCcpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgICAgcmV0ID0gc3RyLmxlbmd0aCAvIDJcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0ID0gdXRmOFRvQnl0ZXMoc3RyKS5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYXNjaWknOlxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgY2FzZSAncmF3JzpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIHJldCA9IGJhc2U2NFRvQnl0ZXMoc3RyKS5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGggKiAyXG4gICAgICBicmVha1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gZW5jb2RpbmcnKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuQnVmZmVyLmNvbmNhdCA9IGZ1bmN0aW9uIChsaXN0LCB0b3RhbExlbmd0aCkge1xuICBhc3NlcnQoaXNBcnJheShsaXN0KSwgJ1VzYWdlOiBCdWZmZXIuY29uY2F0KGxpc3QsIFt0b3RhbExlbmd0aF0pXFxuJyArXG4gICAgICAnbGlzdCBzaG91bGQgYmUgYW4gQXJyYXkuJylcblxuICBpZiAobGlzdC5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcigwKVxuICB9IGVsc2UgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIGxpc3RbMF1cbiAgfVxuXG4gIHZhciBpXG4gIGlmICh0eXBlb2YgdG90YWxMZW5ndGggIT09ICdudW1iZXInKSB7XG4gICAgdG90YWxMZW5ndGggPSAwXG4gICAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRvdGFsTGVuZ3RoICs9IGxpc3RbaV0ubGVuZ3RoXG4gICAgfVxuICB9XG5cbiAgdmFyIGJ1ZiA9IG5ldyBCdWZmZXIodG90YWxMZW5ndGgpXG4gIHZhciBwb3MgPSAwXG4gIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGl0ZW0gPSBsaXN0W2ldXG4gICAgaXRlbS5jb3B5KGJ1ZiwgcG9zKVxuICAgIHBvcyArPSBpdGVtLmxlbmd0aFxuICB9XG4gIHJldHVybiBidWZcbn1cblxuLy8gQlVGRkVSIElOU1RBTkNFIE1FVEhPRFNcbi8vID09PT09PT09PT09PT09PT09PT09PT09XG5cbmZ1bmN0aW9uIF9oZXhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIG9mZnNldCA9IE51bWJlcihvZmZzZXQpIHx8IDBcbiAgdmFyIHJlbWFpbmluZyA9IGJ1Zi5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKCFsZW5ndGgpIHtcbiAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgfSBlbHNlIHtcbiAgICBsZW5ndGggPSBOdW1iZXIobGVuZ3RoKVxuICAgIGlmIChsZW5ndGggPiByZW1haW5pbmcpIHtcbiAgICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICAgIH1cbiAgfVxuXG4gIC8vIG11c3QgYmUgYW4gZXZlbiBudW1iZXIgb2YgZGlnaXRzXG4gIHZhciBzdHJMZW4gPSBzdHJpbmcubGVuZ3RoXG4gIGFzc2VydChzdHJMZW4gJSAyID09PSAwLCAnSW52YWxpZCBoZXggc3RyaW5nJylcblxuICBpZiAobGVuZ3RoID4gc3RyTGVuIC8gMikge1xuICAgIGxlbmd0aCA9IHN0ckxlbiAvIDJcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGJ5dGUgPSBwYXJzZUludChzdHJpbmcuc3Vic3RyKGkgKiAyLCAyKSwgMTYpXG4gICAgYXNzZXJ0KCFpc05hTihieXRlKSwgJ0ludmFsaWQgaGV4IHN0cmluZycpXG4gICAgYnVmW29mZnNldCArIGldID0gYnl0ZVxuICB9XG4gIEJ1ZmZlci5fY2hhcnNXcml0dGVuID0gaSAqIDJcbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gX3V0ZjhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9XG4gICAgYmxpdEJ1ZmZlcih1dGY4VG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbmZ1bmN0aW9uIF9hc2NpaVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgdmFyIGNoYXJzV3JpdHRlbiA9IEJ1ZmZlci5fY2hhcnNXcml0dGVuID1cbiAgICBibGl0QnVmZmVyKGFzY2lpVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbmZ1bmN0aW9uIF9iaW5hcnlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBfYXNjaWlXcml0ZShidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIF9iYXNlNjRXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9XG4gICAgYmxpdEJ1ZmZlcihiYXNlNjRUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG4gIHJldHVybiBjaGFyc1dyaXR0ZW5cbn1cblxuZnVuY3Rpb24gX3V0ZjE2bGVXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9XG4gICAgYmxpdEJ1ZmZlcih1dGYxNmxlVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpIHtcbiAgLy8gU3VwcG9ydCBib3RoIChzdHJpbmcsIG9mZnNldCwgbGVuZ3RoLCBlbmNvZGluZylcbiAgLy8gYW5kIHRoZSBsZWdhY3kgKHN0cmluZywgZW5jb2RpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICBpZiAoaXNGaW5pdGUob2Zmc2V0KSkge1xuICAgIGlmICghaXNGaW5pdGUobGVuZ3RoKSkge1xuICAgICAgZW5jb2RpbmcgPSBsZW5ndGhcbiAgICAgIGxlbmd0aCA9IHVuZGVmaW5lZFxuICAgIH1cbiAgfSBlbHNlIHsgIC8vIGxlZ2FjeVxuICAgIHZhciBzd2FwID0gZW5jb2RpbmdcbiAgICBlbmNvZGluZyA9IG9mZnNldFxuICAgIG9mZnNldCA9IGxlbmd0aFxuICAgIGxlbmd0aCA9IHN3YXBcbiAgfVxuXG4gIG9mZnNldCA9IE51bWJlcihvZmZzZXQpIHx8IDBcbiAgdmFyIHJlbWFpbmluZyA9IHRoaXMubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cbiAgZW5jb2RpbmcgPSBTdHJpbmcoZW5jb2RpbmcgfHwgJ3V0ZjgnKS50b0xvd2VyQ2FzZSgpXG5cbiAgdmFyIHJldFxuICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldCA9IF9oZXhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgICByZXQgPSBfdXRmOFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgIHJldCA9IF9hc2NpaVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICByZXQgPSBfYmluYXJ5V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIHJldCA9IF9iYXNlNjRXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0ID0gX3V0ZjE2bGVXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGVuY29kaW5nJylcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoZW5jb2RpbmcsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgZW5jb2RpbmcgPSBTdHJpbmcoZW5jb2RpbmcgfHwgJ3V0ZjgnKS50b0xvd2VyQ2FzZSgpXG4gIHN0YXJ0ID0gTnVtYmVyKHN0YXJ0KSB8fCAwXG4gIGVuZCA9IChlbmQgIT09IHVuZGVmaW5lZClcbiAgICA/IE51bWJlcihlbmQpXG4gICAgOiBlbmQgPSBzZWxmLmxlbmd0aFxuXG4gIC8vIEZhc3RwYXRoIGVtcHR5IHN0cmluZ3NcbiAgaWYgKGVuZCA9PT0gc3RhcnQpXG4gICAgcmV0dXJuICcnXG5cbiAgdmFyIHJldFxuICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldCA9IF9oZXhTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgICByZXQgPSBfdXRmOFNsaWNlKHNlbGYsIHN0YXJ0LCBlbmQpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgIHJldCA9IF9hc2NpaVNsaWNlKHNlbGYsIHN0YXJ0LCBlbmQpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICByZXQgPSBfYmluYXJ5U2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIHJldCA9IF9iYXNlNjRTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0ID0gX3V0ZjE2bGVTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGVuY29kaW5nJylcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4ge1xuICAgIHR5cGU6ICdCdWZmZXInLFxuICAgIGRhdGE6IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRoaXMuX2FyciB8fCB0aGlzLCAwKVxuICB9XG59XG5cbi8vIGNvcHkodGFyZ2V0QnVmZmVyLCB0YXJnZXRTdGFydD0wLCBzb3VyY2VTdGFydD0wLCBzb3VyY2VFbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uICh0YXJnZXQsIHRhcmdldF9zdGFydCwgc3RhcnQsIGVuZCkge1xuICB2YXIgc291cmNlID0gdGhpc1xuXG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCAmJiBlbmQgIT09IDApIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICghdGFyZ2V0X3N0YXJ0KSB0YXJnZXRfc3RhcnQgPSAwXG5cbiAgLy8gQ29weSAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm5cbiAgaWYgKHRhcmdldC5sZW5ndGggPT09IDAgfHwgc291cmNlLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgLy8gRmF0YWwgZXJyb3IgY29uZGl0aW9uc1xuICBhc3NlcnQoZW5kID49IHN0YXJ0LCAnc291cmNlRW5kIDwgc291cmNlU3RhcnQnKVxuICBhc3NlcnQodGFyZ2V0X3N0YXJ0ID49IDAgJiYgdGFyZ2V0X3N0YXJ0IDwgdGFyZ2V0Lmxlbmd0aCxcbiAgICAgICd0YXJnZXRTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgYXNzZXJ0KHN0YXJ0ID49IDAgJiYgc3RhcnQgPCBzb3VyY2UubGVuZ3RoLCAnc291cmNlU3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGFzc2VydChlbmQgPj0gMCAmJiBlbmQgPD0gc291cmNlLmxlbmd0aCwgJ3NvdXJjZUVuZCBvdXQgb2YgYm91bmRzJylcblxuICAvLyBBcmUgd2Ugb29iP1xuICBpZiAoZW5kID4gdGhpcy5sZW5ndGgpXG4gICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldC5sZW5ndGggLSB0YXJnZXRfc3RhcnQgPCBlbmQgLSBzdGFydClcbiAgICBlbmQgPSB0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0X3N0YXJ0ICsgc3RhcnRcblxuICB2YXIgbGVuID0gZW5kIC0gc3RhcnRcblxuICBpZiAobGVuIDwgMTAwIHx8ICFCdWZmZXIuX3VzZVR5cGVkQXJyYXlzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIHRhcmdldFtpICsgdGFyZ2V0X3N0YXJ0XSA9IHRoaXNbaSArIHN0YXJ0XVxuICB9IGVsc2Uge1xuICAgIHRhcmdldC5fc2V0KHRoaXMuc3ViYXJyYXkoc3RhcnQsIHN0YXJ0ICsgbGVuKSwgdGFyZ2V0X3N0YXJ0KVxuICB9XG59XG5cbmZ1bmN0aW9uIF9iYXNlNjRTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGlmIChzdGFydCA9PT0gMCAmJiBlbmQgPT09IGJ1Zi5sZW5ndGgpIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYuc2xpY2Uoc3RhcnQsIGVuZCkpXG4gIH1cbn1cblxuZnVuY3Rpb24gX3V0ZjhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXMgPSAnJ1xuICB2YXIgdG1wID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgaWYgKGJ1ZltpXSA8PSAweDdGKSB7XG4gICAgICByZXMgKz0gZGVjb2RlVXRmOENoYXIodG1wKSArIFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldKVxuICAgICAgdG1wID0gJydcbiAgICB9IGVsc2Uge1xuICAgICAgdG1wICs9ICclJyArIGJ1ZltpXS50b1N0cmluZygxNilcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzICsgZGVjb2RlVXRmOENoYXIodG1wKVxufVxuXG5mdW5jdGlvbiBfYXNjaWlTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXQgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspXG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldKVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIF9iaW5hcnlTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHJldHVybiBfYXNjaWlTbGljZShidWYsIHN0YXJ0LCBlbmQpXG59XG5cbmZ1bmN0aW9uIF9oZXhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG5cbiAgaWYgKCFzdGFydCB8fCBzdGFydCA8IDApIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCB8fCBlbmQgPCAwIHx8IGVuZCA+IGxlbikgZW5kID0gbGVuXG5cbiAgdmFyIG91dCA9ICcnXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgb3V0ICs9IHRvSGV4KGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gb3V0XG59XG5cbmZ1bmN0aW9uIF91dGYxNmxlU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgYnl0ZXMgPSBidWYuc2xpY2Uoc3RhcnQsIGVuZClcbiAgdmFyIHJlcyA9ICcnXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYnl0ZXMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICByZXMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShieXRlc1tpXSArIGJ5dGVzW2krMV0gKiAyNTYpXG4gIH1cbiAgcmV0dXJuIHJlc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnNsaWNlID0gZnVuY3Rpb24gKHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIHN0YXJ0ID0gY2xhbXAoc3RhcnQsIGxlbiwgMClcbiAgZW5kID0gY2xhbXAoZW5kLCBsZW4sIGxlbilcblxuICBpZiAoQnVmZmVyLl91c2VUeXBlZEFycmF5cykge1xuICAgIHJldHVybiBCdWZmZXIuX2F1Z21lbnQodGhpcy5zdWJhcnJheShzdGFydCwgZW5kKSlcbiAgfSBlbHNlIHtcbiAgICB2YXIgc2xpY2VMZW4gPSBlbmQgLSBzdGFydFxuICAgIHZhciBuZXdCdWYgPSBuZXcgQnVmZmVyKHNsaWNlTGVuLCB1bmRlZmluZWQsIHRydWUpXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzbGljZUxlbjsgaSsrKSB7XG4gICAgICBuZXdCdWZbaV0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gICAgcmV0dXJuIG5ld0J1ZlxuICB9XG59XG5cbi8vIGBnZXRgIHdpbGwgYmUgcmVtb3ZlZCBpbiBOb2RlIDAuMTMrXG5CdWZmZXIucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChvZmZzZXQpIHtcbiAgY29uc29sZS5sb2coJy5nZXQoKSBpcyBkZXByZWNhdGVkLiBBY2Nlc3MgdXNpbmcgYXJyYXkgaW5kZXhlcyBpbnN0ZWFkLicpXG4gIHJldHVybiB0aGlzLnJlYWRVSW50OChvZmZzZXQpXG59XG5cbi8vIGBzZXRgIHdpbGwgYmUgcmVtb3ZlZCBpbiBOb2RlIDAuMTMrXG5CdWZmZXIucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uICh2LCBvZmZzZXQpIHtcbiAgY29uc29sZS5sb2coJy5zZXQoKSBpcyBkZXByZWNhdGVkLiBBY2Nlc3MgdXNpbmcgYXJyYXkgaW5kZXhlcyBpbnN0ZWFkLicpXG4gIHJldHVybiB0aGlzLndyaXRlVUludDgodiwgb2Zmc2V0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50OCA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgPCB0aGlzLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIGlmIChvZmZzZXQgPj0gdGhpcy5sZW5ndGgpXG4gICAgcmV0dXJuXG5cbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5mdW5jdGlvbiBfcmVhZFVJbnQxNiAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAxIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIHZhciB2YWxcbiAgaWYgKGxpdHRsZUVuZGlhbikge1xuICAgIHZhbCA9IGJ1ZltvZmZzZXRdXG4gICAgaWYgKG9mZnNldCArIDEgPCBsZW4pXG4gICAgICB2YWwgfD0gYnVmW29mZnNldCArIDFdIDw8IDhcbiAgfSBlbHNlIHtcbiAgICB2YWwgPSBidWZbb2Zmc2V0XSA8PCA4XG4gICAgaWYgKG9mZnNldCArIDEgPCBsZW4pXG4gICAgICB2YWwgfD0gYnVmW29mZnNldCArIDFdXG4gIH1cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZFVJbnQxNih0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZFVJbnQxNih0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3JlYWRVSW50MzIgKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICB2YXIgdmFsXG4gIGlmIChsaXR0bGVFbmRpYW4pIHtcbiAgICBpZiAob2Zmc2V0ICsgMiA8IGxlbilcbiAgICAgIHZhbCA9IGJ1ZltvZmZzZXQgKyAyXSA8PCAxNlxuICAgIGlmIChvZmZzZXQgKyAxIDwgbGVuKVxuICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAxXSA8PCA4XG4gICAgdmFsIHw9IGJ1ZltvZmZzZXRdXG4gICAgaWYgKG9mZnNldCArIDMgPCBsZW4pXG4gICAgICB2YWwgPSB2YWwgKyAoYnVmW29mZnNldCArIDNdIDw8IDI0ID4+PiAwKVxuICB9IGVsc2Uge1xuICAgIGlmIChvZmZzZXQgKyAxIDwgbGVuKVxuICAgICAgdmFsID0gYnVmW29mZnNldCArIDFdIDw8IDE2XG4gICAgaWYgKG9mZnNldCArIDIgPCBsZW4pXG4gICAgICB2YWwgfD0gYnVmW29mZnNldCArIDJdIDw8IDhcbiAgICBpZiAob2Zmc2V0ICsgMyA8IGxlbilcbiAgICAgIHZhbCB8PSBidWZbb2Zmc2V0ICsgM11cbiAgICB2YWwgPSB2YWwgKyAoYnVmW29mZnNldF0gPDwgMjQgPj4+IDApXG4gIH1cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZFVJbnQzMih0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZFVJbnQzMih0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50OCA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLFxuICAgICAgICAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgPCB0aGlzLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIGlmIChvZmZzZXQgPj0gdGhpcy5sZW5ndGgpXG4gICAgcmV0dXJuXG5cbiAgdmFyIG5lZyA9IHRoaXNbb2Zmc2V0XSAmIDB4ODBcbiAgaWYgKG5lZylcbiAgICByZXR1cm4gKDB4ZmYgLSB0aGlzW29mZnNldF0gKyAxKSAqIC0xXG4gIGVsc2VcbiAgICByZXR1cm4gdGhpc1tvZmZzZXRdXG59XG5cbmZ1bmN0aW9uIF9yZWFkSW50MTYgKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMSA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICB2YXIgdmFsID0gX3JlYWRVSW50MTYoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgdHJ1ZSlcbiAgdmFyIG5lZyA9IHZhbCAmIDB4ODAwMFxuICBpZiAobmVnKVxuICAgIHJldHVybiAoMHhmZmZmIC0gdmFsICsgMSkgKiAtMVxuICBlbHNlXG4gICAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkSW50MTYodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEludDE2KHRoaXMsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfcmVhZEludDMyIChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgdmFyIHZhbCA9IF9yZWFkVUludDMyKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIHRydWUpXG4gIHZhciBuZWcgPSB2YWwgJiAweDgwMDAwMDAwXG4gIGlmIChuZWcpXG4gICAgcmV0dXJuICgweGZmZmZmZmZmIC0gdmFsICsgMSkgKiAtMVxuICBlbHNlXG4gICAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkSW50MzIodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEludDMyKHRoaXMsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfcmVhZEZsb2F0IChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHJldHVybiBpZWVlNzU0LnJlYWQoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0TEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRGbG9hdCh0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdEJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkRmxvYXQodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF9yZWFkRG91YmxlIChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgKyA3IDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHJldHVybiBpZWVlNzU0LnJlYWQoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgNTIsIDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkRG91YmxlKHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkRG91YmxlKHRoaXMsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDggPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0IDwgdGhpcy5sZW5ndGgsICd0cnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmdWludCh2YWx1ZSwgMHhmZilcbiAgfVxuXG4gIGlmIChvZmZzZXQgPj0gdGhpcy5sZW5ndGgpIHJldHVyblxuXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG59XG5cbmZ1bmN0aW9uIF93cml0ZVVJbnQxNiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAxIDwgYnVmLmxlbmd0aCwgJ3RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZ1aW50KHZhbHVlLCAweGZmZmYpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBmb3IgKHZhciBpID0gMCwgaiA9IE1hdGgubWluKGxlbiAtIG9mZnNldCwgMik7IGkgPCBqOyBpKyspIHtcbiAgICBidWZbb2Zmc2V0ICsgaV0gPVxuICAgICAgICAodmFsdWUgJiAoMHhmZiA8PCAoOCAqIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpKSkpID4+PlxuICAgICAgICAgICAgKGxpdHRsZUVuZGlhbiA/IGkgOiAxIC0gaSkgKiA4XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF93cml0ZVVJbnQzMiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ3RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZ1aW50KHZhbHVlLCAweGZmZmZmZmZmKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgZm9yICh2YXIgaSA9IDAsIGogPSBNYXRoLm1pbihsZW4gLSBvZmZzZXQsIDQpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID1cbiAgICAgICAgKHZhbHVlID4+PiAobGl0dGxlRW5kaWFuID8gaSA6IDMgLSBpKSAqIDgpICYgMHhmZlxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50OCA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgPCB0aGlzLmxlbmd0aCwgJ1RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZzaW50KHZhbHVlLCAweDdmLCAtMHg4MClcbiAgfVxuXG4gIGlmIChvZmZzZXQgPj0gdGhpcy5sZW5ndGgpXG4gICAgcmV0dXJuXG5cbiAgaWYgKHZhbHVlID49IDApXG4gICAgdGhpcy53cml0ZVVJbnQ4KHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KVxuICBlbHNlXG4gICAgdGhpcy53cml0ZVVJbnQ4KDB4ZmYgKyB2YWx1ZSArIDEsIG9mZnNldCwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF93cml0ZUludDE2IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDEgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnNpbnQodmFsdWUsIDB4N2ZmZiwgLTB4ODAwMClcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIGlmICh2YWx1ZSA+PSAwKVxuICAgIF93cml0ZVVJbnQxNihidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpXG4gIGVsc2VcbiAgICBfd3JpdGVVSW50MTYoYnVmLCAweGZmZmYgKyB2YWx1ZSArIDEsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2TEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3dyaXRlSW50MzIgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmc2ludCh2YWx1ZSwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZiAodmFsdWUgPj0gMClcbiAgICBfd3JpdGVVSW50MzIoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KVxuICBlbHNlXG4gICAgX3dyaXRlVUludDMyKGJ1ZiwgMHhmZmZmZmZmZiArIHZhbHVlICsgMSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyQkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfd3JpdGVGbG9hdCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZJRUVFNzU0KHZhbHVlLCAzLjQwMjgyMzQ2NjM4NTI4ODZlKzM4LCAtMy40MDI4MjM0NjYzODUyODg2ZSszOClcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0QkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfd3JpdGVEb3VibGUgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgNyA8IGJ1Zi5sZW5ndGgsXG4gICAgICAgICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmSUVFRTc1NCh2YWx1ZSwgMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgsIC0xLjc5NzY5MzEzNDg2MjMxNTdFKzMwOClcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDUyLCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlTEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlQkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuLy8gZmlsbCh2YWx1ZSwgc3RhcnQ9MCwgZW5kPWJ1ZmZlci5sZW5ndGgpXG5CdWZmZXIucHJvdG90eXBlLmZpbGwgPSBmdW5jdGlvbiAodmFsdWUsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKCF2YWx1ZSkgdmFsdWUgPSAwXG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCkgZW5kID0gdGhpcy5sZW5ndGhcblxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgIHZhbHVlID0gdmFsdWUuY2hhckNvZGVBdCgwKVxuICB9XG5cbiAgYXNzZXJ0KHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicgJiYgIWlzTmFOKHZhbHVlKSwgJ3ZhbHVlIGlzIG5vdCBhIG51bWJlcicpXG4gIGFzc2VydChlbmQgPj0gc3RhcnQsICdlbmQgPCBzdGFydCcpXG5cbiAgLy8gRmlsbCAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm5cbiAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm5cblxuICBhc3NlcnQoc3RhcnQgPj0gMCAmJiBzdGFydCA8IHRoaXMubGVuZ3RoLCAnc3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGFzc2VydChlbmQgPj0gMCAmJiBlbmQgPD0gdGhpcy5sZW5ndGgsICdlbmQgb3V0IG9mIGJvdW5kcycpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICB0aGlzW2ldID0gdmFsdWVcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBvdXQgPSBbXVxuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgIG91dFtpXSA9IHRvSGV4KHRoaXNbaV0pXG4gICAgaWYgKGkgPT09IGV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVMpIHtcbiAgICAgIG91dFtpICsgMV0gPSAnLi4uJ1xuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cbiAgcmV0dXJuICc8QnVmZmVyICcgKyBvdXQuam9pbignICcpICsgJz4nXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBgQXJyYXlCdWZmZXJgIHdpdGggdGhlICpjb3BpZWQqIG1lbW9yeSBvZiB0aGUgYnVmZmVyIGluc3RhbmNlLlxuICogQWRkZWQgaW4gTm9kZSAwLjEyLiBPbmx5IGF2YWlsYWJsZSBpbiBicm93c2VycyB0aGF0IHN1cHBvcnQgQXJyYXlCdWZmZXIuXG4gKi9cbkJ1ZmZlci5wcm90b3R5cGUudG9BcnJheUJ1ZmZlciA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJykge1xuICAgIGlmIChCdWZmZXIuX3VzZVR5cGVkQXJyYXlzKSB7XG4gICAgICByZXR1cm4gKG5ldyBCdWZmZXIodGhpcykpLmJ1ZmZlclxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgYnVmID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5sZW5ndGgpXG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gYnVmLmxlbmd0aDsgaSA8IGxlbjsgaSArPSAxKVxuICAgICAgICBidWZbaV0gPSB0aGlzW2ldXG4gICAgICByZXR1cm4gYnVmLmJ1ZmZlclxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0J1ZmZlci50b0FycmF5QnVmZmVyIG5vdCBzdXBwb3J0ZWQgaW4gdGhpcyBicm93c2VyJylcbiAgfVxufVxuXG4vLyBIRUxQRVIgRlVOQ1RJT05TXG4vLyA9PT09PT09PT09PT09PT09XG5cbmZ1bmN0aW9uIHN0cmluZ3RyaW0gKHN0cikge1xuICBpZiAoc3RyLnRyaW0pIHJldHVybiBzdHIudHJpbSgpXG4gIHJldHVybiBzdHIucmVwbGFjZSgvXlxccyt8XFxzKyQvZywgJycpXG59XG5cbnZhciBCUCA9IEJ1ZmZlci5wcm90b3R5cGVcblxuLyoqXG4gKiBBdWdtZW50IGEgVWludDhBcnJheSAqaW5zdGFuY2UqIChub3QgdGhlIFVpbnQ4QXJyYXkgY2xhc3MhKSB3aXRoIEJ1ZmZlciBtZXRob2RzXG4gKi9cbkJ1ZmZlci5fYXVnbWVudCA9IGZ1bmN0aW9uIChhcnIpIHtcbiAgYXJyLl9pc0J1ZmZlciA9IHRydWVcblxuICAvLyBzYXZlIHJlZmVyZW5jZSB0byBvcmlnaW5hbCBVaW50OEFycmF5IGdldC9zZXQgbWV0aG9kcyBiZWZvcmUgb3ZlcndyaXRpbmdcbiAgYXJyLl9nZXQgPSBhcnIuZ2V0XG4gIGFyci5fc2V0ID0gYXJyLnNldFxuXG4gIC8vIGRlcHJlY2F0ZWQsIHdpbGwgYmUgcmVtb3ZlZCBpbiBub2RlIDAuMTMrXG4gIGFyci5nZXQgPSBCUC5nZXRcbiAgYXJyLnNldCA9IEJQLnNldFxuXG4gIGFyci53cml0ZSA9IEJQLndyaXRlXG4gIGFyci50b1N0cmluZyA9IEJQLnRvU3RyaW5nXG4gIGFyci50b0xvY2FsZVN0cmluZyA9IEJQLnRvU3RyaW5nXG4gIGFyci50b0pTT04gPSBCUC50b0pTT05cbiAgYXJyLmNvcHkgPSBCUC5jb3B5XG4gIGFyci5zbGljZSA9IEJQLnNsaWNlXG4gIGFyci5yZWFkVUludDggPSBCUC5yZWFkVUludDhcbiAgYXJyLnJlYWRVSW50MTZMRSA9IEJQLnJlYWRVSW50MTZMRVxuICBhcnIucmVhZFVJbnQxNkJFID0gQlAucmVhZFVJbnQxNkJFXG4gIGFyci5yZWFkVUludDMyTEUgPSBCUC5yZWFkVUludDMyTEVcbiAgYXJyLnJlYWRVSW50MzJCRSA9IEJQLnJlYWRVSW50MzJCRVxuICBhcnIucmVhZEludDggPSBCUC5yZWFkSW50OFxuICBhcnIucmVhZEludDE2TEUgPSBCUC5yZWFkSW50MTZMRVxuICBhcnIucmVhZEludDE2QkUgPSBCUC5yZWFkSW50MTZCRVxuICBhcnIucmVhZEludDMyTEUgPSBCUC5yZWFkSW50MzJMRVxuICBhcnIucmVhZEludDMyQkUgPSBCUC5yZWFkSW50MzJCRVxuICBhcnIucmVhZEZsb2F0TEUgPSBCUC5yZWFkRmxvYXRMRVxuICBhcnIucmVhZEZsb2F0QkUgPSBCUC5yZWFkRmxvYXRCRVxuICBhcnIucmVhZERvdWJsZUxFID0gQlAucmVhZERvdWJsZUxFXG4gIGFyci5yZWFkRG91YmxlQkUgPSBCUC5yZWFkRG91YmxlQkVcbiAgYXJyLndyaXRlVUludDggPSBCUC53cml0ZVVJbnQ4XG4gIGFyci53cml0ZVVJbnQxNkxFID0gQlAud3JpdGVVSW50MTZMRVxuICBhcnIud3JpdGVVSW50MTZCRSA9IEJQLndyaXRlVUludDE2QkVcbiAgYXJyLndyaXRlVUludDMyTEUgPSBCUC53cml0ZVVJbnQzMkxFXG4gIGFyci53cml0ZVVJbnQzMkJFID0gQlAud3JpdGVVSW50MzJCRVxuICBhcnIud3JpdGVJbnQ4ID0gQlAud3JpdGVJbnQ4XG4gIGFyci53cml0ZUludDE2TEUgPSBCUC53cml0ZUludDE2TEVcbiAgYXJyLndyaXRlSW50MTZCRSA9IEJQLndyaXRlSW50MTZCRVxuICBhcnIud3JpdGVJbnQzMkxFID0gQlAud3JpdGVJbnQzMkxFXG4gIGFyci53cml0ZUludDMyQkUgPSBCUC53cml0ZUludDMyQkVcbiAgYXJyLndyaXRlRmxvYXRMRSA9IEJQLndyaXRlRmxvYXRMRVxuICBhcnIud3JpdGVGbG9hdEJFID0gQlAud3JpdGVGbG9hdEJFXG4gIGFyci53cml0ZURvdWJsZUxFID0gQlAud3JpdGVEb3VibGVMRVxuICBhcnIud3JpdGVEb3VibGVCRSA9IEJQLndyaXRlRG91YmxlQkVcbiAgYXJyLmZpbGwgPSBCUC5maWxsXG4gIGFyci5pbnNwZWN0ID0gQlAuaW5zcGVjdFxuICBhcnIudG9BcnJheUJ1ZmZlciA9IEJQLnRvQXJyYXlCdWZmZXJcblxuICByZXR1cm4gYXJyXG59XG5cbi8vIHNsaWNlKHN0YXJ0LCBlbmQpXG5mdW5jdGlvbiBjbGFtcCAoaW5kZXgsIGxlbiwgZGVmYXVsdFZhbHVlKSB7XG4gIGlmICh0eXBlb2YgaW5kZXggIT09ICdudW1iZXInKSByZXR1cm4gZGVmYXVsdFZhbHVlXG4gIGluZGV4ID0gfn5pbmRleDsgIC8vIENvZXJjZSB0byBpbnRlZ2VyLlxuICBpZiAoaW5kZXggPj0gbGVuKSByZXR1cm4gbGVuXG4gIGlmIChpbmRleCA+PSAwKSByZXR1cm4gaW5kZXhcbiAgaW5kZXggKz0gbGVuXG4gIGlmIChpbmRleCA+PSAwKSByZXR1cm4gaW5kZXhcbiAgcmV0dXJuIDBcbn1cblxuZnVuY3Rpb24gY29lcmNlIChsZW5ndGgpIHtcbiAgLy8gQ29lcmNlIGxlbmd0aCB0byBhIG51bWJlciAocG9zc2libHkgTmFOKSwgcm91bmQgdXBcbiAgLy8gaW4gY2FzZSBpdCdzIGZyYWN0aW9uYWwgKGUuZy4gMTIzLjQ1NikgdGhlbiBkbyBhXG4gIC8vIGRvdWJsZSBuZWdhdGUgdG8gY29lcmNlIGEgTmFOIHRvIDAuIEVhc3ksIHJpZ2h0P1xuICBsZW5ndGggPSB+fk1hdGguY2VpbCgrbGVuZ3RoKVxuICByZXR1cm4gbGVuZ3RoIDwgMCA/IDAgOiBsZW5ndGhcbn1cblxuZnVuY3Rpb24gaXNBcnJheSAoc3ViamVjdCkge1xuICByZXR1cm4gKEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKHN1YmplY3QpIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHN1YmplY3QpID09PSAnW29iamVjdCBBcnJheV0nXG4gIH0pKHN1YmplY3QpXG59XG5cbmZ1bmN0aW9uIGlzQXJyYXlpc2ggKHN1YmplY3QpIHtcbiAgcmV0dXJuIGlzQXJyYXkoc3ViamVjdCkgfHwgQnVmZmVyLmlzQnVmZmVyKHN1YmplY3QpIHx8XG4gICAgICBzdWJqZWN0ICYmIHR5cGVvZiBzdWJqZWN0ID09PSAnb2JqZWN0JyAmJlxuICAgICAgdHlwZW9mIHN1YmplY3QubGVuZ3RoID09PSAnbnVtYmVyJ1xufVxuXG5mdW5jdGlvbiB0b0hleCAobikge1xuICBpZiAobiA8IDE2KSByZXR1cm4gJzAnICsgbi50b1N0cmluZygxNilcbiAgcmV0dXJuIG4udG9TdHJpbmcoMTYpXG59XG5cbmZ1bmN0aW9uIHV0ZjhUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGIgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGlmIChiIDw9IDB4N0YpXG4gICAgICBieXRlQXJyYXkucHVzaChzdHIuY2hhckNvZGVBdChpKSlcbiAgICBlbHNlIHtcbiAgICAgIHZhciBzdGFydCA9IGlcbiAgICAgIGlmIChiID49IDB4RDgwMCAmJiBiIDw9IDB4REZGRikgaSsrXG4gICAgICB2YXIgaCA9IGVuY29kZVVSSUNvbXBvbmVudChzdHIuc2xpY2Uoc3RhcnQsIGkrMSkpLnN1YnN0cigxKS5zcGxpdCgnJScpXG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGgubGVuZ3RoOyBqKyspXG4gICAgICAgIGJ5dGVBcnJheS5wdXNoKHBhcnNlSW50KGhbal0sIDE2KSlcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiBhc2NpaVRvQnl0ZXMgKHN0cikge1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICAvLyBOb2RlJ3MgY29kZSBzZWVtcyB0byBiZSBkb2luZyB0aGlzIGFuZCBub3QgJiAweDdGLi5cbiAgICBieXRlQXJyYXkucHVzaChzdHIuY2hhckNvZGVBdChpKSAmIDB4RkYpXG4gIH1cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiB1dGYxNmxlVG9CeXRlcyAoc3RyKSB7XG4gIHZhciBjLCBoaSwgbG9cbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgYyA9IHN0ci5jaGFyQ29kZUF0KGkpXG4gICAgaGkgPSBjID4+IDhcbiAgICBsbyA9IGMgJSAyNTZcbiAgICBieXRlQXJyYXkucHVzaChsbylcbiAgICBieXRlQXJyYXkucHVzaChoaSlcbiAgfVxuXG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gYmFzZTY0VG9CeXRlcyAoc3RyKSB7XG4gIHJldHVybiBiYXNlNjQudG9CeXRlQXJyYXkoc3RyKVxufVxuXG5mdW5jdGlvbiBibGl0QnVmZmVyIChzcmMsIGRzdCwgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgdmFyIHBvc1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKChpICsgb2Zmc2V0ID49IGRzdC5sZW5ndGgpIHx8IChpID49IHNyYy5sZW5ndGgpKVxuICAgICAgYnJlYWtcbiAgICBkc3RbaSArIG9mZnNldF0gPSBzcmNbaV1cbiAgfVxuICByZXR1cm4gaVxufVxuXG5mdW5jdGlvbiBkZWNvZGVVdGY4Q2hhciAoc3RyKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChzdHIpXG4gIH0gY2F0Y2ggKGVycikge1xuICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKDB4RkZGRCkgLy8gVVRGIDggaW52YWxpZCBjaGFyXG4gIH1cbn1cblxuLypcbiAqIFdlIGhhdmUgdG8gbWFrZSBzdXJlIHRoYXQgdGhlIHZhbHVlIGlzIGEgdmFsaWQgaW50ZWdlci4gVGhpcyBtZWFucyB0aGF0IGl0XG4gKiBpcyBub24tbmVnYXRpdmUuIEl0IGhhcyBubyBmcmFjdGlvbmFsIGNvbXBvbmVudCBhbmQgdGhhdCBpdCBkb2VzIG5vdFxuICogZXhjZWVkIHRoZSBtYXhpbXVtIGFsbG93ZWQgdmFsdWUuXG4gKi9cbmZ1bmN0aW9uIHZlcmlmdWludCAodmFsdWUsIG1heCkge1xuICBhc3NlcnQodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJywgJ2Nhbm5vdCB3cml0ZSBhIG5vbi1udW1iZXIgYXMgYSBudW1iZXInKVxuICBhc3NlcnQodmFsdWUgPj0gMCwgJ3NwZWNpZmllZCBhIG5lZ2F0aXZlIHZhbHVlIGZvciB3cml0aW5nIGFuIHVuc2lnbmVkIHZhbHVlJylcbiAgYXNzZXJ0KHZhbHVlIDw9IG1heCwgJ3ZhbHVlIGlzIGxhcmdlciB0aGFuIG1heGltdW0gdmFsdWUgZm9yIHR5cGUnKVxuICBhc3NlcnQoTWF0aC5mbG9vcih2YWx1ZSkgPT09IHZhbHVlLCAndmFsdWUgaGFzIGEgZnJhY3Rpb25hbCBjb21wb25lbnQnKVxufVxuXG5mdW5jdGlvbiB2ZXJpZnNpbnQgKHZhbHVlLCBtYXgsIG1pbikge1xuICBhc3NlcnQodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJywgJ2Nhbm5vdCB3cml0ZSBhIG5vbi1udW1iZXIgYXMgYSBudW1iZXInKVxuICBhc3NlcnQodmFsdWUgPD0gbWF4LCAndmFsdWUgbGFyZ2VyIHRoYW4gbWF4aW11bSBhbGxvd2VkIHZhbHVlJylcbiAgYXNzZXJ0KHZhbHVlID49IG1pbiwgJ3ZhbHVlIHNtYWxsZXIgdGhhbiBtaW5pbXVtIGFsbG93ZWQgdmFsdWUnKVxuICBhc3NlcnQoTWF0aC5mbG9vcih2YWx1ZSkgPT09IHZhbHVlLCAndmFsdWUgaGFzIGEgZnJhY3Rpb25hbCBjb21wb25lbnQnKVxufVxuXG5mdW5jdGlvbiB2ZXJpZklFRUU3NTQgKHZhbHVlLCBtYXgsIG1pbikge1xuICBhc3NlcnQodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJywgJ2Nhbm5vdCB3cml0ZSBhIG5vbi1udW1iZXIgYXMgYSBudW1iZXInKVxuICBhc3NlcnQodmFsdWUgPD0gbWF4LCAndmFsdWUgbGFyZ2VyIHRoYW4gbWF4aW11bSBhbGxvd2VkIHZhbHVlJylcbiAgYXNzZXJ0KHZhbHVlID49IG1pbiwgJ3ZhbHVlIHNtYWxsZXIgdGhhbiBtaW5pbXVtIGFsbG93ZWQgdmFsdWUnKVxufVxuXG5mdW5jdGlvbiBhc3NlcnQgKHRlc3QsIG1lc3NhZ2UpIHtcbiAgaWYgKCF0ZXN0KSB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSB8fCAnRmFpbGVkIGFzc2VydGlvbicpXG59XG4iLCJ2YXIgbG9va3VwID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8nO1xuXG47KGZ1bmN0aW9uIChleHBvcnRzKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuICB2YXIgQXJyID0gKHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJylcbiAgICA/IFVpbnQ4QXJyYXlcbiAgICA6IEFycmF5XG5cblx0dmFyIFBMVVMgICA9ICcrJy5jaGFyQ29kZUF0KDApXG5cdHZhciBTTEFTSCAgPSAnLycuY2hhckNvZGVBdCgwKVxuXHR2YXIgTlVNQkVSID0gJzAnLmNoYXJDb2RlQXQoMClcblx0dmFyIExPV0VSICA9ICdhJy5jaGFyQ29kZUF0KDApXG5cdHZhciBVUFBFUiAgPSAnQScuY2hhckNvZGVBdCgwKVxuXG5cdGZ1bmN0aW9uIGRlY29kZSAoZWx0KSB7XG5cdFx0dmFyIGNvZGUgPSBlbHQuY2hhckNvZGVBdCgwKVxuXHRcdGlmIChjb2RlID09PSBQTFVTKVxuXHRcdFx0cmV0dXJuIDYyIC8vICcrJ1xuXHRcdGlmIChjb2RlID09PSBTTEFTSClcblx0XHRcdHJldHVybiA2MyAvLyAnLydcblx0XHRpZiAoY29kZSA8IE5VTUJFUilcblx0XHRcdHJldHVybiAtMSAvL25vIG1hdGNoXG5cdFx0aWYgKGNvZGUgPCBOVU1CRVIgKyAxMClcblx0XHRcdHJldHVybiBjb2RlIC0gTlVNQkVSICsgMjYgKyAyNlxuXHRcdGlmIChjb2RlIDwgVVBQRVIgKyAyNilcblx0XHRcdHJldHVybiBjb2RlIC0gVVBQRVJcblx0XHRpZiAoY29kZSA8IExPV0VSICsgMjYpXG5cdFx0XHRyZXR1cm4gY29kZSAtIExPV0VSICsgMjZcblx0fVxuXG5cdGZ1bmN0aW9uIGI2NFRvQnl0ZUFycmF5IChiNjQpIHtcblx0XHR2YXIgaSwgaiwgbCwgdG1wLCBwbGFjZUhvbGRlcnMsIGFyclxuXG5cdFx0aWYgKGI2NC5sZW5ndGggJSA0ID4gMCkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHN0cmluZy4gTGVuZ3RoIG11c3QgYmUgYSBtdWx0aXBsZSBvZiA0Jylcblx0XHR9XG5cblx0XHQvLyB0aGUgbnVtYmVyIG9mIGVxdWFsIHNpZ25zIChwbGFjZSBob2xkZXJzKVxuXHRcdC8vIGlmIHRoZXJlIGFyZSB0d28gcGxhY2Vob2xkZXJzLCB0aGFuIHRoZSB0d28gY2hhcmFjdGVycyBiZWZvcmUgaXRcblx0XHQvLyByZXByZXNlbnQgb25lIGJ5dGVcblx0XHQvLyBpZiB0aGVyZSBpcyBvbmx5IG9uZSwgdGhlbiB0aGUgdGhyZWUgY2hhcmFjdGVycyBiZWZvcmUgaXQgcmVwcmVzZW50IDIgYnl0ZXNcblx0XHQvLyB0aGlzIGlzIGp1c3QgYSBjaGVhcCBoYWNrIHRvIG5vdCBkbyBpbmRleE9mIHR3aWNlXG5cdFx0dmFyIGxlbiA9IGI2NC5sZW5ndGhcblx0XHRwbGFjZUhvbGRlcnMgPSAnPScgPT09IGI2NC5jaGFyQXQobGVuIC0gMikgPyAyIDogJz0nID09PSBiNjQuY2hhckF0KGxlbiAtIDEpID8gMSA6IDBcblxuXHRcdC8vIGJhc2U2NCBpcyA0LzMgKyB1cCB0byB0d28gY2hhcmFjdGVycyBvZiB0aGUgb3JpZ2luYWwgZGF0YVxuXHRcdGFyciA9IG5ldyBBcnIoYjY0Lmxlbmd0aCAqIDMgLyA0IC0gcGxhY2VIb2xkZXJzKVxuXG5cdFx0Ly8gaWYgdGhlcmUgYXJlIHBsYWNlaG9sZGVycywgb25seSBnZXQgdXAgdG8gdGhlIGxhc3QgY29tcGxldGUgNCBjaGFyc1xuXHRcdGwgPSBwbGFjZUhvbGRlcnMgPiAwID8gYjY0Lmxlbmd0aCAtIDQgOiBiNjQubGVuZ3RoXG5cblx0XHR2YXIgTCA9IDBcblxuXHRcdGZ1bmN0aW9uIHB1c2ggKHYpIHtcblx0XHRcdGFycltMKytdID0gdlxuXHRcdH1cblxuXHRcdGZvciAoaSA9IDAsIGogPSAwOyBpIDwgbDsgaSArPSA0LCBqICs9IDMpIHtcblx0XHRcdHRtcCA9IChkZWNvZGUoYjY0LmNoYXJBdChpKSkgPDwgMTgpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAxKSkgPDwgMTIpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAyKSkgPDwgNikgfCBkZWNvZGUoYjY0LmNoYXJBdChpICsgMykpXG5cdFx0XHRwdXNoKCh0bXAgJiAweEZGMDAwMCkgPj4gMTYpXG5cdFx0XHRwdXNoKCh0bXAgJiAweEZGMDApID4+IDgpXG5cdFx0XHRwdXNoKHRtcCAmIDB4RkYpXG5cdFx0fVxuXG5cdFx0aWYgKHBsYWNlSG9sZGVycyA9PT0gMikge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAyKSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMSkpID4+IDQpXG5cdFx0XHRwdXNoKHRtcCAmIDB4RkYpXG5cdFx0fSBlbHNlIGlmIChwbGFjZUhvbGRlcnMgPT09IDEpIHtcblx0XHRcdHRtcCA9IChkZWNvZGUoYjY0LmNoYXJBdChpKSkgPDwgMTApIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAxKSkgPDwgNCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDIpKSA+PiAyKVxuXHRcdFx0cHVzaCgodG1wID4+IDgpICYgMHhGRilcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9XG5cblx0XHRyZXR1cm4gYXJyXG5cdH1cblxuXHRmdW5jdGlvbiB1aW50OFRvQmFzZTY0ICh1aW50OCkge1xuXHRcdHZhciBpLFxuXHRcdFx0ZXh0cmFCeXRlcyA9IHVpbnQ4Lmxlbmd0aCAlIDMsIC8vIGlmIHdlIGhhdmUgMSBieXRlIGxlZnQsIHBhZCAyIGJ5dGVzXG5cdFx0XHRvdXRwdXQgPSBcIlwiLFxuXHRcdFx0dGVtcCwgbGVuZ3RoXG5cblx0XHRmdW5jdGlvbiBlbmNvZGUgKG51bSkge1xuXHRcdFx0cmV0dXJuIGxvb2t1cC5jaGFyQXQobnVtKVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHRyaXBsZXRUb0Jhc2U2NCAobnVtKSB7XG5cdFx0XHRyZXR1cm4gZW5jb2RlKG51bSA+PiAxOCAmIDB4M0YpICsgZW5jb2RlKG51bSA+PiAxMiAmIDB4M0YpICsgZW5jb2RlKG51bSA+PiA2ICYgMHgzRikgKyBlbmNvZGUobnVtICYgMHgzRilcblx0XHR9XG5cblx0XHQvLyBnbyB0aHJvdWdoIHRoZSBhcnJheSBldmVyeSB0aHJlZSBieXRlcywgd2UnbGwgZGVhbCB3aXRoIHRyYWlsaW5nIHN0dWZmIGxhdGVyXG5cdFx0Zm9yIChpID0gMCwgbGVuZ3RoID0gdWludDgubGVuZ3RoIC0gZXh0cmFCeXRlczsgaSA8IGxlbmd0aDsgaSArPSAzKSB7XG5cdFx0XHR0ZW1wID0gKHVpbnQ4W2ldIDw8IDE2KSArICh1aW50OFtpICsgMV0gPDwgOCkgKyAodWludDhbaSArIDJdKVxuXHRcdFx0b3V0cHV0ICs9IHRyaXBsZXRUb0Jhc2U2NCh0ZW1wKVxuXHRcdH1cblxuXHRcdC8vIHBhZCB0aGUgZW5kIHdpdGggemVyb3MsIGJ1dCBtYWtlIHN1cmUgdG8gbm90IGZvcmdldCB0aGUgZXh0cmEgYnl0ZXNcblx0XHRzd2l0Y2ggKGV4dHJhQnl0ZXMpIHtcblx0XHRcdGNhc2UgMTpcblx0XHRcdFx0dGVtcCA9IHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDFdXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUodGVtcCA+PiAyKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKCh0ZW1wIDw8IDQpICYgMHgzRilcblx0XHRcdFx0b3V0cHV0ICs9ICc9PSdcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgMjpcblx0XHRcdFx0dGVtcCA9ICh1aW50OFt1aW50OC5sZW5ndGggLSAyXSA8PCA4KSArICh1aW50OFt1aW50OC5sZW5ndGggLSAxXSlcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSh0ZW1wID4+IDEwKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKCh0ZW1wID4+IDQpICYgMHgzRilcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSgodGVtcCA8PCAyKSAmIDB4M0YpXG5cdFx0XHRcdG91dHB1dCArPSAnPSdcblx0XHRcdFx0YnJlYWtcblx0XHR9XG5cblx0XHRyZXR1cm4gb3V0cHV0XG5cdH1cblxuXHRleHBvcnRzLnRvQnl0ZUFycmF5ID0gYjY0VG9CeXRlQXJyYXlcblx0ZXhwb3J0cy5mcm9tQnl0ZUFycmF5ID0gdWludDhUb0Jhc2U2NFxufSh0eXBlb2YgZXhwb3J0cyA9PT0gJ3VuZGVmaW5lZCcgPyAodGhpcy5iYXNlNjRqcyA9IHt9KSA6IGV4cG9ydHMpKVxuIiwiZXhwb3J0cy5yZWFkID0gZnVuY3Rpb24oYnVmZmVyLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSxcbiAgICAgIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDEsXG4gICAgICBlTWF4ID0gKDEgPDwgZUxlbikgLSAxLFxuICAgICAgZUJpYXMgPSBlTWF4ID4+IDEsXG4gICAgICBuQml0cyA9IC03LFxuICAgICAgaSA9IGlzTEUgPyAobkJ5dGVzIC0gMSkgOiAwLFxuICAgICAgZCA9IGlzTEUgPyAtMSA6IDEsXG4gICAgICBzID0gYnVmZmVyW29mZnNldCArIGldO1xuXG4gIGkgKz0gZDtcblxuICBlID0gcyAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKTtcbiAgcyA+Pj0gKC1uQml0cyk7XG4gIG5CaXRzICs9IGVMZW47XG4gIGZvciAoOyBuQml0cyA+IDA7IGUgPSBlICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpO1xuXG4gIG0gPSBlICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpO1xuICBlID4+PSAoLW5CaXRzKTtcbiAgbkJpdHMgKz0gbUxlbjtcbiAgZm9yICg7IG5CaXRzID4gMDsgbSA9IG0gKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCk7XG5cbiAgaWYgKGUgPT09IDApIHtcbiAgICBlID0gMSAtIGVCaWFzO1xuICB9IGVsc2UgaWYgKGUgPT09IGVNYXgpIHtcbiAgICByZXR1cm4gbSA/IE5hTiA6ICgocyA/IC0xIDogMSkgKiBJbmZpbml0eSk7XG4gIH0gZWxzZSB7XG4gICAgbSA9IG0gKyBNYXRoLnBvdygyLCBtTGVuKTtcbiAgICBlID0gZSAtIGVCaWFzO1xuICB9XG4gIHJldHVybiAocyA/IC0xIDogMSkgKiBtICogTWF0aC5wb3coMiwgZSAtIG1MZW4pO1xufTtcblxuZXhwb3J0cy53cml0ZSA9IGZ1bmN0aW9uKGJ1ZmZlciwgdmFsdWUsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLCBjLFxuICAgICAgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMSxcbiAgICAgIGVNYXggPSAoMSA8PCBlTGVuKSAtIDEsXG4gICAgICBlQmlhcyA9IGVNYXggPj4gMSxcbiAgICAgIHJ0ID0gKG1MZW4gPT09IDIzID8gTWF0aC5wb3coMiwgLTI0KSAtIE1hdGgucG93KDIsIC03NykgOiAwKSxcbiAgICAgIGkgPSBpc0xFID8gMCA6IChuQnl0ZXMgLSAxKSxcbiAgICAgIGQgPSBpc0xFID8gMSA6IC0xLFxuICAgICAgcyA9IHZhbHVlIDwgMCB8fCAodmFsdWUgPT09IDAgJiYgMSAvIHZhbHVlIDwgMCkgPyAxIDogMDtcblxuICB2YWx1ZSA9IE1hdGguYWJzKHZhbHVlKTtcblxuICBpZiAoaXNOYU4odmFsdWUpIHx8IHZhbHVlID09PSBJbmZpbml0eSkge1xuICAgIG0gPSBpc05hTih2YWx1ZSkgPyAxIDogMDtcbiAgICBlID0gZU1heDtcbiAgfSBlbHNlIHtcbiAgICBlID0gTWF0aC5mbG9vcihNYXRoLmxvZyh2YWx1ZSkgLyBNYXRoLkxOMik7XG4gICAgaWYgKHZhbHVlICogKGMgPSBNYXRoLnBvdygyLCAtZSkpIDwgMSkge1xuICAgICAgZS0tO1xuICAgICAgYyAqPSAyO1xuICAgIH1cbiAgICBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIHZhbHVlICs9IHJ0IC8gYztcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsdWUgKz0gcnQgKiBNYXRoLnBvdygyLCAxIC0gZUJpYXMpO1xuICAgIH1cbiAgICBpZiAodmFsdWUgKiBjID49IDIpIHtcbiAgICAgIGUrKztcbiAgICAgIGMgLz0gMjtcbiAgICB9XG5cbiAgICBpZiAoZSArIGVCaWFzID49IGVNYXgpIHtcbiAgICAgIG0gPSAwO1xuICAgICAgZSA9IGVNYXg7XG4gICAgfSBlbHNlIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgbSA9ICh2YWx1ZSAqIGMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pO1xuICAgICAgZSA9IGUgKyBlQmlhcztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IHZhbHVlICogTWF0aC5wb3coMiwgZUJpYXMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pO1xuICAgICAgZSA9IDA7XG4gICAgfVxuICB9XG5cbiAgZm9yICg7IG1MZW4gPj0gODsgYnVmZmVyW29mZnNldCArIGldID0gbSAmIDB4ZmYsIGkgKz0gZCwgbSAvPSAyNTYsIG1MZW4gLT0gOCk7XG5cbiAgZSA9IChlIDw8IG1MZW4pIHwgbTtcbiAgZUxlbiArPSBtTGVuO1xuICBmb3IgKDsgZUxlbiA+IDA7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IGUgJiAweGZmLCBpICs9IGQsIGUgLz0gMjU2LCBlTGVuIC09IDgpO1xuXG4gIGJ1ZmZlcltvZmZzZXQgKyBpIC0gZF0gfD0gcyAqIDEyODtcbn07XG4iLCJ2YXIgQnVmZmVyID0gcmVxdWlyZSgnYnVmZmVyJykuQnVmZmVyO1xudmFyIGludFNpemUgPSA0O1xudmFyIHplcm9CdWZmZXIgPSBuZXcgQnVmZmVyKGludFNpemUpOyB6ZXJvQnVmZmVyLmZpbGwoMCk7XG52YXIgY2hyc3ogPSA4O1xuXG5mdW5jdGlvbiB0b0FycmF5KGJ1ZiwgYmlnRW5kaWFuKSB7XG4gIGlmICgoYnVmLmxlbmd0aCAlIGludFNpemUpICE9PSAwKSB7XG4gICAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGggKyAoaW50U2l6ZSAtIChidWYubGVuZ3RoICUgaW50U2l6ZSkpO1xuICAgIGJ1ZiA9IEJ1ZmZlci5jb25jYXQoW2J1ZiwgemVyb0J1ZmZlcl0sIGxlbik7XG4gIH1cblxuICB2YXIgYXJyID0gW107XG4gIHZhciBmbiA9IGJpZ0VuZGlhbiA/IGJ1Zi5yZWFkSW50MzJCRSA6IGJ1Zi5yZWFkSW50MzJMRTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBidWYubGVuZ3RoOyBpICs9IGludFNpemUpIHtcbiAgICBhcnIucHVzaChmbi5jYWxsKGJ1ZiwgaSkpO1xuICB9XG4gIHJldHVybiBhcnI7XG59XG5cbmZ1bmN0aW9uIHRvQnVmZmVyKGFyciwgc2l6ZSwgYmlnRW5kaWFuKSB7XG4gIHZhciBidWYgPSBuZXcgQnVmZmVyKHNpemUpO1xuICB2YXIgZm4gPSBiaWdFbmRpYW4gPyBidWYud3JpdGVJbnQzMkJFIDogYnVmLndyaXRlSW50MzJMRTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHtcbiAgICBmbi5jYWxsKGJ1ZiwgYXJyW2ldLCBpICogNCwgdHJ1ZSk7XG4gIH1cbiAgcmV0dXJuIGJ1Zjtcbn1cblxuZnVuY3Rpb24gaGFzaChidWYsIGZuLCBoYXNoU2l6ZSwgYmlnRW5kaWFuKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGJ1ZikpIGJ1ZiA9IG5ldyBCdWZmZXIoYnVmKTtcbiAgdmFyIGFyciA9IGZuKHRvQXJyYXkoYnVmLCBiaWdFbmRpYW4pLCBidWYubGVuZ3RoICogY2hyc3opO1xuICByZXR1cm4gdG9CdWZmZXIoYXJyLCBoYXNoU2l6ZSwgYmlnRW5kaWFuKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7IGhhc2g6IGhhc2ggfTtcbiIsInZhciBCdWZmZXIgPSByZXF1aXJlKCdidWZmZXInKS5CdWZmZXJcbnZhciBzaGEgPSByZXF1aXJlKCcuL3NoYScpXG52YXIgc2hhMjU2ID0gcmVxdWlyZSgnLi9zaGEyNTYnKVxudmFyIHJuZyA9IHJlcXVpcmUoJy4vcm5nJylcbnZhciBtZDUgPSByZXF1aXJlKCcuL21kNScpXG5cbnZhciBhbGdvcml0aG1zID0ge1xuICBzaGExOiBzaGEsXG4gIHNoYTI1Njogc2hhMjU2LFxuICBtZDU6IG1kNVxufVxuXG52YXIgYmxvY2tzaXplID0gNjRcbnZhciB6ZXJvQnVmZmVyID0gbmV3IEJ1ZmZlcihibG9ja3NpemUpOyB6ZXJvQnVmZmVyLmZpbGwoMClcbmZ1bmN0aW9uIGhtYWMoZm4sIGtleSwgZGF0YSkge1xuICBpZighQnVmZmVyLmlzQnVmZmVyKGtleSkpIGtleSA9IG5ldyBCdWZmZXIoa2V5KVxuICBpZighQnVmZmVyLmlzQnVmZmVyKGRhdGEpKSBkYXRhID0gbmV3IEJ1ZmZlcihkYXRhKVxuXG4gIGlmKGtleS5sZW5ndGggPiBibG9ja3NpemUpIHtcbiAgICBrZXkgPSBmbihrZXkpXG4gIH0gZWxzZSBpZihrZXkubGVuZ3RoIDwgYmxvY2tzaXplKSB7XG4gICAga2V5ID0gQnVmZmVyLmNvbmNhdChba2V5LCB6ZXJvQnVmZmVyXSwgYmxvY2tzaXplKVxuICB9XG5cbiAgdmFyIGlwYWQgPSBuZXcgQnVmZmVyKGJsb2Nrc2l6ZSksIG9wYWQgPSBuZXcgQnVmZmVyKGJsb2Nrc2l6ZSlcbiAgZm9yKHZhciBpID0gMDsgaSA8IGJsb2Nrc2l6ZTsgaSsrKSB7XG4gICAgaXBhZFtpXSA9IGtleVtpXSBeIDB4MzZcbiAgICBvcGFkW2ldID0ga2V5W2ldIF4gMHg1Q1xuICB9XG5cbiAgdmFyIGhhc2ggPSBmbihCdWZmZXIuY29uY2F0KFtpcGFkLCBkYXRhXSkpXG4gIHJldHVybiBmbihCdWZmZXIuY29uY2F0KFtvcGFkLCBoYXNoXSkpXG59XG5cbmZ1bmN0aW9uIGhhc2goYWxnLCBrZXkpIHtcbiAgYWxnID0gYWxnIHx8ICdzaGExJ1xuICB2YXIgZm4gPSBhbGdvcml0aG1zW2FsZ11cbiAgdmFyIGJ1ZnMgPSBbXVxuICB2YXIgbGVuZ3RoID0gMFxuICBpZighZm4pIGVycm9yKCdhbGdvcml0aG06JywgYWxnLCAnaXMgbm90IHlldCBzdXBwb3J0ZWQnKVxuICByZXR1cm4ge1xuICAgIHVwZGF0ZTogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgIGlmKCFCdWZmZXIuaXNCdWZmZXIoZGF0YSkpIGRhdGEgPSBuZXcgQnVmZmVyKGRhdGEpXG4gICAgICAgIFxuICAgICAgYnVmcy5wdXNoKGRhdGEpXG4gICAgICBsZW5ndGggKz0gZGF0YS5sZW5ndGhcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfSxcbiAgICBkaWdlc3Q6IGZ1bmN0aW9uIChlbmMpIHtcbiAgICAgIHZhciBidWYgPSBCdWZmZXIuY29uY2F0KGJ1ZnMpXG4gICAgICB2YXIgciA9IGtleSA/IGhtYWMoZm4sIGtleSwgYnVmKSA6IGZuKGJ1ZilcbiAgICAgIGJ1ZnMgPSBudWxsXG4gICAgICByZXR1cm4gZW5jID8gci50b1N0cmluZyhlbmMpIDogclxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBlcnJvciAoKSB7XG4gIHZhciBtID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpLmpvaW4oJyAnKVxuICB0aHJvdyBuZXcgRXJyb3IoW1xuICAgIG0sXG4gICAgJ3dlIGFjY2VwdCBwdWxsIHJlcXVlc3RzJyxcbiAgICAnaHR0cDovL2dpdGh1Yi5jb20vZG9taW5pY3RhcnIvY3J5cHRvLWJyb3dzZXJpZnknXG4gICAgXS5qb2luKCdcXG4nKSlcbn1cblxuZXhwb3J0cy5jcmVhdGVIYXNoID0gZnVuY3Rpb24gKGFsZykgeyByZXR1cm4gaGFzaChhbGcpIH1cbmV4cG9ydHMuY3JlYXRlSG1hYyA9IGZ1bmN0aW9uIChhbGcsIGtleSkgeyByZXR1cm4gaGFzaChhbGcsIGtleSkgfVxuZXhwb3J0cy5yYW5kb21CeXRlcyA9IGZ1bmN0aW9uKHNpemUsIGNhbGxiYWNrKSB7XG4gIGlmIChjYWxsYmFjayAmJiBjYWxsYmFjay5jYWxsKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNhbGxiYWNrLmNhbGwodGhpcywgdW5kZWZpbmVkLCBuZXcgQnVmZmVyKHJuZyhzaXplKSkpXG4gICAgfSBjYXRjaCAoZXJyKSB7IGNhbGxiYWNrKGVycikgfVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXcgQnVmZmVyKHJuZyhzaXplKSlcbiAgfVxufVxuXG5mdW5jdGlvbiBlYWNoKGEsIGYpIHtcbiAgZm9yKHZhciBpIGluIGEpXG4gICAgZihhW2ldLCBpKVxufVxuXG4vLyB0aGUgbGVhc3QgSSBjYW4gZG8gaXMgbWFrZSBlcnJvciBtZXNzYWdlcyBmb3IgdGhlIHJlc3Qgb2YgdGhlIG5vZGUuanMvY3J5cHRvIGFwaS5cbmVhY2goWydjcmVhdGVDcmVkZW50aWFscydcbiwgJ2NyZWF0ZUNpcGhlcidcbiwgJ2NyZWF0ZUNpcGhlcml2J1xuLCAnY3JlYXRlRGVjaXBoZXInXG4sICdjcmVhdGVEZWNpcGhlcml2J1xuLCAnY3JlYXRlU2lnbidcbiwgJ2NyZWF0ZVZlcmlmeSdcbiwgJ2NyZWF0ZURpZmZpZUhlbGxtYW4nXG4sICdwYmtkZjInXSwgZnVuY3Rpb24gKG5hbWUpIHtcbiAgZXhwb3J0c1tuYW1lXSA9IGZ1bmN0aW9uICgpIHtcbiAgICBlcnJvcignc29ycnksJywgbmFtZSwgJ2lzIG5vdCBpbXBsZW1lbnRlZCB5ZXQnKVxuICB9XG59KVxuIiwiLypcclxuICogQSBKYXZhU2NyaXB0IGltcGxlbWVudGF0aW9uIG9mIHRoZSBSU0EgRGF0YSBTZWN1cml0eSwgSW5jLiBNRDUgTWVzc2FnZVxyXG4gKiBEaWdlc3QgQWxnb3JpdGhtLCBhcyBkZWZpbmVkIGluIFJGQyAxMzIxLlxyXG4gKiBWZXJzaW9uIDIuMSBDb3B5cmlnaHQgKEMpIFBhdWwgSm9obnN0b24gMTk5OSAtIDIwMDIuXHJcbiAqIE90aGVyIGNvbnRyaWJ1dG9yczogR3JlZyBIb2x0LCBBbmRyZXcgS2VwZXJ0LCBZZG5hciwgTG9zdGluZXRcclxuICogRGlzdHJpYnV0ZWQgdW5kZXIgdGhlIEJTRCBMaWNlbnNlXHJcbiAqIFNlZSBodHRwOi8vcGFqaG9tZS5vcmcudWsvY3J5cHQvbWQ1IGZvciBtb3JlIGluZm8uXHJcbiAqL1xyXG5cclxudmFyIGhlbHBlcnMgPSByZXF1aXJlKCcuL2hlbHBlcnMnKTtcclxuXHJcbi8qXHJcbiAqIFBlcmZvcm0gYSBzaW1wbGUgc2VsZi10ZXN0IHRvIHNlZSBpZiB0aGUgVk0gaXMgd29ya2luZ1xyXG4gKi9cclxuZnVuY3Rpb24gbWQ1X3ZtX3Rlc3QoKVxyXG57XHJcbiAgcmV0dXJuIGhleF9tZDUoXCJhYmNcIikgPT0gXCI5MDAxNTA5ODNjZDI0ZmIwZDY5NjNmN2QyOGUxN2Y3MlwiO1xyXG59XHJcblxyXG4vKlxyXG4gKiBDYWxjdWxhdGUgdGhlIE1ENSBvZiBhbiBhcnJheSBvZiBsaXR0bGUtZW5kaWFuIHdvcmRzLCBhbmQgYSBiaXQgbGVuZ3RoXHJcbiAqL1xyXG5mdW5jdGlvbiBjb3JlX21kNSh4LCBsZW4pXHJcbntcclxuICAvKiBhcHBlbmQgcGFkZGluZyAqL1xyXG4gIHhbbGVuID4+IDVdIHw9IDB4ODAgPDwgKChsZW4pICUgMzIpO1xyXG4gIHhbKCgobGVuICsgNjQpID4+PiA5KSA8PCA0KSArIDE0XSA9IGxlbjtcclxuXHJcbiAgdmFyIGEgPSAgMTczMjU4NDE5MztcclxuICB2YXIgYiA9IC0yNzE3MzM4Nzk7XHJcbiAgdmFyIGMgPSAtMTczMjU4NDE5NDtcclxuICB2YXIgZCA9ICAyNzE3MzM4Nzg7XHJcblxyXG4gIGZvcih2YXIgaSA9IDA7IGkgPCB4Lmxlbmd0aDsgaSArPSAxNilcclxuICB7XHJcbiAgICB2YXIgb2xkYSA9IGE7XHJcbiAgICB2YXIgb2xkYiA9IGI7XHJcbiAgICB2YXIgb2xkYyA9IGM7XHJcbiAgICB2YXIgb2xkZCA9IGQ7XHJcblxyXG4gICAgYSA9IG1kNV9mZihhLCBiLCBjLCBkLCB4W2krIDBdLCA3ICwgLTY4MDg3NjkzNik7XHJcbiAgICBkID0gbWQ1X2ZmKGQsIGEsIGIsIGMsIHhbaSsgMV0sIDEyLCAtMzg5NTY0NTg2KTtcclxuICAgIGMgPSBtZDVfZmYoYywgZCwgYSwgYiwgeFtpKyAyXSwgMTcsICA2MDYxMDU4MTkpO1xyXG4gICAgYiA9IG1kNV9mZihiLCBjLCBkLCBhLCB4W2krIDNdLCAyMiwgLTEwNDQ1MjUzMzApO1xyXG4gICAgYSA9IG1kNV9mZihhLCBiLCBjLCBkLCB4W2krIDRdLCA3ICwgLTE3NjQxODg5Nyk7XHJcbiAgICBkID0gbWQ1X2ZmKGQsIGEsIGIsIGMsIHhbaSsgNV0sIDEyLCAgMTIwMDA4MDQyNik7XHJcbiAgICBjID0gbWQ1X2ZmKGMsIGQsIGEsIGIsIHhbaSsgNl0sIDE3LCAtMTQ3MzIzMTM0MSk7XHJcbiAgICBiID0gbWQ1X2ZmKGIsIGMsIGQsIGEsIHhbaSsgN10sIDIyLCAtNDU3MDU5ODMpO1xyXG4gICAgYSA9IG1kNV9mZihhLCBiLCBjLCBkLCB4W2krIDhdLCA3ICwgIDE3NzAwMzU0MTYpO1xyXG4gICAgZCA9IG1kNV9mZihkLCBhLCBiLCBjLCB4W2krIDldLCAxMiwgLTE5NTg0MTQ0MTcpO1xyXG4gICAgYyA9IG1kNV9mZihjLCBkLCBhLCBiLCB4W2krMTBdLCAxNywgLTQyMDYzKTtcclxuICAgIGIgPSBtZDVfZmYoYiwgYywgZCwgYSwgeFtpKzExXSwgMjIsIC0xOTkwNDA0MTYyKTtcclxuICAgIGEgPSBtZDVfZmYoYSwgYiwgYywgZCwgeFtpKzEyXSwgNyAsICAxODA0NjAzNjgyKTtcclxuICAgIGQgPSBtZDVfZmYoZCwgYSwgYiwgYywgeFtpKzEzXSwgMTIsIC00MDM0MTEwMSk7XHJcbiAgICBjID0gbWQ1X2ZmKGMsIGQsIGEsIGIsIHhbaSsxNF0sIDE3LCAtMTUwMjAwMjI5MCk7XHJcbiAgICBiID0gbWQ1X2ZmKGIsIGMsIGQsIGEsIHhbaSsxNV0sIDIyLCAgMTIzNjUzNTMyOSk7XHJcblxyXG4gICAgYSA9IG1kNV9nZyhhLCBiLCBjLCBkLCB4W2krIDFdLCA1ICwgLTE2NTc5NjUxMCk7XHJcbiAgICBkID0gbWQ1X2dnKGQsIGEsIGIsIGMsIHhbaSsgNl0sIDkgLCAtMTA2OTUwMTYzMik7XHJcbiAgICBjID0gbWQ1X2dnKGMsIGQsIGEsIGIsIHhbaSsxMV0sIDE0LCAgNjQzNzE3NzEzKTtcclxuICAgIGIgPSBtZDVfZ2coYiwgYywgZCwgYSwgeFtpKyAwXSwgMjAsIC0zNzM4OTczMDIpO1xyXG4gICAgYSA9IG1kNV9nZyhhLCBiLCBjLCBkLCB4W2krIDVdLCA1ICwgLTcwMTU1ODY5MSk7XHJcbiAgICBkID0gbWQ1X2dnKGQsIGEsIGIsIGMsIHhbaSsxMF0sIDkgLCAgMzgwMTYwODMpO1xyXG4gICAgYyA9IG1kNV9nZyhjLCBkLCBhLCBiLCB4W2krMTVdLCAxNCwgLTY2MDQ3ODMzNSk7XHJcbiAgICBiID0gbWQ1X2dnKGIsIGMsIGQsIGEsIHhbaSsgNF0sIDIwLCAtNDA1NTM3ODQ4KTtcclxuICAgIGEgPSBtZDVfZ2coYSwgYiwgYywgZCwgeFtpKyA5XSwgNSAsICA1Njg0NDY0MzgpO1xyXG4gICAgZCA9IG1kNV9nZyhkLCBhLCBiLCBjLCB4W2krMTRdLCA5ICwgLTEwMTk4MDM2OTApO1xyXG4gICAgYyA9IG1kNV9nZyhjLCBkLCBhLCBiLCB4W2krIDNdLCAxNCwgLTE4NzM2Mzk2MSk7XHJcbiAgICBiID0gbWQ1X2dnKGIsIGMsIGQsIGEsIHhbaSsgOF0sIDIwLCAgMTE2MzUzMTUwMSk7XHJcbiAgICBhID0gbWQ1X2dnKGEsIGIsIGMsIGQsIHhbaSsxM10sIDUgLCAtMTQ0NDY4MTQ2Nyk7XHJcbiAgICBkID0gbWQ1X2dnKGQsIGEsIGIsIGMsIHhbaSsgMl0sIDkgLCAtNTE0MDM3ODQpO1xyXG4gICAgYyA9IG1kNV9nZyhjLCBkLCBhLCBiLCB4W2krIDddLCAxNCwgIDE3MzUzMjg0NzMpO1xyXG4gICAgYiA9IG1kNV9nZyhiLCBjLCBkLCBhLCB4W2krMTJdLCAyMCwgLTE5MjY2MDc3MzQpO1xyXG5cclxuICAgIGEgPSBtZDVfaGgoYSwgYiwgYywgZCwgeFtpKyA1XSwgNCAsIC0zNzg1NTgpO1xyXG4gICAgZCA9IG1kNV9oaChkLCBhLCBiLCBjLCB4W2krIDhdLCAxMSwgLTIwMjI1NzQ0NjMpO1xyXG4gICAgYyA9IG1kNV9oaChjLCBkLCBhLCBiLCB4W2krMTFdLCAxNiwgIDE4MzkwMzA1NjIpO1xyXG4gICAgYiA9IG1kNV9oaChiLCBjLCBkLCBhLCB4W2krMTRdLCAyMywgLTM1MzA5NTU2KTtcclxuICAgIGEgPSBtZDVfaGgoYSwgYiwgYywgZCwgeFtpKyAxXSwgNCAsIC0xNTMwOTkyMDYwKTtcclxuICAgIGQgPSBtZDVfaGgoZCwgYSwgYiwgYywgeFtpKyA0XSwgMTEsICAxMjcyODkzMzUzKTtcclxuICAgIGMgPSBtZDVfaGgoYywgZCwgYSwgYiwgeFtpKyA3XSwgMTYsIC0xNTU0OTc2MzIpO1xyXG4gICAgYiA9IG1kNV9oaChiLCBjLCBkLCBhLCB4W2krMTBdLCAyMywgLTEwOTQ3MzA2NDApO1xyXG4gICAgYSA9IG1kNV9oaChhLCBiLCBjLCBkLCB4W2krMTNdLCA0ICwgIDY4MTI3OTE3NCk7XHJcbiAgICBkID0gbWQ1X2hoKGQsIGEsIGIsIGMsIHhbaSsgMF0sIDExLCAtMzU4NTM3MjIyKTtcclxuICAgIGMgPSBtZDVfaGgoYywgZCwgYSwgYiwgeFtpKyAzXSwgMTYsIC03MjI1MjE5NzkpO1xyXG4gICAgYiA9IG1kNV9oaChiLCBjLCBkLCBhLCB4W2krIDZdLCAyMywgIDc2MDI5MTg5KTtcclxuICAgIGEgPSBtZDVfaGgoYSwgYiwgYywgZCwgeFtpKyA5XSwgNCAsIC02NDAzNjQ0ODcpO1xyXG4gICAgZCA9IG1kNV9oaChkLCBhLCBiLCBjLCB4W2krMTJdLCAxMSwgLTQyMTgxNTgzNSk7XHJcbiAgICBjID0gbWQ1X2hoKGMsIGQsIGEsIGIsIHhbaSsxNV0sIDE2LCAgNTMwNzQyNTIwKTtcclxuICAgIGIgPSBtZDVfaGgoYiwgYywgZCwgYSwgeFtpKyAyXSwgMjMsIC05OTUzMzg2NTEpO1xyXG5cclxuICAgIGEgPSBtZDVfaWkoYSwgYiwgYywgZCwgeFtpKyAwXSwgNiAsIC0xOTg2MzA4NDQpO1xyXG4gICAgZCA9IG1kNV9paShkLCBhLCBiLCBjLCB4W2krIDddLCAxMCwgIDExMjY4OTE0MTUpO1xyXG4gICAgYyA9IG1kNV9paShjLCBkLCBhLCBiLCB4W2krMTRdLCAxNSwgLTE0MTYzNTQ5MDUpO1xyXG4gICAgYiA9IG1kNV9paShiLCBjLCBkLCBhLCB4W2krIDVdLCAyMSwgLTU3NDM0MDU1KTtcclxuICAgIGEgPSBtZDVfaWkoYSwgYiwgYywgZCwgeFtpKzEyXSwgNiAsICAxNzAwNDg1NTcxKTtcclxuICAgIGQgPSBtZDVfaWkoZCwgYSwgYiwgYywgeFtpKyAzXSwgMTAsIC0xODk0OTg2NjA2KTtcclxuICAgIGMgPSBtZDVfaWkoYywgZCwgYSwgYiwgeFtpKzEwXSwgMTUsIC0xMDUxNTIzKTtcclxuICAgIGIgPSBtZDVfaWkoYiwgYywgZCwgYSwgeFtpKyAxXSwgMjEsIC0yMDU0OTIyNzk5KTtcclxuICAgIGEgPSBtZDVfaWkoYSwgYiwgYywgZCwgeFtpKyA4XSwgNiAsICAxODczMzEzMzU5KTtcclxuICAgIGQgPSBtZDVfaWkoZCwgYSwgYiwgYywgeFtpKzE1XSwgMTAsIC0zMDYxMTc0NCk7XHJcbiAgICBjID0gbWQ1X2lpKGMsIGQsIGEsIGIsIHhbaSsgNl0sIDE1LCAtMTU2MDE5ODM4MCk7XHJcbiAgICBiID0gbWQ1X2lpKGIsIGMsIGQsIGEsIHhbaSsxM10sIDIxLCAgMTMwOTE1MTY0OSk7XHJcbiAgICBhID0gbWQ1X2lpKGEsIGIsIGMsIGQsIHhbaSsgNF0sIDYgLCAtMTQ1NTIzMDcwKTtcclxuICAgIGQgPSBtZDVfaWkoZCwgYSwgYiwgYywgeFtpKzExXSwgMTAsIC0xMTIwMjEwMzc5KTtcclxuICAgIGMgPSBtZDVfaWkoYywgZCwgYSwgYiwgeFtpKyAyXSwgMTUsICA3MTg3ODcyNTkpO1xyXG4gICAgYiA9IG1kNV9paShiLCBjLCBkLCBhLCB4W2krIDldLCAyMSwgLTM0MzQ4NTU1MSk7XHJcblxyXG4gICAgYSA9IHNhZmVfYWRkKGEsIG9sZGEpO1xyXG4gICAgYiA9IHNhZmVfYWRkKGIsIG9sZGIpO1xyXG4gICAgYyA9IHNhZmVfYWRkKGMsIG9sZGMpO1xyXG4gICAgZCA9IHNhZmVfYWRkKGQsIG9sZGQpO1xyXG4gIH1cclxuICByZXR1cm4gQXJyYXkoYSwgYiwgYywgZCk7XHJcblxyXG59XHJcblxyXG4vKlxyXG4gKiBUaGVzZSBmdW5jdGlvbnMgaW1wbGVtZW50IHRoZSBmb3VyIGJhc2ljIG9wZXJhdGlvbnMgdGhlIGFsZ29yaXRobSB1c2VzLlxyXG4gKi9cclxuZnVuY3Rpb24gbWQ1X2NtbihxLCBhLCBiLCB4LCBzLCB0KVxyXG57XHJcbiAgcmV0dXJuIHNhZmVfYWRkKGJpdF9yb2woc2FmZV9hZGQoc2FmZV9hZGQoYSwgcSksIHNhZmVfYWRkKHgsIHQpKSwgcyksYik7XHJcbn1cclxuZnVuY3Rpb24gbWQ1X2ZmKGEsIGIsIGMsIGQsIHgsIHMsIHQpXHJcbntcclxuICByZXR1cm4gbWQ1X2NtbigoYiAmIGMpIHwgKCh+YikgJiBkKSwgYSwgYiwgeCwgcywgdCk7XHJcbn1cclxuZnVuY3Rpb24gbWQ1X2dnKGEsIGIsIGMsIGQsIHgsIHMsIHQpXHJcbntcclxuICByZXR1cm4gbWQ1X2NtbigoYiAmIGQpIHwgKGMgJiAofmQpKSwgYSwgYiwgeCwgcywgdCk7XHJcbn1cclxuZnVuY3Rpb24gbWQ1X2hoKGEsIGIsIGMsIGQsIHgsIHMsIHQpXHJcbntcclxuICByZXR1cm4gbWQ1X2NtbihiIF4gYyBeIGQsIGEsIGIsIHgsIHMsIHQpO1xyXG59XHJcbmZ1bmN0aW9uIG1kNV9paShhLCBiLCBjLCBkLCB4LCBzLCB0KVxyXG57XHJcbiAgcmV0dXJuIG1kNV9jbW4oYyBeIChiIHwgKH5kKSksIGEsIGIsIHgsIHMsIHQpO1xyXG59XHJcblxyXG4vKlxyXG4gKiBBZGQgaW50ZWdlcnMsIHdyYXBwaW5nIGF0IDJeMzIuIFRoaXMgdXNlcyAxNi1iaXQgb3BlcmF0aW9ucyBpbnRlcm5hbGx5XHJcbiAqIHRvIHdvcmsgYXJvdW5kIGJ1Z3MgaW4gc29tZSBKUyBpbnRlcnByZXRlcnMuXHJcbiAqL1xyXG5mdW5jdGlvbiBzYWZlX2FkZCh4LCB5KVxyXG57XHJcbiAgdmFyIGxzdyA9ICh4ICYgMHhGRkZGKSArICh5ICYgMHhGRkZGKTtcclxuICB2YXIgbXN3ID0gKHggPj4gMTYpICsgKHkgPj4gMTYpICsgKGxzdyA+PiAxNik7XHJcbiAgcmV0dXJuIChtc3cgPDwgMTYpIHwgKGxzdyAmIDB4RkZGRik7XHJcbn1cclxuXHJcbi8qXHJcbiAqIEJpdHdpc2Ugcm90YXRlIGEgMzItYml0IG51bWJlciB0byB0aGUgbGVmdC5cclxuICovXHJcbmZ1bmN0aW9uIGJpdF9yb2wobnVtLCBjbnQpXHJcbntcclxuICByZXR1cm4gKG51bSA8PCBjbnQpIHwgKG51bSA+Pj4gKDMyIC0gY250KSk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gbWQ1KGJ1Zikge1xyXG4gIHJldHVybiBoZWxwZXJzLmhhc2goYnVmLCBjb3JlX21kNSwgMTYpO1xyXG59O1xyXG4iLCIvLyBPcmlnaW5hbCBjb2RlIGFkYXB0ZWQgZnJvbSBSb2JlcnQgS2llZmZlci5cbi8vIGRldGFpbHMgYXQgaHR0cHM6Ly9naXRodWIuY29tL2Jyb29mYS9ub2RlLXV1aWRcbihmdW5jdGlvbigpIHtcbiAgdmFyIF9nbG9iYWwgPSB0aGlzO1xuXG4gIHZhciBtYXRoUk5HLCB3aGF0d2dSTkc7XG5cbiAgLy8gTk9URTogTWF0aC5yYW5kb20oKSBkb2VzIG5vdCBndWFyYW50ZWUgXCJjcnlwdG9ncmFwaGljIHF1YWxpdHlcIlxuICBtYXRoUk5HID0gZnVuY3Rpb24oc2l6ZSkge1xuICAgIHZhciBieXRlcyA9IG5ldyBBcnJheShzaXplKTtcbiAgICB2YXIgcjtcblxuICAgIGZvciAodmFyIGkgPSAwLCByOyBpIDwgc2l6ZTsgaSsrKSB7XG4gICAgICBpZiAoKGkgJiAweDAzKSA9PSAwKSByID0gTWF0aC5yYW5kb20oKSAqIDB4MTAwMDAwMDAwO1xuICAgICAgYnl0ZXNbaV0gPSByID4+PiAoKGkgJiAweDAzKSA8PCAzKSAmIDB4ZmY7XG4gICAgfVxuXG4gICAgcmV0dXJuIGJ5dGVzO1xuICB9XG5cbiAgaWYgKF9nbG9iYWwuY3J5cHRvICYmIGNyeXB0by5nZXRSYW5kb21WYWx1ZXMpIHtcbiAgICB3aGF0d2dSTkcgPSBmdW5jdGlvbihzaXplKSB7XG4gICAgICB2YXIgYnl0ZXMgPSBuZXcgVWludDhBcnJheShzaXplKTtcbiAgICAgIGNyeXB0by5nZXRSYW5kb21WYWx1ZXMoYnl0ZXMpO1xuICAgICAgcmV0dXJuIGJ5dGVzO1xuICAgIH1cbiAgfVxuXG4gIG1vZHVsZS5leHBvcnRzID0gd2hhdHdnUk5HIHx8IG1hdGhSTkc7XG5cbn0oKSlcbiIsIi8qXG4gKiBBIEphdmFTY3JpcHQgaW1wbGVtZW50YXRpb24gb2YgdGhlIFNlY3VyZSBIYXNoIEFsZ29yaXRobSwgU0hBLTEsIGFzIGRlZmluZWRcbiAqIGluIEZJUFMgUFVCIDE4MC0xXG4gKiBWZXJzaW9uIDIuMWEgQ29weXJpZ2h0IFBhdWwgSm9obnN0b24gMjAwMCAtIDIwMDIuXG4gKiBPdGhlciBjb250cmlidXRvcnM6IEdyZWcgSG9sdCwgQW5kcmV3IEtlcGVydCwgWWRuYXIsIExvc3RpbmV0XG4gKiBEaXN0cmlidXRlZCB1bmRlciB0aGUgQlNEIExpY2Vuc2VcbiAqIFNlZSBodHRwOi8vcGFqaG9tZS5vcmcudWsvY3J5cHQvbWQ1IGZvciBkZXRhaWxzLlxuICovXG5cbnZhciBoZWxwZXJzID0gcmVxdWlyZSgnLi9oZWxwZXJzJyk7XG5cbi8qXG4gKiBDYWxjdWxhdGUgdGhlIFNIQS0xIG9mIGFuIGFycmF5IG9mIGJpZy1lbmRpYW4gd29yZHMsIGFuZCBhIGJpdCBsZW5ndGhcbiAqL1xuZnVuY3Rpb24gY29yZV9zaGExKHgsIGxlbilcbntcbiAgLyogYXBwZW5kIHBhZGRpbmcgKi9cbiAgeFtsZW4gPj4gNV0gfD0gMHg4MCA8PCAoMjQgLSBsZW4gJSAzMik7XG4gIHhbKChsZW4gKyA2NCA+PiA5KSA8PCA0KSArIDE1XSA9IGxlbjtcblxuICB2YXIgdyA9IEFycmF5KDgwKTtcbiAgdmFyIGEgPSAgMTczMjU4NDE5MztcbiAgdmFyIGIgPSAtMjcxNzMzODc5O1xuICB2YXIgYyA9IC0xNzMyNTg0MTk0O1xuICB2YXIgZCA9ICAyNzE3MzM4Nzg7XG4gIHZhciBlID0gLTEwMDk1ODk3NzY7XG5cbiAgZm9yKHZhciBpID0gMDsgaSA8IHgubGVuZ3RoOyBpICs9IDE2KVxuICB7XG4gICAgdmFyIG9sZGEgPSBhO1xuICAgIHZhciBvbGRiID0gYjtcbiAgICB2YXIgb2xkYyA9IGM7XG4gICAgdmFyIG9sZGQgPSBkO1xuICAgIHZhciBvbGRlID0gZTtcblxuICAgIGZvcih2YXIgaiA9IDA7IGogPCA4MDsgaisrKVxuICAgIHtcbiAgICAgIGlmKGogPCAxNikgd1tqXSA9IHhbaSArIGpdO1xuICAgICAgZWxzZSB3W2pdID0gcm9sKHdbai0zXSBeIHdbai04XSBeIHdbai0xNF0gXiB3W2otMTZdLCAxKTtcbiAgICAgIHZhciB0ID0gc2FmZV9hZGQoc2FmZV9hZGQocm9sKGEsIDUpLCBzaGExX2Z0KGosIGIsIGMsIGQpKSxcbiAgICAgICAgICAgICAgICAgICAgICAgc2FmZV9hZGQoc2FmZV9hZGQoZSwgd1tqXSksIHNoYTFfa3QoaikpKTtcbiAgICAgIGUgPSBkO1xuICAgICAgZCA9IGM7XG4gICAgICBjID0gcm9sKGIsIDMwKTtcbiAgICAgIGIgPSBhO1xuICAgICAgYSA9IHQ7XG4gICAgfVxuXG4gICAgYSA9IHNhZmVfYWRkKGEsIG9sZGEpO1xuICAgIGIgPSBzYWZlX2FkZChiLCBvbGRiKTtcbiAgICBjID0gc2FmZV9hZGQoYywgb2xkYyk7XG4gICAgZCA9IHNhZmVfYWRkKGQsIG9sZGQpO1xuICAgIGUgPSBzYWZlX2FkZChlLCBvbGRlKTtcbiAgfVxuICByZXR1cm4gQXJyYXkoYSwgYiwgYywgZCwgZSk7XG5cbn1cblxuLypcbiAqIFBlcmZvcm0gdGhlIGFwcHJvcHJpYXRlIHRyaXBsZXQgY29tYmluYXRpb24gZnVuY3Rpb24gZm9yIHRoZSBjdXJyZW50XG4gKiBpdGVyYXRpb25cbiAqL1xuZnVuY3Rpb24gc2hhMV9mdCh0LCBiLCBjLCBkKVxue1xuICBpZih0IDwgMjApIHJldHVybiAoYiAmIGMpIHwgKCh+YikgJiBkKTtcbiAgaWYodCA8IDQwKSByZXR1cm4gYiBeIGMgXiBkO1xuICBpZih0IDwgNjApIHJldHVybiAoYiAmIGMpIHwgKGIgJiBkKSB8IChjICYgZCk7XG4gIHJldHVybiBiIF4gYyBeIGQ7XG59XG5cbi8qXG4gKiBEZXRlcm1pbmUgdGhlIGFwcHJvcHJpYXRlIGFkZGl0aXZlIGNvbnN0YW50IGZvciB0aGUgY3VycmVudCBpdGVyYXRpb25cbiAqL1xuZnVuY3Rpb24gc2hhMV9rdCh0KVxue1xuICByZXR1cm4gKHQgPCAyMCkgPyAgMTUxODUwMDI0OSA6ICh0IDwgNDApID8gIDE4NTk3NzUzOTMgOlxuICAgICAgICAgKHQgPCA2MCkgPyAtMTg5NDAwNzU4OCA6IC04OTk0OTc1MTQ7XG59XG5cbi8qXG4gKiBBZGQgaW50ZWdlcnMsIHdyYXBwaW5nIGF0IDJeMzIuIFRoaXMgdXNlcyAxNi1iaXQgb3BlcmF0aW9ucyBpbnRlcm5hbGx5XG4gKiB0byB3b3JrIGFyb3VuZCBidWdzIGluIHNvbWUgSlMgaW50ZXJwcmV0ZXJzLlxuICovXG5mdW5jdGlvbiBzYWZlX2FkZCh4LCB5KVxue1xuICB2YXIgbHN3ID0gKHggJiAweEZGRkYpICsgKHkgJiAweEZGRkYpO1xuICB2YXIgbXN3ID0gKHggPj4gMTYpICsgKHkgPj4gMTYpICsgKGxzdyA+PiAxNik7XG4gIHJldHVybiAobXN3IDw8IDE2KSB8IChsc3cgJiAweEZGRkYpO1xufVxuXG4vKlxuICogQml0d2lzZSByb3RhdGUgYSAzMi1iaXQgbnVtYmVyIHRvIHRoZSBsZWZ0LlxuICovXG5mdW5jdGlvbiByb2wobnVtLCBjbnQpXG57XG4gIHJldHVybiAobnVtIDw8IGNudCkgfCAobnVtID4+PiAoMzIgLSBjbnQpKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBzaGExKGJ1Zikge1xuICByZXR1cm4gaGVscGVycy5oYXNoKGJ1ZiwgY29yZV9zaGExLCAyMCwgdHJ1ZSk7XG59O1xuIiwiXG4vKipcbiAqIEEgSmF2YVNjcmlwdCBpbXBsZW1lbnRhdGlvbiBvZiB0aGUgU2VjdXJlIEhhc2ggQWxnb3JpdGhtLCBTSEEtMjU2LCBhcyBkZWZpbmVkXG4gKiBpbiBGSVBTIDE4MC0yXG4gKiBWZXJzaW9uIDIuMi1iZXRhIENvcHlyaWdodCBBbmdlbCBNYXJpbiwgUGF1bCBKb2huc3RvbiAyMDAwIC0gMjAwOS5cbiAqIE90aGVyIGNvbnRyaWJ1dG9yczogR3JlZyBIb2x0LCBBbmRyZXcgS2VwZXJ0LCBZZG5hciwgTG9zdGluZXRcbiAqXG4gKi9cblxudmFyIGhlbHBlcnMgPSByZXF1aXJlKCcuL2hlbHBlcnMnKTtcblxudmFyIHNhZmVfYWRkID0gZnVuY3Rpb24oeCwgeSkge1xuICB2YXIgbHN3ID0gKHggJiAweEZGRkYpICsgKHkgJiAweEZGRkYpO1xuICB2YXIgbXN3ID0gKHggPj4gMTYpICsgKHkgPj4gMTYpICsgKGxzdyA+PiAxNik7XG4gIHJldHVybiAobXN3IDw8IDE2KSB8IChsc3cgJiAweEZGRkYpO1xufTtcblxudmFyIFMgPSBmdW5jdGlvbihYLCBuKSB7XG4gIHJldHVybiAoWCA+Pj4gbikgfCAoWCA8PCAoMzIgLSBuKSk7XG59O1xuXG52YXIgUiA9IGZ1bmN0aW9uKFgsIG4pIHtcbiAgcmV0dXJuIChYID4+PiBuKTtcbn07XG5cbnZhciBDaCA9IGZ1bmN0aW9uKHgsIHksIHopIHtcbiAgcmV0dXJuICgoeCAmIHkpIF4gKCh+eCkgJiB6KSk7XG59O1xuXG52YXIgTWFqID0gZnVuY3Rpb24oeCwgeSwgeikge1xuICByZXR1cm4gKCh4ICYgeSkgXiAoeCAmIHopIF4gKHkgJiB6KSk7XG59O1xuXG52YXIgU2lnbWEwMjU2ID0gZnVuY3Rpb24oeCkge1xuICByZXR1cm4gKFMoeCwgMikgXiBTKHgsIDEzKSBeIFMoeCwgMjIpKTtcbn07XG5cbnZhciBTaWdtYTEyNTYgPSBmdW5jdGlvbih4KSB7XG4gIHJldHVybiAoUyh4LCA2KSBeIFMoeCwgMTEpIF4gUyh4LCAyNSkpO1xufTtcblxudmFyIEdhbW1hMDI1NiA9IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIChTKHgsIDcpIF4gUyh4LCAxOCkgXiBSKHgsIDMpKTtcbn07XG5cbnZhciBHYW1tYTEyNTYgPSBmdW5jdGlvbih4KSB7XG4gIHJldHVybiAoUyh4LCAxNykgXiBTKHgsIDE5KSBeIFIoeCwgMTApKTtcbn07XG5cbnZhciBjb3JlX3NoYTI1NiA9IGZ1bmN0aW9uKG0sIGwpIHtcbiAgdmFyIEsgPSBuZXcgQXJyYXkoMHg0MjhBMkY5OCwweDcxMzc0NDkxLDB4QjVDMEZCQ0YsMHhFOUI1REJBNSwweDM5NTZDMjVCLDB4NTlGMTExRjEsMHg5MjNGODJBNCwweEFCMUM1RUQ1LDB4RDgwN0FBOTgsMHgxMjgzNUIwMSwweDI0MzE4NUJFLDB4NTUwQzdEQzMsMHg3MkJFNUQ3NCwweDgwREVCMUZFLDB4OUJEQzA2QTcsMHhDMTlCRjE3NCwweEU0OUI2OUMxLDB4RUZCRTQ3ODYsMHhGQzE5REM2LDB4MjQwQ0ExQ0MsMHgyREU5MkM2RiwweDRBNzQ4NEFBLDB4NUNCMEE5REMsMHg3NkY5ODhEQSwweDk4M0U1MTUyLDB4QTgzMUM2NkQsMHhCMDAzMjdDOCwweEJGNTk3RkM3LDB4QzZFMDBCRjMsMHhENUE3OTE0NywweDZDQTYzNTEsMHgxNDI5Mjk2NywweDI3QjcwQTg1LDB4MkUxQjIxMzgsMHg0RDJDNkRGQywweDUzMzgwRDEzLDB4NjUwQTczNTQsMHg3NjZBMEFCQiwweDgxQzJDOTJFLDB4OTI3MjJDODUsMHhBMkJGRThBMSwweEE4MUE2NjRCLDB4QzI0QjhCNzAsMHhDNzZDNTFBMywweEQxOTJFODE5LDB4RDY5OTA2MjQsMHhGNDBFMzU4NSwweDEwNkFBMDcwLDB4MTlBNEMxMTYsMHgxRTM3NkMwOCwweDI3NDg3NzRDLDB4MzRCMEJDQjUsMHgzOTFDMENCMywweDRFRDhBQTRBLDB4NUI5Q0NBNEYsMHg2ODJFNkZGMywweDc0OEY4MkVFLDB4NzhBNTYzNkYsMHg4NEM4NzgxNCwweDhDQzcwMjA4LDB4OTBCRUZGRkEsMHhBNDUwNkNFQiwweEJFRjlBM0Y3LDB4QzY3MTc4RjIpO1xuICB2YXIgSEFTSCA9IG5ldyBBcnJheSgweDZBMDlFNjY3LCAweEJCNjdBRTg1LCAweDNDNkVGMzcyLCAweEE1NEZGNTNBLCAweDUxMEU1MjdGLCAweDlCMDU2ODhDLCAweDFGODNEOUFCLCAweDVCRTBDRDE5KTtcbiAgICB2YXIgVyA9IG5ldyBBcnJheSg2NCk7XG4gICAgdmFyIGEsIGIsIGMsIGQsIGUsIGYsIGcsIGgsIGksIGo7XG4gICAgdmFyIFQxLCBUMjtcbiAgLyogYXBwZW5kIHBhZGRpbmcgKi9cbiAgbVtsID4+IDVdIHw9IDB4ODAgPDwgKDI0IC0gbCAlIDMyKTtcbiAgbVsoKGwgKyA2NCA+PiA5KSA8PCA0KSArIDE1XSA9IGw7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbS5sZW5ndGg7IGkgKz0gMTYpIHtcbiAgICBhID0gSEFTSFswXTsgYiA9IEhBU0hbMV07IGMgPSBIQVNIWzJdOyBkID0gSEFTSFszXTsgZSA9IEhBU0hbNF07IGYgPSBIQVNIWzVdOyBnID0gSEFTSFs2XTsgaCA9IEhBU0hbN107XG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCA2NDsgaisrKSB7XG4gICAgICBpZiAoaiA8IDE2KSB7XG4gICAgICAgIFdbal0gPSBtW2ogKyBpXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIFdbal0gPSBzYWZlX2FkZChzYWZlX2FkZChzYWZlX2FkZChHYW1tYTEyNTYoV1tqIC0gMl0pLCBXW2ogLSA3XSksIEdhbW1hMDI1NihXW2ogLSAxNV0pKSwgV1tqIC0gMTZdKTtcbiAgICAgIH1cbiAgICAgIFQxID0gc2FmZV9hZGQoc2FmZV9hZGQoc2FmZV9hZGQoc2FmZV9hZGQoaCwgU2lnbWExMjU2KGUpKSwgQ2goZSwgZiwgZykpLCBLW2pdKSwgV1tqXSk7XG4gICAgICBUMiA9IHNhZmVfYWRkKFNpZ21hMDI1NihhKSwgTWFqKGEsIGIsIGMpKTtcbiAgICAgIGggPSBnOyBnID0gZjsgZiA9IGU7IGUgPSBzYWZlX2FkZChkLCBUMSk7IGQgPSBjOyBjID0gYjsgYiA9IGE7IGEgPSBzYWZlX2FkZChUMSwgVDIpO1xuICAgIH1cbiAgICBIQVNIWzBdID0gc2FmZV9hZGQoYSwgSEFTSFswXSk7IEhBU0hbMV0gPSBzYWZlX2FkZChiLCBIQVNIWzFdKTsgSEFTSFsyXSA9IHNhZmVfYWRkKGMsIEhBU0hbMl0pOyBIQVNIWzNdID0gc2FmZV9hZGQoZCwgSEFTSFszXSk7XG4gICAgSEFTSFs0XSA9IHNhZmVfYWRkKGUsIEhBU0hbNF0pOyBIQVNIWzVdID0gc2FmZV9hZGQoZiwgSEFTSFs1XSk7IEhBU0hbNl0gPSBzYWZlX2FkZChnLCBIQVNIWzZdKTsgSEFTSFs3XSA9IHNhZmVfYWRkKGgsIEhBU0hbN10pO1xuICB9XG4gIHJldHVybiBIQVNIO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBzaGEyNTYoYnVmKSB7XG4gIHJldHVybiBoZWxwZXJzLmhhc2goYnVmLCBjb3JlX3NoYTI1NiwgMzIsIHRydWUpO1xufTtcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG4vKmdsb2JhbHMgSGFuZGxlYmFyczogdHJ1ZSAqL1xudmFyIGJhc2UgPSByZXF1aXJlKFwiLi9oYW5kbGViYXJzL2Jhc2VcIik7XG5cbi8vIEVhY2ggb2YgdGhlc2UgYXVnbWVudCB0aGUgSGFuZGxlYmFycyBvYmplY3QuIE5vIG5lZWQgdG8gc2V0dXAgaGVyZS5cbi8vIChUaGlzIGlzIGRvbmUgdG8gZWFzaWx5IHNoYXJlIGNvZGUgYmV0d2VlbiBjb21tb25qcyBhbmQgYnJvd3NlIGVudnMpXG52YXIgU2FmZVN0cmluZyA9IHJlcXVpcmUoXCIuL2hhbmRsZWJhcnMvc2FmZS1zdHJpbmdcIilbXCJkZWZhdWx0XCJdO1xudmFyIEV4Y2VwdGlvbiA9IHJlcXVpcmUoXCIuL2hhbmRsZWJhcnMvZXhjZXB0aW9uXCIpW1wiZGVmYXVsdFwiXTtcbnZhciBVdGlscyA9IHJlcXVpcmUoXCIuL2hhbmRsZWJhcnMvdXRpbHNcIik7XG52YXIgcnVudGltZSA9IHJlcXVpcmUoXCIuL2hhbmRsZWJhcnMvcnVudGltZVwiKTtcblxuLy8gRm9yIGNvbXBhdGliaWxpdHkgYW5kIHVzYWdlIG91dHNpZGUgb2YgbW9kdWxlIHN5c3RlbXMsIG1ha2UgdGhlIEhhbmRsZWJhcnMgb2JqZWN0IGEgbmFtZXNwYWNlXG52YXIgY3JlYXRlID0gZnVuY3Rpb24oKSB7XG4gIHZhciBoYiA9IG5ldyBiYXNlLkhhbmRsZWJhcnNFbnZpcm9ubWVudCgpO1xuXG4gIFV0aWxzLmV4dGVuZChoYiwgYmFzZSk7XG4gIGhiLlNhZmVTdHJpbmcgPSBTYWZlU3RyaW5nO1xuICBoYi5FeGNlcHRpb24gPSBFeGNlcHRpb247XG4gIGhiLlV0aWxzID0gVXRpbHM7XG5cbiAgaGIuVk0gPSBydW50aW1lO1xuICBoYi50ZW1wbGF0ZSA9IGZ1bmN0aW9uKHNwZWMpIHtcbiAgICByZXR1cm4gcnVudGltZS50ZW1wbGF0ZShzcGVjLCBoYik7XG4gIH07XG5cbiAgcmV0dXJuIGhiO1xufTtcblxudmFyIEhhbmRsZWJhcnMgPSBjcmVhdGUoKTtcbkhhbmRsZWJhcnMuY3JlYXRlID0gY3JlYXRlO1xuXG5leHBvcnRzW1wiZGVmYXVsdFwiXSA9IEhhbmRsZWJhcnM7IiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgVXRpbHMgPSByZXF1aXJlKFwiLi91dGlsc1wiKTtcbnZhciBFeGNlcHRpb24gPSByZXF1aXJlKFwiLi9leGNlcHRpb25cIilbXCJkZWZhdWx0XCJdO1xuXG52YXIgVkVSU0lPTiA9IFwiMS4zLjBcIjtcbmV4cG9ydHMuVkVSU0lPTiA9IFZFUlNJT047dmFyIENPTVBJTEVSX1JFVklTSU9OID0gNDtcbmV4cG9ydHMuQ09NUElMRVJfUkVWSVNJT04gPSBDT01QSUxFUl9SRVZJU0lPTjtcbnZhciBSRVZJU0lPTl9DSEFOR0VTID0ge1xuICAxOiAnPD0gMS4wLnJjLjInLCAvLyAxLjAucmMuMiBpcyBhY3R1YWxseSByZXYyIGJ1dCBkb2Vzbid0IHJlcG9ydCBpdFxuICAyOiAnPT0gMS4wLjAtcmMuMycsXG4gIDM6ICc9PSAxLjAuMC1yYy40JyxcbiAgNDogJz49IDEuMC4wJ1xufTtcbmV4cG9ydHMuUkVWSVNJT05fQ0hBTkdFUyA9IFJFVklTSU9OX0NIQU5HRVM7XG52YXIgaXNBcnJheSA9IFV0aWxzLmlzQXJyYXksXG4gICAgaXNGdW5jdGlvbiA9IFV0aWxzLmlzRnVuY3Rpb24sXG4gICAgdG9TdHJpbmcgPSBVdGlscy50b1N0cmluZyxcbiAgICBvYmplY3RUeXBlID0gJ1tvYmplY3QgT2JqZWN0XSc7XG5cbmZ1bmN0aW9uIEhhbmRsZWJhcnNFbnZpcm9ubWVudChoZWxwZXJzLCBwYXJ0aWFscykge1xuICB0aGlzLmhlbHBlcnMgPSBoZWxwZXJzIHx8IHt9O1xuICB0aGlzLnBhcnRpYWxzID0gcGFydGlhbHMgfHwge307XG5cbiAgcmVnaXN0ZXJEZWZhdWx0SGVscGVycyh0aGlzKTtcbn1cblxuZXhwb3J0cy5IYW5kbGViYXJzRW52aXJvbm1lbnQgPSBIYW5kbGViYXJzRW52aXJvbm1lbnQ7SGFuZGxlYmFyc0Vudmlyb25tZW50LnByb3RvdHlwZSA9IHtcbiAgY29uc3RydWN0b3I6IEhhbmRsZWJhcnNFbnZpcm9ubWVudCxcblxuICBsb2dnZXI6IGxvZ2dlcixcbiAgbG9nOiBsb2csXG5cbiAgcmVnaXN0ZXJIZWxwZXI6IGZ1bmN0aW9uKG5hbWUsIGZuLCBpbnZlcnNlKSB7XG4gICAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICAgIGlmIChpbnZlcnNlIHx8IGZuKSB7IHRocm93IG5ldyBFeGNlcHRpb24oJ0FyZyBub3Qgc3VwcG9ydGVkIHdpdGggbXVsdGlwbGUgaGVscGVycycpOyB9XG4gICAgICBVdGlscy5leHRlbmQodGhpcy5oZWxwZXJzLCBuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGludmVyc2UpIHsgZm4ubm90ID0gaW52ZXJzZTsgfVxuICAgICAgdGhpcy5oZWxwZXJzW25hbWVdID0gZm47XG4gICAgfVxuICB9LFxuXG4gIHJlZ2lzdGVyUGFydGlhbDogZnVuY3Rpb24obmFtZSwgc3RyKSB7XG4gICAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICAgIFV0aWxzLmV4dGVuZCh0aGlzLnBhcnRpYWxzLCAgbmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucGFydGlhbHNbbmFtZV0gPSBzdHI7XG4gICAgfVxuICB9XG59O1xuXG5mdW5jdGlvbiByZWdpc3RlckRlZmF1bHRIZWxwZXJzKGluc3RhbmNlKSB7XG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdoZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oYXJnKSB7XG4gICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIk1pc3NpbmcgaGVscGVyOiAnXCIgKyBhcmcgKyBcIidcIik7XG4gICAgfVxuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignYmxvY2tIZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIHZhciBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlIHx8IGZ1bmN0aW9uKCkge30sIGZuID0gb3B0aW9ucy5mbjtcblxuICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQpKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICAgIGlmKGNvbnRleHQgPT09IHRydWUpIHtcbiAgICAgIHJldHVybiBmbih0aGlzKTtcbiAgICB9IGVsc2UgaWYoY29udGV4dCA9PT0gZmFsc2UgfHwgY29udGV4dCA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgICB9IGVsc2UgaWYgKGlzQXJyYXkoY29udGV4dCkpIHtcbiAgICAgIGlmKGNvbnRleHQubGVuZ3RoID4gMCkge1xuICAgICAgICByZXR1cm4gaW5zdGFuY2UuaGVscGVycy5lYWNoKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmbihjb250ZXh0KTtcbiAgICB9XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdlYWNoJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIHZhciBmbiA9IG9wdGlvbnMuZm4sIGludmVyc2UgPSBvcHRpb25zLmludmVyc2U7XG4gICAgdmFyIGkgPSAwLCByZXQgPSBcIlwiLCBkYXRhO1xuXG4gICAgaWYgKGlzRnVuY3Rpb24oY29udGV4dCkpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gICAgaWYgKG9wdGlvbnMuZGF0YSkge1xuICAgICAgZGF0YSA9IGNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gICAgfVxuXG4gICAgaWYoY29udGV4dCAmJiB0eXBlb2YgY29udGV4dCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGlmIChpc0FycmF5KGNvbnRleHQpKSB7XG4gICAgICAgIGZvcih2YXIgaiA9IGNvbnRleHQubGVuZ3RoOyBpPGo7IGkrKykge1xuICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICBkYXRhLmluZGV4ID0gaTtcbiAgICAgICAgICAgIGRhdGEuZmlyc3QgPSAoaSA9PT0gMCk7XG4gICAgICAgICAgICBkYXRhLmxhc3QgID0gKGkgPT09IChjb250ZXh0Lmxlbmd0aC0xKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldCA9IHJldCArIGZuKGNvbnRleHRbaV0sIHsgZGF0YTogZGF0YSB9KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yKHZhciBrZXkgaW4gY29udGV4dCkge1xuICAgICAgICAgIGlmKGNvbnRleHQuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgaWYoZGF0YSkgeyBcbiAgICAgICAgICAgICAgZGF0YS5rZXkgPSBrZXk7IFxuICAgICAgICAgICAgICBkYXRhLmluZGV4ID0gaTtcbiAgICAgICAgICAgICAgZGF0YS5maXJzdCA9IChpID09PSAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldCA9IHJldCArIGZuKGNvbnRleHRba2V5XSwge2RhdGE6IGRhdGF9KTtcbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZihpID09PSAwKXtcbiAgICAgIHJldCA9IGludmVyc2UodGhpcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2lmJywgZnVuY3Rpb24oY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgICBpZiAoaXNGdW5jdGlvbihjb25kaXRpb25hbCkpIHsgY29uZGl0aW9uYWwgPSBjb25kaXRpb25hbC5jYWxsKHRoaXMpOyB9XG5cbiAgICAvLyBEZWZhdWx0IGJlaGF2aW9yIGlzIHRvIHJlbmRlciB0aGUgcG9zaXRpdmUgcGF0aCBpZiB0aGUgdmFsdWUgaXMgdHJ1dGh5IGFuZCBub3QgZW1wdHkuXG4gICAgLy8gVGhlIGBpbmNsdWRlWmVyb2Agb3B0aW9uIG1heSBiZSBzZXQgdG8gdHJlYXQgdGhlIGNvbmR0aW9uYWwgYXMgcHVyZWx5IG5vdCBlbXB0eSBiYXNlZCBvbiB0aGVcbiAgICAvLyBiZWhhdmlvciBvZiBpc0VtcHR5LiBFZmZlY3RpdmVseSB0aGlzIGRldGVybWluZXMgaWYgMCBpcyBoYW5kbGVkIGJ5IHRoZSBwb3NpdGl2ZSBwYXRoIG9yIG5lZ2F0aXZlLlxuICAgIGlmICgoIW9wdGlvbnMuaGFzaC5pbmNsdWRlWmVybyAmJiAhY29uZGl0aW9uYWwpIHx8IFV0aWxzLmlzRW1wdHkoY29uZGl0aW9uYWwpKSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5mbih0aGlzKTtcbiAgICB9XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCd1bmxlc3MnLCBmdW5jdGlvbihjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICAgIHJldHVybiBpbnN0YW5jZS5oZWxwZXJzWydpZiddLmNhbGwodGhpcywgY29uZGl0aW9uYWwsIHtmbjogb3B0aW9ucy5pbnZlcnNlLCBpbnZlcnNlOiBvcHRpb25zLmZuLCBoYXNoOiBvcHRpb25zLmhhc2h9KTtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ3dpdGgnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24oY29udGV4dCkpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gICAgaWYgKCFVdGlscy5pc0VtcHR5KGNvbnRleHQpKSByZXR1cm4gb3B0aW9ucy5mbihjb250ZXh0KTtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2xvZycsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICB2YXIgbGV2ZWwgPSBvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5kYXRhLmxldmVsICE9IG51bGwgPyBwYXJzZUludChvcHRpb25zLmRhdGEubGV2ZWwsIDEwKSA6IDE7XG4gICAgaW5zdGFuY2UubG9nKGxldmVsLCBjb250ZXh0KTtcbiAgfSk7XG59XG5cbnZhciBsb2dnZXIgPSB7XG4gIG1ldGhvZE1hcDogeyAwOiAnZGVidWcnLCAxOiAnaW5mbycsIDI6ICd3YXJuJywgMzogJ2Vycm9yJyB9LFxuXG4gIC8vIFN0YXRlIGVudW1cbiAgREVCVUc6IDAsXG4gIElORk86IDEsXG4gIFdBUk46IDIsXG4gIEVSUk9SOiAzLFxuICBsZXZlbDogMyxcblxuICAvLyBjYW4gYmUgb3ZlcnJpZGRlbiBpbiB0aGUgaG9zdCBlbnZpcm9ubWVudFxuICBsb2c6IGZ1bmN0aW9uKGxldmVsLCBvYmopIHtcbiAgICBpZiAobG9nZ2VyLmxldmVsIDw9IGxldmVsKSB7XG4gICAgICB2YXIgbWV0aG9kID0gbG9nZ2VyLm1ldGhvZE1hcFtsZXZlbF07XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmIGNvbnNvbGVbbWV0aG9kXSkge1xuICAgICAgICBjb25zb2xlW21ldGhvZF0uY2FsbChjb25zb2xlLCBvYmopO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcbmV4cG9ydHMubG9nZ2VyID0gbG9nZ2VyO1xuZnVuY3Rpb24gbG9nKGxldmVsLCBvYmopIHsgbG9nZ2VyLmxvZyhsZXZlbCwgb2JqKTsgfVxuXG5leHBvcnRzLmxvZyA9IGxvZzt2YXIgY3JlYXRlRnJhbWUgPSBmdW5jdGlvbihvYmplY3QpIHtcbiAgdmFyIG9iaiA9IHt9O1xuICBVdGlscy5leHRlbmQob2JqLCBvYmplY3QpO1xuICByZXR1cm4gb2JqO1xufTtcbmV4cG9ydHMuY3JlYXRlRnJhbWUgPSBjcmVhdGVGcmFtZTsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIGVycm9yUHJvcHMgPSBbJ2Rlc2NyaXB0aW9uJywgJ2ZpbGVOYW1lJywgJ2xpbmVOdW1iZXInLCAnbWVzc2FnZScsICduYW1lJywgJ251bWJlcicsICdzdGFjayddO1xuXG5mdW5jdGlvbiBFeGNlcHRpb24obWVzc2FnZSwgbm9kZSkge1xuICB2YXIgbGluZTtcbiAgaWYgKG5vZGUgJiYgbm9kZS5maXJzdExpbmUpIHtcbiAgICBsaW5lID0gbm9kZS5maXJzdExpbmU7XG5cbiAgICBtZXNzYWdlICs9ICcgLSAnICsgbGluZSArICc6JyArIG5vZGUuZmlyc3RDb2x1bW47XG4gIH1cblxuICB2YXIgdG1wID0gRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yLmNhbGwodGhpcywgbWVzc2FnZSk7XG5cbiAgLy8gVW5mb3J0dW5hdGVseSBlcnJvcnMgYXJlIG5vdCBlbnVtZXJhYmxlIGluIENocm9tZSAoYXQgbGVhc3QpLCBzbyBgZm9yIHByb3AgaW4gdG1wYCBkb2Vzbid0IHdvcmsuXG4gIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IGVycm9yUHJvcHMubGVuZ3RoOyBpZHgrKykge1xuICAgIHRoaXNbZXJyb3JQcm9wc1tpZHhdXSA9IHRtcFtlcnJvclByb3BzW2lkeF1dO1xuICB9XG5cbiAgaWYgKGxpbmUpIHtcbiAgICB0aGlzLmxpbmVOdW1iZXIgPSBsaW5lO1xuICAgIHRoaXMuY29sdW1uID0gbm9kZS5maXJzdENvbHVtbjtcbiAgfVxufVxuXG5FeGNlcHRpb24ucHJvdG90eXBlID0gbmV3IEVycm9yKCk7XG5cbmV4cG9ydHNbXCJkZWZhdWx0XCJdID0gRXhjZXB0aW9uOyIsIlwidXNlIHN0cmljdFwiO1xudmFyIFV0aWxzID0gcmVxdWlyZShcIi4vdXRpbHNcIik7XG52YXIgRXhjZXB0aW9uID0gcmVxdWlyZShcIi4vZXhjZXB0aW9uXCIpW1wiZGVmYXVsdFwiXTtcbnZhciBDT01QSUxFUl9SRVZJU0lPTiA9IHJlcXVpcmUoXCIuL2Jhc2VcIikuQ09NUElMRVJfUkVWSVNJT047XG52YXIgUkVWSVNJT05fQ0hBTkdFUyA9IHJlcXVpcmUoXCIuL2Jhc2VcIikuUkVWSVNJT05fQ0hBTkdFUztcblxuZnVuY3Rpb24gY2hlY2tSZXZpc2lvbihjb21waWxlckluZm8pIHtcbiAgdmFyIGNvbXBpbGVyUmV2aXNpb24gPSBjb21waWxlckluZm8gJiYgY29tcGlsZXJJbmZvWzBdIHx8IDEsXG4gICAgICBjdXJyZW50UmV2aXNpb24gPSBDT01QSUxFUl9SRVZJU0lPTjtcblxuICBpZiAoY29tcGlsZXJSZXZpc2lvbiAhPT0gY3VycmVudFJldmlzaW9uKSB7XG4gICAgaWYgKGNvbXBpbGVyUmV2aXNpb24gPCBjdXJyZW50UmV2aXNpb24pIHtcbiAgICAgIHZhciBydW50aW1lVmVyc2lvbnMgPSBSRVZJU0lPTl9DSEFOR0VTW2N1cnJlbnRSZXZpc2lvbl0sXG4gICAgICAgICAgY29tcGlsZXJWZXJzaW9ucyA9IFJFVklTSU9OX0NIQU5HRVNbY29tcGlsZXJSZXZpc2lvbl07XG4gICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYW4gb2xkZXIgdmVyc2lvbiBvZiBIYW5kbGViYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gXCIrXG4gICAgICAgICAgICBcIlBsZWFzZSB1cGRhdGUgeW91ciBwcmVjb21waWxlciB0byBhIG5ld2VyIHZlcnNpb24gKFwiK3J1bnRpbWVWZXJzaW9ucytcIikgb3IgZG93bmdyYWRlIHlvdXIgcnVudGltZSB0byBhbiBvbGRlciB2ZXJzaW9uIChcIitjb21waWxlclZlcnNpb25zK1wiKS5cIik7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFVzZSB0aGUgZW1iZWRkZWQgdmVyc2lvbiBpbmZvIHNpbmNlIHRoZSBydW50aW1lIGRvZXNuJ3Qga25vdyBhYm91dCB0aGlzIHJldmlzaW9uIHlldFxuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIlRlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGEgbmV3ZXIgdmVyc2lvbiBvZiBIYW5kbGViYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gXCIrXG4gICAgICAgICAgICBcIlBsZWFzZSB1cGRhdGUgeW91ciBydW50aW1lIHRvIGEgbmV3ZXIgdmVyc2lvbiAoXCIrY29tcGlsZXJJbmZvWzFdK1wiKS5cIik7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydHMuY2hlY2tSZXZpc2lvbiA9IGNoZWNrUmV2aXNpb247Ly8gVE9ETzogUmVtb3ZlIHRoaXMgbGluZSBhbmQgYnJlYWsgdXAgY29tcGlsZVBhcnRpYWxcblxuZnVuY3Rpb24gdGVtcGxhdGUodGVtcGxhdGVTcGVjLCBlbnYpIHtcbiAgaWYgKCFlbnYpIHtcbiAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiTm8gZW52aXJvbm1lbnQgcGFzc2VkIHRvIHRlbXBsYXRlXCIpO1xuICB9XG5cbiAgLy8gTm90ZTogVXNpbmcgZW52LlZNIHJlZmVyZW5jZXMgcmF0aGVyIHRoYW4gbG9jYWwgdmFyIHJlZmVyZW5jZXMgdGhyb3VnaG91dCB0aGlzIHNlY3Rpb24gdG8gYWxsb3dcbiAgLy8gZm9yIGV4dGVybmFsIHVzZXJzIHRvIG92ZXJyaWRlIHRoZXNlIGFzIHBzdWVkby1zdXBwb3J0ZWQgQVBJcy5cbiAgdmFyIGludm9rZVBhcnRpYWxXcmFwcGVyID0gZnVuY3Rpb24ocGFydGlhbCwgbmFtZSwgY29udGV4dCwgaGVscGVycywgcGFydGlhbHMsIGRhdGEpIHtcbiAgICB2YXIgcmVzdWx0ID0gZW52LlZNLmludm9rZVBhcnRpYWwuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBpZiAocmVzdWx0ICE9IG51bGwpIHsgcmV0dXJuIHJlc3VsdDsgfVxuXG4gICAgaWYgKGVudi5jb21waWxlKSB7XG4gICAgICB2YXIgb3B0aW9ucyA9IHsgaGVscGVyczogaGVscGVycywgcGFydGlhbHM6IHBhcnRpYWxzLCBkYXRhOiBkYXRhIH07XG4gICAgICBwYXJ0aWFsc1tuYW1lXSA9IGVudi5jb21waWxlKHBhcnRpYWwsIHsgZGF0YTogZGF0YSAhPT0gdW5kZWZpbmVkIH0sIGVudik7XG4gICAgICByZXR1cm4gcGFydGlhbHNbbmFtZV0oY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJUaGUgcGFydGlhbCBcIiArIG5hbWUgKyBcIiBjb3VsZCBub3QgYmUgY29tcGlsZWQgd2hlbiBydW5uaW5nIGluIHJ1bnRpbWUtb25seSBtb2RlXCIpO1xuICAgIH1cbiAgfTtcblxuICAvLyBKdXN0IGFkZCB3YXRlclxuICB2YXIgY29udGFpbmVyID0ge1xuICAgIGVzY2FwZUV4cHJlc3Npb246IFV0aWxzLmVzY2FwZUV4cHJlc3Npb24sXG4gICAgaW52b2tlUGFydGlhbDogaW52b2tlUGFydGlhbFdyYXBwZXIsXG4gICAgcHJvZ3JhbXM6IFtdLFxuICAgIHByb2dyYW06IGZ1bmN0aW9uKGksIGZuLCBkYXRhKSB7XG4gICAgICB2YXIgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldO1xuICAgICAgaWYoZGF0YSkge1xuICAgICAgICBwcm9ncmFtV3JhcHBlciA9IHByb2dyYW0oaSwgZm4sIGRhdGEpO1xuICAgICAgfSBlbHNlIGlmICghcHJvZ3JhbVdyYXBwZXIpIHtcbiAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldID0gcHJvZ3JhbShpLCBmbik7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHJvZ3JhbVdyYXBwZXI7XG4gICAgfSxcbiAgICBtZXJnZTogZnVuY3Rpb24ocGFyYW0sIGNvbW1vbikge1xuICAgICAgdmFyIHJldCA9IHBhcmFtIHx8IGNvbW1vbjtcblxuICAgICAgaWYgKHBhcmFtICYmIGNvbW1vbiAmJiAocGFyYW0gIT09IGNvbW1vbikpIHtcbiAgICAgICAgcmV0ID0ge307XG4gICAgICAgIFV0aWxzLmV4dGVuZChyZXQsIGNvbW1vbik7XG4gICAgICAgIFV0aWxzLmV4dGVuZChyZXQsIHBhcmFtKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXQ7XG4gICAgfSxcbiAgICBwcm9ncmFtV2l0aERlcHRoOiBlbnYuVk0ucHJvZ3JhbVdpdGhEZXB0aCxcbiAgICBub29wOiBlbnYuVk0ubm9vcCxcbiAgICBjb21waWxlckluZm86IG51bGxcbiAgfTtcblxuICByZXR1cm4gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHZhciBuYW1lc3BhY2UgPSBvcHRpb25zLnBhcnRpYWwgPyBvcHRpb25zIDogZW52LFxuICAgICAgICBoZWxwZXJzLFxuICAgICAgICBwYXJ0aWFscztcblxuICAgIGlmICghb3B0aW9ucy5wYXJ0aWFsKSB7XG4gICAgICBoZWxwZXJzID0gb3B0aW9ucy5oZWxwZXJzO1xuICAgICAgcGFydGlhbHMgPSBvcHRpb25zLnBhcnRpYWxzO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0ID0gdGVtcGxhdGVTcGVjLmNhbGwoXG4gICAgICAgICAgY29udGFpbmVyLFxuICAgICAgICAgIG5hbWVzcGFjZSwgY29udGV4dCxcbiAgICAgICAgICBoZWxwZXJzLFxuICAgICAgICAgIHBhcnRpYWxzLFxuICAgICAgICAgIG9wdGlvbnMuZGF0YSk7XG5cbiAgICBpZiAoIW9wdGlvbnMucGFydGlhbCkge1xuICAgICAgZW52LlZNLmNoZWNrUmV2aXNpb24oY29udGFpbmVyLmNvbXBpbGVySW5mbyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbn1cblxuZXhwb3J0cy50ZW1wbGF0ZSA9IHRlbXBsYXRlO2Z1bmN0aW9uIHByb2dyYW1XaXRoRGVwdGgoaSwgZm4sIGRhdGEgLyosICRkZXB0aCAqLykge1xuICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMyk7XG5cbiAgdmFyIHByb2cgPSBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgW2NvbnRleHQsIG9wdGlvbnMuZGF0YSB8fCBkYXRhXS5jb25jYXQoYXJncykpO1xuICB9O1xuICBwcm9nLnByb2dyYW0gPSBpO1xuICBwcm9nLmRlcHRoID0gYXJncy5sZW5ndGg7XG4gIHJldHVybiBwcm9nO1xufVxuXG5leHBvcnRzLnByb2dyYW1XaXRoRGVwdGggPSBwcm9ncmFtV2l0aERlcHRoO2Z1bmN0aW9uIHByb2dyYW0oaSwgZm4sIGRhdGEpIHtcbiAgdmFyIHByb2cgPSBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICByZXR1cm4gZm4oY29udGV4dCwgb3B0aW9ucy5kYXRhIHx8IGRhdGEpO1xuICB9O1xuICBwcm9nLnByb2dyYW0gPSBpO1xuICBwcm9nLmRlcHRoID0gMDtcbiAgcmV0dXJuIHByb2c7XG59XG5cbmV4cG9ydHMucHJvZ3JhbSA9IHByb2dyYW07ZnVuY3Rpb24gaW52b2tlUGFydGlhbChwYXJ0aWFsLCBuYW1lLCBjb250ZXh0LCBoZWxwZXJzLCBwYXJ0aWFscywgZGF0YSkge1xuICB2YXIgb3B0aW9ucyA9IHsgcGFydGlhbDogdHJ1ZSwgaGVscGVyczogaGVscGVycywgcGFydGlhbHM6IHBhcnRpYWxzLCBkYXRhOiBkYXRhIH07XG5cbiAgaWYocGFydGlhbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIlRoZSBwYXJ0aWFsIFwiICsgbmFtZSArIFwiIGNvdWxkIG5vdCBiZSBmb3VuZFwiKTtcbiAgfSBlbHNlIGlmKHBhcnRpYWwgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgIHJldHVybiBwYXJ0aWFsKGNvbnRleHQsIG9wdGlvbnMpO1xuICB9XG59XG5cbmV4cG9ydHMuaW52b2tlUGFydGlhbCA9IGludm9rZVBhcnRpYWw7ZnVuY3Rpb24gbm9vcCgpIHsgcmV0dXJuIFwiXCI7IH1cblxuZXhwb3J0cy5ub29wID0gbm9vcDsiLCJcInVzZSBzdHJpY3RcIjtcbi8vIEJ1aWxkIG91dCBvdXIgYmFzaWMgU2FmZVN0cmluZyB0eXBlXG5mdW5jdGlvbiBTYWZlU3RyaW5nKHN0cmluZykge1xuICB0aGlzLnN0cmluZyA9IHN0cmluZztcbn1cblxuU2FmZVN0cmluZy5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIFwiXCIgKyB0aGlzLnN0cmluZztcbn07XG5cbmV4cG9ydHNbXCJkZWZhdWx0XCJdID0gU2FmZVN0cmluZzsiLCJcInVzZSBzdHJpY3RcIjtcbi8qanNoaW50IC1XMDA0ICovXG52YXIgU2FmZVN0cmluZyA9IHJlcXVpcmUoXCIuL3NhZmUtc3RyaW5nXCIpW1wiZGVmYXVsdFwiXTtcblxudmFyIGVzY2FwZSA9IHtcbiAgXCImXCI6IFwiJmFtcDtcIixcbiAgXCI8XCI6IFwiJmx0O1wiLFxuICBcIj5cIjogXCImZ3Q7XCIsXG4gICdcIic6IFwiJnF1b3Q7XCIsXG4gIFwiJ1wiOiBcIiYjeDI3O1wiLFxuICBcImBcIjogXCImI3g2MDtcIlxufTtcblxudmFyIGJhZENoYXJzID0gL1smPD5cIidgXS9nO1xudmFyIHBvc3NpYmxlID0gL1smPD5cIidgXS87XG5cbmZ1bmN0aW9uIGVzY2FwZUNoYXIoY2hyKSB7XG4gIHJldHVybiBlc2NhcGVbY2hyXSB8fCBcIiZhbXA7XCI7XG59XG5cbmZ1bmN0aW9uIGV4dGVuZChvYmosIHZhbHVlKSB7XG4gIGZvcih2YXIga2V5IGluIHZhbHVlKSB7XG4gICAgaWYoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHZhbHVlLCBrZXkpKSB7XG4gICAgICBvYmpba2V5XSA9IHZhbHVlW2tleV07XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydHMuZXh0ZW5kID0gZXh0ZW5kO3ZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5leHBvcnRzLnRvU3RyaW5nID0gdG9TdHJpbmc7XG4vLyBTb3VyY2VkIGZyb20gbG9kYXNoXG4vLyBodHRwczovL2dpdGh1Yi5jb20vYmVzdGllanMvbG9kYXNoL2Jsb2IvbWFzdGVyL0xJQ0VOU0UudHh0XG52YXIgaXNGdW5jdGlvbiA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbic7XG59O1xuLy8gZmFsbGJhY2sgZm9yIG9sZGVyIHZlcnNpb25zIG9mIENocm9tZSBhbmQgU2FmYXJpXG5pZiAoaXNGdW5jdGlvbigveC8pKSB7XG4gIGlzRnVuY3Rpb24gPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbicgJiYgdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG4gIH07XG59XG52YXIgaXNGdW5jdGlvbjtcbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSA/IHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSAnW29iamVjdCBBcnJheV0nIDogZmFsc2U7XG59O1xuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcblxuZnVuY3Rpb24gZXNjYXBlRXhwcmVzc2lvbihzdHJpbmcpIHtcbiAgLy8gZG9uJ3QgZXNjYXBlIFNhZmVTdHJpbmdzLCBzaW5jZSB0aGV5J3JlIGFscmVhZHkgc2FmZVxuICBpZiAoc3RyaW5nIGluc3RhbmNlb2YgU2FmZVN0cmluZykge1xuICAgIHJldHVybiBzdHJpbmcudG9TdHJpbmcoKTtcbiAgfSBlbHNlIGlmICghc3RyaW5nICYmIHN0cmluZyAhPT0gMCkge1xuICAgIHJldHVybiBcIlwiO1xuICB9XG5cbiAgLy8gRm9yY2UgYSBzdHJpbmcgY29udmVyc2lvbiBhcyB0aGlzIHdpbGwgYmUgZG9uZSBieSB0aGUgYXBwZW5kIHJlZ2FyZGxlc3MgYW5kXG4gIC8vIHRoZSByZWdleCB0ZXN0IHdpbGwgZG8gdGhpcyB0cmFuc3BhcmVudGx5IGJlaGluZCB0aGUgc2NlbmVzLCBjYXVzaW5nIGlzc3VlcyBpZlxuICAvLyBhbiBvYmplY3QncyB0byBzdHJpbmcgaGFzIGVzY2FwZWQgY2hhcmFjdGVycyBpbiBpdC5cbiAgc3RyaW5nID0gXCJcIiArIHN0cmluZztcblxuICBpZighcG9zc2libGUudGVzdChzdHJpbmcpKSB7IHJldHVybiBzdHJpbmc7IH1cbiAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKGJhZENoYXJzLCBlc2NhcGVDaGFyKTtcbn1cblxuZXhwb3J0cy5lc2NhcGVFeHByZXNzaW9uID0gZXNjYXBlRXhwcmVzc2lvbjtmdW5jdGlvbiBpc0VtcHR5KHZhbHVlKSB7XG4gIGlmICghdmFsdWUgJiYgdmFsdWUgIT09IDApIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIGlmIChpc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZXhwb3J0cy5pc0VtcHR5ID0gaXNFbXB0eTsiLCIvLyBDcmVhdGUgYSBzaW1wbGUgcGF0aCBhbGlhcyB0byBhbGxvdyBicm93c2VyaWZ5IHRvIHJlc29sdmVcbi8vIHRoZSBydW50aW1lIG9uIGEgc3VwcG9ydGVkIHBhdGguXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vZGlzdC9janMvaGFuZGxlYmFycy5ydW50aW1lJyk7XG4iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKipcbiAqIG1hcmtlZCAtIGEgbWFya2Rvd24gcGFyc2VyXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTEtMjAxMywgQ2hyaXN0b3BoZXIgSmVmZnJleS4gKE1JVCBMaWNlbnNlZClcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9jaGpqL21hcmtlZFxuICovXG5cbjsoZnVuY3Rpb24oKSB7XG5cbi8qKlxuICogQmxvY2stTGV2ZWwgR3JhbW1hclxuICovXG5cbnZhciBibG9jayA9IHtcbiAgbmV3bGluZTogL15cXG4rLyxcbiAgY29kZTogL14oIHs0fVteXFxuXStcXG4qKSsvLFxuICBmZW5jZXM6IG5vb3AsXG4gIGhyOiAvXiggKlstKl9dKXszLH0gKig/Olxcbit8JCkvLFxuICBoZWFkaW5nOiAvXiAqKCN7MSw2fSkgKihbXlxcbl0rPykgKiMqICooPzpcXG4rfCQpLyxcbiAgbnB0YWJsZTogbm9vcCxcbiAgbGhlYWRpbmc6IC9eKFteXFxuXSspXFxuICooPXwtKXsyLH0gKig/Olxcbit8JCkvLFxuICBibG9ja3F1b3RlOiAvXiggKj5bXlxcbl0rKFxcblteXFxuXSspKlxcbiopKy8sXG4gIGxpc3Q6IC9eKCAqKShidWxsKSBbXFxzXFxTXSs/KD86aHJ8XFxuezIsfSg/ISApKD8hXFwxYnVsbCApXFxuKnxcXHMqJCkvLFxuICBodG1sOiAvXiAqKD86Y29tbWVudHxjbG9zZWR8Y2xvc2luZykgKig/OlxcbnsyLH18XFxzKiQpLyxcbiAgZGVmOiAvXiAqXFxbKFteXFxdXSspXFxdOiAqPD8oW15cXHM+XSspPj8oPzogK1tcIihdKFteXFxuXSspW1wiKV0pPyAqKD86XFxuK3wkKS8sXG4gIHRhYmxlOiBub29wLFxuICBwYXJhZ3JhcGg6IC9eKCg/OlteXFxuXStcXG4/KD8haHJ8aGVhZGluZ3xsaGVhZGluZ3xibG9ja3F1b3RlfHRhZ3xkZWYpKSspXFxuKi8sXG4gIHRleHQ6IC9eW15cXG5dKy9cbn07XG5cbmJsb2NrLmJ1bGxldCA9IC8oPzpbKistXXxcXGQrXFwuKS87XG5ibG9jay5pdGVtID0gL14oICopKGJ1bGwpIFteXFxuXSooPzpcXG4oPyFcXDFidWxsIClbXlxcbl0qKSovO1xuYmxvY2suaXRlbSA9IHJlcGxhY2UoYmxvY2suaXRlbSwgJ2dtJylcbiAgKC9idWxsL2csIGJsb2NrLmJ1bGxldClcbiAgKCk7XG5cbmJsb2NrLmxpc3QgPSByZXBsYWNlKGJsb2NrLmxpc3QpXG4gICgvYnVsbC9nLCBibG9jay5idWxsZXQpXG4gICgnaHInLCAvXFxuKyg/PSg/OiAqWy0qX10pezMsfSAqKD86XFxuK3wkKSkvKVxuICAoKTtcblxuYmxvY2suX3RhZyA9ICcoPyEoPzonXG4gICsgJ2F8ZW18c3Ryb25nfHNtYWxsfHN8Y2l0ZXxxfGRmbnxhYmJyfGRhdGF8dGltZXxjb2RlJ1xuICArICd8dmFyfHNhbXB8a2JkfHN1YnxzdXB8aXxifHV8bWFya3xydWJ5fHJ0fHJwfGJkaXxiZG8nXG4gICsgJ3xzcGFufGJyfHdicnxpbnN8ZGVsfGltZylcXFxcYilcXFxcdysoPyE6L3xAKVxcXFxiJztcblxuYmxvY2suaHRtbCA9IHJlcGxhY2UoYmxvY2suaHRtbClcbiAgKCdjb21tZW50JywgLzwhLS1bXFxzXFxTXSo/LS0+LylcbiAgKCdjbG9zZWQnLCAvPCh0YWcpW1xcc1xcU10rPzxcXC9cXDE+LylcbiAgKCdjbG9zaW5nJywgLzx0YWcoPzpcIlteXCJdKlwifCdbXiddKid8W14nXCI+XSkqPz4vKVxuICAoL3RhZy9nLCBibG9jay5fdGFnKVxuICAoKTtcblxuYmxvY2sucGFyYWdyYXBoID0gcmVwbGFjZShibG9jay5wYXJhZ3JhcGgpXG4gICgnaHInLCBibG9jay5ocilcbiAgKCdoZWFkaW5nJywgYmxvY2suaGVhZGluZylcbiAgKCdsaGVhZGluZycsIGJsb2NrLmxoZWFkaW5nKVxuICAoJ2Jsb2NrcXVvdGUnLCBibG9jay5ibG9ja3F1b3RlKVxuICAoJ3RhZycsICc8JyArIGJsb2NrLl90YWcpXG4gICgnZGVmJywgYmxvY2suZGVmKVxuICAoKTtcblxuLyoqXG4gKiBOb3JtYWwgQmxvY2sgR3JhbW1hclxuICovXG5cbmJsb2NrLm5vcm1hbCA9IG1lcmdlKHt9LCBibG9jayk7XG5cbi8qKlxuICogR0ZNIEJsb2NrIEdyYW1tYXJcbiAqL1xuXG5ibG9jay5nZm0gPSBtZXJnZSh7fSwgYmxvY2subm9ybWFsLCB7XG4gIGZlbmNlczogL14gKihgezMsfXx+ezMsfSkgKihcXFMrKT8gKlxcbihbXFxzXFxTXSs/KVxccypcXDEgKig/Olxcbit8JCkvLFxuICBwYXJhZ3JhcGg6IC9eL1xufSk7XG5cbmJsb2NrLmdmbS5wYXJhZ3JhcGggPSByZXBsYWNlKGJsb2NrLnBhcmFncmFwaClcbiAgKCcoPyEnLCAnKD8hJ1xuICAgICsgYmxvY2suZ2ZtLmZlbmNlcy5zb3VyY2UucmVwbGFjZSgnXFxcXDEnLCAnXFxcXDInKSArICd8J1xuICAgICsgYmxvY2subGlzdC5zb3VyY2UucmVwbGFjZSgnXFxcXDEnLCAnXFxcXDMnKSArICd8JylcbiAgKCk7XG5cbi8qKlxuICogR0ZNICsgVGFibGVzIEJsb2NrIEdyYW1tYXJcbiAqL1xuXG5ibG9jay50YWJsZXMgPSBtZXJnZSh7fSwgYmxvY2suZ2ZtLCB7XG4gIG5wdGFibGU6IC9eICooXFxTLipcXHwuKilcXG4gKihbLTpdKyAqXFx8Wy18IDpdKilcXG4oKD86LipcXHwuKig/OlxcbnwkKSkqKVxcbiovLFxuICB0YWJsZTogL14gKlxcfCguKylcXG4gKlxcfCggKlstOl0rWy18IDpdKilcXG4oKD86ICpcXHwuKig/OlxcbnwkKSkqKVxcbiovXG59KTtcblxuLyoqXG4gKiBCbG9jayBMZXhlclxuICovXG5cbmZ1bmN0aW9uIExleGVyKG9wdGlvbnMpIHtcbiAgdGhpcy50b2tlbnMgPSBbXTtcbiAgdGhpcy50b2tlbnMubGlua3MgPSB7fTtcbiAgdGhpcy5vcHRpb25zID0gb3B0aW9ucyB8fCBtYXJrZWQuZGVmYXVsdHM7XG4gIHRoaXMucnVsZXMgPSBibG9jay5ub3JtYWw7XG5cbiAgaWYgKHRoaXMub3B0aW9ucy5nZm0pIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLnRhYmxlcykge1xuICAgICAgdGhpcy5ydWxlcyA9IGJsb2NrLnRhYmxlcztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5ydWxlcyA9IGJsb2NrLmdmbTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBFeHBvc2UgQmxvY2sgUnVsZXNcbiAqL1xuXG5MZXhlci5ydWxlcyA9IGJsb2NrO1xuXG4vKipcbiAqIFN0YXRpYyBMZXggTWV0aG9kXG4gKi9cblxuTGV4ZXIubGV4ID0gZnVuY3Rpb24oc3JjLCBvcHRpb25zKSB7XG4gIHZhciBsZXhlciA9IG5ldyBMZXhlcihvcHRpb25zKTtcbiAgcmV0dXJuIGxleGVyLmxleChzcmMpO1xufTtcblxuLyoqXG4gKiBQcmVwcm9jZXNzaW5nXG4gKi9cblxuTGV4ZXIucHJvdG90eXBlLmxleCA9IGZ1bmN0aW9uKHNyYykge1xuICBzcmMgPSBzcmNcbiAgICAucmVwbGFjZSgvXFxyXFxufFxcci9nLCAnXFxuJylcbiAgICAucmVwbGFjZSgvXFx0L2csICcgICAgJylcbiAgICAucmVwbGFjZSgvXFx1MDBhMC9nLCAnICcpXG4gICAgLnJlcGxhY2UoL1xcdTI0MjQvZywgJ1xcbicpO1xuXG4gIHJldHVybiB0aGlzLnRva2VuKHNyYywgdHJ1ZSk7XG59O1xuXG4vKipcbiAqIExleGluZ1xuICovXG5cbkxleGVyLnByb3RvdHlwZS50b2tlbiA9IGZ1bmN0aW9uKHNyYywgdG9wKSB7XG4gIHZhciBzcmMgPSBzcmMucmVwbGFjZSgvXiArJC9nbSwgJycpXG4gICAgLCBuZXh0XG4gICAgLCBsb29zZVxuICAgICwgY2FwXG4gICAgLCBidWxsXG4gICAgLCBiXG4gICAgLCBpdGVtXG4gICAgLCBzcGFjZVxuICAgICwgaVxuICAgICwgbDtcblxuICB3aGlsZSAoc3JjKSB7XG4gICAgLy8gbmV3bGluZVxuICAgIGlmIChjYXAgPSB0aGlzLnJ1bGVzLm5ld2xpbmUuZXhlYyhzcmMpKSB7XG4gICAgICBzcmMgPSBzcmMuc3Vic3RyaW5nKGNhcFswXS5sZW5ndGgpO1xuICAgICAgaWYgKGNhcFswXS5sZW5ndGggPiAxKSB7XG4gICAgICAgIHRoaXMudG9rZW5zLnB1c2goe1xuICAgICAgICAgIHR5cGU6ICdzcGFjZSdcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gY29kZVxuICAgIGlmIChjYXAgPSB0aGlzLnJ1bGVzLmNvZGUuZXhlYyhzcmMpKSB7XG4gICAgICBzcmMgPSBzcmMuc3Vic3RyaW5nKGNhcFswXS5sZW5ndGgpO1xuICAgICAgY2FwID0gY2FwWzBdLnJlcGxhY2UoL14gezR9L2dtLCAnJyk7XG4gICAgICB0aGlzLnRva2Vucy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2NvZGUnLFxuICAgICAgICB0ZXh0OiAhdGhpcy5vcHRpb25zLnBlZGFudGljXG4gICAgICAgICAgPyBjYXAucmVwbGFjZSgvXFxuKyQvLCAnJylcbiAgICAgICAgICA6IGNhcFxuICAgICAgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBmZW5jZXMgKGdmbSlcbiAgICBpZiAoY2FwID0gdGhpcy5ydWxlcy5mZW5jZXMuZXhlYyhzcmMpKSB7XG4gICAgICBzcmMgPSBzcmMuc3Vic3RyaW5nKGNhcFswXS5sZW5ndGgpO1xuICAgICAgdGhpcy50b2tlbnMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdjb2RlJyxcbiAgICAgICAgbGFuZzogY2FwWzJdLFxuICAgICAgICB0ZXh0OiBjYXBbM11cbiAgICAgIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gaGVhZGluZ1xuICAgIGlmIChjYXAgPSB0aGlzLnJ1bGVzLmhlYWRpbmcuZXhlYyhzcmMpKSB7XG4gICAgICBzcmMgPSBzcmMuc3Vic3RyaW5nKGNhcFswXS5sZW5ndGgpO1xuICAgICAgdGhpcy50b2tlbnMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdoZWFkaW5nJyxcbiAgICAgICAgZGVwdGg6IGNhcFsxXS5sZW5ndGgsXG4gICAgICAgIHRleHQ6IGNhcFsyXVxuICAgICAgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyB0YWJsZSBubyBsZWFkaW5nIHBpcGUgKGdmbSlcbiAgICBpZiAodG9wICYmIChjYXAgPSB0aGlzLnJ1bGVzLm5wdGFibGUuZXhlYyhzcmMpKSkge1xuICAgICAgc3JjID0gc3JjLnN1YnN0cmluZyhjYXBbMF0ubGVuZ3RoKTtcblxuICAgICAgaXRlbSA9IHtcbiAgICAgICAgdHlwZTogJ3RhYmxlJyxcbiAgICAgICAgaGVhZGVyOiBjYXBbMV0ucmVwbGFjZSgvXiAqfCAqXFx8ICokL2csICcnKS5zcGxpdCgvICpcXHwgKi8pLFxuICAgICAgICBhbGlnbjogY2FwWzJdLnJlcGxhY2UoL14gKnxcXHwgKiQvZywgJycpLnNwbGl0KC8gKlxcfCAqLyksXG4gICAgICAgIGNlbGxzOiBjYXBbM10ucmVwbGFjZSgvXFxuJC8sICcnKS5zcGxpdCgnXFxuJylcbiAgICAgIH07XG5cbiAgICAgIGZvciAoaSA9IDA7IGkgPCBpdGVtLmFsaWduLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICgvXiAqLSs6ICokLy50ZXN0KGl0ZW0uYWxpZ25baV0pKSB7XG4gICAgICAgICAgaXRlbS5hbGlnbltpXSA9ICdyaWdodCc7XG4gICAgICAgIH0gZWxzZSBpZiAoL14gKjotKzogKiQvLnRlc3QoaXRlbS5hbGlnbltpXSkpIHtcbiAgICAgICAgICBpdGVtLmFsaWduW2ldID0gJ2NlbnRlcic7XG4gICAgICAgIH0gZWxzZSBpZiAoL14gKjotKyAqJC8udGVzdChpdGVtLmFsaWduW2ldKSkge1xuICAgICAgICAgIGl0ZW0uYWxpZ25baV0gPSAnbGVmdCc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaXRlbS5hbGlnbltpXSA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZm9yIChpID0gMDsgaSA8IGl0ZW0uY2VsbHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaXRlbS5jZWxsc1tpXSA9IGl0ZW0uY2VsbHNbaV0uc3BsaXQoLyAqXFx8ICovKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy50b2tlbnMucHVzaChpdGVtKTtcblxuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gbGhlYWRpbmdcbiAgICBpZiAoY2FwID0gdGhpcy5ydWxlcy5saGVhZGluZy5leGVjKHNyYykpIHtcbiAgICAgIHNyYyA9IHNyYy5zdWJzdHJpbmcoY2FwWzBdLmxlbmd0aCk7XG4gICAgICB0aGlzLnRva2Vucy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2hlYWRpbmcnLFxuICAgICAgICBkZXB0aDogY2FwWzJdID09PSAnPScgPyAxIDogMixcbiAgICAgICAgdGV4dDogY2FwWzFdXG4gICAgICB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIGhyXG4gICAgaWYgKGNhcCA9IHRoaXMucnVsZXMuaHIuZXhlYyhzcmMpKSB7XG4gICAgICBzcmMgPSBzcmMuc3Vic3RyaW5nKGNhcFswXS5sZW5ndGgpO1xuICAgICAgdGhpcy50b2tlbnMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdocidcbiAgICAgIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gYmxvY2txdW90ZVxuICAgIGlmIChjYXAgPSB0aGlzLnJ1bGVzLmJsb2NrcXVvdGUuZXhlYyhzcmMpKSB7XG4gICAgICBzcmMgPSBzcmMuc3Vic3RyaW5nKGNhcFswXS5sZW5ndGgpO1xuXG4gICAgICB0aGlzLnRva2Vucy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2Jsb2NrcXVvdGVfc3RhcnQnXG4gICAgICB9KTtcblxuICAgICAgY2FwID0gY2FwWzBdLnJlcGxhY2UoL14gKj4gPy9nbSwgJycpO1xuXG4gICAgICAvLyBQYXNzIGB0b3BgIHRvIGtlZXAgdGhlIGN1cnJlbnRcbiAgICAgIC8vIFwidG9wbGV2ZWxcIiBzdGF0ZS4gVGhpcyBpcyBleGFjdGx5XG4gICAgICAvLyBob3cgbWFya2Rvd24ucGwgd29ya3MuXG4gICAgICB0aGlzLnRva2VuKGNhcCwgdG9wKTtcblxuICAgICAgdGhpcy50b2tlbnMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdibG9ja3F1b3RlX2VuZCdcbiAgICAgIH0pO1xuXG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBsaXN0XG4gICAgaWYgKGNhcCA9IHRoaXMucnVsZXMubGlzdC5leGVjKHNyYykpIHtcbiAgICAgIHNyYyA9IHNyYy5zdWJzdHJpbmcoY2FwWzBdLmxlbmd0aCk7XG4gICAgICBidWxsID0gY2FwWzJdO1xuXG4gICAgICB0aGlzLnRva2Vucy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2xpc3Rfc3RhcnQnLFxuICAgICAgICBvcmRlcmVkOiBidWxsLmxlbmd0aCA+IDFcbiAgICAgIH0pO1xuXG4gICAgICAvLyBHZXQgZWFjaCB0b3AtbGV2ZWwgaXRlbS5cbiAgICAgIGNhcCA9IGNhcFswXS5tYXRjaCh0aGlzLnJ1bGVzLml0ZW0pO1xuXG4gICAgICBuZXh0ID0gZmFsc2U7XG4gICAgICBsID0gY2FwLmxlbmd0aDtcbiAgICAgIGkgPSAwO1xuXG4gICAgICBmb3IgKDsgaSA8IGw7IGkrKykge1xuICAgICAgICBpdGVtID0gY2FwW2ldO1xuXG4gICAgICAgIC8vIFJlbW92ZSB0aGUgbGlzdCBpdGVtJ3MgYnVsbGV0XG4gICAgICAgIC8vIHNvIGl0IGlzIHNlZW4gYXMgdGhlIG5leHQgdG9rZW4uXG4gICAgICAgIHNwYWNlID0gaXRlbS5sZW5ndGg7XG4gICAgICAgIGl0ZW0gPSBpdGVtLnJlcGxhY2UoL14gKihbKistXXxcXGQrXFwuKSArLywgJycpO1xuXG4gICAgICAgIC8vIE91dGRlbnQgd2hhdGV2ZXIgdGhlXG4gICAgICAgIC8vIGxpc3QgaXRlbSBjb250YWlucy4gSGFja3kuXG4gICAgICAgIGlmICh+aXRlbS5pbmRleE9mKCdcXG4gJykpIHtcbiAgICAgICAgICBzcGFjZSAtPSBpdGVtLmxlbmd0aDtcbiAgICAgICAgICBpdGVtID0gIXRoaXMub3B0aW9ucy5wZWRhbnRpY1xuICAgICAgICAgICAgPyBpdGVtLnJlcGxhY2UobmV3IFJlZ0V4cCgnXiB7MSwnICsgc3BhY2UgKyAnfScsICdnbScpLCAnJylcbiAgICAgICAgICAgIDogaXRlbS5yZXBsYWNlKC9eIHsxLDR9L2dtLCAnJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEZXRlcm1pbmUgd2hldGhlciB0aGUgbmV4dCBsaXN0IGl0ZW0gYmVsb25ncyBoZXJlLlxuICAgICAgICAvLyBCYWNrcGVkYWwgaWYgaXQgZG9lcyBub3QgYmVsb25nIGluIHRoaXMgbGlzdC5cbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5zbWFydExpc3RzICYmIGkgIT09IGwgLSAxKSB7XG4gICAgICAgICAgYiA9IGJsb2NrLmJ1bGxldC5leGVjKGNhcFtpICsgMV0pWzBdO1xuICAgICAgICAgIGlmIChidWxsICE9PSBiICYmICEoYnVsbC5sZW5ndGggPiAxICYmIGIubGVuZ3RoID4gMSkpIHtcbiAgICAgICAgICAgIHNyYyA9IGNhcC5zbGljZShpICsgMSkuam9pbignXFxuJykgKyBzcmM7XG4gICAgICAgICAgICBpID0gbCAtIDE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGV0ZXJtaW5lIHdoZXRoZXIgaXRlbSBpcyBsb29zZSBvciBub3QuXG4gICAgICAgIC8vIFVzZTogLyhefFxcbikoPyEgKVteXFxuXStcXG5cXG4oPyFcXHMqJCkvXG4gICAgICAgIC8vIGZvciBkaXNjb3VudCBiZWhhdmlvci5cbiAgICAgICAgbG9vc2UgPSBuZXh0IHx8IC9cXG5cXG4oPyFcXHMqJCkvLnRlc3QoaXRlbSk7XG4gICAgICAgIGlmIChpICE9PSBsIC0gMSkge1xuICAgICAgICAgIG5leHQgPSBpdGVtLmNoYXJBdChpdGVtLmxlbmd0aCAtIDEpID09PSAnXFxuJztcbiAgICAgICAgICBpZiAoIWxvb3NlKSBsb29zZSA9IG5leHQ7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnRva2Vucy5wdXNoKHtcbiAgICAgICAgICB0eXBlOiBsb29zZVxuICAgICAgICAgICAgPyAnbG9vc2VfaXRlbV9zdGFydCdcbiAgICAgICAgICAgIDogJ2xpc3RfaXRlbV9zdGFydCdcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmVjdXJzZS5cbiAgICAgICAgdGhpcy50b2tlbihpdGVtLCBmYWxzZSk7XG5cbiAgICAgICAgdGhpcy50b2tlbnMucHVzaCh7XG4gICAgICAgICAgdHlwZTogJ2xpc3RfaXRlbV9lbmQnXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnRva2Vucy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2xpc3RfZW5kJ1xuICAgICAgfSk7XG5cbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIGh0bWxcbiAgICBpZiAoY2FwID0gdGhpcy5ydWxlcy5odG1sLmV4ZWMoc3JjKSkge1xuICAgICAgc3JjID0gc3JjLnN1YnN0cmluZyhjYXBbMF0ubGVuZ3RoKTtcbiAgICAgIHRoaXMudG9rZW5zLnB1c2goe1xuICAgICAgICB0eXBlOiB0aGlzLm9wdGlvbnMuc2FuaXRpemVcbiAgICAgICAgICA/ICdwYXJhZ3JhcGgnXG4gICAgICAgICAgOiAnaHRtbCcsXG4gICAgICAgIHByZTogY2FwWzFdID09PSAncHJlJyB8fCBjYXBbMV0gPT09ICdzY3JpcHQnIHx8IGNhcFsxXSA9PT0gJ3N0eWxlJyxcbiAgICAgICAgdGV4dDogY2FwWzBdXG4gICAgICB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIGRlZlxuICAgIGlmICh0b3AgJiYgKGNhcCA9IHRoaXMucnVsZXMuZGVmLmV4ZWMoc3JjKSkpIHtcbiAgICAgIHNyYyA9IHNyYy5zdWJzdHJpbmcoY2FwWzBdLmxlbmd0aCk7XG4gICAgICB0aGlzLnRva2Vucy5saW5rc1tjYXBbMV0udG9Mb3dlckNhc2UoKV0gPSB7XG4gICAgICAgIGhyZWY6IGNhcFsyXSxcbiAgICAgICAgdGl0bGU6IGNhcFszXVxuICAgICAgfTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIHRhYmxlIChnZm0pXG4gICAgaWYgKHRvcCAmJiAoY2FwID0gdGhpcy5ydWxlcy50YWJsZS5leGVjKHNyYykpKSB7XG4gICAgICBzcmMgPSBzcmMuc3Vic3RyaW5nKGNhcFswXS5sZW5ndGgpO1xuXG4gICAgICBpdGVtID0ge1xuICAgICAgICB0eXBlOiAndGFibGUnLFxuICAgICAgICBoZWFkZXI6IGNhcFsxXS5yZXBsYWNlKC9eICp8ICpcXHwgKiQvZywgJycpLnNwbGl0KC8gKlxcfCAqLyksXG4gICAgICAgIGFsaWduOiBjYXBbMl0ucmVwbGFjZSgvXiAqfFxcfCAqJC9nLCAnJykuc3BsaXQoLyAqXFx8ICovKSxcbiAgICAgICAgY2VsbHM6IGNhcFszXS5yZXBsYWNlKC8oPzogKlxcfCAqKT9cXG4kLywgJycpLnNwbGl0KCdcXG4nKVxuICAgICAgfTtcblxuICAgICAgZm9yIChpID0gMDsgaSA8IGl0ZW0uYWxpZ24ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKC9eICotKzogKiQvLnRlc3QoaXRlbS5hbGlnbltpXSkpIHtcbiAgICAgICAgICBpdGVtLmFsaWduW2ldID0gJ3JpZ2h0JztcbiAgICAgICAgfSBlbHNlIGlmICgvXiAqOi0rOiAqJC8udGVzdChpdGVtLmFsaWduW2ldKSkge1xuICAgICAgICAgIGl0ZW0uYWxpZ25baV0gPSAnY2VudGVyJztcbiAgICAgICAgfSBlbHNlIGlmICgvXiAqOi0rICokLy50ZXN0KGl0ZW0uYWxpZ25baV0pKSB7XG4gICAgICAgICAgaXRlbS5hbGlnbltpXSA9ICdsZWZ0JztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpdGVtLmFsaWduW2ldID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBmb3IgKGkgPSAwOyBpIDwgaXRlbS5jZWxscy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpdGVtLmNlbGxzW2ldID0gaXRlbS5jZWxsc1tpXVxuICAgICAgICAgIC5yZXBsYWNlKC9eICpcXHwgKnwgKlxcfCAqJC9nLCAnJylcbiAgICAgICAgICAuc3BsaXQoLyAqXFx8ICovKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy50b2tlbnMucHVzaChpdGVtKTtcblxuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gdG9wLWxldmVsIHBhcmFncmFwaFxuICAgIGlmICh0b3AgJiYgKGNhcCA9IHRoaXMucnVsZXMucGFyYWdyYXBoLmV4ZWMoc3JjKSkpIHtcbiAgICAgIHNyYyA9IHNyYy5zdWJzdHJpbmcoY2FwWzBdLmxlbmd0aCk7XG4gICAgICB0aGlzLnRva2Vucy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ3BhcmFncmFwaCcsXG4gICAgICAgIHRleHQ6IGNhcFsxXS5jaGFyQXQoY2FwWzFdLmxlbmd0aCAtIDEpID09PSAnXFxuJ1xuICAgICAgICAgID8gY2FwWzFdLnNsaWNlKDAsIC0xKVxuICAgICAgICAgIDogY2FwWzFdXG4gICAgICB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIHRleHRcbiAgICBpZiAoY2FwID0gdGhpcy5ydWxlcy50ZXh0LmV4ZWMoc3JjKSkge1xuICAgICAgLy8gVG9wLWxldmVsIHNob3VsZCBuZXZlciByZWFjaCBoZXJlLlxuICAgICAgc3JjID0gc3JjLnN1YnN0cmluZyhjYXBbMF0ubGVuZ3RoKTtcbiAgICAgIHRoaXMudG9rZW5zLnB1c2goe1xuICAgICAgICB0eXBlOiAndGV4dCcsXG4gICAgICAgIHRleHQ6IGNhcFswXVxuICAgICAgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoc3JjKSB7XG4gICAgICB0aHJvdyBuZXdcbiAgICAgICAgRXJyb3IoJ0luZmluaXRlIGxvb3Agb24gYnl0ZTogJyArIHNyYy5jaGFyQ29kZUF0KDApKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcy50b2tlbnM7XG59O1xuXG4vKipcbiAqIElubGluZS1MZXZlbCBHcmFtbWFyXG4gKi9cblxudmFyIGlubGluZSA9IHtcbiAgZXNjYXBlOiAvXlxcXFwoW1xcXFxgKnt9XFxbXFxdKCkjK1xcLS4hXz5dKS8sXG4gIGF1dG9saW5rOiAvXjwoW14gPl0rKEB8OlxcLylbXiA+XSspPi8sXG4gIHVybDogbm9vcCxcbiAgdGFnOiAvXjwhLS1bXFxzXFxTXSo/LS0+fF48XFwvP1xcdysoPzpcIlteXCJdKlwifCdbXiddKid8W14nXCI+XSkqPz4vLFxuICBsaW5rOiAvXiE/XFxbKGluc2lkZSlcXF1cXChocmVmXFwpLyxcbiAgcmVmbGluazogL14hP1xcWyhpbnNpZGUpXFxdXFxzKlxcWyhbXlxcXV0qKVxcXS8sXG4gIG5vbGluazogL14hP1xcWygoPzpcXFtbXlxcXV0qXFxdfFteXFxbXFxdXSkqKVxcXS8sXG4gIHN0cm9uZzogL15fXyhbXFxzXFxTXSs/KV9fKD8hXyl8XlxcKlxcKihbXFxzXFxTXSs/KVxcKlxcKig/IVxcKikvLFxuICBlbTogL15cXGJfKCg/Ol9ffFtcXHNcXFNdKSs/KV9cXGJ8XlxcKigoPzpcXCpcXCp8W1xcc1xcU10pKz8pXFwqKD8hXFwqKS8sXG4gIGNvZGU6IC9eKGArKVxccyooW1xcc1xcU10qP1teYF0pXFxzKlxcMSg/IWApLyxcbiAgYnI6IC9eIHsyLH1cXG4oPyFcXHMqJCkvLFxuICBkZWw6IG5vb3AsXG4gIHRleHQ6IC9eW1xcc1xcU10rPyg/PVtcXFxcPCFcXFtfKmBdfCB7Mix9XFxufCQpL1xufTtcblxuaW5saW5lLl9pbnNpZGUgPSAvKD86XFxbW15cXF1dKlxcXXxbXlxcW1xcXV18XFxdKD89W15cXFtdKlxcXSkpKi87XG5pbmxpbmUuX2hyZWYgPSAvXFxzKjw/KFtcXHNcXFNdKj8pPj8oPzpcXHMrWydcIl0oW1xcc1xcU10qPylbJ1wiXSk/XFxzKi87XG5cbmlubGluZS5saW5rID0gcmVwbGFjZShpbmxpbmUubGluaylcbiAgKCdpbnNpZGUnLCBpbmxpbmUuX2luc2lkZSlcbiAgKCdocmVmJywgaW5saW5lLl9ocmVmKVxuICAoKTtcblxuaW5saW5lLnJlZmxpbmsgPSByZXBsYWNlKGlubGluZS5yZWZsaW5rKVxuICAoJ2luc2lkZScsIGlubGluZS5faW5zaWRlKVxuICAoKTtcblxuLyoqXG4gKiBOb3JtYWwgSW5saW5lIEdyYW1tYXJcbiAqL1xuXG5pbmxpbmUubm9ybWFsID0gbWVyZ2Uoe30sIGlubGluZSk7XG5cbi8qKlxuICogUGVkYW50aWMgSW5saW5lIEdyYW1tYXJcbiAqL1xuXG5pbmxpbmUucGVkYW50aWMgPSBtZXJnZSh7fSwgaW5saW5lLm5vcm1hbCwge1xuICBzdHJvbmc6IC9eX18oPz1cXFMpKFtcXHNcXFNdKj9cXFMpX18oPyFfKXxeXFwqXFwqKD89XFxTKShbXFxzXFxTXSo/XFxTKVxcKlxcKig/IVxcKikvLFxuICBlbTogL15fKD89XFxTKShbXFxzXFxTXSo/XFxTKV8oPyFfKXxeXFwqKD89XFxTKShbXFxzXFxTXSo/XFxTKVxcKig/IVxcKikvXG59KTtcblxuLyoqXG4gKiBHRk0gSW5saW5lIEdyYW1tYXJcbiAqL1xuXG5pbmxpbmUuZ2ZtID0gbWVyZ2Uoe30sIGlubGluZS5ub3JtYWwsIHtcbiAgZXNjYXBlOiByZXBsYWNlKGlubGluZS5lc2NhcGUpKCddKScsICd+fF0pJykoKSxcbiAgdXJsOiAvXihodHRwcz86XFwvXFwvW15cXHM8XStbXjwuLDo7XCInKVxcXVxcc10pLyxcbiAgZGVsOiAvXn5+KD89XFxTKShbXFxzXFxTXSo/XFxTKX5+LyxcbiAgdGV4dDogcmVwbGFjZShpbmxpbmUudGV4dClcbiAgICAoJ118JywgJ35dfCcpXG4gICAgKCd8JywgJ3xodHRwcz86Ly98JylcbiAgICAoKVxufSk7XG5cbi8qKlxuICogR0ZNICsgTGluZSBCcmVha3MgSW5saW5lIEdyYW1tYXJcbiAqL1xuXG5pbmxpbmUuYnJlYWtzID0gbWVyZ2Uoe30sIGlubGluZS5nZm0sIHtcbiAgYnI6IHJlcGxhY2UoaW5saW5lLmJyKSgnezIsfScsICcqJykoKSxcbiAgdGV4dDogcmVwbGFjZShpbmxpbmUuZ2ZtLnRleHQpKCd7Mix9JywgJyonKSgpXG59KTtcblxuLyoqXG4gKiBJbmxpbmUgTGV4ZXIgJiBDb21waWxlclxuICovXG5cbmZ1bmN0aW9uIElubGluZUxleGVyKGxpbmtzLCBvcHRpb25zKSB7XG4gIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwgbWFya2VkLmRlZmF1bHRzO1xuICB0aGlzLmxpbmtzID0gbGlua3M7XG4gIHRoaXMucnVsZXMgPSBpbmxpbmUubm9ybWFsO1xuXG4gIGlmICghdGhpcy5saW5rcykge1xuICAgIHRocm93IG5ld1xuICAgICAgRXJyb3IoJ1Rva2VucyBhcnJheSByZXF1aXJlcyBhIGBsaW5rc2AgcHJvcGVydHkuJyk7XG4gIH1cblxuICBpZiAodGhpcy5vcHRpb25zLmdmbSkge1xuICAgIGlmICh0aGlzLm9wdGlvbnMuYnJlYWtzKSB7XG4gICAgICB0aGlzLnJ1bGVzID0gaW5saW5lLmJyZWFrcztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5ydWxlcyA9IGlubGluZS5nZm07XG4gICAgfVxuICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5wZWRhbnRpYykge1xuICAgIHRoaXMucnVsZXMgPSBpbmxpbmUucGVkYW50aWM7XG4gIH1cbn1cblxuLyoqXG4gKiBFeHBvc2UgSW5saW5lIFJ1bGVzXG4gKi9cblxuSW5saW5lTGV4ZXIucnVsZXMgPSBpbmxpbmU7XG5cbi8qKlxuICogU3RhdGljIExleGluZy9Db21waWxpbmcgTWV0aG9kXG4gKi9cblxuSW5saW5lTGV4ZXIub3V0cHV0ID0gZnVuY3Rpb24oc3JjLCBsaW5rcywgb3B0aW9ucykge1xuICB2YXIgaW5saW5lID0gbmV3IElubGluZUxleGVyKGxpbmtzLCBvcHRpb25zKTtcbiAgcmV0dXJuIGlubGluZS5vdXRwdXQoc3JjKTtcbn07XG5cbi8qKlxuICogTGV4aW5nL0NvbXBpbGluZ1xuICovXG5cbklubGluZUxleGVyLnByb3RvdHlwZS5vdXRwdXQgPSBmdW5jdGlvbihzcmMpIHtcbiAgdmFyIG91dCA9ICcnXG4gICAgLCBsaW5rXG4gICAgLCB0ZXh0XG4gICAgLCBocmVmXG4gICAgLCBjYXA7XG5cbiAgd2hpbGUgKHNyYykge1xuICAgIC8vIGVzY2FwZVxuICAgIGlmIChjYXAgPSB0aGlzLnJ1bGVzLmVzY2FwZS5leGVjKHNyYykpIHtcbiAgICAgIHNyYyA9IHNyYy5zdWJzdHJpbmcoY2FwWzBdLmxlbmd0aCk7XG4gICAgICBvdXQgKz0gY2FwWzFdO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gYXV0b2xpbmtcbiAgICBpZiAoY2FwID0gdGhpcy5ydWxlcy5hdXRvbGluay5leGVjKHNyYykpIHtcbiAgICAgIHNyYyA9IHNyYy5zdWJzdHJpbmcoY2FwWzBdLmxlbmd0aCk7XG4gICAgICBpZiAoY2FwWzJdID09PSAnQCcpIHtcbiAgICAgICAgdGV4dCA9IGNhcFsxXS5jaGFyQXQoNikgPT09ICc6J1xuICAgICAgICAgID8gdGhpcy5tYW5nbGUoY2FwWzFdLnN1YnN0cmluZyg3KSlcbiAgICAgICAgICA6IHRoaXMubWFuZ2xlKGNhcFsxXSk7XG4gICAgICAgIGhyZWYgPSB0aGlzLm1hbmdsZSgnbWFpbHRvOicpICsgdGV4dDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRleHQgPSBlc2NhcGUoY2FwWzFdKTtcbiAgICAgICAgaHJlZiA9IHRleHQ7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJzxhIGhyZWY9XCInXG4gICAgICAgICsgaHJlZlxuICAgICAgICArICdcIj4nXG4gICAgICAgICsgdGV4dFxuICAgICAgICArICc8L2E+JztcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIHVybCAoZ2ZtKVxuICAgIGlmIChjYXAgPSB0aGlzLnJ1bGVzLnVybC5leGVjKHNyYykpIHtcbiAgICAgIHNyYyA9IHNyYy5zdWJzdHJpbmcoY2FwWzBdLmxlbmd0aCk7XG4gICAgICB0ZXh0ID0gZXNjYXBlKGNhcFsxXSk7XG4gICAgICBocmVmID0gdGV4dDtcbiAgICAgIG91dCArPSAnPGEgaHJlZj1cIidcbiAgICAgICAgKyBocmVmXG4gICAgICAgICsgJ1wiPidcbiAgICAgICAgKyB0ZXh0XG4gICAgICAgICsgJzwvYT4nO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gdGFnXG4gICAgaWYgKGNhcCA9IHRoaXMucnVsZXMudGFnLmV4ZWMoc3JjKSkge1xuICAgICAgc3JjID0gc3JjLnN1YnN0cmluZyhjYXBbMF0ubGVuZ3RoKTtcbiAgICAgIG91dCArPSB0aGlzLm9wdGlvbnMuc2FuaXRpemVcbiAgICAgICAgPyBlc2NhcGUoY2FwWzBdKVxuICAgICAgICA6IGNhcFswXTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIGxpbmtcbiAgICBpZiAoY2FwID0gdGhpcy5ydWxlcy5saW5rLmV4ZWMoc3JjKSkge1xuICAgICAgc3JjID0gc3JjLnN1YnN0cmluZyhjYXBbMF0ubGVuZ3RoKTtcbiAgICAgIG91dCArPSB0aGlzLm91dHB1dExpbmsoY2FwLCB7XG4gICAgICAgIGhyZWY6IGNhcFsyXSxcbiAgICAgICAgdGl0bGU6IGNhcFszXVxuICAgICAgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyByZWZsaW5rLCBub2xpbmtcbiAgICBpZiAoKGNhcCA9IHRoaXMucnVsZXMucmVmbGluay5leGVjKHNyYykpXG4gICAgICAgIHx8IChjYXAgPSB0aGlzLnJ1bGVzLm5vbGluay5leGVjKHNyYykpKSB7XG4gICAgICBzcmMgPSBzcmMuc3Vic3RyaW5nKGNhcFswXS5sZW5ndGgpO1xuICAgICAgbGluayA9IChjYXBbMl0gfHwgY2FwWzFdKS5yZXBsYWNlKC9cXHMrL2csICcgJyk7XG4gICAgICBsaW5rID0gdGhpcy5saW5rc1tsaW5rLnRvTG93ZXJDYXNlKCldO1xuICAgICAgaWYgKCFsaW5rIHx8ICFsaW5rLmhyZWYpIHtcbiAgICAgICAgb3V0ICs9IGNhcFswXS5jaGFyQXQoMCk7XG4gICAgICAgIHNyYyA9IGNhcFswXS5zdWJzdHJpbmcoMSkgKyBzcmM7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgb3V0ICs9IHRoaXMub3V0cHV0TGluayhjYXAsIGxpbmspO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gc3Ryb25nXG4gICAgaWYgKGNhcCA9IHRoaXMucnVsZXMuc3Ryb25nLmV4ZWMoc3JjKSkge1xuICAgICAgc3JjID0gc3JjLnN1YnN0cmluZyhjYXBbMF0ubGVuZ3RoKTtcbiAgICAgIG91dCArPSAnPHN0cm9uZz4nXG4gICAgICAgICsgdGhpcy5vdXRwdXQoY2FwWzJdIHx8IGNhcFsxXSlcbiAgICAgICAgKyAnPC9zdHJvbmc+JztcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIGVtXG4gICAgaWYgKGNhcCA9IHRoaXMucnVsZXMuZW0uZXhlYyhzcmMpKSB7XG4gICAgICBzcmMgPSBzcmMuc3Vic3RyaW5nKGNhcFswXS5sZW5ndGgpO1xuICAgICAgb3V0ICs9ICc8ZW0+J1xuICAgICAgICArIHRoaXMub3V0cHV0KGNhcFsyXSB8fCBjYXBbMV0pXG4gICAgICAgICsgJzwvZW0+JztcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIGNvZGVcbiAgICBpZiAoY2FwID0gdGhpcy5ydWxlcy5jb2RlLmV4ZWMoc3JjKSkge1xuICAgICAgc3JjID0gc3JjLnN1YnN0cmluZyhjYXBbMF0ubGVuZ3RoKTtcbiAgICAgIG91dCArPSAnPGNvZGU+J1xuICAgICAgICArIGVzY2FwZShjYXBbMl0sIHRydWUpXG4gICAgICAgICsgJzwvY29kZT4nO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gYnJcbiAgICBpZiAoY2FwID0gdGhpcy5ydWxlcy5ici5leGVjKHNyYykpIHtcbiAgICAgIHNyYyA9IHNyYy5zdWJzdHJpbmcoY2FwWzBdLmxlbmd0aCk7XG4gICAgICBvdXQgKz0gJzxicj4nO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gZGVsIChnZm0pXG4gICAgaWYgKGNhcCA9IHRoaXMucnVsZXMuZGVsLmV4ZWMoc3JjKSkge1xuICAgICAgc3JjID0gc3JjLnN1YnN0cmluZyhjYXBbMF0ubGVuZ3RoKTtcbiAgICAgIG91dCArPSAnPGRlbD4nXG4gICAgICAgICsgdGhpcy5vdXRwdXQoY2FwWzFdKVxuICAgICAgICArICc8L2RlbD4nO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gdGV4dFxuICAgIGlmIChjYXAgPSB0aGlzLnJ1bGVzLnRleHQuZXhlYyhzcmMpKSB7XG4gICAgICBzcmMgPSBzcmMuc3Vic3RyaW5nKGNhcFswXS5sZW5ndGgpO1xuICAgICAgb3V0ICs9IGVzY2FwZSh0aGlzLnNtYXJ0eXBhbnRzKGNhcFswXSkpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKHNyYykge1xuICAgICAgdGhyb3cgbmV3XG4gICAgICAgIEVycm9yKCdJbmZpbml0ZSBsb29wIG9uIGJ5dGU6ICcgKyBzcmMuY2hhckNvZGVBdCgwKSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG91dDtcbn07XG5cbi8qKlxuICogQ29tcGlsZSBMaW5rXG4gKi9cblxuSW5saW5lTGV4ZXIucHJvdG90eXBlLm91dHB1dExpbmsgPSBmdW5jdGlvbihjYXAsIGxpbmspIHtcbiAgaWYgKGNhcFswXS5jaGFyQXQoMCkgIT09ICchJykge1xuICAgIHJldHVybiAnPGEgaHJlZj1cIidcbiAgICAgICsgZXNjYXBlKGxpbmsuaHJlZilcbiAgICAgICsgJ1wiJ1xuICAgICAgKyAobGluay50aXRsZVxuICAgICAgPyAnIHRpdGxlPVwiJ1xuICAgICAgKyBlc2NhcGUobGluay50aXRsZSlcbiAgICAgICsgJ1wiJ1xuICAgICAgOiAnJylcbiAgICAgICsgJz4nXG4gICAgICArIHRoaXMub3V0cHV0KGNhcFsxXSlcbiAgICAgICsgJzwvYT4nO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAnPGltZyBzcmM9XCInXG4gICAgICArIGVzY2FwZShsaW5rLmhyZWYpXG4gICAgICArICdcIiBhbHQ9XCInXG4gICAgICArIGVzY2FwZShjYXBbMV0pXG4gICAgICArICdcIidcbiAgICAgICsgKGxpbmsudGl0bGVcbiAgICAgID8gJyB0aXRsZT1cIidcbiAgICAgICsgZXNjYXBlKGxpbmsudGl0bGUpXG4gICAgICArICdcIidcbiAgICAgIDogJycpXG4gICAgICArICc+JztcbiAgfVxufTtcblxuLyoqXG4gKiBTbWFydHlwYW50cyBUcmFuc2Zvcm1hdGlvbnNcbiAqL1xuXG5JbmxpbmVMZXhlci5wcm90b3R5cGUuc21hcnR5cGFudHMgPSBmdW5jdGlvbih0ZXh0KSB7XG4gIGlmICghdGhpcy5vcHRpb25zLnNtYXJ0eXBhbnRzKSByZXR1cm4gdGV4dDtcbiAgcmV0dXJuIHRleHRcbiAgICAvLyBlbS1kYXNoZXNcbiAgICAucmVwbGFjZSgvLS0vZywgJ1xcdTIwMTQnKVxuICAgIC8vIG9wZW5pbmcgc2luZ2xlc1xuICAgIC5yZXBsYWNlKC8oXnxbLVxcdTIwMTQvKFxcW3tcIlxcc10pJy9nLCAnJDFcXHUyMDE4JylcbiAgICAvLyBjbG9zaW5nIHNpbmdsZXMgJiBhcG9zdHJvcGhlc1xuICAgIC5yZXBsYWNlKC8nL2csICdcXHUyMDE5JylcbiAgICAvLyBvcGVuaW5nIGRvdWJsZXNcbiAgICAucmVwbGFjZSgvKF58Wy1cXHUyMDE0LyhcXFt7XFx1MjAxOFxcc10pXCIvZywgJyQxXFx1MjAxYycpXG4gICAgLy8gY2xvc2luZyBkb3VibGVzXG4gICAgLnJlcGxhY2UoL1wiL2csICdcXHUyMDFkJylcbiAgICAvLyBlbGxpcHNlc1xuICAgIC5yZXBsYWNlKC9cXC57M30vZywgJ1xcdTIwMjYnKTtcbn07XG5cbi8qKlxuICogTWFuZ2xlIExpbmtzXG4gKi9cblxuSW5saW5lTGV4ZXIucHJvdG90eXBlLm1hbmdsZSA9IGZ1bmN0aW9uKHRleHQpIHtcbiAgdmFyIG91dCA9ICcnXG4gICAgLCBsID0gdGV4dC5sZW5ndGhcbiAgICAsIGkgPSAwXG4gICAgLCBjaDtcblxuICBmb3IgKDsgaSA8IGw7IGkrKykge1xuICAgIGNoID0gdGV4dC5jaGFyQ29kZUF0KGkpO1xuICAgIGlmIChNYXRoLnJhbmRvbSgpID4gMC41KSB7XG4gICAgICBjaCA9ICd4JyArIGNoLnRvU3RyaW5nKDE2KTtcbiAgICB9XG4gICAgb3V0ICs9ICcmIycgKyBjaCArICc7JztcbiAgfVxuXG4gIHJldHVybiBvdXQ7XG59O1xuXG4vKipcbiAqIFBhcnNpbmcgJiBDb21waWxpbmdcbiAqL1xuXG5mdW5jdGlvbiBQYXJzZXIob3B0aW9ucykge1xuICB0aGlzLnRva2VucyA9IFtdO1xuICB0aGlzLnRva2VuID0gbnVsbDtcbiAgdGhpcy5vcHRpb25zID0gb3B0aW9ucyB8fCBtYXJrZWQuZGVmYXVsdHM7XG59XG5cbi8qKlxuICogU3RhdGljIFBhcnNlIE1ldGhvZFxuICovXG5cblBhcnNlci5wYXJzZSA9IGZ1bmN0aW9uKHNyYywgb3B0aW9ucykge1xuICB2YXIgcGFyc2VyID0gbmV3IFBhcnNlcihvcHRpb25zKTtcbiAgcmV0dXJuIHBhcnNlci5wYXJzZShzcmMpO1xufTtcblxuLyoqXG4gKiBQYXJzZSBMb29wXG4gKi9cblxuUGFyc2VyLnByb3RvdHlwZS5wYXJzZSA9IGZ1bmN0aW9uKHNyYykge1xuICB0aGlzLmlubGluZSA9IG5ldyBJbmxpbmVMZXhlcihzcmMubGlua3MsIHRoaXMub3B0aW9ucyk7XG4gIHRoaXMudG9rZW5zID0gc3JjLnJldmVyc2UoKTtcblxuICB2YXIgb3V0ID0gJyc7XG4gIHdoaWxlICh0aGlzLm5leHQoKSkge1xuICAgIG91dCArPSB0aGlzLnRvaygpO1xuICB9XG5cbiAgcmV0dXJuIG91dDtcbn07XG5cbi8qKlxuICogTmV4dCBUb2tlblxuICovXG5cblBhcnNlci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy50b2tlbiA9IHRoaXMudG9rZW5zLnBvcCgpO1xufTtcblxuLyoqXG4gKiBQcmV2aWV3IE5leHQgVG9rZW5cbiAqL1xuXG5QYXJzZXIucHJvdG90eXBlLnBlZWsgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMudG9rZW5zW3RoaXMudG9rZW5zLmxlbmd0aCAtIDFdIHx8IDA7XG59O1xuXG4vKipcbiAqIFBhcnNlIFRleHQgVG9rZW5zXG4gKi9cblxuUGFyc2VyLnByb3RvdHlwZS5wYXJzZVRleHQgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGJvZHkgPSB0aGlzLnRva2VuLnRleHQ7XG5cbiAgd2hpbGUgKHRoaXMucGVlaygpLnR5cGUgPT09ICd0ZXh0Jykge1xuICAgIGJvZHkgKz0gJ1xcbicgKyB0aGlzLm5leHQoKS50ZXh0O1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuaW5saW5lLm91dHB1dChib2R5KTtcbn07XG5cbi8qKlxuICogUGFyc2UgQ3VycmVudCBUb2tlblxuICovXG5cblBhcnNlci5wcm90b3R5cGUudG9rID0gZnVuY3Rpb24oKSB7XG4gIHN3aXRjaCAodGhpcy50b2tlbi50eXBlKSB7XG4gICAgY2FzZSAnc3BhY2UnOiB7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfVxuICAgIGNhc2UgJ2hyJzoge1xuICAgICAgcmV0dXJuICc8aHI+XFxuJztcbiAgICB9XG4gICAgY2FzZSAnaGVhZGluZyc6IHtcbiAgICAgIHJldHVybiAnPGgnXG4gICAgICAgICsgdGhpcy50b2tlbi5kZXB0aFxuICAgICAgICArICcgaWQ9XCInXG4gICAgICAgICsgdGhpcy50b2tlbi50ZXh0LnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvW15cXHddKy9nLCAnLScpXG4gICAgICAgICsgJ1wiPidcbiAgICAgICAgKyB0aGlzLmlubGluZS5vdXRwdXQodGhpcy50b2tlbi50ZXh0KVxuICAgICAgICArICc8L2gnXG4gICAgICAgICsgdGhpcy50b2tlbi5kZXB0aFxuICAgICAgICArICc+XFxuJztcbiAgICB9XG4gICAgY2FzZSAnY29kZSc6IHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuaGlnaGxpZ2h0KSB7XG4gICAgICAgIHZhciBjb2RlID0gdGhpcy5vcHRpb25zLmhpZ2hsaWdodCh0aGlzLnRva2VuLnRleHQsIHRoaXMudG9rZW4ubGFuZyk7XG4gICAgICAgIGlmIChjb2RlICE9IG51bGwgJiYgY29kZSAhPT0gdGhpcy50b2tlbi50ZXh0KSB7XG4gICAgICAgICAgdGhpcy50b2tlbi5lc2NhcGVkID0gdHJ1ZTtcbiAgICAgICAgICB0aGlzLnRva2VuLnRleHQgPSBjb2RlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICghdGhpcy50b2tlbi5lc2NhcGVkKSB7XG4gICAgICAgIHRoaXMudG9rZW4udGV4dCA9IGVzY2FwZSh0aGlzLnRva2VuLnRleHQsIHRydWUpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gJzxwcmU+PGNvZGUnXG4gICAgICAgICsgKHRoaXMudG9rZW4ubGFuZ1xuICAgICAgICA/ICcgY2xhc3M9XCInXG4gICAgICAgICsgdGhpcy5vcHRpb25zLmxhbmdQcmVmaXhcbiAgICAgICAgKyB0aGlzLnRva2VuLmxhbmdcbiAgICAgICAgKyAnXCInXG4gICAgICAgIDogJycpXG4gICAgICAgICsgJz4nXG4gICAgICAgICsgdGhpcy50b2tlbi50ZXh0XG4gICAgICAgICsgJzwvY29kZT48L3ByZT5cXG4nO1xuICAgIH1cbiAgICBjYXNlICd0YWJsZSc6IHtcbiAgICAgIHZhciBib2R5ID0gJydcbiAgICAgICAgLCBoZWFkaW5nXG4gICAgICAgICwgaVxuICAgICAgICAsIHJvd1xuICAgICAgICAsIGNlbGxcbiAgICAgICAgLCBqO1xuXG4gICAgICAvLyBoZWFkZXJcbiAgICAgIGJvZHkgKz0gJzx0aGVhZD5cXG48dHI+XFxuJztcbiAgICAgIGZvciAoaSA9IDA7IGkgPCB0aGlzLnRva2VuLmhlYWRlci5sZW5ndGg7IGkrKykge1xuICAgICAgICBoZWFkaW5nID0gdGhpcy5pbmxpbmUub3V0cHV0KHRoaXMudG9rZW4uaGVhZGVyW2ldKTtcbiAgICAgICAgYm9keSArPSAnPHRoJztcbiAgICAgICAgaWYgKHRoaXMudG9rZW4uYWxpZ25baV0pIHtcbiAgICAgICAgICBib2R5ICs9ICcgc3R5bGU9XCJ0ZXh0LWFsaWduOicgKyB0aGlzLnRva2VuLmFsaWduW2ldICsgJ1wiJztcbiAgICAgICAgfVxuICAgICAgICBib2R5ICs9ICc+JyArIGhlYWRpbmcgKyAnPC90aD5cXG4nO1xuICAgICAgfVxuICAgICAgYm9keSArPSAnPC90cj5cXG48L3RoZWFkPlxcbic7XG5cbiAgICAgIC8vIGJvZHlcbiAgICAgIGJvZHkgKz0gJzx0Ym9keT5cXG4nXG4gICAgICBmb3IgKGkgPSAwOyBpIDwgdGhpcy50b2tlbi5jZWxscy5sZW5ndGg7IGkrKykge1xuICAgICAgICByb3cgPSB0aGlzLnRva2VuLmNlbGxzW2ldO1xuICAgICAgICBib2R5ICs9ICc8dHI+XFxuJztcbiAgICAgICAgZm9yIChqID0gMDsgaiA8IHJvdy5sZW5ndGg7IGorKykge1xuICAgICAgICAgIGNlbGwgPSB0aGlzLmlubGluZS5vdXRwdXQocm93W2pdKTtcbiAgICAgICAgICBib2R5ICs9ICc8dGQnO1xuICAgICAgICAgIGlmICh0aGlzLnRva2VuLmFsaWduW2pdKSB7XG4gICAgICAgICAgICBib2R5ICs9ICcgc3R5bGU9XCJ0ZXh0LWFsaWduOicgKyB0aGlzLnRva2VuLmFsaWduW2pdICsgJ1wiJztcbiAgICAgICAgICB9XG4gICAgICAgICAgYm9keSArPSAnPicgKyBjZWxsICsgJzwvdGQ+XFxuJztcbiAgICAgICAgfVxuICAgICAgICBib2R5ICs9ICc8L3RyPlxcbic7XG4gICAgICB9XG4gICAgICBib2R5ICs9ICc8L3Rib2R5Plxcbic7XG5cbiAgICAgIHJldHVybiAnPHRhYmxlPlxcbidcbiAgICAgICAgKyBib2R5XG4gICAgICAgICsgJzwvdGFibGU+XFxuJztcbiAgICB9XG4gICAgY2FzZSAnYmxvY2txdW90ZV9zdGFydCc6IHtcbiAgICAgIHZhciBib2R5ID0gJyc7XG5cbiAgICAgIHdoaWxlICh0aGlzLm5leHQoKS50eXBlICE9PSAnYmxvY2txdW90ZV9lbmQnKSB7XG4gICAgICAgIGJvZHkgKz0gdGhpcy50b2soKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuICc8YmxvY2txdW90ZT5cXG4nXG4gICAgICAgICsgYm9keVxuICAgICAgICArICc8L2Jsb2NrcXVvdGU+XFxuJztcbiAgICB9XG4gICAgY2FzZSAnbGlzdF9zdGFydCc6IHtcbiAgICAgIHZhciB0eXBlID0gdGhpcy50b2tlbi5vcmRlcmVkID8gJ29sJyA6ICd1bCdcbiAgICAgICAgLCBib2R5ID0gJyc7XG5cbiAgICAgIHdoaWxlICh0aGlzLm5leHQoKS50eXBlICE9PSAnbGlzdF9lbmQnKSB7XG4gICAgICAgIGJvZHkgKz0gdGhpcy50b2soKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuICc8J1xuICAgICAgICArIHR5cGVcbiAgICAgICAgKyAnPlxcbidcbiAgICAgICAgKyBib2R5XG4gICAgICAgICsgJzwvJ1xuICAgICAgICArIHR5cGVcbiAgICAgICAgKyAnPlxcbic7XG4gICAgfVxuICAgIGNhc2UgJ2xpc3RfaXRlbV9zdGFydCc6IHtcbiAgICAgIHZhciBib2R5ID0gJyc7XG5cbiAgICAgIHdoaWxlICh0aGlzLm5leHQoKS50eXBlICE9PSAnbGlzdF9pdGVtX2VuZCcpIHtcbiAgICAgICAgYm9keSArPSB0aGlzLnRva2VuLnR5cGUgPT09ICd0ZXh0J1xuICAgICAgICAgID8gdGhpcy5wYXJzZVRleHQoKVxuICAgICAgICAgIDogdGhpcy50b2soKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuICc8bGk+J1xuICAgICAgICArIGJvZHlcbiAgICAgICAgKyAnPC9saT5cXG4nO1xuICAgIH1cbiAgICBjYXNlICdsb29zZV9pdGVtX3N0YXJ0Jzoge1xuICAgICAgdmFyIGJvZHkgPSAnJztcblxuICAgICAgd2hpbGUgKHRoaXMubmV4dCgpLnR5cGUgIT09ICdsaXN0X2l0ZW1fZW5kJykge1xuICAgICAgICBib2R5ICs9IHRoaXMudG9rKCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiAnPGxpPidcbiAgICAgICAgKyBib2R5XG4gICAgICAgICsgJzwvbGk+XFxuJztcbiAgICB9XG4gICAgY2FzZSAnaHRtbCc6IHtcbiAgICAgIHJldHVybiAhdGhpcy50b2tlbi5wcmUgJiYgIXRoaXMub3B0aW9ucy5wZWRhbnRpY1xuICAgICAgICA/IHRoaXMuaW5saW5lLm91dHB1dCh0aGlzLnRva2VuLnRleHQpXG4gICAgICAgIDogdGhpcy50b2tlbi50ZXh0O1xuICAgIH1cbiAgICBjYXNlICdwYXJhZ3JhcGgnOiB7XG4gICAgICByZXR1cm4gJzxwPidcbiAgICAgICAgKyB0aGlzLmlubGluZS5vdXRwdXQodGhpcy50b2tlbi50ZXh0KVxuICAgICAgICArICc8L3A+XFxuJztcbiAgICB9XG4gICAgY2FzZSAndGV4dCc6IHtcbiAgICAgIHJldHVybiAnPHA+J1xuICAgICAgICArIHRoaXMucGFyc2VUZXh0KClcbiAgICAgICAgKyAnPC9wPlxcbic7XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAqIEhlbHBlcnNcbiAqL1xuXG5mdW5jdGlvbiBlc2NhcGUoaHRtbCwgZW5jb2RlKSB7XG4gIHJldHVybiBodG1sXG4gICAgLnJlcGxhY2UoIWVuY29kZSA/IC8mKD8hIz9cXHcrOykvZyA6IC8mL2csICcmYW1wOycpXG4gICAgLnJlcGxhY2UoLzwvZywgJyZsdDsnKVxuICAgIC5yZXBsYWNlKC8+L2csICcmZ3Q7JylcbiAgICAucmVwbGFjZSgvXCIvZywgJyZxdW90OycpXG4gICAgLnJlcGxhY2UoLycvZywgJyYjMzk7Jyk7XG59XG5cbmZ1bmN0aW9uIHJlcGxhY2UocmVnZXgsIG9wdCkge1xuICByZWdleCA9IHJlZ2V4LnNvdXJjZTtcbiAgb3B0ID0gb3B0IHx8ICcnO1xuICByZXR1cm4gZnVuY3Rpb24gc2VsZihuYW1lLCB2YWwpIHtcbiAgICBpZiAoIW5hbWUpIHJldHVybiBuZXcgUmVnRXhwKHJlZ2V4LCBvcHQpO1xuICAgIHZhbCA9IHZhbC5zb3VyY2UgfHwgdmFsO1xuICAgIHZhbCA9IHZhbC5yZXBsYWNlKC8oXnxbXlxcW10pXFxeL2csICckMScpO1xuICAgIHJlZ2V4ID0gcmVnZXgucmVwbGFjZShuYW1lLCB2YWwpO1xuICAgIHJldHVybiBzZWxmO1xuICB9O1xufVxuXG5mdW5jdGlvbiBub29wKCkge31cbm5vb3AuZXhlYyA9IG5vb3A7XG5cbmZ1bmN0aW9uIG1lcmdlKG9iaikge1xuICB2YXIgaSA9IDFcbiAgICAsIHRhcmdldFxuICAgICwga2V5O1xuXG4gIGZvciAoOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgdGFyZ2V0ID0gYXJndW1lbnRzW2ldO1xuICAgIGZvciAoa2V5IGluIHRhcmdldCkge1xuICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0YXJnZXQsIGtleSkpIHtcbiAgICAgICAgb2JqW2tleV0gPSB0YXJnZXRba2V5XTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gb2JqO1xufVxuXG4vKipcbiAqIE1hcmtlZFxuICovXG5cbmZ1bmN0aW9uIG1hcmtlZChzcmMsIG9wdCwgY2FsbGJhY2spIHtcbiAgaWYgKGNhbGxiYWNrIHx8IHR5cGVvZiBvcHQgPT09ICdmdW5jdGlvbicpIHtcbiAgICBpZiAoIWNhbGxiYWNrKSB7XG4gICAgICBjYWxsYmFjayA9IG9wdDtcbiAgICAgIG9wdCA9IG51bGw7XG4gICAgfVxuXG4gICAgb3B0ID0gbWVyZ2Uoe30sIG1hcmtlZC5kZWZhdWx0cywgb3B0IHx8IHt9KTtcblxuICAgIHZhciBoaWdobGlnaHQgPSBvcHQuaGlnaGxpZ2h0XG4gICAgICAsIHRva2Vuc1xuICAgICAgLCBwZW5kaW5nXG4gICAgICAsIGkgPSAwO1xuXG4gICAgdHJ5IHtcbiAgICAgIHRva2VucyA9IExleGVyLmxleChzcmMsIG9wdClcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2soZSk7XG4gICAgfVxuXG4gICAgcGVuZGluZyA9IHRva2Vucy5sZW5ndGg7XG5cbiAgICB2YXIgZG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIG91dCwgZXJyO1xuXG4gICAgICB0cnkge1xuICAgICAgICBvdXQgPSBQYXJzZXIucGFyc2UodG9rZW5zLCBvcHQpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBlcnIgPSBlO1xuICAgICAgfVxuXG4gICAgICBvcHQuaGlnaGxpZ2h0ID0gaGlnaGxpZ2h0O1xuXG4gICAgICByZXR1cm4gZXJyXG4gICAgICAgID8gY2FsbGJhY2soZXJyKVxuICAgICAgICA6IGNhbGxiYWNrKG51bGwsIG91dCk7XG4gICAgfTtcblxuICAgIGlmICghaGlnaGxpZ2h0IHx8IGhpZ2hsaWdodC5sZW5ndGggPCAzKSB7XG4gICAgICByZXR1cm4gZG9uZSgpO1xuICAgIH1cblxuICAgIGRlbGV0ZSBvcHQuaGlnaGxpZ2h0O1xuXG4gICAgaWYgKCFwZW5kaW5nKSByZXR1cm4gZG9uZSgpO1xuXG4gICAgZm9yICg7IGkgPCB0b2tlbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIChmdW5jdGlvbih0b2tlbikge1xuICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gJ2NvZGUnKSB7XG4gICAgICAgICAgcmV0dXJuIC0tcGVuZGluZyB8fCBkb25lKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGhpZ2hsaWdodCh0b2tlbi50ZXh0LCB0b2tlbi5sYW5nLCBmdW5jdGlvbihlcnIsIGNvZGUpIHtcbiAgICAgICAgICBpZiAoY29kZSA9PSBudWxsIHx8IGNvZGUgPT09IHRva2VuLnRleHQpIHtcbiAgICAgICAgICAgIHJldHVybiAtLXBlbmRpbmcgfHwgZG9uZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0b2tlbi50ZXh0ID0gY29kZTtcbiAgICAgICAgICB0b2tlbi5lc2NhcGVkID0gdHJ1ZTtcbiAgICAgICAgICAtLXBlbmRpbmcgfHwgZG9uZSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pKHRva2Vuc1tpXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuO1xuICB9XG4gIHRyeSB7XG4gICAgaWYgKG9wdCkgb3B0ID0gbWVyZ2Uoe30sIG1hcmtlZC5kZWZhdWx0cywgb3B0KTtcbiAgICByZXR1cm4gUGFyc2VyLnBhcnNlKExleGVyLmxleChzcmMsIG9wdCksIG9wdCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBlLm1lc3NhZ2UgKz0gJ1xcblBsZWFzZSByZXBvcnQgdGhpcyB0byBodHRwczovL2dpdGh1Yi5jb20vY2hqai9tYXJrZWQuJztcbiAgICBpZiAoKG9wdCB8fCBtYXJrZWQuZGVmYXVsdHMpLnNpbGVudCkge1xuICAgICAgcmV0dXJuICc8cD5BbiBlcnJvciBvY2N1cmVkOjwvcD48cHJlPidcbiAgICAgICAgKyBlc2NhcGUoZS5tZXNzYWdlICsgJycsIHRydWUpXG4gICAgICAgICsgJzwvcHJlPic7XG4gICAgfVxuICAgIHRocm93IGU7XG4gIH1cbn1cblxuLyoqXG4gKiBPcHRpb25zXG4gKi9cblxubWFya2VkLm9wdGlvbnMgPVxubWFya2VkLnNldE9wdGlvbnMgPSBmdW5jdGlvbihvcHQpIHtcbiAgbWVyZ2UobWFya2VkLmRlZmF1bHRzLCBvcHQpO1xuICByZXR1cm4gbWFya2VkO1xufTtcblxubWFya2VkLmRlZmF1bHRzID0ge1xuICBnZm06IHRydWUsXG4gIHRhYmxlczogdHJ1ZSxcbiAgYnJlYWtzOiBmYWxzZSxcbiAgcGVkYW50aWM6IGZhbHNlLFxuICBzYW5pdGl6ZTogZmFsc2UsXG4gIHNtYXJ0TGlzdHM6IGZhbHNlLFxuICBzaWxlbnQ6IGZhbHNlLFxuICBoaWdobGlnaHQ6IG51bGwsXG4gIGxhbmdQcmVmaXg6ICdsYW5nLScsXG4gIHNtYXJ0eXBhbnRzOiBmYWxzZVxufTtcblxuLyoqXG4gKiBFeHBvc2VcbiAqL1xuXG5tYXJrZWQuUGFyc2VyID0gUGFyc2VyO1xubWFya2VkLnBhcnNlciA9IFBhcnNlci5wYXJzZTtcblxubWFya2VkLkxleGVyID0gTGV4ZXI7XG5tYXJrZWQubGV4ZXIgPSBMZXhlci5sZXg7XG5cbm1hcmtlZC5JbmxpbmVMZXhlciA9IElubGluZUxleGVyO1xubWFya2VkLmlubGluZUxleGVyID0gSW5saW5lTGV4ZXIub3V0cHV0O1xuXG5tYXJrZWQucGFyc2UgPSBtYXJrZWQ7XG5cbmlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgbW9kdWxlLmV4cG9ydHMgPSBtYXJrZWQ7XG59IGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICBkZWZpbmUoZnVuY3Rpb24oKSB7IHJldHVybiBtYXJrZWQ7IH0pO1xufSBlbHNlIHtcbiAgdGhpcy5tYXJrZWQgPSBtYXJrZWQ7XG59XG5cbn0pLmNhbGwoZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzIHx8ICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IGdsb2JhbCk7XG59KCkpO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIm1vZHVsZS5leHBvcnRzID0geyBDbGllbnQ6IHdpbmRvdy5XZWJTb2NrZXQgfTtcbiIsIigodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQgJiYgZnVuY3Rpb24gKG0pIHsgZGVmaW5lKFwiYmFuZVwiLCBtKTsgfSkgfHxcbiAodHlwZW9mIG1vZHVsZSA9PT0gXCJvYmplY3RcIiAmJiBmdW5jdGlvbiAobSkgeyBtb2R1bGUuZXhwb3J0cyA9IG0oKTsgfSkgfHxcbiBmdW5jdGlvbiAobSkgeyB0aGlzLmJhbmUgPSBtKCk7IH1cbikoZnVuY3Rpb24gKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcblxuICAgIGZ1bmN0aW9uIGhhbmRsZUVycm9yKGV2ZW50LCBlcnJvciwgZXJyYmFja3MpIHtcbiAgICAgICAgdmFyIGksIGwgPSBlcnJiYWNrcy5sZW5ndGg7XG4gICAgICAgIGlmIChsID4gMCkge1xuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGw7ICsraSkgeyBlcnJiYWNrc1tpXShldmVudCwgZXJyb3IpOyB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBlcnJvci5tZXNzYWdlID0gZXZlbnQgKyBcIiBsaXN0ZW5lciB0aHJldyBlcnJvcjogXCIgKyBlcnJvci5tZXNzYWdlO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH0sIDApO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFzc2VydEZ1bmN0aW9uKGZuKSB7XG4gICAgICAgIGlmICh0eXBlb2YgZm4gIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkxpc3RlbmVyIGlzIG5vdCBmdW5jdGlvblwiKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZm47XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3VwZXJ2aXNvcnMob2JqZWN0KSB7XG4gICAgICAgIGlmICghb2JqZWN0LnN1cGVydmlzb3JzKSB7IG9iamVjdC5zdXBlcnZpc29ycyA9IFtdOyB9XG4gICAgICAgIHJldHVybiBvYmplY3Quc3VwZXJ2aXNvcnM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGlzdGVuZXJzKG9iamVjdCwgZXZlbnQpIHtcbiAgICAgICAgaWYgKCFvYmplY3QubGlzdGVuZXJzKSB7IG9iamVjdC5saXN0ZW5lcnMgPSB7fTsgfVxuICAgICAgICBpZiAoZXZlbnQgJiYgIW9iamVjdC5saXN0ZW5lcnNbZXZlbnRdKSB7IG9iamVjdC5saXN0ZW5lcnNbZXZlbnRdID0gW107IH1cbiAgICAgICAgcmV0dXJuIGV2ZW50ID8gb2JqZWN0Lmxpc3RlbmVyc1tldmVudF0gOiBvYmplY3QubGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGVycmJhY2tzKG9iamVjdCkge1xuICAgICAgICBpZiAoIW9iamVjdC5lcnJiYWNrcykgeyBvYmplY3QuZXJyYmFja3MgPSBbXTsgfVxuICAgICAgICByZXR1cm4gb2JqZWN0LmVycmJhY2tzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBzaWduYXR1cmUgdmFyIGVtaXR0ZXIgPSBiYW5lLmNyZWF0ZUVtaXR0ZXIoW29iamVjdF0pO1xuICAgICAqXG4gICAgICogQ3JlYXRlIGEgbmV3IGV2ZW50IGVtaXR0ZXIuIElmIGFuIG9iamVjdCBpcyBwYXNzZWQsIGl0IHdpbGwgYmUgbW9kaWZpZWRcbiAgICAgKiBieSBhZGRpbmcgdGhlIGV2ZW50IGVtaXR0ZXIgbWV0aG9kcyAoc2VlIGJlbG93KS5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjcmVhdGVFdmVudEVtaXR0ZXIob2JqZWN0KSB7XG4gICAgICAgIG9iamVjdCA9IG9iamVjdCB8fCB7fTtcblxuICAgICAgICBmdW5jdGlvbiBub3RpZnlMaXN0ZW5lcihldmVudCwgbGlzdGVuZXIsIGFyZ3MpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIuYXBwbHkobGlzdGVuZXIudGhpc3AgfHwgb2JqZWN0LCBhcmdzKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBoYW5kbGVFcnJvcihldmVudCwgZSwgZXJyYmFja3Mob2JqZWN0KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBvYmplY3Qub24gPSBmdW5jdGlvbiAoZXZlbnQsIGxpc3RlbmVyLCB0aGlzcCkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBldmVudCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN1cGVydmlzb3JzKHRoaXMpLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBsaXN0ZW5lcjogZXZlbnQsXG4gICAgICAgICAgICAgICAgICAgIHRoaXNwOiBsaXN0ZW5lclxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGlzdGVuZXJzKHRoaXMsIGV2ZW50KS5wdXNoKHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcjogYXNzZXJ0RnVuY3Rpb24obGlzdGVuZXIpLFxuICAgICAgICAgICAgICAgIHRoaXNwOiB0aGlzcFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgb2JqZWN0Lm9mZiA9IGZ1bmN0aW9uIChldmVudCwgbGlzdGVuZXIpIHtcbiAgICAgICAgICAgIHZhciBmbnMsIGV2ZW50cywgaSwgbDtcbiAgICAgICAgICAgIGlmICghZXZlbnQpIHtcbiAgICAgICAgICAgICAgICBmbnMgPSBzdXBlcnZpc29ycyh0aGlzKTtcbiAgICAgICAgICAgICAgICBmbnMuc3BsaWNlKDAsIGZucy5sZW5ndGgpO1xuXG4gICAgICAgICAgICAgICAgZXZlbnRzID0gbGlzdGVuZXJzKHRoaXMpO1xuICAgICAgICAgICAgICAgIGZvciAoaSBpbiBldmVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGV2ZW50cy5oYXNPd25Qcm9wZXJ0eShpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm5zID0gbGlzdGVuZXJzKHRoaXMsIGkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm5zLnNwbGljZSgwLCBmbnMubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGZucyA9IGVycmJhY2tzKHRoaXMpO1xuICAgICAgICAgICAgICAgIGZucy5zcGxpY2UoMCwgZm5zLmxlbmd0aCk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIGV2ZW50ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICBmbnMgPSBzdXBlcnZpc29ycyh0aGlzKTtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lciA9IGV2ZW50O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmbnMgPSBsaXN0ZW5lcnModGhpcywgZXZlbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFsaXN0ZW5lcikge1xuICAgICAgICAgICAgICAgIGZucy5zcGxpY2UoMCwgZm5zLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChpID0gMCwgbCA9IGZucy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgICAgICAgICAgICBpZiAoZm5zW2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikge1xuICAgICAgICAgICAgICAgICAgICBmbnMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIG9iamVjdC5vbmNlID0gZnVuY3Rpb24gKGV2ZW50LCBsaXN0ZW5lciwgdGhpc3ApIHtcbiAgICAgICAgICAgIHZhciB3cmFwcGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIG9iamVjdC5vZmYoZXZlbnQsIHdyYXBwZXIpO1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBvYmplY3Qub24oZXZlbnQsIHdyYXBwZXIsIHRoaXNwKTtcbiAgICAgICAgfTtcblxuICAgICAgICBvYmplY3QuYmluZCA9IGZ1bmN0aW9uIChvYmplY3QsIGV2ZW50cykge1xuICAgICAgICAgICAgdmFyIHByb3AsIGksIGw7XG4gICAgICAgICAgICBpZiAoIWV2ZW50cykge1xuICAgICAgICAgICAgICAgIGZvciAocHJvcCBpbiBvYmplY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvYmplY3RbcHJvcF0gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vbihwcm9wLCBvYmplY3RbcHJvcF0sIG9iamVjdCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IDAsIGwgPSBldmVudHMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb2JqZWN0W2V2ZW50c1tpXV0gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vbihldmVudHNbaV0sIG9iamVjdFtldmVudHNbaV1dLCBvYmplY3QpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm8gc3VjaCBtZXRob2QgXCIgKyBldmVudHNbaV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgICAgfTtcblxuICAgICAgICBvYmplY3QuZW1pdCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgdmFyIHRvTm90aWZ5ID0gc3VwZXJ2aXNvcnModGhpcyk7XG4gICAgICAgICAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzKSwgaSwgbDtcblxuICAgICAgICAgICAgZm9yIChpID0gMCwgbCA9IHRvTm90aWZ5Lmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgICAgICAgICAgIG5vdGlmeUxpc3RlbmVyKGV2ZW50LCB0b05vdGlmeVtpXSwgYXJncyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRvTm90aWZ5ID0gbGlzdGVuZXJzKHRoaXMsIGV2ZW50KS5zbGljZSgpO1xuICAgICAgICAgICAgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgIGZvciAoaSA9IDAsIGwgPSB0b05vdGlmeS5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgICAgICAgICAgICBub3RpZnlMaXN0ZW5lcihldmVudCwgdG9Ob3RpZnlbaV0sIGFyZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIG9iamVjdC5lcnJiYWNrID0gZnVuY3Rpb24gKGxpc3RlbmVyKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuZXJyYmFja3MpIHsgdGhpcy5lcnJiYWNrcyA9IFtdOyB9XG4gICAgICAgICAgICB0aGlzLmVycmJhY2tzLnB1c2goYXNzZXJ0RnVuY3Rpb24obGlzdGVuZXIpKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gb2JqZWN0O1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIGNyZWF0ZUV2ZW50RW1pdHRlcjogY3JlYXRlRXZlbnRFbWl0dGVyLFxuICAgICAgICBhZ2dyZWdhdGU6IGZ1bmN0aW9uIChlbWl0dGVycykge1xuICAgICAgICAgICAgdmFyIGFnZ3JlZ2F0ZSA9IGNyZWF0ZUV2ZW50RW1pdHRlcigpO1xuICAgICAgICAgICAgZW1pdHRlcnMuZm9yRWFjaChmdW5jdGlvbiAoZW1pdHRlcikge1xuICAgICAgICAgICAgICAgIGVtaXR0ZXIub24oZnVuY3Rpb24gKGV2ZW50LCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIGFnZ3JlZ2F0ZS5lbWl0KGV2ZW50LCBkYXRhKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIGFnZ3JlZ2F0ZTtcbiAgICAgICAgfVxuICAgIH07XG59KTtcbiIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG4oZnVuY3Rpb24oZGVmaW5lKSB7ICd1c2Ugc3RyaWN0JztcbmRlZmluZShmdW5jdGlvbiAocmVxdWlyZSkge1xuXG5cdHZhciBtYWtlUHJvbWlzZSA9IHJlcXVpcmUoJy4vbWFrZVByb21pc2UnKTtcblx0dmFyIFNjaGVkdWxlciA9IHJlcXVpcmUoJy4vc2NoZWR1bGVyJyk7XG5cdHZhciBhc3luYyA9IHJlcXVpcmUoJy4vYXN5bmMnKTtcblxuXHRyZXR1cm4gbWFrZVByb21pc2Uoe1xuXHRcdHNjaGVkdWxlcjogbmV3IFNjaGVkdWxlcihhc3luYylcblx0fSk7XG5cbn0pO1xufSkodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lIDogZnVuY3Rpb24gKGZhY3RvcnkpIHsgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUpOyB9KTtcbiIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG4oZnVuY3Rpb24oZGVmaW5lKSB7ICd1c2Ugc3RyaWN0JztcbmRlZmluZShmdW5jdGlvbigpIHtcblx0LyoqXG5cdCAqIENpcmN1bGFyIHF1ZXVlXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSBjYXBhY2l0eVBvdzIgcG93ZXIgb2YgMiB0byB3aGljaCB0aGlzIHF1ZXVlJ3MgY2FwYWNpdHlcblx0ICogIHdpbGwgYmUgc2V0IGluaXRpYWxseS4gZWcgd2hlbiBjYXBhY2l0eVBvdzIgPT0gMywgcXVldWUgY2FwYWNpdHlcblx0ICogIHdpbGwgYmUgOC5cblx0ICogQGNvbnN0cnVjdG9yXG5cdCAqL1xuXHRmdW5jdGlvbiBRdWV1ZShjYXBhY2l0eVBvdzIpIHtcblx0XHR0aGlzLmhlYWQgPSB0aGlzLnRhaWwgPSB0aGlzLmxlbmd0aCA9IDA7XG5cdFx0dGhpcy5idWZmZXIgPSBuZXcgQXJyYXkoMSA8PCBjYXBhY2l0eVBvdzIpO1xuXHR9XG5cblx0UXVldWUucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbih4KSB7XG5cdFx0aWYodGhpcy5sZW5ndGggPT09IHRoaXMuYnVmZmVyLmxlbmd0aCkge1xuXHRcdFx0dGhpcy5fZW5zdXJlQ2FwYWNpdHkodGhpcy5sZW5ndGggKiAyKTtcblx0XHR9XG5cblx0XHR0aGlzLmJ1ZmZlclt0aGlzLnRhaWxdID0geDtcblx0XHR0aGlzLnRhaWwgPSAodGhpcy50YWlsICsgMSkgJiAodGhpcy5idWZmZXIubGVuZ3RoIC0gMSk7XG5cdFx0Kyt0aGlzLmxlbmd0aDtcblx0XHRyZXR1cm4gdGhpcy5sZW5ndGg7XG5cdH07XG5cblx0UXVldWUucHJvdG90eXBlLnNoaWZ0ID0gZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHggPSB0aGlzLmJ1ZmZlclt0aGlzLmhlYWRdO1xuXHRcdHRoaXMuYnVmZmVyW3RoaXMuaGVhZF0gPSB2b2lkIDA7XG5cdFx0dGhpcy5oZWFkID0gKHRoaXMuaGVhZCArIDEpICYgKHRoaXMuYnVmZmVyLmxlbmd0aCAtIDEpO1xuXHRcdC0tdGhpcy5sZW5ndGg7XG5cdFx0cmV0dXJuIHg7XG5cdH07XG5cblx0UXVldWUucHJvdG90eXBlLl9lbnN1cmVDYXBhY2l0eSA9IGZ1bmN0aW9uKGNhcGFjaXR5KSB7XG5cdFx0dmFyIGhlYWQgPSB0aGlzLmhlYWQ7XG5cdFx0dmFyIGJ1ZmZlciA9IHRoaXMuYnVmZmVyO1xuXHRcdHZhciBuZXdCdWZmZXIgPSBuZXcgQXJyYXkoY2FwYWNpdHkpO1xuXHRcdHZhciBpID0gMDtcblx0XHR2YXIgbGVuO1xuXG5cdFx0aWYoaGVhZCA9PT0gMCkge1xuXHRcdFx0bGVuID0gdGhpcy5sZW5ndGg7XG5cdFx0XHRmb3IoOyBpPGxlbjsgKytpKSB7XG5cdFx0XHRcdG5ld0J1ZmZlcltpXSA9IGJ1ZmZlcltpXTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0Y2FwYWNpdHkgPSBidWZmZXIubGVuZ3RoO1xuXHRcdFx0bGVuID0gdGhpcy50YWlsO1xuXHRcdFx0Zm9yKDsgaGVhZDxjYXBhY2l0eTsgKytpLCArK2hlYWQpIHtcblx0XHRcdFx0bmV3QnVmZmVyW2ldID0gYnVmZmVyW2hlYWRdO1xuXHRcdFx0fVxuXG5cdFx0XHRmb3IoaGVhZD0wOyBoZWFkPGxlbjsgKytpLCArK2hlYWQpIHtcblx0XHRcdFx0bmV3QnVmZmVyW2ldID0gYnVmZmVyW2hlYWRdO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMuYnVmZmVyID0gbmV3QnVmZmVyO1xuXHRcdHRoaXMuaGVhZCA9IDA7XG5cdFx0dGhpcy50YWlsID0gdGhpcy5sZW5ndGg7XG5cdH07XG5cblx0cmV0dXJuIFF1ZXVlO1xuXG59KTtcbn0odHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lIDogZnVuY3Rpb24oZmFjdG9yeSkgeyBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTsgfSkpO1xuIiwiLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE0IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbihmdW5jdGlvbihkZWZpbmUpIHsgJ3VzZSBzdHJpY3QnO1xuZGVmaW5lKGZ1bmN0aW9uKCkge1xuXG5cdC8qKlxuXHQgKiBDdXN0b20gZXJyb3IgdHlwZSBmb3IgcHJvbWlzZXMgcmVqZWN0ZWQgYnkgcHJvbWlzZS50aW1lb3V0XG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlXG5cdCAqIEBjb25zdHJ1Y3RvclxuXHQgKi9cblx0ZnVuY3Rpb24gVGltZW91dEVycm9yIChtZXNzYWdlKSB7XG5cdFx0RXJyb3IuY2FsbCh0aGlzKTtcblx0XHR0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuXHRcdHRoaXMubmFtZSA9IFRpbWVvdXRFcnJvci5uYW1lO1xuXHRcdGlmICh0eXBlb2YgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UgPT09ICdmdW5jdGlvbicpIHtcblx0XHRcdEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIFRpbWVvdXRFcnJvcik7XG5cdFx0fVxuXHR9XG5cblx0VGltZW91dEVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcblx0VGltZW91dEVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFRpbWVvdXRFcnJvcjtcblxuXHRyZXR1cm4gVGltZW91dEVycm9yO1xufSk7XG59KHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZSA6IGZ1bmN0aW9uKGZhY3RvcnkpIHsgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7IH0pKTsiLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE0IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbihmdW5jdGlvbihkZWZpbmUpIHsgJ3VzZSBzdHJpY3QnO1xuZGVmaW5lKGZ1bmN0aW9uKHJlcXVpcmUpIHtcblxuXHQvLyBTbmlmZiBcImJlc3RcIiBhc3luYyBzY2hlZHVsaW5nIG9wdGlvblxuXHQvLyBQcmVmZXIgcHJvY2Vzcy5uZXh0VGljayBvciBNdXRhdGlvbk9ic2VydmVyLCB0aGVuIGNoZWNrIGZvclxuXHQvLyB2ZXJ0eCBhbmQgZmluYWxseSBmYWxsIGJhY2sgdG8gc2V0VGltZW91dFxuXG5cdC8qanNoaW50IG1heGNvbXBsZXhpdHk6NiovXG5cdC8qZ2xvYmFsIHByb2Nlc3MsZG9jdW1lbnQsc2V0VGltZW91dCxNdXRhdGlvbk9ic2VydmVyLFdlYktpdE11dGF0aW9uT2JzZXJ2ZXIqL1xuXHR2YXIgbmV4dFRpY2ssIE11dGF0aW9uT2JzO1xuXG5cdGlmICh0eXBlb2YgcHJvY2VzcyAhPT0gJ3VuZGVmaW5lZCcgJiYgcHJvY2VzcyAhPT0gbnVsbCAmJlxuXHRcdHR5cGVvZiBwcm9jZXNzLm5leHRUaWNrID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0bmV4dFRpY2sgPSBmdW5jdGlvbihmKSB7XG5cdFx0XHRwcm9jZXNzLm5leHRUaWNrKGYpO1xuXHRcdH07XG5cblx0fSBlbHNlIGlmIChNdXRhdGlvbk9icyA9XG5cdFx0KHR5cGVvZiBNdXRhdGlvbk9ic2VydmVyID09PSAnZnVuY3Rpb24nICYmIE11dGF0aW9uT2JzZXJ2ZXIpIHx8XG5cdFx0KHR5cGVvZiBXZWJLaXRNdXRhdGlvbk9ic2VydmVyID09PSAnZnVuY3Rpb24nICYmIFdlYktpdE11dGF0aW9uT2JzZXJ2ZXIpKSB7XG5cdFx0bmV4dFRpY2sgPSAoZnVuY3Rpb24gKGRvY3VtZW50LCBNdXRhdGlvbk9ic2VydmVyKSB7XG5cdFx0XHR2YXIgc2NoZWR1bGVkO1xuXHRcdFx0dmFyIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0XHR2YXIgbyA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKHJ1bik7XG5cdFx0XHRvLm9ic2VydmUoZWwsIHsgYXR0cmlidXRlczogdHJ1ZSB9KTtcblxuXHRcdFx0ZnVuY3Rpb24gcnVuKCkge1xuXHRcdFx0XHR2YXIgZiA9IHNjaGVkdWxlZDtcblx0XHRcdFx0c2NoZWR1bGVkID0gdm9pZCAwO1xuXHRcdFx0XHRmKCk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBmdW5jdGlvbiAoZikge1xuXHRcdFx0XHRzY2hlZHVsZWQgPSBmO1xuXHRcdFx0XHRlbC5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3gnKTtcblx0XHRcdH07XG5cdFx0fShkb2N1bWVudCwgTXV0YXRpb25PYnMpKTtcblxuXHR9IGVsc2Uge1xuXHRcdG5leHRUaWNrID0gKGZ1bmN0aW9uKGNqc1JlcXVpcmUpIHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdC8vIHZlcnQueCAxLnggfHwgMi54XG5cdFx0XHRcdHJldHVybiBjanNSZXF1aXJlKCd2ZXJ0eCcpLnJ1bk9uTG9vcCB8fCBjanNSZXF1aXJlKCd2ZXJ0eCcpLnJ1bk9uQ29udGV4dDtcblx0XHRcdH0gY2F0Y2ggKGlnbm9yZSkge31cblxuXHRcdFx0Ly8gY2FwdHVyZSBzZXRUaW1lb3V0IHRvIGF2b2lkIGJlaW5nIGNhdWdodCBieSBmYWtlIHRpbWVyc1xuXHRcdFx0Ly8gdXNlZCBpbiB0aW1lIGJhc2VkIHRlc3RzXG5cdFx0XHR2YXIgY2FwdHVyZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcblx0XHRcdHJldHVybiBmdW5jdGlvbiAodCkge1xuXHRcdFx0XHRjYXB0dXJlZFNldFRpbWVvdXQodCwgMCk7XG5cdFx0XHR9O1xuXHRcdH0ocmVxdWlyZSkpO1xuXHR9XG5cblx0cmV0dXJuIG5leHRUaWNrO1xufSk7XG59KHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZSA6IGZ1bmN0aW9uKGZhY3RvcnkpIHsgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUpOyB9KSk7XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiRldhQVNIXCIpKSIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG4oZnVuY3Rpb24oZGVmaW5lKSB7ICd1c2Ugc3RyaWN0JztcbmRlZmluZShmdW5jdGlvbigpIHtcblxuXHRyZXR1cm4gZnVuY3Rpb24gYXJyYXkoUHJvbWlzZSkge1xuXG5cdFx0dmFyIGFycmF5TWFwID0gQXJyYXkucHJvdG90eXBlLm1hcDtcblx0XHR2YXIgYXJyYXlSZWR1Y2UgPSBBcnJheS5wcm90b3R5cGUucmVkdWNlO1xuXHRcdHZhciBhcnJheVJlZHVjZVJpZ2h0ID0gQXJyYXkucHJvdG90eXBlLnJlZHVjZVJpZ2h0O1xuXHRcdHZhciBhcnJheUZvckVhY2ggPSBBcnJheS5wcm90b3R5cGUuZm9yRWFjaDtcblxuXHRcdHZhciB0b1Byb21pc2UgPSBQcm9taXNlLnJlc29sdmU7XG5cdFx0dmFyIGFsbCA9IFByb21pc2UuYWxsO1xuXG5cdFx0Ly8gQWRkaXRpb25hbCBhcnJheSBjb21iaW5hdG9yc1xuXG5cdFx0UHJvbWlzZS5hbnkgPSBhbnk7XG5cdFx0UHJvbWlzZS5zb21lID0gc29tZTtcblx0XHRQcm9taXNlLnNldHRsZSA9IHNldHRsZTtcblxuXHRcdFByb21pc2UubWFwID0gbWFwO1xuXHRcdFByb21pc2UucmVkdWNlID0gcmVkdWNlO1xuXHRcdFByb21pc2UucmVkdWNlUmlnaHQgPSByZWR1Y2VSaWdodDtcblxuXHRcdC8qKlxuXHRcdCAqIFdoZW4gdGhpcyBwcm9taXNlIGZ1bGZpbGxzIHdpdGggYW4gYXJyYXksIGRvXG5cdFx0ICogb25GdWxmaWxsZWQuYXBwbHkodm9pZCAwLCBhcnJheSlcblx0XHQgKiBAcGFyYW0gKGZ1bmN0aW9uKSBvbkZ1bGZpbGxlZCBmdW5jdGlvbiB0byBhcHBseVxuXHRcdCAqIEByZXR1cm5zIHtQcm9taXNlfSBwcm9taXNlIGZvciB0aGUgcmVzdWx0IG9mIGFwcGx5aW5nIG9uRnVsZmlsbGVkXG5cdFx0ICovXG5cdFx0UHJvbWlzZS5wcm90b3R5cGUuc3ByZWFkID0gZnVuY3Rpb24ob25GdWxmaWxsZWQpIHtcblx0XHRcdHJldHVybiB0aGlzLnRoZW4oYWxsKS50aGVuKGZ1bmN0aW9uKGFycmF5KSB7XG5cdFx0XHRcdHJldHVybiBvbkZ1bGZpbGxlZC5hcHBseSh2b2lkIDAsIGFycmF5KTtcblx0XHRcdH0pO1xuXHRcdH07XG5cblx0XHRyZXR1cm4gUHJvbWlzZTtcblxuXHRcdC8qKlxuXHRcdCAqIE9uZS13aW5uZXIgY29tcGV0aXRpdmUgcmFjZS5cblx0XHQgKiBSZXR1cm4gYSBwcm9taXNlIHRoYXQgd2lsbCBmdWxmaWxsIHdoZW4gb25lIG9mIHRoZSBwcm9taXNlc1xuXHRcdCAqIGluIHRoZSBpbnB1dCBhcnJheSBmdWxmaWxscywgb3Igd2lsbCByZWplY3Qgd2hlbiBhbGwgcHJvbWlzZXNcblx0XHQgKiBoYXZlIHJlamVjdGVkLlxuXHRcdCAqIEBwYXJhbSB7YXJyYXl9IHByb21pc2VzXG5cdFx0ICogQHJldHVybnMge1Byb21pc2V9IHByb21pc2UgZm9yIHRoZSBmaXJzdCBmdWxmaWxsZWQgdmFsdWVcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBhbnkocHJvbWlzZXMpIHtcblx0XHRcdHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcblx0XHRcdFx0dmFyIHBlbmRpbmcgPSAwO1xuXHRcdFx0XHR2YXIgZXJyb3JzID0gW107XG5cblx0XHRcdFx0YXJyYXlGb3JFYWNoLmNhbGwocHJvbWlzZXMsIGZ1bmN0aW9uKHApIHtcblx0XHRcdFx0XHQrK3BlbmRpbmc7XG5cdFx0XHRcdFx0dG9Qcm9taXNlKHApLnRoZW4ocmVzb2x2ZSwgaGFuZGxlUmVqZWN0KTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0aWYocGVuZGluZyA9PT0gMCkge1xuXHRcdFx0XHRcdHJlc29sdmUoKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGZ1bmN0aW9uIGhhbmRsZVJlamVjdChlKSB7XG5cdFx0XHRcdFx0ZXJyb3JzLnB1c2goZSk7XG5cdFx0XHRcdFx0aWYoLS1wZW5kaW5nID09PSAwKSB7XG5cdFx0XHRcdFx0XHRyZWplY3QoZXJyb3JzKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIE4td2lubmVyIGNvbXBldGl0aXZlIHJhY2Vcblx0XHQgKiBSZXR1cm4gYSBwcm9taXNlIHRoYXQgd2lsbCBmdWxmaWxsIHdoZW4gbiBpbnB1dCBwcm9taXNlcyBoYXZlXG5cdFx0ICogZnVsZmlsbGVkLCBvciB3aWxsIHJlamVjdCB3aGVuIGl0IGJlY29tZXMgaW1wb3NzaWJsZSBmb3IgblxuXHRcdCAqIGlucHV0IHByb21pc2VzIHRvIGZ1bGZpbGwgKGllIHdoZW4gcHJvbWlzZXMubGVuZ3RoIC0gbiArIDFcblx0XHQgKiBoYXZlIHJlamVjdGVkKVxuXHRcdCAqIEBwYXJhbSB7YXJyYXl9IHByb21pc2VzXG5cdFx0ICogQHBhcmFtIHtudW1iZXJ9IG5cblx0XHQgKiBAcmV0dXJucyB7UHJvbWlzZX0gcHJvbWlzZSBmb3IgdGhlIGVhcmxpZXN0IG4gZnVsZmlsbG1lbnQgdmFsdWVzXG5cdFx0ICpcblx0XHQgKiBAZGVwcmVjYXRlZFxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIHNvbWUocHJvbWlzZXMsIG4pIHtcblx0XHRcdHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QsIG5vdGlmeSkge1xuXHRcdFx0XHR2YXIgbkZ1bGZpbGwgPSAwO1xuXHRcdFx0XHR2YXIgblJlamVjdDtcblx0XHRcdFx0dmFyIHJlc3VsdHMgPSBbXTtcblx0XHRcdFx0dmFyIGVycm9ycyA9IFtdO1xuXG5cdFx0XHRcdGFycmF5Rm9yRWFjaC5jYWxsKHByb21pc2VzLCBmdW5jdGlvbihwKSB7XG5cdFx0XHRcdFx0KytuRnVsZmlsbDtcblx0XHRcdFx0XHR0b1Byb21pc2UocCkudGhlbihoYW5kbGVSZXNvbHZlLCBoYW5kbGVSZWplY3QsIG5vdGlmeSk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdG4gPSBNYXRoLm1heChuLCAwKTtcblx0XHRcdFx0blJlamVjdCA9IChuRnVsZmlsbCAtIG4gKyAxKTtcblx0XHRcdFx0bkZ1bGZpbGwgPSBNYXRoLm1pbihuLCBuRnVsZmlsbCk7XG5cblx0XHRcdFx0aWYobkZ1bGZpbGwgPT09IDApIHtcblx0XHRcdFx0XHRyZXNvbHZlKHJlc3VsdHMpO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGZ1bmN0aW9uIGhhbmRsZVJlc29sdmUoeCkge1xuXHRcdFx0XHRcdGlmKG5GdWxmaWxsID4gMCkge1xuXHRcdFx0XHRcdFx0LS1uRnVsZmlsbDtcblx0XHRcdFx0XHRcdHJlc3VsdHMucHVzaCh4KTtcblxuXHRcdFx0XHRcdFx0aWYobkZ1bGZpbGwgPT09IDApIHtcblx0XHRcdFx0XHRcdFx0cmVzb2x2ZShyZXN1bHRzKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRmdW5jdGlvbiBoYW5kbGVSZWplY3QoZSkge1xuXHRcdFx0XHRcdGlmKG5SZWplY3QgPiAwKSB7XG5cdFx0XHRcdFx0XHQtLW5SZWplY3Q7XG5cdFx0XHRcdFx0XHRlcnJvcnMucHVzaChlKTtcblxuXHRcdFx0XHRcdFx0aWYoblJlamVjdCA9PT0gMCkge1xuXHRcdFx0XHRcdFx0XHRyZWplY3QoZXJyb3JzKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIEFwcGx5IGYgdG8gdGhlIHZhbHVlIG9mIGVhY2ggcHJvbWlzZSBpbiBhIGxpc3Qgb2YgcHJvbWlzZXNcblx0XHQgKiBhbmQgcmV0dXJuIGEgbmV3IGxpc3QgY29udGFpbmluZyB0aGUgcmVzdWx0cy5cblx0XHQgKiBAcGFyYW0ge2FycmF5fSBwcm9taXNlc1xuXHRcdCAqIEBwYXJhbSB7ZnVuY3Rpb259IGZcblx0XHQgKiBAcGFyYW0ge2Z1bmN0aW9ufSBmYWxsYmFja1xuXHRcdCAqIEByZXR1cm5zIHtQcm9taXNlfVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIG1hcChwcm9taXNlcywgZiwgZmFsbGJhY2spIHtcblx0XHRcdHJldHVybiBhbGwoYXJyYXlNYXAuY2FsbChwcm9taXNlcywgZnVuY3Rpb24oeCkge1xuXHRcdFx0XHRyZXR1cm4gdG9Qcm9taXNlKHgpLnRoZW4oZiwgZmFsbGJhY2spO1xuXHRcdFx0fSkpO1xuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIFJldHVybiBhIHByb21pc2UgdGhhdCB3aWxsIGFsd2F5cyBmdWxmaWxsIHdpdGggYW4gYXJyYXkgY29udGFpbmluZ1xuXHRcdCAqIHRoZSBvdXRjb21lIHN0YXRlcyBvZiBhbGwgaW5wdXQgcHJvbWlzZXMuICBUaGUgcmV0dXJuZWQgcHJvbWlzZVxuXHRcdCAqIHdpbGwgbmV2ZXIgcmVqZWN0LlxuXHRcdCAqIEBwYXJhbSB7YXJyYXl9IHByb21pc2VzXG5cdFx0ICogQHJldHVybnMge1Byb21pc2V9XG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gc2V0dGxlKHByb21pc2VzKSB7XG5cdFx0XHRyZXR1cm4gYWxsKGFycmF5TWFwLmNhbGwocHJvbWlzZXMsIGZ1bmN0aW9uKHApIHtcblx0XHRcdFx0cCA9IHRvUHJvbWlzZShwKTtcblx0XHRcdFx0cmV0dXJuIHAudGhlbihpbnNwZWN0LCBpbnNwZWN0KTtcblxuXHRcdFx0XHRmdW5jdGlvbiBpbnNwZWN0KCkge1xuXHRcdFx0XHRcdHJldHVybiBwLmluc3BlY3QoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSkpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHJlZHVjZShwcm9taXNlcywgZikge1xuXHRcdFx0cmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPiAyXG5cdFx0XHRcdD8gYXJyYXlSZWR1Y2UuY2FsbChwcm9taXNlcywgcmVkdWNlciwgYXJndW1lbnRzWzJdKVxuXHRcdFx0XHQ6IGFycmF5UmVkdWNlLmNhbGwocHJvbWlzZXMsIHJlZHVjZXIpO1xuXG5cdFx0XHRmdW5jdGlvbiByZWR1Y2VyKHJlc3VsdCwgeCwgaSkge1xuXHRcdFx0XHRyZXR1cm4gdG9Qcm9taXNlKHJlc3VsdCkudGhlbihmdW5jdGlvbihyKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRvUHJvbWlzZSh4KS50aGVuKGZ1bmN0aW9uKHgpIHtcblx0XHRcdFx0XHRcdHJldHVybiBmKHIsIHgsIGkpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRmdW5jdGlvbiByZWR1Y2VSaWdodChwcm9taXNlcywgZikge1xuXHRcdFx0cmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPiAyXG5cdFx0XHRcdD8gYXJyYXlSZWR1Y2VSaWdodC5jYWxsKHByb21pc2VzLCByZWR1Y2VyLCBhcmd1bWVudHNbMl0pXG5cdFx0XHRcdDogYXJyYXlSZWR1Y2VSaWdodC5jYWxsKHByb21pc2VzLCByZWR1Y2VyKTtcblxuXHRcdFx0ZnVuY3Rpb24gcmVkdWNlcihyZXN1bHQsIHgsIGkpIHtcblx0XHRcdFx0cmV0dXJuIHRvUHJvbWlzZShyZXN1bHQpLnRoZW4oZnVuY3Rpb24ocikge1xuXHRcdFx0XHRcdHJldHVybiB0b1Byb21pc2UoeCkudGhlbihmdW5jdGlvbih4KSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZihyLCB4LCBpKTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xuXG5cbn0pO1xufSh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUgOiBmdW5jdGlvbihmYWN0b3J5KSB7IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpOyB9KSk7XG4iLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuKGZ1bmN0aW9uKGRlZmluZSkgeyAndXNlIHN0cmljdCc7XG5kZWZpbmUoZnVuY3Rpb24oKSB7XG5cblx0cmV0dXJuIGZ1bmN0aW9uIGZsb3coUHJvbWlzZSkge1xuXG5cdFx0dmFyIHJlamVjdCA9IFByb21pc2UucmVqZWN0O1xuXHRcdHZhciBvcmlnQ2F0Y2ggPSBQcm9taXNlLnByb3RvdHlwZVsnY2F0Y2gnXTtcblxuXHRcdC8qKlxuXHRcdCAqIEhhbmRsZSB0aGUgdWx0aW1hdGUgZnVsZmlsbG1lbnQgdmFsdWUgb3IgcmVqZWN0aW9uIHJlYXNvbiwgYW5kIGFzc3VtZVxuXHRcdCAqIHJlc3BvbnNpYmlsaXR5IGZvciBhbGwgZXJyb3JzLiAgSWYgYW4gZXJyb3IgcHJvcGFnYXRlcyBvdXQgb2YgcmVzdWx0XG5cdFx0ICogb3IgaGFuZGxlRmF0YWxFcnJvciwgaXQgd2lsbCBiZSByZXRocm93biB0byB0aGUgaG9zdCwgcmVzdWx0aW5nIGluIGFcblx0XHQgKiBsb3VkIHN0YWNrIHRyYWNrIG9uIG1vc3QgcGxhdGZvcm1zIGFuZCBhIGNyYXNoIG9uIHNvbWUuXG5cdFx0ICogQHBhcmFtIHtmdW5jdGlvbj99IG9uUmVzdWx0XG5cdFx0ICogQHBhcmFtIHtmdW5jdGlvbj99IG9uRXJyb3Jcblx0XHQgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuXHRcdCAqL1xuXHRcdFByb21pc2UucHJvdG90eXBlLmRvbmUgPSBmdW5jdGlvbihvblJlc3VsdCwgb25FcnJvcikge1xuXHRcdFx0dmFyIGggPSB0aGlzLl9oYW5kbGVyO1xuXHRcdFx0aC53aGVuKHsgcmVzb2x2ZTogdGhpcy5fbWF5YmVGYXRhbCwgbm90aWZ5OiBub29wLCBjb250ZXh0OiB0aGlzLFxuXHRcdFx0XHRyZWNlaXZlcjogaC5yZWNlaXZlciwgZnVsZmlsbGVkOiBvblJlc3VsdCwgcmVqZWN0ZWQ6IG9uRXJyb3IsXG5cdFx0XHRcdHByb2dyZXNzOiB2b2lkIDAgfSk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIEFkZCBFcnJvci10eXBlIGFuZCBwcmVkaWNhdGUgbWF0Y2hpbmcgdG8gY2F0Y2guICBFeGFtcGxlczpcblx0XHQgKiBwcm9taXNlLmNhdGNoKFR5cGVFcnJvciwgaGFuZGxlVHlwZUVycm9yKVxuXHRcdCAqICAgLmNhdGNoKHByZWRpY2F0ZSwgaGFuZGxlTWF0Y2hlZEVycm9ycylcblx0XHQgKiAgIC5jYXRjaChoYW5kbGVSZW1haW5pbmdFcnJvcnMpXG5cdFx0ICogQHBhcmFtIG9uUmVqZWN0ZWRcblx0XHQgKiBAcmV0dXJucyB7Kn1cblx0XHQgKi9cblx0XHRQcm9taXNlLnByb3RvdHlwZVsnY2F0Y2gnXSA9IFByb21pc2UucHJvdG90eXBlLm90aGVyd2lzZSA9IGZ1bmN0aW9uKG9uUmVqZWN0ZWQpIHtcblx0XHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRcdHJldHVybiBvcmlnQ2F0Y2guY2FsbCh0aGlzLCBvblJlamVjdGVkKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmKHR5cGVvZiBvblJlamVjdGVkICE9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuZW5zdXJlKHJlamVjdEludmFsaWRQcmVkaWNhdGUpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmV0dXJuIG9yaWdDYXRjaC5jYWxsKHRoaXMsIGNyZWF0ZUNhdGNoRmlsdGVyKGFyZ3VtZW50c1sxXSwgb25SZWplY3RlZCkpO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBXcmFwcyB0aGUgcHJvdmlkZWQgY2F0Y2ggaGFuZGxlciwgc28gdGhhdCBpdCB3aWxsIG9ubHkgYmUgY2FsbGVkXG5cdFx0ICogaWYgdGhlIHByZWRpY2F0ZSBldmFsdWF0ZXMgdHJ1dGh5XG5cdFx0ICogQHBhcmFtIHs/ZnVuY3Rpb259IGhhbmRsZXJcblx0XHQgKiBAcGFyYW0ge2Z1bmN0aW9ufSBwcmVkaWNhdGVcblx0XHQgKiBAcmV0dXJucyB7ZnVuY3Rpb259IGNvbmRpdGlvbmFsIGNhdGNoIGhhbmRsZXJcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBjcmVhdGVDYXRjaEZpbHRlcihoYW5kbGVyLCBwcmVkaWNhdGUpIHtcblx0XHRcdHJldHVybiBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdHJldHVybiBldmFsdWF0ZVByZWRpY2F0ZShlLCBwcmVkaWNhdGUpXG5cdFx0XHRcdFx0PyBoYW5kbGVyLmNhbGwodGhpcywgZSlcblx0XHRcdFx0XHQ6IHJlamVjdChlKTtcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogRW5zdXJlcyB0aGF0IG9uRnVsZmlsbGVkT3JSZWplY3RlZCB3aWxsIGJlIGNhbGxlZCByZWdhcmRsZXNzIG9mIHdoZXRoZXJcblx0XHQgKiB0aGlzIHByb21pc2UgaXMgZnVsZmlsbGVkIG9yIHJlamVjdGVkLiAgb25GdWxmaWxsZWRPclJlamVjdGVkIFdJTEwgTk9UXG5cdFx0ICogcmVjZWl2ZSB0aGUgcHJvbWlzZXMnIHZhbHVlIG9yIHJlYXNvbi4gIEFueSByZXR1cm5lZCB2YWx1ZSB3aWxsIGJlIGRpc3JlZ2FyZGVkLlxuXHRcdCAqIG9uRnVsZmlsbGVkT3JSZWplY3RlZCBtYXkgdGhyb3cgb3IgcmV0dXJuIGEgcmVqZWN0ZWQgcHJvbWlzZSB0byBzaWduYWxcblx0XHQgKiBhbiBhZGRpdGlvbmFsIGVycm9yLlxuXHRcdCAqIEBwYXJhbSB7ZnVuY3Rpb259IGhhbmRsZXIgaGFuZGxlciB0byBiZSBjYWxsZWQgcmVnYXJkbGVzcyBvZlxuXHRcdCAqICBmdWxmaWxsbWVudCBvciByZWplY3Rpb25cblx0XHQgKiBAcmV0dXJucyB7UHJvbWlzZX1cblx0XHQgKi9cblx0XHRQcm9taXNlLnByb3RvdHlwZVsnZmluYWxseSddID0gUHJvbWlzZS5wcm90b3R5cGUuZW5zdXJlID0gZnVuY3Rpb24oaGFuZGxlcikge1xuXHRcdFx0aWYodHlwZW9mIGhhbmRsZXIgIT09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0Ly8gT3B0aW1pemF0aW9uOiByZXN1bHQgd2lsbCBub3QgY2hhbmdlLCByZXR1cm4gc2FtZSBwcm9taXNlXG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fVxuXG5cdFx0XHRoYW5kbGVyID0gaXNvbGF0ZShoYW5kbGVyLCB0aGlzKTtcblx0XHRcdHJldHVybiB0aGlzLnRoZW4oaGFuZGxlciwgaGFuZGxlcik7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIFJlY292ZXIgZnJvbSBhIGZhaWx1cmUgYnkgcmV0dXJuaW5nIGEgZGVmYXVsdFZhbHVlLiAgSWYgZGVmYXVsdFZhbHVlXG5cdFx0ICogaXMgYSBwcm9taXNlLCBpdCdzIGZ1bGZpbGxtZW50IHZhbHVlIHdpbGwgYmUgdXNlZC4gIElmIGRlZmF1bHRWYWx1ZSBpc1xuXHRcdCAqIGEgcHJvbWlzZSB0aGF0IHJlamVjdHMsIHRoZSByZXR1cm5lZCBwcm9taXNlIHdpbGwgcmVqZWN0IHdpdGggdGhlXG5cdFx0ICogc2FtZSByZWFzb24uXG5cdFx0ICogQHBhcmFtIHsqfSBkZWZhdWx0VmFsdWVcblx0XHQgKiBAcmV0dXJucyB7UHJvbWlzZX0gbmV3IHByb21pc2Vcblx0XHQgKi9cblx0XHRQcm9taXNlLnByb3RvdHlwZVsnZWxzZSddID0gUHJvbWlzZS5wcm90b3R5cGUub3JFbHNlID0gZnVuY3Rpb24oZGVmYXVsdFZhbHVlKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy50aGVuKHZvaWQgMCwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBkZWZhdWx0VmFsdWU7XG5cdFx0XHR9KTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogU2hvcnRjdXQgZm9yIC50aGVuKGZ1bmN0aW9uKCkgeyByZXR1cm4gdmFsdWU7IH0pXG5cdFx0ICogQHBhcmFtICB7Kn0gdmFsdWVcblx0XHQgKiBAcmV0dXJuIHtQcm9taXNlfSBhIHByb21pc2UgdGhhdDpcblx0XHQgKiAgLSBpcyBmdWxmaWxsZWQgaWYgdmFsdWUgaXMgbm90IGEgcHJvbWlzZSwgb3Jcblx0XHQgKiAgLSBpZiB2YWx1ZSBpcyBhIHByb21pc2UsIHdpbGwgZnVsZmlsbCB3aXRoIGl0cyB2YWx1ZSwgb3IgcmVqZWN0XG5cdFx0ICogICAgd2l0aCBpdHMgcmVhc29uLlxuXHRcdCAqL1xuXHRcdFByb21pc2UucHJvdG90eXBlWyd5aWVsZCddID0gZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdHJldHVybiB0aGlzLnRoZW4oZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiB2YWx1ZTtcblx0XHRcdH0pO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBSdW5zIGEgc2lkZSBlZmZlY3Qgd2hlbiB0aGlzIHByb21pc2UgZnVsZmlsbHMsIHdpdGhvdXQgY2hhbmdpbmcgdGhlXG5cdFx0ICogZnVsZmlsbG1lbnQgdmFsdWUuXG5cdFx0ICogQHBhcmFtIHtmdW5jdGlvbn0gb25GdWxmaWxsZWRTaWRlRWZmZWN0XG5cdFx0ICogQHJldHVybnMge1Byb21pc2V9XG5cdFx0ICovXG5cdFx0UHJvbWlzZS5wcm90b3R5cGUudGFwID0gZnVuY3Rpb24ob25GdWxmaWxsZWRTaWRlRWZmZWN0KSB7XG5cdFx0XHRyZXR1cm4gdGhpcy50aGVuKG9uRnVsZmlsbGVkU2lkZUVmZmVjdClbJ3lpZWxkJ10odGhpcyk7XG5cdFx0fTtcblxuXHRcdHJldHVybiBQcm9taXNlO1xuXHR9O1xuXG5cdGZ1bmN0aW9uIHJlamVjdEludmFsaWRQcmVkaWNhdGUoKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignY2F0Y2ggcHJlZGljYXRlIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXHR9XG5cblx0ZnVuY3Rpb24gZXZhbHVhdGVQcmVkaWNhdGUoZSwgcHJlZGljYXRlKSB7XG5cdFx0cmV0dXJuIGlzRXJyb3IocHJlZGljYXRlKSA/IGUgaW5zdGFuY2VvZiBwcmVkaWNhdGUgOiBwcmVkaWNhdGUoZSk7XG5cdH1cblxuXHRmdW5jdGlvbiBpc0Vycm9yKHByZWRpY2F0ZSkge1xuXHRcdHJldHVybiBwcmVkaWNhdGUgPT09IEVycm9yXG5cdFx0XHR8fCAocHJlZGljYXRlICE9IG51bGwgJiYgcHJlZGljYXRlLnByb3RvdHlwZSBpbnN0YW5jZW9mIEVycm9yKTtcblx0fVxuXG5cdC8vIHByZXZlbnQgYXJndW1lbnQgcGFzc2luZyB0byBmIGFuZCBpZ25vcmUgcmV0dXJuIHZhbHVlXG5cdGZ1bmN0aW9uIGlzb2xhdGUoZiwgeCkge1xuXHRcdHJldHVybiBmdW5jdGlvbigpIHtcblx0XHRcdGYuY2FsbCh0aGlzKTtcblx0XHRcdHJldHVybiB4O1xuXHRcdH07XG5cdH1cblxuXHRmdW5jdGlvbiBub29wKCkge31cblxufSk7XG59KHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZSA6IGZ1bmN0aW9uKGZhY3RvcnkpIHsgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7IH0pKTtcbiIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuLyoqIEBhdXRob3IgSmVmZiBFc2NhbGFudGUgKi9cblxuKGZ1bmN0aW9uKGRlZmluZSkgeyAndXNlIHN0cmljdCc7XG5kZWZpbmUoZnVuY3Rpb24oKSB7XG5cblx0cmV0dXJuIGZ1bmN0aW9uIGZvbGQoUHJvbWlzZSkge1xuXG5cdFx0UHJvbWlzZS5wcm90b3R5cGUuZm9sZCA9IGZ1bmN0aW9uKGZuLCBhcmcpIHtcblx0XHRcdHZhciBwcm9taXNlID0gdGhpcy5fYmVnZXQoKTtcblx0XHRcdHRoaXMuX2hhbmRsZXIuZm9sZChwcm9taXNlLl9oYW5kbGVyLCBmbiwgYXJnKTtcblx0XHRcdHJldHVybiBwcm9taXNlO1xuXHRcdH07XG5cblx0XHRyZXR1cm4gUHJvbWlzZTtcblx0fTtcblxufSk7XG59KHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZSA6IGZ1bmN0aW9uKGZhY3RvcnkpIHsgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7IH0pKTtcbiIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG4oZnVuY3Rpb24oZGVmaW5lKSB7ICd1c2Ugc3RyaWN0JztcbmRlZmluZShmdW5jdGlvbigpIHtcblxuXHRyZXR1cm4gZnVuY3Rpb24gaW5zcGVjdChQcm9taXNlKSB7XG5cblx0XHRQcm9taXNlLnByb3RvdHlwZS5pbnNwZWN0ID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5faGFuZGxlci5pbnNwZWN0KCk7XG5cdFx0fTtcblxuXHRcdHJldHVybiBQcm9taXNlO1xuXHR9O1xuXG59KTtcbn0odHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lIDogZnVuY3Rpb24oZmFjdG9yeSkgeyBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTsgfSkpO1xuIiwiLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE0IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbihmdW5jdGlvbihkZWZpbmUpIHsgJ3VzZSBzdHJpY3QnO1xuZGVmaW5lKGZ1bmN0aW9uKCkge1xuXG5cdHJldHVybiBmdW5jdGlvbiBnZW5lcmF0ZShQcm9taXNlKSB7XG5cblx0XHR2YXIgcmVzb2x2ZSA9IFByb21pc2UucmVzb2x2ZTtcblxuXHRcdFByb21pc2UuaXRlcmF0ZSA9IGl0ZXJhdGU7XG5cdFx0UHJvbWlzZS51bmZvbGQgPSB1bmZvbGQ7XG5cblx0XHRyZXR1cm4gUHJvbWlzZTtcblxuXHRcdC8qKlxuXHRcdCAqIEdlbmVyYXRlIGEgKHBvdGVudGlhbGx5IGluZmluaXRlKSBzdHJlYW0gb2YgcHJvbWlzZWQgdmFsdWVzOlxuXHRcdCAqIHgsIGYoeCksIGYoZih4KSksIGV0Yy4gdW50aWwgY29uZGl0aW9uKHgpIHJldHVybnMgdHJ1ZVxuXHRcdCAqIEBwYXJhbSB7ZnVuY3Rpb259IGYgZnVuY3Rpb24gdG8gZ2VuZXJhdGUgYSBuZXcgeCBmcm9tIHRoZSBwcmV2aW91cyB4XG5cdFx0ICogQHBhcmFtIHtmdW5jdGlvbn0gY29uZGl0aW9uIGZ1bmN0aW9uIHRoYXQsIGdpdmVuIHRoZSBjdXJyZW50IHgsIHJldHVybnNcblx0XHQgKiAgdHJ1dGh5IHdoZW4gdGhlIGl0ZXJhdGUgc2hvdWxkIHN0b3Bcblx0XHQgKiBAcGFyYW0ge2Z1bmN0aW9ufSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgdmFsdWUgcHJvZHVjZWQgYnkgZlxuXHRcdCAqIEBwYXJhbSB7KnxQcm9taXNlfSB4IHN0YXJ0aW5nIHZhbHVlLCBtYXkgYmUgYSBwcm9taXNlXG5cdFx0ICogQHJldHVybiB7UHJvbWlzZX0gdGhlIHJlc3VsdCBvZiB0aGUgbGFzdCBjYWxsIHRvIGYgYmVmb3JlXG5cdFx0ICogIGNvbmRpdGlvbiByZXR1cm5zIHRydWVcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBpdGVyYXRlKGYsIGNvbmRpdGlvbiwgaGFuZGxlciwgeCkge1xuXHRcdFx0cmV0dXJuIHVuZm9sZChmdW5jdGlvbih4KSB7XG5cdFx0XHRcdHJldHVybiBbeCwgZih4KV07XG5cdFx0XHR9LCBjb25kaXRpb24sIGhhbmRsZXIsIHgpO1xuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIEdlbmVyYXRlIGEgKHBvdGVudGlhbGx5IGluZmluaXRlKSBzdHJlYW0gb2YgcHJvbWlzZWQgdmFsdWVzXG5cdFx0ICogYnkgYXBwbHlpbmcgaGFuZGxlcihnZW5lcmF0b3Ioc2VlZCkpIGl0ZXJhdGl2ZWx5IHVudGlsXG5cdFx0ICogY29uZGl0aW9uKHNlZWQpIHJldHVybnMgdHJ1ZS5cblx0XHQgKiBAcGFyYW0ge2Z1bmN0aW9ufSB1bnNwb29sIGZ1bmN0aW9uIHRoYXQgZ2VuZXJhdGVzIGEgW3ZhbHVlLCBuZXdTZWVkXVxuXHRcdCAqICBnaXZlbiBhIHNlZWQuXG5cdFx0ICogQHBhcmFtIHtmdW5jdGlvbn0gY29uZGl0aW9uIGZ1bmN0aW9uIHRoYXQsIGdpdmVuIHRoZSBjdXJyZW50IHNlZWQsIHJldHVybnNcblx0XHQgKiAgdHJ1dGh5IHdoZW4gdGhlIHVuZm9sZCBzaG91bGQgc3RvcFxuXHRcdCAqIEBwYXJhbSB7ZnVuY3Rpb259IGhhbmRsZXIgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSB2YWx1ZSBwcm9kdWNlZCBieSB1bnNwb29sXG5cdFx0ICogQHBhcmFtIHggeyp8UHJvbWlzZX0gc3RhcnRpbmcgdmFsdWUsIG1heSBiZSBhIHByb21pc2Vcblx0XHQgKiBAcmV0dXJuIHtQcm9taXNlfSB0aGUgcmVzdWx0IG9mIHRoZSBsYXN0IHZhbHVlIHByb2R1Y2VkIGJ5IHVuc3Bvb2wgYmVmb3JlXG5cdFx0ICogIGNvbmRpdGlvbiByZXR1cm5zIHRydWVcblx0XHQgKi9cblx0XHRmdW5jdGlvbiB1bmZvbGQodW5zcG9vbCwgY29uZGl0aW9uLCBoYW5kbGVyLCB4KSB7XG5cdFx0XHRyZXR1cm4gcmVzb2x2ZSh4KS50aGVuKGZ1bmN0aW9uKHNlZWQpIHtcblx0XHRcdFx0cmV0dXJuIHJlc29sdmUoY29uZGl0aW9uKHNlZWQpKS50aGVuKGZ1bmN0aW9uKGRvbmUpIHtcblx0XHRcdFx0XHRyZXR1cm4gZG9uZSA/IHNlZWQgOiByZXNvbHZlKHVuc3Bvb2woc2VlZCkpLnNwcmVhZChuZXh0KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblxuXHRcdFx0ZnVuY3Rpb24gbmV4dChpdGVtLCBuZXdTZWVkKSB7XG5cdFx0XHRcdHJldHVybiByZXNvbHZlKGhhbmRsZXIoaXRlbSkpLnRoZW4oZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHVuZm9sZCh1bnNwb29sLCBjb25kaXRpb24sIGhhbmRsZXIsIG5ld1NlZWQpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cbn0pO1xufSh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUgOiBmdW5jdGlvbihmYWN0b3J5KSB7IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpOyB9KSk7XG4iLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuKGZ1bmN0aW9uKGRlZmluZSkgeyAndXNlIHN0cmljdCc7XG5kZWZpbmUoZnVuY3Rpb24oKSB7XG5cblx0cmV0dXJuIGZ1bmN0aW9uIHByb2dyZXNzKFByb21pc2UpIHtcblxuXHRcdC8qKlxuXHRcdCAqIFJlZ2lzdGVyIGEgcHJvZ3Jlc3MgaGFuZGxlciBmb3IgdGhpcyBwcm9taXNlXG5cdFx0ICogQHBhcmFtIHtmdW5jdGlvbn0gb25Qcm9ncmVzc1xuXHRcdCAqIEByZXR1cm5zIHtQcm9taXNlfVxuXHRcdCAqL1xuXHRcdFByb21pc2UucHJvdG90eXBlLnByb2dyZXNzID0gZnVuY3Rpb24ob25Qcm9ncmVzcykge1xuXHRcdFx0cmV0dXJuIHRoaXMudGhlbih2b2lkIDAsIHZvaWQgMCwgb25Qcm9ncmVzcyk7XG5cdFx0fTtcblxuXHRcdHJldHVybiBQcm9taXNlO1xuXHR9O1xuXG59KTtcbn0odHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lIDogZnVuY3Rpb24oZmFjdG9yeSkgeyBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTsgfSkpO1xuIiwiLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE0IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbihmdW5jdGlvbihkZWZpbmUpIHsgJ3VzZSBzdHJpY3QnO1xuZGVmaW5lKGZ1bmN0aW9uKHJlcXVpcmUpIHtcblxuXHR2YXIgdGltZXIgPSByZXF1aXJlKCcuLi90aW1lcicpO1xuXHR2YXIgVGltZW91dEVycm9yID0gcmVxdWlyZSgnLi4vVGltZW91dEVycm9yJyk7XG5cblx0cmV0dXJuIGZ1bmN0aW9uIHRpbWVkKFByb21pc2UpIHtcblx0XHQvKipcblx0XHQgKiBSZXR1cm4gYSBuZXcgcHJvbWlzZSB3aG9zZSBmdWxmaWxsbWVudCB2YWx1ZSBpcyByZXZlYWxlZCBvbmx5XG5cdFx0ICogYWZ0ZXIgbXMgbWlsbGlzZWNvbmRzXG5cdFx0ICogQHBhcmFtIHtudW1iZXJ9IG1zIG1pbGxpc2Vjb25kc1xuXHRcdCAqIEByZXR1cm5zIHtQcm9taXNlfVxuXHRcdCAqL1xuXHRcdFByb21pc2UucHJvdG90eXBlLmRlbGF5ID0gZnVuY3Rpb24obXMpIHtcblx0XHRcdHZhciBwID0gdGhpcy5fYmVnZXQoKTtcblx0XHRcdHZhciBoID0gcC5faGFuZGxlcjtcblxuXHRcdFx0dGhpcy5faGFuZGxlci5tYXAoZnVuY3Rpb24gZGVsYXkoeCkge1xuXHRcdFx0XHR0aW1lci5zZXQoZnVuY3Rpb24oKSB7IGgucmVzb2x2ZSh4KTsgfSwgbXMpO1xuXHRcdFx0fSwgaCk7XG5cblx0XHRcdHJldHVybiBwO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBSZXR1cm4gYSBuZXcgcHJvbWlzZSB0aGF0IHJlamVjdHMgYWZ0ZXIgbXMgbWlsbGlzZWNvbmRzIHVubGVzc1xuXHRcdCAqIHRoaXMgcHJvbWlzZSBmdWxmaWxscyBlYXJsaWVyLCBpbiB3aGljaCBjYXNlIHRoZSByZXR1cm5lZCBwcm9taXNlXG5cdFx0ICogZnVsZmlsbHMgd2l0aCB0aGUgc2FtZSB2YWx1ZS5cblx0XHQgKiBAcGFyYW0ge251bWJlcn0gbXMgbWlsbGlzZWNvbmRzXG5cdFx0ICogQHBhcmFtIHtFcnJvcnwqPX0gcmVhc29uIG9wdGlvbmFsIHJlamVjdGlvbiByZWFzb24gdG8gdXNlLCBkZWZhdWx0c1xuXHRcdCAqICAgdG8gYW4gRXJyb3IgaWYgbm90IHByb3ZpZGVkXG5cdFx0ICogQHJldHVybnMge1Byb21pc2V9XG5cdFx0ICovXG5cdFx0UHJvbWlzZS5wcm90b3R5cGUudGltZW91dCA9IGZ1bmN0aW9uKG1zLCByZWFzb24pIHtcblx0XHRcdHZhciBoYXNSZWFzb24gPSBhcmd1bWVudHMubGVuZ3RoID4gMTtcblx0XHRcdHZhciBwID0gdGhpcy5fYmVnZXQoKTtcblx0XHRcdHZhciBoID0gcC5faGFuZGxlcjtcblxuXHRcdFx0dmFyIHQgPSB0aW1lci5zZXQob25UaW1lb3V0LCBtcyk7XG5cblx0XHRcdHRoaXMuX2hhbmRsZXIuY2hhaW4oaCxcblx0XHRcdFx0ZnVuY3Rpb24gb25GdWxmaWxsKHgpIHtcblx0XHRcdFx0XHR0aW1lci5jbGVhcih0KTtcblx0XHRcdFx0XHR0aGlzLnJlc29sdmUoeCk7IC8vIHRoaXMgPSBwLl9oYW5kbGVyXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGZ1bmN0aW9uIG9uUmVqZWN0KHgpIHtcblx0XHRcdFx0XHR0aW1lci5jbGVhcih0KTtcblx0XHRcdFx0XHR0aGlzLnJlamVjdCh4KTsgLy8gdGhpcyA9IHAuX2hhbmRsZXJcblx0XHRcdFx0fSxcblx0XHRcdFx0aC5ub3RpZnkpO1xuXG5cdFx0XHRyZXR1cm4gcDtcblxuXHRcdFx0ZnVuY3Rpb24gb25UaW1lb3V0KCkge1xuXHRcdFx0XHRoLnJlamVjdChoYXNSZWFzb25cblx0XHRcdFx0XHQ/IHJlYXNvbiA6IG5ldyBUaW1lb3V0RXJyb3IoJ3RpbWVkIG91dCBhZnRlciAnICsgbXMgKyAnbXMnKSk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdHJldHVybiBQcm9taXNlO1xuXHR9O1xuXG59KTtcbn0odHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lIDogZnVuY3Rpb24oZmFjdG9yeSkgeyBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSk7IH0pKTtcbiIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG4oZnVuY3Rpb24oZGVmaW5lKSB7ICd1c2Ugc3RyaWN0JztcbmRlZmluZShmdW5jdGlvbihyZXF1aXJlKSB7XG5cblx0dmFyIHRpbWVyID0gcmVxdWlyZSgnLi4vdGltZXInKTtcblxuXHRyZXR1cm4gZnVuY3Rpb24gdW5oYW5kbGVkUmVqZWN0aW9uKFByb21pc2UpIHtcblx0XHR2YXIgbG9nRXJyb3IgPSBub29wO1xuXHRcdHZhciBsb2dJbmZvID0gbm9vcDtcblxuXHRcdGlmKHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0bG9nRXJyb3IgPSB0eXBlb2YgY29uc29sZS5lcnJvciAhPT0gJ3VuZGVmaW5lZCdcblx0XHRcdFx0PyBmdW5jdGlvbiAoZSkgeyBjb25zb2xlLmVycm9yKGUpOyB9XG5cdFx0XHRcdDogZnVuY3Rpb24gKGUpIHsgY29uc29sZS5sb2coZSk7IH07XG5cblx0XHRcdGxvZ0luZm8gPSB0eXBlb2YgY29uc29sZS5pbmZvICE9PSAndW5kZWZpbmVkJ1xuXHRcdFx0XHQ/IGZ1bmN0aW9uIChlKSB7IGNvbnNvbGUuaW5mbyhlKTsgfVxuXHRcdFx0XHQ6IGZ1bmN0aW9uIChlKSB7IGNvbnNvbGUubG9nKGUpOyB9O1xuXHRcdH1cblxuXHRcdFByb21pc2Uub25Qb3RlbnRpYWxseVVuaGFuZGxlZFJlamVjdGlvbiA9IGZ1bmN0aW9uKHJlamVjdGlvbikge1xuXHRcdFx0ZW5xdWV1ZShyZXBvcnQsIHJlamVjdGlvbik7XG5cdFx0fTtcblxuXHRcdFByb21pc2Uub25Qb3RlbnRpYWxseVVuaGFuZGxlZFJlamVjdGlvbkhhbmRsZWQgPSBmdW5jdGlvbihyZWplY3Rpb24pIHtcblx0XHRcdGVucXVldWUodW5yZXBvcnQsIHJlamVjdGlvbik7XG5cdFx0fTtcblxuXHRcdFByb21pc2Uub25GYXRhbFJlamVjdGlvbiA9IGZ1bmN0aW9uKHJlamVjdGlvbikge1xuXHRcdFx0ZW5xdWV1ZSh0aHJvd2l0LCByZWplY3Rpb24udmFsdWUpO1xuXHRcdH07XG5cblx0XHR2YXIgdGFza3MgPSBbXTtcblx0XHR2YXIgcmVwb3J0ZWQgPSBbXTtcblx0XHR2YXIgcnVubmluZyA9IGZhbHNlO1xuXG5cdFx0ZnVuY3Rpb24gcmVwb3J0KHIpIHtcblx0XHRcdGlmKCFyLmhhbmRsZWQpIHtcblx0XHRcdFx0cmVwb3J0ZWQucHVzaChyKTtcblx0XHRcdFx0bG9nRXJyb3IoJ1BvdGVudGlhbGx5IHVuaGFuZGxlZCByZWplY3Rpb24gWycgKyByLmlkICsgJ10gJyArIGZvcm1hdEVycm9yKHIudmFsdWUpKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRmdW5jdGlvbiB1bnJlcG9ydChyKSB7XG5cdFx0XHR2YXIgaSA9IHJlcG9ydGVkLmluZGV4T2Yocik7XG5cdFx0XHRpZihpID49IDApIHtcblx0XHRcdFx0cmVwb3J0ZWQuc3BsaWNlKGksIDEpO1xuXHRcdFx0XHRsb2dJbmZvKCdIYW5kbGVkIHByZXZpb3VzIHJlamVjdGlvbiBbJyArIHIuaWQgKyAnXSAnICsgZm9ybWF0T2JqZWN0KHIudmFsdWUpKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBlbnF1ZXVlKGYsIHgpIHtcblx0XHRcdHRhc2tzLnB1c2goZiwgeCk7XG5cdFx0XHRpZighcnVubmluZykge1xuXHRcdFx0XHRydW5uaW5nID0gdHJ1ZTtcblx0XHRcdFx0cnVubmluZyA9IHRpbWVyLnNldChmbHVzaCwgMCk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZmx1c2goKSB7XG5cdFx0XHRydW5uaW5nID0gZmFsc2U7XG5cdFx0XHR3aGlsZSh0YXNrcy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdHRhc2tzLnNoaWZ0KCkodGFza3Muc2hpZnQoKSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFByb21pc2U7XG5cdH07XG5cblx0ZnVuY3Rpb24gZm9ybWF0RXJyb3IoZSkge1xuXHRcdHZhciBzID0gdHlwZW9mIGUgPT09ICdvYmplY3QnICYmIGUuc3RhY2sgPyBlLnN0YWNrIDogZm9ybWF0T2JqZWN0KGUpO1xuXHRcdHJldHVybiBlIGluc3RhbmNlb2YgRXJyb3IgPyBzIDogcyArICcgKFdBUk5JTkc6IG5vbi1FcnJvciB1c2VkKSc7XG5cdH1cblxuXHRmdW5jdGlvbiBmb3JtYXRPYmplY3Qobykge1xuXHRcdHZhciBzID0gU3RyaW5nKG8pO1xuXHRcdGlmKHMgPT09ICdbb2JqZWN0IE9iamVjdF0nICYmIHR5cGVvZiBKU09OICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0cyA9IHRyeVN0cmluZ2lmeShvLCBzKTtcblx0XHR9XG5cdFx0cmV0dXJuIHM7XG5cdH1cblxuXHRmdW5jdGlvbiB0cnlTdHJpbmdpZnkoZSwgZGVmYXVsdFZhbHVlKSB7XG5cdFx0dHJ5IHtcblx0XHRcdHJldHVybiBKU09OLnN0cmluZ2lmeShlKTtcblx0XHR9IGNhdGNoKGUpIHtcblx0XHRcdC8vIElnbm9yZS4gQ2Fubm90IEpTT04uc3RyaW5naWZ5IGUsIHN0aWNrIHdpdGggU3RyaW5nKGUpXG5cdFx0XHRyZXR1cm4gZGVmYXVsdFZhbHVlO1xuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIHRocm93aXQoZSkge1xuXHRcdHRocm93IGU7XG5cdH1cblxuXHRmdW5jdGlvbiBub29wKCkge31cblxufSk7XG59KHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZSA6IGZ1bmN0aW9uKGZhY3RvcnkpIHsgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUpOyB9KSk7XG4iLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuKGZ1bmN0aW9uKGRlZmluZSkgeyAndXNlIHN0cmljdCc7XG5kZWZpbmUoZnVuY3Rpb24oKSB7XG5cblx0cmV0dXJuIGZ1bmN0aW9uIGFkZFdpdGgoUHJvbWlzZSkge1xuXHRcdC8qKlxuXHRcdCAqIFJldHVybnMgYSBwcm9taXNlIHdob3NlIGhhbmRsZXJzIHdpbGwgYmUgY2FsbGVkIHdpdGggYHRoaXNgIHNldCB0b1xuXHRcdCAqIHRoZSBzdXBwbGllZCBgdGhpc0FyZ2AuICBTdWJzZXF1ZW50IHByb21pc2VzIGRlcml2ZWQgZnJvbSB0aGVcblx0XHQgKiByZXR1cm5lZCBwcm9taXNlIHdpbGwgYWxzbyBoYXZlIHRoZWlyIGhhbmRsZXJzIGNhbGxlZCB3aXRoIGB0aGlzQXJnYC5cblx0XHQgKiBDYWxsaW5nIGB3aXRoYCB3aXRoIHVuZGVmaW5lZCBvciBubyBhcmd1bWVudHMgd2lsbCByZXR1cm4gYSBwcm9taXNlXG5cdFx0ICogd2hvc2UgaGFuZGxlcnMgd2lsbCBhZ2FpbiBiZSBjYWxsZWQgaW4gdGhlIHVzdWFsIFByb21pc2VzL0ErIHdheSAobm8gYHRoaXNgKVxuXHRcdCAqIHRodXMgc2FmZWx5IHVuZG9pbmcgYW55IHByZXZpb3VzIGB3aXRoYCBpbiB0aGUgcHJvbWlzZSBjaGFpbi5cblx0XHQgKlxuXHRcdCAqIFdBUk5JTkc6IFByb21pc2VzIHJldHVybmVkIGZyb20gYHdpdGhgL2B3aXRoVGhpc2AgYXJlIE5PVCBQcm9taXNlcy9BK1xuXHRcdCAqIGNvbXBsaWFudCwgc3BlY2lmaWNhbGx5IHZpb2xhdGluZyAyLjIuNSAoaHR0cDovL3Byb21pc2VzYXBsdXMuY29tLyNwb2ludC00MSlcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSB7b2JqZWN0fSB0aGlzQXJnIGB0aGlzYCB2YWx1ZSBmb3IgYWxsIGhhbmRsZXJzIGF0dGFjaGVkIHRvXG5cdFx0ICogIHRoZSByZXR1cm5lZCBwcm9taXNlLlxuXHRcdCAqIEByZXR1cm5zIHtQcm9taXNlfVxuXHRcdCAqL1xuXHRcdFByb21pc2UucHJvdG90eXBlWyd3aXRoJ10gPSBQcm9taXNlLnByb3RvdHlwZS53aXRoVGhpc1xuXHRcdFx0PSBQcm9taXNlLnByb3RvdHlwZS5fYmluZENvbnRleHQ7XG5cblx0XHRyZXR1cm4gUHJvbWlzZTtcblx0fTtcblxufSk7XG59KHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZSA6IGZ1bmN0aW9uKGZhY3RvcnkpIHsgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7IH0pKTtcblxuIiwiLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE0IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbihmdW5jdGlvbihkZWZpbmUpIHsgJ3VzZSBzdHJpY3QnO1xuZGVmaW5lKGZ1bmN0aW9uKCkge1xuXG5cdHJldHVybiBmdW5jdGlvbiBtYWtlUHJvbWlzZShlbnZpcm9ubWVudCkge1xuXG5cdFx0dmFyIHRhc2tzID0gZW52aXJvbm1lbnQuc2NoZWR1bGVyO1xuXG5cdFx0dmFyIG9iamVjdENyZWF0ZSA9IE9iamVjdC5jcmVhdGUgfHxcblx0XHRcdGZ1bmN0aW9uKHByb3RvKSB7XG5cdFx0XHRcdGZ1bmN0aW9uIENoaWxkKCkge31cblx0XHRcdFx0Q2hpbGQucHJvdG90eXBlID0gcHJvdG87XG5cdFx0XHRcdHJldHVybiBuZXcgQ2hpbGQoKTtcblx0XHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBDcmVhdGUgYSBwcm9taXNlIHdob3NlIGZhdGUgaXMgZGV0ZXJtaW5lZCBieSByZXNvbHZlclxuXHRcdCAqIEBjb25zdHJ1Y3RvclxuXHRcdCAqIEByZXR1cm5zIHtQcm9taXNlfSBwcm9taXNlXG5cdFx0ICogQG5hbWUgUHJvbWlzZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIFByb21pc2UocmVzb2x2ZXIsIGhhbmRsZXIpIHtcblx0XHRcdHRoaXMuX2hhbmRsZXIgPSByZXNvbHZlciA9PT0gSGFuZGxlciA/IGhhbmRsZXIgOiBpbml0KHJlc29sdmVyKTtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBSdW4gdGhlIHN1cHBsaWVkIHJlc29sdmVyXG5cdFx0ICogQHBhcmFtIHJlc29sdmVyXG5cdFx0ICogQHJldHVybnMge21ha2VQcm9taXNlLkRlZmVycmVkSGFuZGxlcn1cblx0XHQgKi9cblx0XHRmdW5jdGlvbiBpbml0KHJlc29sdmVyKSB7XG5cdFx0XHR2YXIgaGFuZGxlciA9IG5ldyBEZWZlcnJlZEhhbmRsZXIoKTtcblxuXHRcdFx0dHJ5IHtcblx0XHRcdFx0cmVzb2x2ZXIocHJvbWlzZVJlc29sdmUsIHByb21pc2VSZWplY3QsIHByb21pc2VOb3RpZnkpO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRwcm9taXNlUmVqZWN0KGUpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gaGFuZGxlcjtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBUcmFuc2l0aW9uIGZyb20gcHJlLXJlc29sdXRpb24gc3RhdGUgdG8gcG9zdC1yZXNvbHV0aW9uIHN0YXRlLCBub3RpZnlpbmdcblx0XHRcdCAqIGFsbCBsaXN0ZW5lcnMgb2YgdGhlIHVsdGltYXRlIGZ1bGZpbGxtZW50IG9yIHJlamVjdGlvblxuXHRcdFx0ICogQHBhcmFtIHsqfSB4IHJlc29sdXRpb24gdmFsdWVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gcHJvbWlzZVJlc29sdmUgKHgpIHtcblx0XHRcdFx0aGFuZGxlci5yZXNvbHZlKHgpO1xuXHRcdFx0fVxuXHRcdFx0LyoqXG5cdFx0XHQgKiBSZWplY3QgdGhpcyBwcm9taXNlIHdpdGggcmVhc29uLCB3aGljaCB3aWxsIGJlIHVzZWQgdmVyYmF0aW1cblx0XHRcdCAqIEBwYXJhbSB7RXJyb3J8Kn0gcmVhc29uIHJlamVjdGlvbiByZWFzb24sIHN0cm9uZ2x5IHN1Z2dlc3RlZFxuXHRcdFx0ICogICB0byBiZSBhbiBFcnJvciB0eXBlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIHByb21pc2VSZWplY3QgKHJlYXNvbikge1xuXHRcdFx0XHRoYW5kbGVyLnJlamVjdChyZWFzb24pO1xuXHRcdFx0fVxuXG5cdFx0XHQvKipcblx0XHRcdCAqIElzc3VlIGEgcHJvZ3Jlc3MgZXZlbnQsIG5vdGlmeWluZyBhbGwgcHJvZ3Jlc3MgbGlzdGVuZXJzXG5cdFx0XHQgKiBAcGFyYW0geyp9IHggcHJvZ3Jlc3MgZXZlbnQgcGF5bG9hZCB0byBwYXNzIHRvIGFsbCBsaXN0ZW5lcnNcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gcHJvbWlzZU5vdGlmeSAoeCkge1xuXHRcdFx0XHRoYW5kbGVyLm5vdGlmeSh4KTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBDcmVhdGlvblxuXG5cdFx0UHJvbWlzZS5yZXNvbHZlID0gcmVzb2x2ZTtcblx0XHRQcm9taXNlLnJlamVjdCA9IHJlamVjdDtcblx0XHRQcm9taXNlLm5ldmVyID0gbmV2ZXI7XG5cblx0XHRQcm9taXNlLl9kZWZlciA9IGRlZmVyO1xuXG5cdFx0LyoqXG5cdFx0ICogUmV0dXJucyBhIHRydXN0ZWQgcHJvbWlzZS4gSWYgeCBpcyBhbHJlYWR5IGEgdHJ1c3RlZCBwcm9taXNlLCBpdCBpc1xuXHRcdCAqIHJldHVybmVkLCBvdGhlcndpc2UgcmV0dXJucyBhIG5ldyB0cnVzdGVkIFByb21pc2Ugd2hpY2ggZm9sbG93cyB4LlxuXHRcdCAqIEBwYXJhbSAgeyp9IHhcblx0XHQgKiBAcmV0dXJuIHtQcm9taXNlfSBwcm9taXNlXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gcmVzb2x2ZSh4KSB7XG5cdFx0XHRyZXR1cm4gaXNQcm9taXNlKHgpID8geFxuXHRcdFx0XHQ6IG5ldyBQcm9taXNlKEhhbmRsZXIsIG5ldyBBc3luY0hhbmRsZXIoZ2V0SGFuZGxlcih4KSkpO1xuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIFJldHVybiBhIHJlamVjdCBwcm9taXNlIHdpdGggeCBhcyBpdHMgcmVhc29uICh4IGlzIHVzZWQgdmVyYmF0aW0pXG5cdFx0ICogQHBhcmFtIHsqfSB4XG5cdFx0ICogQHJldHVybnMge1Byb21pc2V9IHJlamVjdGVkIHByb21pc2Vcblx0XHQgKi9cblx0XHRmdW5jdGlvbiByZWplY3QoeCkge1xuXHRcdFx0cmV0dXJuIG5ldyBQcm9taXNlKEhhbmRsZXIsIG5ldyBBc3luY0hhbmRsZXIobmV3IFJlamVjdGVkSGFuZGxlcih4KSkpO1xuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIFJldHVybiBhIHByb21pc2UgdGhhdCByZW1haW5zIHBlbmRpbmcgZm9yZXZlclxuXHRcdCAqIEByZXR1cm5zIHtQcm9taXNlfSBmb3JldmVyLXBlbmRpbmcgcHJvbWlzZS5cblx0XHQgKi9cblx0XHRmdW5jdGlvbiBuZXZlcigpIHtcblx0XHRcdHJldHVybiBmb3JldmVyUGVuZGluZ1Byb21pc2U7IC8vIFNob3VsZCBiZSBmcm96ZW5cblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBDcmVhdGVzIGFuIGludGVybmFsIHtwcm9taXNlLCByZXNvbHZlcn0gcGFpclxuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICogQHJldHVybnMge1Byb21pc2V9XG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gZGVmZXIoKSB7XG5cdFx0XHRyZXR1cm4gbmV3IFByb21pc2UoSGFuZGxlciwgbmV3IERlZmVycmVkSGFuZGxlcigpKTtcblx0XHR9XG5cblx0XHQvLyBUcmFuc2Zvcm1hdGlvbiBhbmQgZmxvdyBjb250cm9sXG5cblx0XHQvKipcblx0XHQgKiBUcmFuc2Zvcm0gdGhpcyBwcm9taXNlJ3MgZnVsZmlsbG1lbnQgdmFsdWUsIHJldHVybmluZyBhIG5ldyBQcm9taXNlXG5cdFx0ICogZm9yIHRoZSB0cmFuc2Zvcm1lZCByZXN1bHQuICBJZiB0aGUgcHJvbWlzZSBjYW5ub3QgYmUgZnVsZmlsbGVkLCBvblJlamVjdGVkXG5cdFx0ICogaXMgY2FsbGVkIHdpdGggdGhlIHJlYXNvbi4gIG9uUHJvZ3Jlc3MgKm1heSogYmUgY2FsbGVkIHdpdGggdXBkYXRlcyB0b3dhcmRcblx0XHQgKiB0aGlzIHByb21pc2UncyBmdWxmaWxsbWVudC5cblx0XHQgKiBAcGFyYW0ge2Z1bmN0aW9uPX0gb25GdWxmaWxsZWQgZnVsZmlsbG1lbnQgaGFuZGxlclxuXHRcdCAqIEBwYXJhbSB7ZnVuY3Rpb249fSBvblJlamVjdGVkIHJlamVjdGlvbiBoYW5kbGVyXG5cdFx0ICogQGRlcHJlY2F0ZWQgQHBhcmFtIHtmdW5jdGlvbj19IG9uUHJvZ3Jlc3MgcHJvZ3Jlc3MgaGFuZGxlclxuXHRcdCAqIEByZXR1cm4ge1Byb21pc2V9IG5ldyBwcm9taXNlXG5cdFx0ICovXG5cdFx0UHJvbWlzZS5wcm90b3R5cGUudGhlbiA9IGZ1bmN0aW9uKG9uRnVsZmlsbGVkLCBvblJlamVjdGVkKSB7XG5cdFx0XHR2YXIgcGFyZW50ID0gdGhpcy5faGFuZGxlcjtcblxuXHRcdFx0aWYgKHR5cGVvZiBvbkZ1bGZpbGxlZCAhPT0gJ2Z1bmN0aW9uJyAmJiBwYXJlbnQuam9pbigpLnN0YXRlKCkgPiAwKSB7XG5cdFx0XHRcdC8vIFNob3J0IGNpcmN1aXQ6IHZhbHVlIHdpbGwgbm90IGNoYW5nZSwgc2ltcGx5IHNoYXJlIGhhbmRsZXJcblx0XHRcdFx0cmV0dXJuIG5ldyBQcm9taXNlKEhhbmRsZXIsIHBhcmVudCk7XG5cdFx0XHR9XG5cblx0XHRcdHZhciBwID0gdGhpcy5fYmVnZXQoKTtcblx0XHRcdHZhciBjaGlsZCA9IHAuX2hhbmRsZXI7XG5cblx0XHRcdHBhcmVudC53aGVuKHtcblx0XHRcdFx0cmVzb2x2ZTogY2hpbGQucmVzb2x2ZSxcblx0XHRcdFx0bm90aWZ5OiBjaGlsZC5ub3RpZnksXG5cdFx0XHRcdGNvbnRleHQ6IGNoaWxkLFxuXHRcdFx0XHRyZWNlaXZlcjogcGFyZW50LnJlY2VpdmVyLFxuXHRcdFx0XHRmdWxmaWxsZWQ6IG9uRnVsZmlsbGVkLFxuXHRcdFx0XHRyZWplY3RlZDogb25SZWplY3RlZCxcblx0XHRcdFx0cHJvZ3Jlc3M6IGFyZ3VtZW50cy5sZW5ndGggPiAyID8gYXJndW1lbnRzWzJdIDogdm9pZCAwXG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIHA7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIElmIHRoaXMgcHJvbWlzZSBjYW5ub3QgYmUgZnVsZmlsbGVkIGR1ZSB0byBhbiBlcnJvciwgY2FsbCBvblJlamVjdGVkIHRvXG5cdFx0ICogaGFuZGxlIHRoZSBlcnJvci4gU2hvcnRjdXQgZm9yIC50aGVuKHVuZGVmaW5lZCwgb25SZWplY3RlZClcblx0XHQgKiBAcGFyYW0ge2Z1bmN0aW9uP30gb25SZWplY3RlZFxuXHRcdCAqIEByZXR1cm4ge1Byb21pc2V9XG5cdFx0ICovXG5cdFx0UHJvbWlzZS5wcm90b3R5cGVbJ2NhdGNoJ10gPSBmdW5jdGlvbihvblJlamVjdGVkKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy50aGVuKHZvaWQgMCwgb25SZWplY3RlZCk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIFByaXZhdGUgZnVuY3Rpb24gdG8gYmluZCBhIHRoaXNBcmcgZm9yIHRoaXMgcHJvbWlzZSdzIGhhbmRsZXJzXG5cdFx0ICogQHByaXZhdGVcblx0XHQgKiBAcGFyYW0ge29iamVjdH0gdGhpc0FyZyBgdGhpc2AgdmFsdWUgZm9yIGFsbCBoYW5kbGVycyBhdHRhY2hlZCB0b1xuXHRcdCAqICB0aGUgcmV0dXJuZWQgcHJvbWlzZS5cblx0XHQgKiBAcmV0dXJucyB7UHJvbWlzZX1cblx0XHQgKi9cblx0XHRQcm9taXNlLnByb3RvdHlwZS5fYmluZENvbnRleHQgPSBmdW5jdGlvbih0aGlzQXJnKSB7XG5cdFx0XHRyZXR1cm4gbmV3IFByb21pc2UoSGFuZGxlciwgbmV3IEJvdW5kSGFuZGxlcih0aGlzLl9oYW5kbGVyLCB0aGlzQXJnKSk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIENyZWF0ZXMgYSBuZXcsIHBlbmRpbmcgcHJvbWlzZSBvZiB0aGUgc2FtZSB0eXBlIGFzIHRoaXMgcHJvbWlzZVxuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICogQHJldHVybnMge1Byb21pc2V9XG5cdFx0ICovXG5cdFx0UHJvbWlzZS5wcm90b3R5cGUuX2JlZ2V0ID0gZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgcGFyZW50ID0gdGhpcy5faGFuZGxlcjtcblx0XHRcdHZhciBjaGlsZCA9IG5ldyBEZWZlcnJlZEhhbmRsZXIocGFyZW50LnJlY2VpdmVyLCBwYXJlbnQuam9pbigpLmNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIG5ldyB0aGlzLmNvbnN0cnVjdG9yKEhhbmRsZXIsIGNoaWxkKTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogQ2hlY2sgaWYgeCBpcyBhIHJlamVjdGVkIHByb21pc2UsIGFuZCBpZiBzbywgZGVsZWdhdGUgdG8gaGFuZGxlci5fZmF0YWxcblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqIEBwYXJhbSB7Kn0geFxuXHRcdCAqL1xuXHRcdFByb21pc2UucHJvdG90eXBlLl9tYXliZUZhdGFsID0gZnVuY3Rpb24oeCkge1xuXHRcdFx0aWYoIW1heWJlVGhlbmFibGUoeCkpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgaGFuZGxlciA9IGdldEhhbmRsZXIoeCk7XG5cdFx0XHR2YXIgY29udGV4dCA9IHRoaXMuX2hhbmRsZXIuY29udGV4dDtcblx0XHRcdGhhbmRsZXIuY2F0Y2hFcnJvcihmdW5jdGlvbigpIHtcblx0XHRcdFx0dGhpcy5fZmF0YWwoY29udGV4dCk7XG5cdFx0XHR9LCBoYW5kbGVyKTtcblx0XHR9O1xuXG5cdFx0Ly8gQXJyYXkgY29tYmluYXRvcnNcblxuXHRcdFByb21pc2UuYWxsID0gYWxsO1xuXHRcdFByb21pc2UucmFjZSA9IHJhY2U7XG5cblx0XHQvKipcblx0XHQgKiBSZXR1cm4gYSBwcm9taXNlIHRoYXQgd2lsbCBmdWxmaWxsIHdoZW4gYWxsIHByb21pc2VzIGluIHRoZVxuXHRcdCAqIGlucHV0IGFycmF5IGhhdmUgZnVsZmlsbGVkLCBvciB3aWxsIHJlamVjdCB3aGVuIG9uZSBvZiB0aGVcblx0XHQgKiBwcm9taXNlcyByZWplY3RzLlxuXHRcdCAqIEBwYXJhbSB7YXJyYXl9IHByb21pc2VzIGFycmF5IG9mIHByb21pc2VzXG5cdFx0ICogQHJldHVybnMge1Byb21pc2V9IHByb21pc2UgZm9yIGFycmF5IG9mIGZ1bGZpbGxtZW50IHZhbHVlc1xuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGFsbChwcm9taXNlcykge1xuXHRcdFx0Lypqc2hpbnQgbWF4Y29tcGxleGl0eTo4Ki9cblx0XHRcdHZhciByZXNvbHZlciA9IG5ldyBEZWZlcnJlZEhhbmRsZXIoKTtcblx0XHRcdHZhciBwZW5kaW5nID0gcHJvbWlzZXMubGVuZ3RoID4+PiAwO1xuXHRcdFx0dmFyIHJlc3VsdHMgPSBuZXcgQXJyYXkocGVuZGluZyk7XG5cblx0XHRcdHZhciBpLCBoLCB4LCBzO1xuXHRcdFx0Zm9yIChpID0gMDsgaSA8IHByb21pc2VzLmxlbmd0aDsgKytpKSB7XG5cdFx0XHRcdHggPSBwcm9taXNlc1tpXTtcblxuXHRcdFx0XHRpZiAoeCA9PT0gdm9pZCAwICYmICEoaSBpbiBwcm9taXNlcykpIHtcblx0XHRcdFx0XHQtLXBlbmRpbmc7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAobWF5YmVUaGVuYWJsZSh4KSkge1xuXHRcdFx0XHRcdGggPSBpc1Byb21pc2UoeClcblx0XHRcdFx0XHRcdD8geC5faGFuZGxlci5qb2luKClcblx0XHRcdFx0XHRcdDogZ2V0SGFuZGxlclVudHJ1c3RlZCh4KTtcblxuXHRcdFx0XHRcdHMgPSBoLnN0YXRlKCk7XG5cdFx0XHRcdFx0aWYgKHMgPT09IDApIHtcblx0XHRcdFx0XHRcdHJlc29sdmVPbmUocmVzb2x2ZXIsIHJlc3VsdHMsIGgsIGkpO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAocyA+IDApIHtcblx0XHRcdFx0XHRcdHJlc3VsdHNbaV0gPSBoLnZhbHVlO1xuXHRcdFx0XHRcdFx0LS1wZW5kaW5nO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRyZXNvbHZlci5iZWNvbWUoaCk7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRyZXN1bHRzW2ldID0geDtcblx0XHRcdFx0XHQtLXBlbmRpbmc7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0aWYocGVuZGluZyA9PT0gMCkge1xuXHRcdFx0XHRyZXNvbHZlci5iZWNvbWUobmV3IEZ1bGZpbGxlZEhhbmRsZXIocmVzdWx0cykpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gbmV3IFByb21pc2UoSGFuZGxlciwgcmVzb2x2ZXIpO1xuXHRcdFx0ZnVuY3Rpb24gcmVzb2x2ZU9uZShyZXNvbHZlciwgcmVzdWx0cywgaGFuZGxlciwgaSkge1xuXHRcdFx0XHRoYW5kbGVyLm1hcChmdW5jdGlvbih4KSB7XG5cdFx0XHRcdFx0cmVzdWx0c1tpXSA9IHg7XG5cdFx0XHRcdFx0aWYoLS1wZW5kaW5nID09PSAwKSB7XG5cdFx0XHRcdFx0XHR0aGlzLmJlY29tZShuZXcgRnVsZmlsbGVkSGFuZGxlcihyZXN1bHRzKSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LCByZXNvbHZlcik7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogRnVsZmlsbC1yZWplY3QgY29tcGV0aXRpdmUgcmFjZS4gUmV0dXJuIGEgcHJvbWlzZSB0aGF0IHdpbGwgc2V0dGxlXG5cdFx0ICogdG8gdGhlIHNhbWUgc3RhdGUgYXMgdGhlIGVhcmxpZXN0IGlucHV0IHByb21pc2UgdG8gc2V0dGxlLlxuXHRcdCAqXG5cdFx0ICogV0FSTklORzogVGhlIEVTNiBQcm9taXNlIHNwZWMgcmVxdWlyZXMgdGhhdCByYWNlKClpbmcgYW4gZW1wdHkgYXJyYXlcblx0XHQgKiBtdXN0IHJldHVybiBhIHByb21pc2UgdGhhdCBpcyBwZW5kaW5nIGZvcmV2ZXIuICBUaGlzIGltcGxlbWVudGF0aW9uXG5cdFx0ICogcmV0dXJucyBhIHNpbmdsZXRvbiBmb3JldmVyLXBlbmRpbmcgcHJvbWlzZSwgdGhlIHNhbWUgc2luZ2xldG9uIHRoYXQgaXNcblx0XHQgKiByZXR1cm5lZCBieSBQcm9taXNlLm5ldmVyKCksIHRodXMgY2FuIGJlIGNoZWNrZWQgd2l0aCA9PT1cblx0XHQgKlxuXHRcdCAqIEBwYXJhbSB7YXJyYXl9IHByb21pc2VzIGFycmF5IG9mIHByb21pc2VzIHRvIHJhY2Vcblx0XHQgKiBAcmV0dXJucyB7UHJvbWlzZX0gaWYgaW5wdXQgaXMgbm9uLWVtcHR5LCBhIHByb21pc2UgdGhhdCB3aWxsIHNldHRsZVxuXHRcdCAqIHRvIHRoZSBzYW1lIG91dGNvbWUgYXMgdGhlIGVhcmxpZXN0IGlucHV0IHByb21pc2UgdG8gc2V0dGxlLiBpZiBlbXB0eVxuXHRcdCAqIGlzIGVtcHR5LCByZXR1cm5zIGEgcHJvbWlzZSB0aGF0IHdpbGwgbmV2ZXIgc2V0dGxlLlxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIHJhY2UocHJvbWlzZXMpIHtcblx0XHRcdC8vIFNpZ2gsIHJhY2UoW10pIGlzIHVudGVzdGFibGUgdW5sZXNzIHdlIHJldHVybiAqc29tZXRoaW5nKlxuXHRcdFx0Ly8gdGhhdCBpcyByZWNvZ25pemFibGUgd2l0aG91dCBjYWxsaW5nIC50aGVuKCkgb24gaXQuXG5cdFx0XHRpZihPYmplY3QocHJvbWlzZXMpID09PSBwcm9taXNlcyAmJiBwcm9taXNlcy5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0cmV0dXJuIG5ldmVyKCk7XG5cdFx0XHR9XG5cblx0XHRcdHZhciBoID0gbmV3IERlZmVycmVkSGFuZGxlcigpO1xuXHRcdFx0dmFyIGksIHg7XG5cdFx0XHRmb3IoaT0wOyBpPHByb21pc2VzLmxlbmd0aDsgKytpKSB7XG5cdFx0XHRcdHggPSBwcm9taXNlc1tpXTtcblx0XHRcdFx0aWYgKHggIT09IHZvaWQgMCAmJiBpIGluIHByb21pc2VzKSB7XG5cdFx0XHRcdFx0Z2V0SGFuZGxlcih4KS5jaGFpbihoLCBoLnJlc29sdmUsIGgucmVqZWN0KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG5ldyBQcm9taXNlKEhhbmRsZXIsIGgpO1xuXHRcdH1cblxuXHRcdC8vIFByb21pc2UgaW50ZXJuYWxzXG5cblx0XHQvKipcblx0XHQgKiBHZXQgYW4gYXBwcm9wcmlhdGUgaGFuZGxlciBmb3IgeCwgd2l0aG91dCBjaGVja2luZyBmb3IgY3ljbGVzXG5cdFx0ICogQHByaXZhdGVcblx0XHQgKiBAcGFyYW0geyp9IHhcblx0XHQgKiBAcmV0dXJucyB7b2JqZWN0fSBoYW5kbGVyXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gZ2V0SGFuZGxlcih4KSB7XG5cdFx0XHRpZihpc1Byb21pc2UoeCkpIHtcblx0XHRcdFx0cmV0dXJuIHguX2hhbmRsZXIuam9pbigpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG1heWJlVGhlbmFibGUoeCkgPyBnZXRIYW5kbGVyVW50cnVzdGVkKHgpIDogbmV3IEZ1bGZpbGxlZEhhbmRsZXIoeCk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gaXNQcm9taXNlKHgpIHtcblx0XHRcdHJldHVybiB4IGluc3RhbmNlb2YgUHJvbWlzZTtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBHZXQgYSBoYW5kbGVyIGZvciBwb3RlbnRpYWxseSB1bnRydXN0ZWQgdGhlbmFibGUgeFxuXHRcdCAqIEBwYXJhbSB7Kn0geFxuXHRcdCAqIEByZXR1cm5zIHtvYmplY3R9IGhhbmRsZXJcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBnZXRIYW5kbGVyVW50cnVzdGVkKHgpIHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdHZhciB1bnRydXN0ZWRUaGVuID0geC50aGVuO1xuXHRcdFx0XHRyZXR1cm4gdHlwZW9mIHVudHJ1c3RlZFRoZW4gPT09ICdmdW5jdGlvbidcblx0XHRcdFx0XHQ/IG5ldyBUaGVuYWJsZUhhbmRsZXIodW50cnVzdGVkVGhlbiwgeClcblx0XHRcdFx0XHQ6IG5ldyBGdWxmaWxsZWRIYW5kbGVyKHgpO1xuXHRcdFx0fSBjYXRjaChlKSB7XG5cdFx0XHRcdHJldHVybiBuZXcgUmVqZWN0ZWRIYW5kbGVyKGUpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIEhhbmRsZXIgZm9yIGEgcHJvbWlzZSB0aGF0IGlzIHBlbmRpbmcgZm9yZXZlclxuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICogQGNvbnN0cnVjdG9yXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gSGFuZGxlcigpIHt9XG5cblx0XHRIYW5kbGVyLnByb3RvdHlwZS53aGVuXG5cdFx0XHQ9IEhhbmRsZXIucHJvdG90eXBlLnJlc29sdmVcblx0XHRcdD0gSGFuZGxlci5wcm90b3R5cGUucmVqZWN0XG5cdFx0XHQ9IEhhbmRsZXIucHJvdG90eXBlLm5vdGlmeVxuXHRcdFx0PSBIYW5kbGVyLnByb3RvdHlwZS5fZmF0YWxcblx0XHRcdD0gSGFuZGxlci5wcm90b3R5cGUuX3VucmVwb3J0XG5cdFx0XHQ9IEhhbmRsZXIucHJvdG90eXBlLl9yZXBvcnRcblx0XHRcdD0gbm9vcDtcblxuXHRcdEhhbmRsZXIucHJvdG90eXBlLmluc3BlY3QgPSB0b1BlbmRpbmdTdGF0ZTtcblxuXHRcdEhhbmRsZXIucHJvdG90eXBlLl9zdGF0ZSA9IDA7XG5cblx0XHRIYW5kbGVyLnByb3RvdHlwZS5zdGF0ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuX3N0YXRlO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBSZWN1cnNpdmVseSBjb2xsYXBzZSBoYW5kbGVyIGNoYWluIHRvIGZpbmQgdGhlIGhhbmRsZXJcblx0XHQgKiBuZWFyZXN0IHRvIHRoZSBmdWxseSByZXNvbHZlZCB2YWx1ZS5cblx0XHQgKiBAcmV0dXJucyB7b2JqZWN0fSBoYW5kbGVyIG5lYXJlc3QgdGhlIGZ1bGx5IHJlc29sdmVkIHZhbHVlXG5cdFx0ICovXG5cdFx0SGFuZGxlci5wcm90b3R5cGUuam9pbiA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGggPSB0aGlzO1xuXHRcdFx0d2hpbGUoaC5oYW5kbGVyICE9PSB2b2lkIDApIHtcblx0XHRcdFx0aCA9IGguaGFuZGxlcjtcblx0XHRcdH1cblx0XHRcdHJldHVybiBoO1xuXHRcdH07XG5cblx0XHRIYW5kbGVyLnByb3RvdHlwZS5jaGFpbiA9IGZ1bmN0aW9uKHRvLCBmdWxmaWxsZWQsIHJlamVjdGVkLCBwcm9ncmVzcykge1xuXHRcdFx0dGhpcy53aGVuKHtcblx0XHRcdFx0cmVzb2x2ZTogbm9vcCxcblx0XHRcdFx0bm90aWZ5OiBub29wLFxuXHRcdFx0XHRjb250ZXh0OiB2b2lkIDAsXG5cdFx0XHRcdHJlY2VpdmVyOiB0byxcblx0XHRcdFx0ZnVsZmlsbGVkOiBmdWxmaWxsZWQsXG5cdFx0XHRcdHJlamVjdGVkOiByZWplY3RlZCxcblx0XHRcdFx0cHJvZ3Jlc3M6IHByb2dyZXNzXG5cdFx0XHR9KTtcblx0XHR9O1xuXG5cdFx0SGFuZGxlci5wcm90b3R5cGUubWFwID0gZnVuY3Rpb24oZiwgdG8pIHtcblx0XHRcdHRoaXMuY2hhaW4odG8sIGYsIHRvLnJlamVjdCwgdG8ubm90aWZ5KTtcblx0XHR9O1xuXG5cdFx0SGFuZGxlci5wcm90b3R5cGUuY2F0Y2hFcnJvciA9IGZ1bmN0aW9uKGYsIHRvKSB7XG5cdFx0XHR0aGlzLmNoYWluKHRvLCB0by5yZXNvbHZlLCBmLCB0by5ub3RpZnkpO1xuXHRcdH07XG5cblx0XHRIYW5kbGVyLnByb3RvdHlwZS5mb2xkID0gZnVuY3Rpb24odG8sIGYsIHopIHtcblx0XHRcdHRoaXMuam9pbigpLm1hcChmdW5jdGlvbih4KSB7XG5cdFx0XHRcdGdldEhhbmRsZXIoeikubWFwKGZ1bmN0aW9uKHopIHtcblx0XHRcdFx0XHR0aGlzLnJlc29sdmUodHJ5Q2F0Y2hSZWplY3QyKGYsIHosIHgsIHRoaXMucmVjZWl2ZXIpKTtcblx0XHRcdFx0fSwgdGhpcyk7XG5cdFx0XHR9LCB0byk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIEhhbmRsZXIgdGhhdCBtYW5hZ2VzIGEgcXVldWUgb2YgY29uc3VtZXJzIHdhaXRpbmcgb24gYSBwZW5kaW5nIHByb21pc2Vcblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqIEBjb25zdHJ1Y3RvclxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIERlZmVycmVkSGFuZGxlcihyZWNlaXZlciwgaW5oZXJpdGVkQ29udGV4dCkge1xuXHRcdFx0UHJvbWlzZS5jcmVhdGVDb250ZXh0KHRoaXMsIGluaGVyaXRlZENvbnRleHQpO1xuXG5cdFx0XHR0aGlzLmNvbnN1bWVycyA9IHZvaWQgMDtcblx0XHRcdHRoaXMucmVjZWl2ZXIgPSByZWNlaXZlcjtcblx0XHRcdHRoaXMuaGFuZGxlciA9IHZvaWQgMDtcblx0XHRcdHRoaXMucmVzb2x2ZWQgPSBmYWxzZTtcblx0XHR9XG5cblx0XHRpbmhlcml0KEhhbmRsZXIsIERlZmVycmVkSGFuZGxlcik7XG5cblx0XHREZWZlcnJlZEhhbmRsZXIucHJvdG90eXBlLl9zdGF0ZSA9IDA7XG5cblx0XHREZWZlcnJlZEhhbmRsZXIucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB0aGlzLnJlc29sdmVkID8gdGhpcy5qb2luKCkuaW5zcGVjdCgpIDogdG9QZW5kaW5nU3RhdGUoKTtcblx0XHR9O1xuXG5cdFx0RGVmZXJyZWRIYW5kbGVyLnByb3RvdHlwZS5yZXNvbHZlID0gZnVuY3Rpb24oeCkge1xuXHRcdFx0aWYoIXRoaXMucmVzb2x2ZWQpIHtcblx0XHRcdFx0dGhpcy5iZWNvbWUoZ2V0SGFuZGxlcih4KSk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdERlZmVycmVkSGFuZGxlci5wcm90b3R5cGUucmVqZWN0ID0gZnVuY3Rpb24oeCkge1xuXHRcdFx0aWYoIXRoaXMucmVzb2x2ZWQpIHtcblx0XHRcdFx0dGhpcy5iZWNvbWUobmV3IFJlamVjdGVkSGFuZGxlcih4KSk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdERlZmVycmVkSGFuZGxlci5wcm90b3R5cGUuam9pbiA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKHRoaXMucmVzb2x2ZWQpIHtcblx0XHRcdFx0dmFyIGggPSB0aGlzO1xuXHRcdFx0XHR3aGlsZShoLmhhbmRsZXIgIT09IHZvaWQgMCkge1xuXHRcdFx0XHRcdGggPSBoLmhhbmRsZXI7XG5cdFx0XHRcdFx0aWYoaCA9PT0gdGhpcykge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuaGFuZGxlciA9IG5ldyBDeWNsZSgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gaDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHREZWZlcnJlZEhhbmRsZXIucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHEgPSB0aGlzLmNvbnN1bWVycztcblx0XHRcdHZhciBoYW5kbGVyID0gdGhpcy5qb2luKCk7XG5cdFx0XHR0aGlzLmNvbnN1bWVycyA9IHZvaWQgMDtcblxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBxLmxlbmd0aDsgKytpKSB7XG5cdFx0XHRcdGhhbmRsZXIud2hlbihxW2ldKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0RGVmZXJyZWRIYW5kbGVyLnByb3RvdHlwZS5iZWNvbWUgPSBmdW5jdGlvbihoYW5kbGVyKSB7XG5cdFx0XHR0aGlzLnJlc29sdmVkID0gdHJ1ZTtcblx0XHRcdHRoaXMuaGFuZGxlciA9IGhhbmRsZXI7XG5cdFx0XHRpZih0aGlzLmNvbnN1bWVycyAhPT0gdm9pZCAwKSB7XG5cdFx0XHRcdHRhc2tzLmVucXVldWUodGhpcyk7XG5cdFx0XHR9XG5cblx0XHRcdGlmKHRoaXMuY29udGV4dCAhPT0gdm9pZCAwKSB7XG5cdFx0XHRcdGhhbmRsZXIuX3JlcG9ydCh0aGlzLmNvbnRleHQpO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHREZWZlcnJlZEhhbmRsZXIucHJvdG90eXBlLndoZW4gPSBmdW5jdGlvbihjb250aW51YXRpb24pIHtcblx0XHRcdGlmKHRoaXMucmVzb2x2ZWQpIHtcblx0XHRcdFx0dGFza3MuZW5xdWV1ZShuZXcgQ29udGludWF0aW9uVGFzayhjb250aW51YXRpb24sIHRoaXMuaGFuZGxlcikpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aWYodGhpcy5jb25zdW1lcnMgPT09IHZvaWQgMCkge1xuXHRcdFx0XHRcdHRoaXMuY29uc3VtZXJzID0gW2NvbnRpbnVhdGlvbl07XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGhpcy5jb25zdW1lcnMucHVzaChjb250aW51YXRpb24pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdERlZmVycmVkSGFuZGxlci5wcm90b3R5cGUubm90aWZ5ID0gZnVuY3Rpb24oeCkge1xuXHRcdFx0aWYoIXRoaXMucmVzb2x2ZWQpIHtcblx0XHRcdFx0dGFza3MuZW5xdWV1ZShuZXcgUHJvZ3Jlc3NUYXNrKHRoaXMsIHgpKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0RGVmZXJyZWRIYW5kbGVyLnByb3RvdHlwZS5fcmVwb3J0ID0gZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdFx0dGhpcy5yZXNvbHZlZCAmJiB0aGlzLmhhbmRsZXIuam9pbigpLl9yZXBvcnQoY29udGV4dCk7XG5cdFx0fTtcblxuXHRcdERlZmVycmVkSGFuZGxlci5wcm90b3R5cGUuX3VucmVwb3J0ID0gZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLnJlc29sdmVkICYmIHRoaXMuaGFuZGxlci5qb2luKCkuX3VucmVwb3J0KCk7XG5cdFx0fTtcblxuXHRcdERlZmVycmVkSGFuZGxlci5wcm90b3R5cGUuX2ZhdGFsID0gZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdFx0dmFyIGMgPSB0eXBlb2YgY29udGV4dCA9PT0gJ3VuZGVmaW5lZCcgPyB0aGlzLmNvbnRleHQgOiBjb250ZXh0O1xuXHRcdFx0dGhpcy5yZXNvbHZlZCAmJiB0aGlzLmhhbmRsZXIuam9pbigpLl9mYXRhbChjKTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogQWJzdHJhY3QgYmFzZSBmb3IgaGFuZGxlciB0aGF0IGRlbGVnYXRlcyB0byBhbm90aGVyIGhhbmRsZXJcblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqIEBwYXJhbSB7b2JqZWN0fSBoYW5kbGVyXG5cdFx0ICogQGNvbnN0cnVjdG9yXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gRGVsZWdhdGVIYW5kbGVyKGhhbmRsZXIpIHtcblx0XHRcdHRoaXMuaGFuZGxlciA9IGhhbmRsZXI7XG5cdFx0fVxuXG5cdFx0aW5oZXJpdChIYW5kbGVyLCBEZWxlZ2F0ZUhhbmRsZXIpO1xuXG5cdFx0RGVsZWdhdGVIYW5kbGVyLnByb3RvdHlwZS5pbnNwZWN0ID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5qb2luKCkuaW5zcGVjdCgpO1xuXHRcdH07XG5cblx0XHREZWxlZ2F0ZUhhbmRsZXIucHJvdG90eXBlLl9yZXBvcnQgPSBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0XHR0aGlzLmpvaW4oKS5fcmVwb3J0KGNvbnRleHQpO1xuXHRcdH07XG5cblx0XHREZWxlZ2F0ZUhhbmRsZXIucHJvdG90eXBlLl91bnJlcG9ydCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy5qb2luKCkuX3VucmVwb3J0KCk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIFdyYXAgYW5vdGhlciBoYW5kbGVyIGFuZCBmb3JjZSBpdCBpbnRvIGEgZnV0dXJlIHN0YWNrXG5cdFx0ICogQHByaXZhdGVcblx0XHQgKiBAcGFyYW0ge29iamVjdH0gaGFuZGxlclxuXHRcdCAqIEBjb25zdHJ1Y3RvclxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIEFzeW5jSGFuZGxlcihoYW5kbGVyKSB7XG5cdFx0XHREZWxlZ2F0ZUhhbmRsZXIuY2FsbCh0aGlzLCBoYW5kbGVyKTtcblx0XHR9XG5cblx0XHRpbmhlcml0KERlbGVnYXRlSGFuZGxlciwgQXN5bmNIYW5kbGVyKTtcblxuXHRcdEFzeW5jSGFuZGxlci5wcm90b3R5cGUud2hlbiA9IGZ1bmN0aW9uKGNvbnRpbnVhdGlvbikge1xuXHRcdFx0dGFza3MuZW5xdWV1ZShuZXcgQ29udGludWF0aW9uVGFzayhjb250aW51YXRpb24sIHRoaXMuam9pbigpKSk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIEhhbmRsZXIgdGhhdCBmb2xsb3dzIGFub3RoZXIgaGFuZGxlciwgaW5qZWN0aW5nIGEgcmVjZWl2ZXJcblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqIEBwYXJhbSB7b2JqZWN0fSBoYW5kbGVyIGFub3RoZXIgaGFuZGxlciB0byBmb2xsb3dcblx0XHQgKiBAcGFyYW0ge29iamVjdD11bmRlZmluZWR9IHJlY2VpdmVyXG5cdFx0ICogQGNvbnN0cnVjdG9yXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gQm91bmRIYW5kbGVyKGhhbmRsZXIsIHJlY2VpdmVyKSB7XG5cdFx0XHREZWxlZ2F0ZUhhbmRsZXIuY2FsbCh0aGlzLCBoYW5kbGVyKTtcblx0XHRcdHRoaXMucmVjZWl2ZXIgPSByZWNlaXZlcjtcblx0XHR9XG5cblx0XHRpbmhlcml0KERlbGVnYXRlSGFuZGxlciwgQm91bmRIYW5kbGVyKTtcblxuXHRcdEJvdW5kSGFuZGxlci5wcm90b3R5cGUud2hlbiA9IGZ1bmN0aW9uKGNvbnRpbnVhdGlvbikge1xuXHRcdFx0Ly8gQmVjYXVzZSBoYW5kbGVycyBhcmUgYWxsb3dlZCB0byBiZSBzaGFyZWQgYW1vbmcgcHJvbWlzZXMsXG5cdFx0XHQvLyBlYWNoIG9mIHdoaWNoIHBvc3NpYmx5IGhhdmluZyBhIGRpZmZlcmVudCByZWNlaXZlciwgd2UgaGF2ZVxuXHRcdFx0Ly8gdG8gaW5zZXJ0IG91ciBvd24gcmVjZWl2ZXIgaW50byB0aGUgY2hhaW4gaWYgaXQgaGFzIGJlZW4gc2V0XG5cdFx0XHQvLyBzbyB0aGF0IGNhbGxiYWNrcyAoZiwgciwgdSkgd2lsbCBiZSBjYWxsZWQgdXNpbmcgb3VyIHJlY2VpdmVyXG5cdFx0XHRpZih0aGlzLnJlY2VpdmVyICE9PSB2b2lkIDApIHtcblx0XHRcdFx0Y29udGludWF0aW9uLnJlY2VpdmVyID0gdGhpcy5yZWNlaXZlcjtcblx0XHRcdH1cblx0XHRcdHRoaXMuam9pbigpLndoZW4oY29udGludWF0aW9uKTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogSGFuZGxlciB0aGF0IHdyYXBzIGFuIHVudHJ1c3RlZCB0aGVuYWJsZSBhbmQgYXNzaW1pbGF0ZXMgaXQgaW4gYSBmdXR1cmUgc3RhY2tcblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqIEBwYXJhbSB7ZnVuY3Rpb259IHRoZW5cblx0XHQgKiBAcGFyYW0ge3t0aGVuOiBmdW5jdGlvbn19IHRoZW5hYmxlXG5cdFx0ICogQGNvbnN0cnVjdG9yXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gVGhlbmFibGVIYW5kbGVyKHRoZW4sIHRoZW5hYmxlKSB7XG5cdFx0XHREZWZlcnJlZEhhbmRsZXIuY2FsbCh0aGlzKTtcblx0XHRcdHRhc2tzLmVucXVldWUobmV3IEFzc2ltaWxhdGVUYXNrKHRoZW4sIHRoZW5hYmxlLCB0aGlzKSk7XG5cdFx0fVxuXG5cdFx0aW5oZXJpdChEZWZlcnJlZEhhbmRsZXIsIFRoZW5hYmxlSGFuZGxlcik7XG5cblx0XHQvKipcblx0XHQgKiBIYW5kbGVyIGZvciBhIGZ1bGZpbGxlZCBwcm9taXNlXG5cdFx0ICogQHByaXZhdGVcblx0XHQgKiBAcGFyYW0geyp9IHggZnVsZmlsbG1lbnQgdmFsdWVcblx0XHQgKiBAY29uc3RydWN0b3Jcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBGdWxmaWxsZWRIYW5kbGVyKHgpIHtcblx0XHRcdFByb21pc2UuY3JlYXRlQ29udGV4dCh0aGlzKTtcblx0XHRcdHRoaXMudmFsdWUgPSB4O1xuXHRcdH1cblxuXHRcdGluaGVyaXQoSGFuZGxlciwgRnVsZmlsbGVkSGFuZGxlcik7XG5cblx0XHRGdWxmaWxsZWRIYW5kbGVyLnByb3RvdHlwZS5fc3RhdGUgPSAxO1xuXG5cdFx0RnVsZmlsbGVkSGFuZGxlci5wcm90b3R5cGUuaW5zcGVjdCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHsgc3RhdGU6ICdmdWxmaWxsZWQnLCB2YWx1ZTogdGhpcy52YWx1ZSB9O1xuXHRcdH07XG5cblx0XHRGdWxmaWxsZWRIYW5kbGVyLnByb3RvdHlwZS53aGVuID0gZnVuY3Rpb24oY29udCkge1xuXHRcdFx0dmFyIHg7XG5cblx0XHRcdGlmICh0eXBlb2YgY29udC5mdWxmaWxsZWQgPT09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0UHJvbWlzZS5lbnRlckNvbnRleHQodGhpcyk7XG5cdFx0XHRcdHggPSB0cnlDYXRjaFJlamVjdChjb250LmZ1bGZpbGxlZCwgdGhpcy52YWx1ZSwgY29udC5yZWNlaXZlcik7XG5cdFx0XHRcdFByb21pc2UuZXhpdENvbnRleHQoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHggPSB0aGlzLnZhbHVlO1xuXHRcdFx0fVxuXG5cdFx0XHRjb250LnJlc29sdmUuY2FsbChjb250LmNvbnRleHQsIHgpO1xuXHRcdH07XG5cblx0XHR2YXIgaWQgPSAwO1xuXHRcdC8qKlxuXHRcdCAqIEhhbmRsZXIgZm9yIGEgcmVqZWN0ZWQgcHJvbWlzZVxuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICogQHBhcmFtIHsqfSB4IHJlamVjdGlvbiByZWFzb25cblx0XHQgKiBAY29uc3RydWN0b3Jcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBSZWplY3RlZEhhbmRsZXIoeCkge1xuXHRcdFx0UHJvbWlzZS5jcmVhdGVDb250ZXh0KHRoaXMpO1xuXG5cdFx0XHR0aGlzLmlkID0gKytpZDtcblx0XHRcdHRoaXMudmFsdWUgPSB4O1xuXHRcdFx0dGhpcy5oYW5kbGVkID0gZmFsc2U7XG5cdFx0XHR0aGlzLnJlcG9ydGVkID0gZmFsc2U7XG5cblx0XHRcdHRoaXMuX3JlcG9ydCgpO1xuXHRcdH1cblxuXHRcdGluaGVyaXQoSGFuZGxlciwgUmVqZWN0ZWRIYW5kbGVyKTtcblxuXHRcdFJlamVjdGVkSGFuZGxlci5wcm90b3R5cGUuX3N0YXRlID0gLTE7XG5cblx0XHRSZWplY3RlZEhhbmRsZXIucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB7IHN0YXRlOiAncmVqZWN0ZWQnLCByZWFzb246IHRoaXMudmFsdWUgfTtcblx0XHR9O1xuXG5cdFx0UmVqZWN0ZWRIYW5kbGVyLnByb3RvdHlwZS53aGVuID0gZnVuY3Rpb24oY29udCkge1xuXHRcdFx0dmFyIHg7XG5cblx0XHRcdGlmICh0eXBlb2YgY29udC5yZWplY3RlZCA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHR0aGlzLl91bnJlcG9ydCgpO1xuXHRcdFx0XHRQcm9taXNlLmVudGVyQ29udGV4dCh0aGlzKTtcblx0XHRcdFx0eCA9IHRyeUNhdGNoUmVqZWN0KGNvbnQucmVqZWN0ZWQsIHRoaXMudmFsdWUsIGNvbnQucmVjZWl2ZXIpO1xuXHRcdFx0XHRQcm9taXNlLmV4aXRDb250ZXh0KCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR4ID0gbmV3IFByb21pc2UoSGFuZGxlciwgdGhpcyk7XG5cdFx0XHR9XG5cblxuXHRcdFx0Y29udC5yZXNvbHZlLmNhbGwoY29udC5jb250ZXh0LCB4KTtcblx0XHR9O1xuXG5cdFx0UmVqZWN0ZWRIYW5kbGVyLnByb3RvdHlwZS5fcmVwb3J0ID0gZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdFx0dGFza3MuYWZ0ZXJRdWV1ZShyZXBvcnRVbmhhbmRsZWQsIHRoaXMsIGNvbnRleHQpO1xuXHRcdH07XG5cblx0XHRSZWplY3RlZEhhbmRsZXIucHJvdG90eXBlLl91bnJlcG9ydCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy5oYW5kbGVkID0gdHJ1ZTtcblx0XHRcdHRhc2tzLmFmdGVyUXVldWUocmVwb3J0SGFuZGxlZCwgdGhpcyk7XG5cdFx0fTtcblxuXHRcdFJlamVjdGVkSGFuZGxlci5wcm90b3R5cGUuX2ZhdGFsID0gZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdFx0UHJvbWlzZS5vbkZhdGFsUmVqZWN0aW9uKHRoaXMsIGNvbnRleHQpO1xuXHRcdH07XG5cblx0XHRmdW5jdGlvbiByZXBvcnRVbmhhbmRsZWQocmVqZWN0aW9uLCBjb250ZXh0KSB7XG5cdFx0XHRpZighcmVqZWN0aW9uLmhhbmRsZWQpIHtcblx0XHRcdFx0cmVqZWN0aW9uLnJlcG9ydGVkID0gdHJ1ZTtcblx0XHRcdFx0UHJvbWlzZS5vblBvdGVudGlhbGx5VW5oYW5kbGVkUmVqZWN0aW9uKHJlamVjdGlvbiwgY29udGV4dCk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcmVwb3J0SGFuZGxlZChyZWplY3Rpb24pIHtcblx0XHRcdGlmKHJlamVjdGlvbi5yZXBvcnRlZCkge1xuXHRcdFx0XHRQcm9taXNlLm9uUG90ZW50aWFsbHlVbmhhbmRsZWRSZWplY3Rpb25IYW5kbGVkKHJlamVjdGlvbik7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gVW5oYW5kbGVkIHJlamVjdGlvbiBob29rc1xuXHRcdC8vIEJ5IGRlZmF1bHQsIGV2ZXJ5dGhpbmcgaXMgYSBub29wXG5cblx0XHQvLyBUT0RPOiBCZXR0ZXIgbmFtZXM6IFwiYW5ub3RhdGVcIj9cblx0XHRQcm9taXNlLmNyZWF0ZUNvbnRleHRcblx0XHRcdD0gUHJvbWlzZS5lbnRlckNvbnRleHRcblx0XHRcdD0gUHJvbWlzZS5leGl0Q29udGV4dFxuXHRcdFx0PSBQcm9taXNlLm9uUG90ZW50aWFsbHlVbmhhbmRsZWRSZWplY3Rpb25cblx0XHRcdD0gUHJvbWlzZS5vblBvdGVudGlhbGx5VW5oYW5kbGVkUmVqZWN0aW9uSGFuZGxlZFxuXHRcdFx0PSBQcm9taXNlLm9uRmF0YWxSZWplY3Rpb25cblx0XHRcdD0gbm9vcDtcblxuXHRcdC8vIEVycm9ycyBhbmQgc2luZ2xldG9uc1xuXG5cdFx0dmFyIGZvcmV2ZXJQZW5kaW5nSGFuZGxlciA9IG5ldyBIYW5kbGVyKCk7XG5cdFx0dmFyIGZvcmV2ZXJQZW5kaW5nUHJvbWlzZSA9IG5ldyBQcm9taXNlKEhhbmRsZXIsIGZvcmV2ZXJQZW5kaW5nSGFuZGxlcik7XG5cblx0XHRmdW5jdGlvbiBDeWNsZSgpIHtcblx0XHRcdFJlamVjdGVkSGFuZGxlci5jYWxsKHRoaXMsIG5ldyBUeXBlRXJyb3IoJ1Byb21pc2UgY3ljbGUnKSk7XG5cdFx0fVxuXG5cdFx0aW5oZXJpdChSZWplY3RlZEhhbmRsZXIsIEN5Y2xlKTtcblxuXHRcdC8vIFNuYXBzaG90IHN0YXRlc1xuXG5cdFx0LyoqXG5cdFx0ICogQ3JlYXRlcyBhIHBlbmRpbmcgc3RhdGUgc25hcHNob3Rcblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqIEByZXR1cm5zIHt7c3RhdGU6J3BlbmRpbmcnfX1cblx0XHQgKi9cblx0XHRmdW5jdGlvbiB0b1BlbmRpbmdTdGF0ZSgpIHtcblx0XHRcdHJldHVybiB7IHN0YXRlOiAncGVuZGluZycgfTtcblx0XHR9XG5cblx0XHQvLyBUYXNrIHJ1bm5lcnNcblxuXHRcdC8qKlxuXHRcdCAqIFJ1biBhIHNpbmdsZSBjb25zdW1lclxuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICogQGNvbnN0cnVjdG9yXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gQ29udGludWF0aW9uVGFzayhjb250aW51YXRpb24sIGhhbmRsZXIpIHtcblx0XHRcdHRoaXMuY29udGludWF0aW9uID0gY29udGludWF0aW9uO1xuXHRcdFx0dGhpcy5oYW5kbGVyID0gaGFuZGxlcjtcblx0XHR9XG5cblx0XHRDb250aW51YXRpb25UYXNrLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMuaGFuZGxlci5qb2luKCkud2hlbih0aGlzLmNvbnRpbnVhdGlvbik7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIFJ1biBhIHF1ZXVlIG9mIHByb2dyZXNzIGhhbmRsZXJzXG5cdFx0ICogQHByaXZhdGVcblx0XHQgKiBAY29uc3RydWN0b3Jcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBQcm9ncmVzc1Rhc2soaGFuZGxlciwgdmFsdWUpIHtcblx0XHRcdHRoaXMuaGFuZGxlciA9IGhhbmRsZXI7XG5cdFx0XHR0aGlzLnZhbHVlID0gdmFsdWU7XG5cdFx0fVxuXG5cdFx0UHJvZ3Jlc3NUYXNrLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBxID0gdGhpcy5oYW5kbGVyLmNvbnN1bWVycztcblx0XHRcdGlmKHEgPT09IHZvaWQgMCkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHQvLyBGaXJzdCBwcm9ncmVzcyBoYW5kbGVyIGlzIGF0IGluZGV4IDFcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgcS5sZW5ndGg7ICsraSkge1xuXHRcdFx0XHR0aGlzLl9ub3RpZnkocVtpXSk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdFByb2dyZXNzVGFzay5wcm90b3R5cGUuX25vdGlmeSA9IGZ1bmN0aW9uKGNvbnRpbnVhdGlvbikge1xuXHRcdFx0dmFyIHggPSB0eXBlb2YgY29udGludWF0aW9uLnByb2dyZXNzID09PSAnZnVuY3Rpb24nXG5cdFx0XHRcdD8gdHJ5Q2F0Y2hSZXR1cm4oY29udGludWF0aW9uLnByb2dyZXNzLCB0aGlzLnZhbHVlLCBjb250aW51YXRpb24ucmVjZWl2ZXIpXG5cdFx0XHRcdDogdGhpcy52YWx1ZTtcblxuXHRcdFx0Y29udGludWF0aW9uLm5vdGlmeS5jYWxsKGNvbnRpbnVhdGlvbi5jb250ZXh0LCB4KTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogQXNzaW1pbGF0ZSBhIHRoZW5hYmxlLCBzZW5kaW5nIGl0J3MgdmFsdWUgdG8gcmVzb2x2ZXJcblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqIEBwYXJhbSB7ZnVuY3Rpb259IHRoZW5cblx0XHQgKiBAcGFyYW0ge29iamVjdHxmdW5jdGlvbn0gdGhlbmFibGVcblx0XHQgKiBAcGFyYW0ge29iamVjdH0gcmVzb2x2ZXJcblx0XHQgKiBAY29uc3RydWN0b3Jcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBBc3NpbWlsYXRlVGFzayh0aGVuLCB0aGVuYWJsZSwgcmVzb2x2ZXIpIHtcblx0XHRcdHRoaXMuX3RoZW4gPSB0aGVuO1xuXHRcdFx0dGhpcy50aGVuYWJsZSA9IHRoZW5hYmxlO1xuXHRcdFx0dGhpcy5yZXNvbHZlciA9IHJlc29sdmVyO1xuXHRcdH1cblxuXHRcdEFzc2ltaWxhdGVUYXNrLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBoID0gdGhpcy5yZXNvbHZlcjtcblx0XHRcdHRyeUFzc2ltaWxhdGUodGhpcy5fdGhlbiwgdGhpcy50aGVuYWJsZSwgX3Jlc29sdmUsIF9yZWplY3QsIF9ub3RpZnkpO1xuXG5cdFx0XHRmdW5jdGlvbiBfcmVzb2x2ZSh4KSB7IGgucmVzb2x2ZSh4KTsgfVxuXHRcdFx0ZnVuY3Rpb24gX3JlamVjdCh4KSAgeyBoLnJlamVjdCh4KTsgfVxuXHRcdFx0ZnVuY3Rpb24gX25vdGlmeSh4KSAgeyBoLm5vdGlmeSh4KTsgfVxuXHRcdH07XG5cblx0XHRmdW5jdGlvbiB0cnlBc3NpbWlsYXRlKHRoZW4sIHRoZW5hYmxlLCByZXNvbHZlLCByZWplY3QsIG5vdGlmeSkge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0dGhlbi5jYWxsKHRoZW5hYmxlLCByZXNvbHZlLCByZWplY3QsIG5vdGlmeSk7XG5cdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdHJlamVjdChlKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBPdGhlciBoZWxwZXJzXG5cblx0XHQvKipcblx0XHQgKiBAcGFyYW0geyp9IHhcblx0XHQgKiBAcmV0dXJucyB7Ym9vbGVhbn0gZmFsc2UgaWZmIHggaXMgZ3VhcmFudGVlZCBub3QgdG8gYmUgYSB0aGVuYWJsZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIG1heWJlVGhlbmFibGUoeCkge1xuXHRcdFx0cmV0dXJuICh0eXBlb2YgeCA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIHggPT09ICdmdW5jdGlvbicpICYmIHggIT09IG51bGw7XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogUmV0dXJuIGYuY2FsbCh0aGlzQXJnLCB4KSwgb3IgaWYgaXQgdGhyb3dzIHJldHVybiBhIHJlamVjdGVkIHByb21pc2UgZm9yXG5cdFx0ICogdGhlIHRocm93biBleGNlcHRpb25cblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIHRyeUNhdGNoUmVqZWN0KGYsIHgsIHRoaXNBcmcpIHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdHJldHVybiBmLmNhbGwodGhpc0FyZywgeCk7XG5cdFx0XHR9IGNhdGNoKGUpIHtcblx0XHRcdFx0cmV0dXJuIHJlamVjdChlKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBTYW1lIGFzIGFib3ZlLCBidXQgaW5jbHVkZXMgdGhlIGV4dHJhIGFyZ3VtZW50IHBhcmFtZXRlci5cblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIHRyeUNhdGNoUmVqZWN0MihmLCB4LCB5LCB0aGlzQXJnKSB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRyZXR1cm4gZi5jYWxsKHRoaXNBcmcsIHgsIHkpO1xuXHRcdFx0fSBjYXRjaChlKSB7XG5cdFx0XHRcdHJldHVybiByZWplY3QoZSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogUmV0dXJuIGYuY2FsbCh0aGlzQXJnLCB4KSwgb3IgaWYgaXQgdGhyb3dzLCAqcmV0dXJuKiB0aGUgZXhjZXB0aW9uXG5cdFx0ICogQHByaXZhdGVcblx0XHQgKi9cblx0XHRmdW5jdGlvbiB0cnlDYXRjaFJldHVybihmLCB4LCB0aGlzQXJnKSB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRyZXR1cm4gZi5jYWxsKHRoaXNBcmcsIHgpO1xuXHRcdFx0fSBjYXRjaChlKSB7XG5cdFx0XHRcdHJldHVybiBlO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGluaGVyaXQoUGFyZW50LCBDaGlsZCkge1xuXHRcdFx0Q2hpbGQucHJvdG90eXBlID0gb2JqZWN0Q3JlYXRlKFBhcmVudC5wcm90b3R5cGUpO1xuXHRcdFx0Q2hpbGQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQ2hpbGQ7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gbm9vcCgpIHt9XG5cblx0XHRyZXR1cm4gUHJvbWlzZTtcblx0fTtcbn0pO1xufSh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUgOiBmdW5jdGlvbihmYWN0b3J5KSB7IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpOyB9KSk7XG4iLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuKGZ1bmN0aW9uKGRlZmluZSkgeyAndXNlIHN0cmljdCc7XG5kZWZpbmUoZnVuY3Rpb24ocmVxdWlyZSkge1xuXG5cdHZhciBRdWV1ZSA9IHJlcXVpcmUoJy4vUXVldWUnKTtcblxuXHQvLyBDcmVkaXQgdG8gVHdpc29sIChodHRwczovL2dpdGh1Yi5jb20vVHdpc29sKSBmb3Igc3VnZ2VzdGluZ1xuXHQvLyB0aGlzIHR5cGUgb2YgZXh0ZW5zaWJsZSBxdWV1ZSArIHRyYW1wb2xpbmUgYXBwcm9hY2ggZm9yIG5leHQtdGljayBjb25mbGF0aW9uLlxuXG5cdGZ1bmN0aW9uIFNjaGVkdWxlcihlbnF1ZXVlKSB7XG5cdFx0dGhpcy5fZW5xdWV1ZSA9IGVucXVldWU7XG5cdFx0dGhpcy5faGFuZGxlclF1ZXVlID0gbmV3IFF1ZXVlKDE1KTtcblx0XHR0aGlzLl9hZnRlclF1ZXVlID0gbmV3IFF1ZXVlKDUpO1xuXHRcdHRoaXMuX3J1bm5pbmcgPSBmYWxzZTtcblxuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHR0aGlzLmRyYWluID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRzZWxmLl9kcmFpbigpO1xuXHRcdH07XG5cdH1cblxuXHQvKipcblx0ICogRW5xdWV1ZSBhIHRhc2suIElmIHRoZSBxdWV1ZSBpcyBub3QgY3VycmVudGx5IHNjaGVkdWxlZCB0byBiZVxuXHQgKiBkcmFpbmVkLCBzY2hlZHVsZSBpdC5cblx0ICogQHBhcmFtIHtmdW5jdGlvbn0gdGFza1xuXHQgKi9cblx0U2NoZWR1bGVyLnByb3RvdHlwZS5lbnF1ZXVlID0gZnVuY3Rpb24odGFzaykge1xuXHRcdHRoaXMuX2hhbmRsZXJRdWV1ZS5wdXNoKHRhc2spO1xuXHRcdGlmKCF0aGlzLl9ydW5uaW5nKSB7XG5cdFx0XHR0aGlzLl9ydW5uaW5nID0gdHJ1ZTtcblx0XHRcdHRoaXMuX2VucXVldWUodGhpcy5kcmFpbik7XG5cdFx0fVxuXHR9O1xuXG5cdFNjaGVkdWxlci5wcm90b3R5cGUuYWZ0ZXJRdWV1ZSA9IGZ1bmN0aW9uKGYsIHgsIHkpIHtcblx0XHR0aGlzLl9hZnRlclF1ZXVlLnB1c2goZik7XG5cdFx0dGhpcy5fYWZ0ZXJRdWV1ZS5wdXNoKHgpO1xuXHRcdHRoaXMuX2FmdGVyUXVldWUucHVzaCh5KTtcblx0XHRpZighdGhpcy5fcnVubmluZykge1xuXHRcdFx0dGhpcy5fcnVubmluZyA9IHRydWU7XG5cdFx0XHR0aGlzLl9lbnF1ZXVlKHRoaXMuZHJhaW4pO1xuXHRcdH1cblx0fTtcblxuXHQvKipcblx0ICogRHJhaW4gdGhlIGhhbmRsZXIgcXVldWUgZW50aXJlbHksIGJlaW5nIGNhcmVmdWwgdG8gYWxsb3cgdGhlXG5cdCAqIHF1ZXVlIHRvIGJlIGV4dGVuZGVkIHdoaWxlIGl0IGlzIGJlaW5nIHByb2Nlc3NlZCwgYW5kIHRvIGNvbnRpbnVlXG5cdCAqIHByb2Nlc3NpbmcgdW50aWwgaXQgaXMgdHJ1bHkgZW1wdHkuXG5cdCAqL1xuXHRTY2hlZHVsZXIucHJvdG90eXBlLl9kcmFpbiA9IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBxID0gdGhpcy5faGFuZGxlclF1ZXVlO1xuXHRcdHdoaWxlKHEubGVuZ3RoID4gMCkge1xuXHRcdFx0cS5zaGlmdCgpLnJ1bigpO1xuXHRcdH1cblxuXHRcdHRoaXMuX3J1bm5pbmcgPSBmYWxzZTtcblxuXHRcdHEgPSB0aGlzLl9hZnRlclF1ZXVlO1xuXHRcdHdoaWxlKHEubGVuZ3RoID4gMCkge1xuXHRcdFx0cS5zaGlmdCgpKHEuc2hpZnQoKSwgcS5zaGlmdCgpKTtcblx0XHR9XG5cdH07XG5cblx0cmV0dXJuIFNjaGVkdWxlcjtcblxufSk7XG59KHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZSA6IGZ1bmN0aW9uKGZhY3RvcnkpIHsgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUpOyB9KSk7XG4iLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuKGZ1bmN0aW9uKGRlZmluZSkgeyAndXNlIHN0cmljdCc7XG5kZWZpbmUoZnVuY3Rpb24ocmVxdWlyZSkge1xuXHQvKmdsb2JhbCBzZXRUaW1lb3V0LGNsZWFyVGltZW91dCovXG5cdHZhciBjanNSZXF1aXJlLCB2ZXJ0eCwgc2V0VGltZXIsIGNsZWFyVGltZXI7XG5cblx0Y2pzUmVxdWlyZSA9IHJlcXVpcmU7XG5cblx0dHJ5IHtcblx0XHR2ZXJ0eCA9IGNqc1JlcXVpcmUoJ3ZlcnR4Jyk7XG5cdFx0c2V0VGltZXIgPSBmdW5jdGlvbiAoZiwgbXMpIHsgcmV0dXJuIHZlcnR4LnNldFRpbWVyKG1zLCBmKTsgfTtcblx0XHRjbGVhclRpbWVyID0gdmVydHguY2FuY2VsVGltZXI7XG5cdH0gY2F0Y2ggKGUpIHtcblx0XHRzZXRUaW1lciA9IGZ1bmN0aW9uKGYsIG1zKSB7IHJldHVybiBzZXRUaW1lb3V0KGYsIG1zKTsgfTtcblx0XHRjbGVhclRpbWVyID0gZnVuY3Rpb24odCkgeyByZXR1cm4gY2xlYXJUaW1lb3V0KHQpOyB9O1xuXHR9XG5cblx0cmV0dXJuIHtcblx0XHRzZXQ6IHNldFRpbWVyLFxuXHRcdGNsZWFyOiBjbGVhclRpbWVyXG5cdH07XG5cbn0pO1xufSh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUgOiBmdW5jdGlvbihmYWN0b3J5KSB7IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKTsgfSkpO1xuIiwiLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE0IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG5cbi8qKlxuICogUHJvbWlzZXMvQSsgYW5kIHdoZW4oKSBpbXBsZW1lbnRhdGlvblxuICogd2hlbiBpcyBwYXJ0IG9mIHRoZSBjdWpvSlMgZmFtaWx5IG9mIGxpYnJhcmllcyAoaHR0cDovL2N1am9qcy5jb20vKVxuICogQGF1dGhvciBCcmlhbiBDYXZhbGllclxuICogQGF1dGhvciBKb2huIEhhbm5cbiAqIEB2ZXJzaW9uIDMuMi4zXG4gKi9cbihmdW5jdGlvbihkZWZpbmUpIHsgJ3VzZSBzdHJpY3QnO1xuZGVmaW5lKGZ1bmN0aW9uIChyZXF1aXJlKSB7XG5cblx0dmFyIHRpbWVkID0gcmVxdWlyZSgnLi9saWIvZGVjb3JhdG9ycy90aW1lZCcpO1xuXHR2YXIgYXJyYXkgPSByZXF1aXJlKCcuL2xpYi9kZWNvcmF0b3JzL2FycmF5Jyk7XG5cdHZhciBmbG93ID0gcmVxdWlyZSgnLi9saWIvZGVjb3JhdG9ycy9mbG93Jyk7XG5cdHZhciBmb2xkID0gcmVxdWlyZSgnLi9saWIvZGVjb3JhdG9ycy9mb2xkJyk7XG5cdHZhciBpbnNwZWN0ID0gcmVxdWlyZSgnLi9saWIvZGVjb3JhdG9ycy9pbnNwZWN0Jyk7XG5cdHZhciBnZW5lcmF0ZSA9IHJlcXVpcmUoJy4vbGliL2RlY29yYXRvcnMvaXRlcmF0ZScpO1xuXHR2YXIgcHJvZ3Jlc3MgPSByZXF1aXJlKCcuL2xpYi9kZWNvcmF0b3JzL3Byb2dyZXNzJyk7XG5cdHZhciB3aXRoVGhpcyA9IHJlcXVpcmUoJy4vbGliL2RlY29yYXRvcnMvd2l0aCcpO1xuXHR2YXIgdW5oYW5kbGVkUmVqZWN0aW9uID0gcmVxdWlyZSgnLi9saWIvZGVjb3JhdG9ycy91bmhhbmRsZWRSZWplY3Rpb24nKTtcblx0dmFyIFRpbWVvdXRFcnJvciA9IHJlcXVpcmUoJy4vbGliL1RpbWVvdXRFcnJvcicpO1xuXG5cdHZhciBQcm9taXNlID0gW2FycmF5LCBmbG93LCBmb2xkLCBnZW5lcmF0ZSwgcHJvZ3Jlc3MsXG5cdFx0aW5zcGVjdCwgd2l0aFRoaXMsIHRpbWVkLCB1bmhhbmRsZWRSZWplY3Rpb25dXG5cdFx0LnJlZHVjZShmdW5jdGlvbihQcm9taXNlLCBmZWF0dXJlKSB7XG5cdFx0XHRyZXR1cm4gZmVhdHVyZShQcm9taXNlKTtcblx0XHR9LCByZXF1aXJlKCcuL2xpYi9Qcm9taXNlJykpO1xuXG5cdHZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcblxuXHQvLyBQdWJsaWMgQVBJXG5cblx0d2hlbi5wcm9taXNlICAgICA9IHByb21pc2U7ICAgICAgICAgICAgICAvLyBDcmVhdGUgYSBwZW5kaW5nIHByb21pc2Vcblx0d2hlbi5yZXNvbHZlICAgICA9IFByb21pc2UucmVzb2x2ZTsgICAgICAvLyBDcmVhdGUgYSByZXNvbHZlZCBwcm9taXNlXG5cdHdoZW4ucmVqZWN0ICAgICAgPSBQcm9taXNlLnJlamVjdDsgICAgICAgLy8gQ3JlYXRlIGEgcmVqZWN0ZWQgcHJvbWlzZVxuXG5cdHdoZW4ubGlmdCAgICAgICAgPSBsaWZ0OyAgICAgICAgICAgICAgICAgLy8gbGlmdCBhIGZ1bmN0aW9uIHRvIHJldHVybiBwcm9taXNlc1xuXHR3aGVuWyd0cnknXSAgICAgID0gYXR0ZW1wdDsgICAgICAgICAgICAgIC8vIGNhbGwgYSBmdW5jdGlvbiBhbmQgcmV0dXJuIGEgcHJvbWlzZVxuXHR3aGVuLmF0dGVtcHQgICAgID0gYXR0ZW1wdDsgICAgICAgICAgICAgIC8vIGFsaWFzIGZvciB3aGVuLnRyeVxuXG5cdHdoZW4uaXRlcmF0ZSAgICAgPSBQcm9taXNlLml0ZXJhdGU7ICAgICAgLy8gR2VuZXJhdGUgYSBzdHJlYW0gb2YgcHJvbWlzZXNcblx0d2hlbi51bmZvbGQgICAgICA9IFByb21pc2UudW5mb2xkOyAgICAgICAvLyBHZW5lcmF0ZSBhIHN0cmVhbSBvZiBwcm9taXNlc1xuXG5cdHdoZW4uam9pbiAgICAgICAgPSBqb2luOyAgICAgICAgICAgICAgICAgLy8gSm9pbiAyIG9yIG1vcmUgcHJvbWlzZXNcblxuXHR3aGVuLmFsbCAgICAgICAgID0gYWxsOyAgICAgICAgICAgICAgICAgIC8vIFJlc29sdmUgYSBsaXN0IG9mIHByb21pc2VzXG5cdHdoZW4uc2V0dGxlICAgICAgPSBzZXR0bGU7ICAgICAgICAgICAgICAgLy8gU2V0dGxlIGEgbGlzdCBvZiBwcm9taXNlc1xuXG5cdHdoZW4uYW55ICAgICAgICAgPSBsaWZ0KFByb21pc2UuYW55KTsgICAgLy8gT25lLXdpbm5lciByYWNlXG5cdHdoZW4uc29tZSAgICAgICAgPSBsaWZ0KFByb21pc2Uuc29tZSk7ICAgLy8gTXVsdGktd2lubmVyIHJhY2VcblxuXHR3aGVuLm1hcCAgICAgICAgID0gbWFwOyAgICAgICAgICAgICAgICAgIC8vIEFycmF5Lm1hcCgpIGZvciBwcm9taXNlc1xuXHR3aGVuLnJlZHVjZSAgICAgID0gcmVkdWNlOyAgICAgICAgICAgICAgIC8vIEFycmF5LnJlZHVjZSgpIGZvciBwcm9taXNlc1xuXHR3aGVuLnJlZHVjZVJpZ2h0ID0gcmVkdWNlUmlnaHQ7ICAgICAgICAgIC8vIEFycmF5LnJlZHVjZVJpZ2h0KCkgZm9yIHByb21pc2VzXG5cblx0d2hlbi5pc1Byb21pc2VMaWtlID0gaXNQcm9taXNlTGlrZTsgICAgICAvLyBJcyBzb21ldGhpbmcgcHJvbWlzZS1saWtlLCBha2EgdGhlbmFibGVcblxuXHR3aGVuLlByb21pc2UgICAgID0gUHJvbWlzZTsgICAgICAgICAgICAgIC8vIFByb21pc2UgY29uc3RydWN0b3Jcblx0d2hlbi5kZWZlciAgICAgICA9IGRlZmVyOyAgICAgICAgICAgICAgICAvLyBDcmVhdGUgYSB7cHJvbWlzZSwgcmVzb2x2ZSwgcmVqZWN0fSB0dXBsZVxuXG5cdC8vIEVycm9yIHR5cGVzXG5cblx0d2hlbi5UaW1lb3V0RXJyb3IgPSBUaW1lb3V0RXJyb3I7XG5cblx0LyoqXG5cdCAqIEdldCBhIHRydXN0ZWQgcHJvbWlzZSBmb3IgeCwgb3IgYnkgdHJhbnNmb3JtaW5nIHggd2l0aCBvbkZ1bGZpbGxlZFxuXHQgKlxuXHQgKiBAcGFyYW0geyp9IHhcblx0ICogQHBhcmFtIHtmdW5jdGlvbj99IG9uRnVsZmlsbGVkIGNhbGxiYWNrIHRvIGJlIGNhbGxlZCB3aGVuIHggaXNcblx0ICogICBzdWNjZXNzZnVsbHkgZnVsZmlsbGVkLiAgSWYgcHJvbWlzZU9yVmFsdWUgaXMgYW4gaW1tZWRpYXRlIHZhbHVlLCBjYWxsYmFja1xuXHQgKiAgIHdpbGwgYmUgaW52b2tlZCBpbW1lZGlhdGVseS5cblx0ICogQHBhcmFtIHtmdW5jdGlvbj99IG9uUmVqZWN0ZWQgY2FsbGJhY2sgdG8gYmUgY2FsbGVkIHdoZW4geCBpc1xuXHQgKiAgIHJlamVjdGVkLlxuXHQgKiBAZGVwcmVjYXRlZCBAcGFyYW0ge2Z1bmN0aW9uP30gb25Qcm9ncmVzcyBjYWxsYmFjayB0byBiZSBjYWxsZWQgd2hlbiBwcm9ncmVzcyB1cGRhdGVzXG5cdCAqICAgYXJlIGlzc3VlZCBmb3IgeC5cblx0ICogQHJldHVybnMge1Byb21pc2V9IGEgbmV3IHByb21pc2UgdGhhdCB3aWxsIGZ1bGZpbGwgd2l0aCB0aGUgcmV0dXJuXG5cdCAqICAgdmFsdWUgb2YgY2FsbGJhY2sgb3IgZXJyYmFjayBvciB0aGUgY29tcGxldGlvbiB2YWx1ZSBvZiBwcm9taXNlT3JWYWx1ZSBpZlxuXHQgKiAgIGNhbGxiYWNrIGFuZC9vciBlcnJiYWNrIGlzIG5vdCBzdXBwbGllZC5cblx0ICovXG5cdGZ1bmN0aW9uIHdoZW4oeCwgb25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQpIHtcblx0XHR2YXIgcCA9IFByb21pc2UucmVzb2x2ZSh4KTtcblx0XHRpZihhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuXHRcdFx0cmV0dXJuIHA7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPiAzXG5cdFx0XHQ/IHAudGhlbihvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCwgYXJndW1lbnRzWzNdKVxuXHRcdFx0OiBwLnRoZW4ob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENyZWF0ZXMgYSBuZXcgcHJvbWlzZSB3aG9zZSBmYXRlIGlzIGRldGVybWluZWQgYnkgcmVzb2x2ZXIuXG5cdCAqIEBwYXJhbSB7ZnVuY3Rpb259IHJlc29sdmVyIGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCwgbm90aWZ5KVxuXHQgKiBAcmV0dXJucyB7UHJvbWlzZX0gcHJvbWlzZSB3aG9zZSBmYXRlIGlzIGRldGVybWluZSBieSByZXNvbHZlclxuXHQgKi9cblx0ZnVuY3Rpb24gcHJvbWlzZShyZXNvbHZlcikge1xuXHRcdHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlcik7XG5cdH1cblxuXHQvKipcblx0ICogTGlmdCB0aGUgc3VwcGxpZWQgZnVuY3Rpb24sIGNyZWF0aW5nIGEgdmVyc2lvbiBvZiBmIHRoYXQgcmV0dXJuc1xuXHQgKiBwcm9taXNlcywgYW5kIGFjY2VwdHMgcHJvbWlzZXMgYXMgYXJndW1lbnRzLlxuXHQgKiBAcGFyYW0ge2Z1bmN0aW9ufSBmXG5cdCAqIEByZXR1cm5zIHtGdW5jdGlvbn0gdmVyc2lvbiBvZiBmIHRoYXQgcmV0dXJucyBwcm9taXNlc1xuXHQgKi9cblx0ZnVuY3Rpb24gbGlmdChmKSB7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIF9hcHBseShmLCB0aGlzLCBzbGljZS5jYWxsKGFyZ3VtZW50cykpO1xuXHRcdH07XG5cdH1cblxuXHQvKipcblx0ICogQ2FsbCBmIGluIGEgZnV0dXJlIHR1cm4sIHdpdGggdGhlIHN1cHBsaWVkIGFyZ3MsIGFuZCByZXR1cm4gYSBwcm9taXNlXG5cdCAqIGZvciB0aGUgcmVzdWx0LlxuXHQgKiBAcGFyYW0ge2Z1bmN0aW9ufSBmXG5cdCAqIEByZXR1cm5zIHtQcm9taXNlfVxuXHQgKi9cblx0ZnVuY3Rpb24gYXR0ZW1wdChmIC8qLCBhcmdzLi4uICovKSB7XG5cdFx0Lypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cblx0XHRyZXR1cm4gX2FwcGx5KGYsIHRoaXMsIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG5cdH1cblxuXHQvKipcblx0ICogdHJ5L2xpZnQgaGVscGVyIHRoYXQgYWxsb3dzIHNwZWNpZnlpbmcgdGhpc0FyZ1xuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0ZnVuY3Rpb24gX2FwcGx5KGYsIHRoaXNBcmcsIGFyZ3MpIHtcblx0XHRyZXR1cm4gUHJvbWlzZS5hbGwoYXJncykudGhlbihmdW5jdGlvbihhcmdzKSB7XG5cdFx0XHRyZXR1cm4gZi5hcHBseSh0aGlzQXJnLCBhcmdzKTtcblx0XHR9KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDcmVhdGVzIGEge3Byb21pc2UsIHJlc29sdmVyfSBwYWlyLCBlaXRoZXIgb3IgYm90aCBvZiB3aGljaFxuXHQgKiBtYXkgYmUgZ2l2ZW4gb3V0IHNhZmVseSB0byBjb25zdW1lcnMuXG5cdCAqIEByZXR1cm4ge3twcm9taXNlOiBQcm9taXNlLCByZXNvbHZlOiBmdW5jdGlvbiwgcmVqZWN0OiBmdW5jdGlvbiwgbm90aWZ5OiBmdW5jdGlvbn19XG5cdCAqL1xuXHRmdW5jdGlvbiBkZWZlcigpIHtcblx0XHRyZXR1cm4gbmV3IERlZmVycmVkKCk7XG5cdH1cblxuXHRmdW5jdGlvbiBEZWZlcnJlZCgpIHtcblx0XHR2YXIgcCA9IFByb21pc2UuX2RlZmVyKCk7XG5cblx0XHRmdW5jdGlvbiByZXNvbHZlKHgpIHsgcC5faGFuZGxlci5yZXNvbHZlKHgpOyB9XG5cdFx0ZnVuY3Rpb24gcmVqZWN0KHgpIHsgcC5faGFuZGxlci5yZWplY3QoeCk7IH1cblx0XHRmdW5jdGlvbiBub3RpZnkoeCkgeyBwLl9oYW5kbGVyLm5vdGlmeSh4KTsgfVxuXG5cdFx0dGhpcy5wcm9taXNlID0gcDtcblx0XHR0aGlzLnJlc29sdmUgPSByZXNvbHZlO1xuXHRcdHRoaXMucmVqZWN0ID0gcmVqZWN0O1xuXHRcdHRoaXMubm90aWZ5ID0gbm90aWZ5O1xuXHRcdHRoaXMucmVzb2x2ZXIgPSB7IHJlc29sdmU6IHJlc29sdmUsIHJlamVjdDogcmVqZWN0LCBub3RpZnk6IG5vdGlmeSB9O1xuXHR9XG5cblx0LyoqXG5cdCAqIERldGVybWluZXMgaWYgeCBpcyBwcm9taXNlLWxpa2UsIGkuZS4gYSB0aGVuYWJsZSBvYmplY3Rcblx0ICogTk9URTogV2lsbCByZXR1cm4gdHJ1ZSBmb3IgKmFueSB0aGVuYWJsZSBvYmplY3QqLCBhbmQgaXNuJ3QgdHJ1bHlcblx0ICogc2FmZSwgc2luY2UgaXQgbWF5IGF0dGVtcHQgdG8gYWNjZXNzIHRoZSBgdGhlbmAgcHJvcGVydHkgb2YgeCAoaS5lLlxuXHQgKiAgY2xldmVyL21hbGljaW91cyBnZXR0ZXJzIG1heSBkbyB3ZWlyZCB0aGluZ3MpXG5cdCAqIEBwYXJhbSB7Kn0geCBhbnl0aGluZ1xuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn0gdHJ1ZSBpZiB4IGlzIHByb21pc2UtbGlrZVxuXHQgKi9cblx0ZnVuY3Rpb24gaXNQcm9taXNlTGlrZSh4KSB7XG5cdFx0cmV0dXJuIHggJiYgdHlwZW9mIHgudGhlbiA9PT0gJ2Z1bmN0aW9uJztcblx0fVxuXG5cdC8qKlxuXHQgKiBSZXR1cm4gYSBwcm9taXNlIHRoYXQgd2lsbCByZXNvbHZlIG9ubHkgb25jZSBhbGwgdGhlIHN1cHBsaWVkIGFyZ3VtZW50c1xuXHQgKiBoYXZlIHJlc29sdmVkLiBUaGUgcmVzb2x1dGlvbiB2YWx1ZSBvZiB0aGUgcmV0dXJuZWQgcHJvbWlzZSB3aWxsIGJlIGFuIGFycmF5XG5cdCAqIGNvbnRhaW5pbmcgdGhlIHJlc29sdXRpb24gdmFsdWVzIG9mIGVhY2ggb2YgdGhlIGFyZ3VtZW50cy5cblx0ICogQHBhcmFtIHsuLi4qfSBhcmd1bWVudHMgbWF5IGJlIGEgbWl4IG9mIHByb21pc2VzIGFuZCB2YWx1ZXNcblx0ICogQHJldHVybnMge1Byb21pc2V9XG5cdCAqL1xuXHRmdW5jdGlvbiBqb2luKC8qIC4uLnByb21pc2VzICovKSB7XG5cdFx0cmV0dXJuIFByb21pc2UuYWxsKGFyZ3VtZW50cyk7XG5cdH1cblxuXHQvKipcblx0ICogUmV0dXJuIGEgcHJvbWlzZSB0aGF0IHdpbGwgZnVsZmlsbCBvbmNlIGFsbCBpbnB1dCBwcm9taXNlcyBoYXZlXG5cdCAqIGZ1bGZpbGxlZCwgb3IgcmVqZWN0IHdoZW4gYW55IG9uZSBpbnB1dCBwcm9taXNlIHJlamVjdHMuXG5cdCAqIEBwYXJhbSB7YXJyYXl8UHJvbWlzZX0gcHJvbWlzZXMgYXJyYXkgKG9yIHByb21pc2UgZm9yIGFuIGFycmF5KSBvZiBwcm9taXNlc1xuXHQgKiBAcmV0dXJucyB7UHJvbWlzZX1cblx0ICovXG5cdGZ1bmN0aW9uIGFsbChwcm9taXNlcykge1xuXHRcdHJldHVybiB3aGVuKHByb21pc2VzLCBQcm9taXNlLmFsbCk7XG5cdH1cblxuXHQvKipcblx0ICogUmV0dXJuIGEgcHJvbWlzZSB0aGF0IHdpbGwgYWx3YXlzIGZ1bGZpbGwgd2l0aCBhbiBhcnJheSBjb250YWluaW5nXG5cdCAqIHRoZSBvdXRjb21lIHN0YXRlcyBvZiBhbGwgaW5wdXQgcHJvbWlzZXMuICBUaGUgcmV0dXJuZWQgcHJvbWlzZVxuXHQgKiB3aWxsIG9ubHkgcmVqZWN0IGlmIGBwcm9taXNlc2AgaXRzZWxmIGlzIGEgcmVqZWN0ZWQgcHJvbWlzZS5cblx0ICogQHBhcmFtIHthcnJheXxQcm9taXNlfSBwcm9taXNlcyBhcnJheSAob3IgcHJvbWlzZSBmb3IgYW4gYXJyYXkpIG9mIHByb21pc2VzXG5cdCAqIEByZXR1cm5zIHtQcm9taXNlfVxuXHQgKi9cblx0ZnVuY3Rpb24gc2V0dGxlKHByb21pc2VzKSB7XG5cdFx0cmV0dXJuIHdoZW4ocHJvbWlzZXMsIFByb21pc2Uuc2V0dGxlKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBQcm9taXNlLWF3YXJlIGFycmF5IG1hcCBmdW5jdGlvbiwgc2ltaWxhciB0byBgQXJyYXkucHJvdG90eXBlLm1hcCgpYCxcblx0ICogYnV0IGlucHV0IGFycmF5IG1heSBjb250YWluIHByb21pc2VzIG9yIHZhbHVlcy5cblx0ICogQHBhcmFtIHtBcnJheXxQcm9taXNlfSBwcm9taXNlcyBhcnJheSBvZiBhbnl0aGluZywgbWF5IGNvbnRhaW4gcHJvbWlzZXMgYW5kIHZhbHVlc1xuXHQgKiBAcGFyYW0ge2Z1bmN0aW9ufSBtYXBGdW5jIG1hcCBmdW5jdGlvbiB3aGljaCBtYXkgcmV0dXJuIGEgcHJvbWlzZSBvciB2YWx1ZVxuXHQgKiBAcmV0dXJucyB7UHJvbWlzZX0gcHJvbWlzZSB0aGF0IHdpbGwgZnVsZmlsbCB3aXRoIGFuIGFycmF5IG9mIG1hcHBlZCB2YWx1ZXNcblx0ICogIG9yIHJlamVjdCBpZiBhbnkgaW5wdXQgcHJvbWlzZSByZWplY3RzLlxuXHQgKi9cblx0ZnVuY3Rpb24gbWFwKHByb21pc2VzLCBtYXBGdW5jKSB7XG5cdFx0cmV0dXJuIHdoZW4ocHJvbWlzZXMsIGZ1bmN0aW9uKHByb21pc2VzKSB7XG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5tYXAocHJvbWlzZXMsIG1hcEZ1bmMpO1xuXHRcdH0pO1xuXHR9XG5cblx0LyoqXG5cdCAqIFRyYWRpdGlvbmFsIHJlZHVjZSBmdW5jdGlvbiwgc2ltaWxhciB0byBgQXJyYXkucHJvdG90eXBlLnJlZHVjZSgpYCwgYnV0XG5cdCAqIGlucHV0IG1heSBjb250YWluIHByb21pc2VzIGFuZC9vciB2YWx1ZXMsIGFuZCByZWR1Y2VGdW5jXG5cdCAqIG1heSByZXR1cm4gZWl0aGVyIGEgdmFsdWUgb3IgYSBwcm9taXNlLCAqYW5kKiBpbml0aWFsVmFsdWUgbWF5XG5cdCAqIGJlIGEgcHJvbWlzZSBmb3IgdGhlIHN0YXJ0aW5nIHZhbHVlLlxuXHQgKlxuXHQgKiBAcGFyYW0ge0FycmF5fFByb21pc2V9IHByb21pc2VzIGFycmF5IG9yIHByb21pc2UgZm9yIGFuIGFycmF5IG9mIGFueXRoaW5nLFxuXHQgKiAgICAgIG1heSBjb250YWluIGEgbWl4IG9mIHByb21pc2VzIGFuZCB2YWx1ZXMuXG5cdCAqIEBwYXJhbSB7ZnVuY3Rpb259IGYgcmVkdWNlIGZ1bmN0aW9uIHJlZHVjZShjdXJyZW50VmFsdWUsIG5leHRWYWx1ZSwgaW5kZXgpXG5cdCAqIEByZXR1cm5zIHtQcm9taXNlfSB0aGF0IHdpbGwgcmVzb2x2ZSB0byB0aGUgZmluYWwgcmVkdWNlZCB2YWx1ZVxuXHQgKi9cblx0ZnVuY3Rpb24gcmVkdWNlKHByb21pc2VzLCBmIC8qLCBpbml0aWFsVmFsdWUgKi8pIHtcblx0XHQvKmpzaGludCB1bnVzZWQ6ZmFsc2UqL1xuXHRcdHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuXHRcdHJldHVybiB3aGVuKHByb21pc2VzLCBmdW5jdGlvbihhcnJheSkge1xuXHRcdFx0YXJncy51bnNoaWZ0KGFycmF5KTtcblx0XHRcdHJldHVybiBQcm9taXNlLnJlZHVjZS5hcHBseShQcm9taXNlLCBhcmdzKTtcblx0XHR9KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBUcmFkaXRpb25hbCByZWR1Y2UgZnVuY3Rpb24sIHNpbWlsYXIgdG8gYEFycmF5LnByb3RvdHlwZS5yZWR1Y2VSaWdodCgpYCwgYnV0XG5cdCAqIGlucHV0IG1heSBjb250YWluIHByb21pc2VzIGFuZC9vciB2YWx1ZXMsIGFuZCByZWR1Y2VGdW5jXG5cdCAqIG1heSByZXR1cm4gZWl0aGVyIGEgdmFsdWUgb3IgYSBwcm9taXNlLCAqYW5kKiBpbml0aWFsVmFsdWUgbWF5XG5cdCAqIGJlIGEgcHJvbWlzZSBmb3IgdGhlIHN0YXJ0aW5nIHZhbHVlLlxuXHQgKlxuXHQgKiBAcGFyYW0ge0FycmF5fFByb21pc2V9IHByb21pc2VzIGFycmF5IG9yIHByb21pc2UgZm9yIGFuIGFycmF5IG9mIGFueXRoaW5nLFxuXHQgKiAgICAgIG1heSBjb250YWluIGEgbWl4IG9mIHByb21pc2VzIGFuZCB2YWx1ZXMuXG5cdCAqIEBwYXJhbSB7ZnVuY3Rpb259IGYgcmVkdWNlIGZ1bmN0aW9uIHJlZHVjZShjdXJyZW50VmFsdWUsIG5leHRWYWx1ZSwgaW5kZXgpXG5cdCAqIEByZXR1cm5zIHtQcm9taXNlfSB0aGF0IHdpbGwgcmVzb2x2ZSB0byB0aGUgZmluYWwgcmVkdWNlZCB2YWx1ZVxuXHQgKi9cblx0ZnVuY3Rpb24gcmVkdWNlUmlnaHQocHJvbWlzZXMsIGYgLyosIGluaXRpYWxWYWx1ZSAqLykge1xuXHRcdC8qanNoaW50IHVudXNlZDpmYWxzZSovXG5cdFx0dmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG5cdFx0cmV0dXJuIHdoZW4ocHJvbWlzZXMsIGZ1bmN0aW9uKGFycmF5KSB7XG5cdFx0XHRhcmdzLnVuc2hpZnQoYXJyYXkpO1xuXHRcdFx0cmV0dXJuIFByb21pc2UucmVkdWNlUmlnaHQuYXBwbHkoUHJvbWlzZSwgYXJncyk7XG5cdFx0fSk7XG5cdH1cblxuXHRyZXR1cm4gd2hlbjtcbn0pO1xufSkodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lIDogZnVuY3Rpb24gKGZhY3RvcnkpIHsgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUpOyB9KTtcbiIsIi8qZ2xvYmFsIG1vZHVsZTp0cnVlLCByZXF1aXJlOmZhbHNlKi9cblxudmFyIGJhbmUgPSByZXF1aXJlKFwiYmFuZVwiKTtcbnZhciB3ZWJzb2NrZXQgPSByZXF1aXJlKFwiLi4vbGliL3dlYnNvY2tldC9cIik7XG52YXIgd2hlbiA9IHJlcXVpcmUoXCJ3aGVuXCIpO1xuXG5mdW5jdGlvbiBNb3BpZHkoc2V0dGluZ3MpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgTW9waWR5KSkge1xuICAgICAgICByZXR1cm4gbmV3IE1vcGlkeShzZXR0aW5ncyk7XG4gICAgfVxuXG4gICAgdGhpcy5fY29uc29sZSA9IHRoaXMuX2dldENvbnNvbGUoc2V0dGluZ3MgfHwge30pO1xuICAgIHRoaXMuX3NldHRpbmdzID0gdGhpcy5fY29uZmlndXJlKHNldHRpbmdzIHx8IHt9KTtcblxuICAgIHRoaXMuX2JhY2tvZmZEZWxheSA9IHRoaXMuX3NldHRpbmdzLmJhY2tvZmZEZWxheU1pbjtcbiAgICB0aGlzLl9wZW5kaW5nUmVxdWVzdHMgPSB7fTtcbiAgICB0aGlzLl93ZWJTb2NrZXQgPSBudWxsO1xuXG4gICAgYmFuZS5jcmVhdGVFdmVudEVtaXR0ZXIodGhpcyk7XG4gICAgdGhpcy5fZGVsZWdhdGVFdmVudHMoKTtcblxuICAgIGlmICh0aGlzLl9zZXR0aW5ncy5hdXRvQ29ubmVjdCkge1xuICAgICAgICB0aGlzLmNvbm5lY3QoKTtcbiAgICB9XG59XG5cbk1vcGlkeS5Db25uZWN0aW9uRXJyb3IgPSBmdW5jdGlvbiAobWVzc2FnZSkge1xuICAgIHRoaXMubmFtZSA9IFwiQ29ubmVjdGlvbkVycm9yXCI7XG4gICAgdGhpcy5tZXNzYWdlID0gbWVzc2FnZTtcbn07XG5Nb3BpZHkuQ29ubmVjdGlvbkVycm9yLnByb3RvdHlwZSA9IG5ldyBFcnJvcigpO1xuTW9waWR5LkNvbm5lY3Rpb25FcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBNb3BpZHkuQ29ubmVjdGlvbkVycm9yO1xuXG5Nb3BpZHkuU2VydmVyRXJyb3IgPSBmdW5jdGlvbiAobWVzc2FnZSkge1xuICAgIHRoaXMubmFtZSA9IFwiU2VydmVyRXJyb3JcIjtcbiAgICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xufTtcbk1vcGlkeS5TZXJ2ZXJFcnJvci5wcm90b3R5cGUgPSBuZXcgRXJyb3IoKTtcbk1vcGlkeS5TZXJ2ZXJFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBNb3BpZHkuU2VydmVyRXJyb3I7XG5cbk1vcGlkeS5XZWJTb2NrZXQgPSB3ZWJzb2NrZXQuQ2xpZW50O1xuXG5Nb3BpZHkucHJvdG90eXBlLl9nZXRDb25zb2xlID0gZnVuY3Rpb24gKHNldHRpbmdzKSB7XG4gICAgaWYgKHR5cGVvZiBzZXR0aW5ncy5jb25zb2xlICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIHJldHVybiBzZXR0aW5ncy5jb25zb2xlO1xuICAgIH1cblxuICAgIHZhciBjb24gPSB0eXBlb2YgY29uc29sZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBjb25zb2xlIHx8IHt9O1xuXG4gICAgY29uLmxvZyA9IGNvbi5sb2cgfHwgZnVuY3Rpb24gKCkge307XG4gICAgY29uLndhcm4gPSBjb24ud2FybiB8fCBmdW5jdGlvbiAoKSB7fTtcbiAgICBjb24uZXJyb3IgPSBjb24uZXJyb3IgfHwgZnVuY3Rpb24gKCkge307XG5cbiAgICByZXR1cm4gY29uO1xufTtcblxuTW9waWR5LnByb3RvdHlwZS5fY29uZmlndXJlID0gZnVuY3Rpb24gKHNldHRpbmdzKSB7XG4gICAgdmFyIGN1cnJlbnRIb3N0ID0gKHR5cGVvZiBkb2N1bWVudCAhPT0gXCJ1bmRlZmluZWRcIiAmJlxuICAgICAgICBkb2N1bWVudC5sb2NhdGlvbi5ob3N0KSB8fCBcImxvY2FsaG9zdFwiO1xuICAgIHNldHRpbmdzLndlYlNvY2tldFVybCA9IHNldHRpbmdzLndlYlNvY2tldFVybCB8fFxuICAgICAgICBcIndzOi8vXCIgKyBjdXJyZW50SG9zdCArIFwiL21vcGlkeS93c1wiO1xuXG4gICAgaWYgKHNldHRpbmdzLmF1dG9Db25uZWN0ICE9PSBmYWxzZSkge1xuICAgICAgICBzZXR0aW5ncy5hdXRvQ29ubmVjdCA9IHRydWU7XG4gICAgfVxuXG4gICAgc2V0dGluZ3MuYmFja29mZkRlbGF5TWluID0gc2V0dGluZ3MuYmFja29mZkRlbGF5TWluIHx8IDEwMDA7XG4gICAgc2V0dGluZ3MuYmFja29mZkRlbGF5TWF4ID0gc2V0dGluZ3MuYmFja29mZkRlbGF5TWF4IHx8IDY0MDAwO1xuXG4gICAgaWYgKHR5cGVvZiBzZXR0aW5ncy5jYWxsaW5nQ29udmVudGlvbiA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICB0aGlzLl9jb25zb2xlLndhcm4oXG4gICAgICAgICAgICBcIk1vcGlkeS5qcyBpcyB1c2luZyB0aGUgZGVmYXVsdCBjYWxsaW5nIGNvbnZlbnRpb24uIFRoZSBcIiArXG4gICAgICAgICAgICBcImRlZmF1bHQgd2lsbCBjaGFuZ2UgaW4gdGhlIGZ1dHVyZS4gWW91IHNob3VsZCBleHBsaWNpdGx5IFwiICtcbiAgICAgICAgICAgIFwic3BlY2lmeSB3aGljaCBjYWxsaW5nIGNvbnZlbnRpb24geW91IHVzZS5cIik7XG4gICAgfVxuICAgIHNldHRpbmdzLmNhbGxpbmdDb252ZW50aW9uID0gKFxuICAgICAgICBzZXR0aW5ncy5jYWxsaW5nQ29udmVudGlvbiB8fCBcImJ5LXBvc2l0aW9uLW9ubHlcIik7XG5cbiAgICByZXR1cm4gc2V0dGluZ3M7XG59O1xuXG5Nb3BpZHkucHJvdG90eXBlLl9kZWxlZ2F0ZUV2ZW50cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBSZW1vdmUgZXhpc3RpbmcgZXZlbnQgaGFuZGxlcnNcbiAgICB0aGlzLm9mZihcIndlYnNvY2tldDpjbG9zZVwiKTtcbiAgICB0aGlzLm9mZihcIndlYnNvY2tldDplcnJvclwiKTtcbiAgICB0aGlzLm9mZihcIndlYnNvY2tldDppbmNvbWluZ01lc3NhZ2VcIik7XG4gICAgdGhpcy5vZmYoXCJ3ZWJzb2NrZXQ6b3BlblwiKTtcbiAgICB0aGlzLm9mZihcInN0YXRlOm9mZmxpbmVcIik7XG5cbiAgICAvLyBSZWdpc3RlciBiYXNpYyBzZXQgb2YgZXZlbnQgaGFuZGxlcnNcbiAgICB0aGlzLm9uKFwid2Vic29ja2V0OmNsb3NlXCIsIHRoaXMuX2NsZWFudXApO1xuICAgIHRoaXMub24oXCJ3ZWJzb2NrZXQ6ZXJyb3JcIiwgdGhpcy5faGFuZGxlV2ViU29ja2V0RXJyb3IpO1xuICAgIHRoaXMub24oXCJ3ZWJzb2NrZXQ6aW5jb21pbmdNZXNzYWdlXCIsIHRoaXMuX2hhbmRsZU1lc3NhZ2UpO1xuICAgIHRoaXMub24oXCJ3ZWJzb2NrZXQ6b3BlblwiLCB0aGlzLl9yZXNldEJhY2tvZmZEZWxheSk7XG4gICAgdGhpcy5vbihcIndlYnNvY2tldDpvcGVuXCIsIHRoaXMuX2dldEFwaVNwZWMpO1xuICAgIHRoaXMub24oXCJzdGF0ZTpvZmZsaW5lXCIsIHRoaXMuX3JlY29ubmVjdCk7XG59O1xuXG5Nb3BpZHkucHJvdG90eXBlLmNvbm5lY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuX3dlYlNvY2tldCkge1xuICAgICAgICBpZiAodGhpcy5fd2ViU29ja2V0LnJlYWR5U3RhdGUgPT09IE1vcGlkeS5XZWJTb2NrZXQuT1BFTikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fd2ViU29ja2V0LmNsb3NlKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLl93ZWJTb2NrZXQgPSB0aGlzLl9zZXR0aW5ncy53ZWJTb2NrZXQgfHxcbiAgICAgICAgbmV3IE1vcGlkeS5XZWJTb2NrZXQodGhpcy5fc2V0dGluZ3Mud2ViU29ja2V0VXJsKTtcblxuICAgIHRoaXMuX3dlYlNvY2tldC5vbmNsb3NlID0gZnVuY3Rpb24gKGNsb3NlKSB7XG4gICAgICAgIHRoaXMuZW1pdChcIndlYnNvY2tldDpjbG9zZVwiLCBjbG9zZSk7XG4gICAgfS5iaW5kKHRoaXMpO1xuXG4gICAgdGhpcy5fd2ViU29ja2V0Lm9uZXJyb3IgPSBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgdGhpcy5lbWl0KFwid2Vic29ja2V0OmVycm9yXCIsIGVycm9yKTtcbiAgICB9LmJpbmQodGhpcyk7XG5cbiAgICB0aGlzLl93ZWJTb2NrZXQub25vcGVuID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmVtaXQoXCJ3ZWJzb2NrZXQ6b3BlblwiKTtcbiAgICB9LmJpbmQodGhpcyk7XG5cbiAgICB0aGlzLl93ZWJTb2NrZXQub25tZXNzYWdlID0gZnVuY3Rpb24gKG1lc3NhZ2UpIHtcbiAgICAgICAgdGhpcy5lbWl0KFwid2Vic29ja2V0OmluY29taW5nTWVzc2FnZVwiLCBtZXNzYWdlKTtcbiAgICB9LmJpbmQodGhpcyk7XG59O1xuXG5Nb3BpZHkucHJvdG90eXBlLl9jbGVhbnVwID0gZnVuY3Rpb24gKGNsb3NlRXZlbnQpIHtcbiAgICBPYmplY3Qua2V5cyh0aGlzLl9wZW5kaW5nUmVxdWVzdHMpLmZvckVhY2goZnVuY3Rpb24gKHJlcXVlc3RJZCkge1xuICAgICAgICB2YXIgcmVzb2x2ZXIgPSB0aGlzLl9wZW5kaW5nUmVxdWVzdHNbcmVxdWVzdElkXTtcbiAgICAgICAgZGVsZXRlIHRoaXMuX3BlbmRpbmdSZXF1ZXN0c1tyZXF1ZXN0SWRdO1xuICAgICAgICB2YXIgZXJyb3IgPSBuZXcgTW9waWR5LkNvbm5lY3Rpb25FcnJvcihcIldlYlNvY2tldCBjbG9zZWRcIik7XG4gICAgICAgIGVycm9yLmNsb3NlRXZlbnQgPSBjbG9zZUV2ZW50O1xuICAgICAgICByZXNvbHZlci5yZWplY3QoZXJyb3IpO1xuICAgIH0uYmluZCh0aGlzKSk7XG5cbiAgICB0aGlzLmVtaXQoXCJzdGF0ZTpvZmZsaW5lXCIpO1xufTtcblxuTW9waWR5LnByb3RvdHlwZS5fcmVjb25uZWN0ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZW1pdChcInJlY29ubmVjdGlvblBlbmRpbmdcIiwge1xuICAgICAgICB0aW1lVG9BdHRlbXB0OiB0aGlzLl9iYWNrb2ZmRGVsYXlcbiAgICB9KTtcblxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmVtaXQoXCJyZWNvbm5lY3RpbmdcIik7XG4gICAgICAgIHRoaXMuY29ubmVjdCgpO1xuICAgIH0uYmluZCh0aGlzKSwgdGhpcy5fYmFja29mZkRlbGF5KTtcblxuICAgIHRoaXMuX2JhY2tvZmZEZWxheSA9IHRoaXMuX2JhY2tvZmZEZWxheSAqIDI7XG4gICAgaWYgKHRoaXMuX2JhY2tvZmZEZWxheSA+IHRoaXMuX3NldHRpbmdzLmJhY2tvZmZEZWxheU1heCkge1xuICAgICAgICB0aGlzLl9iYWNrb2ZmRGVsYXkgPSB0aGlzLl9zZXR0aW5ncy5iYWNrb2ZmRGVsYXlNYXg7XG4gICAgfVxufTtcblxuTW9waWR5LnByb3RvdHlwZS5fcmVzZXRCYWNrb2ZmRGVsYXkgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fYmFja29mZkRlbGF5ID0gdGhpcy5fc2V0dGluZ3MuYmFja29mZkRlbGF5TWluO1xufTtcblxuTW9waWR5LnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLm9mZihcInN0YXRlOm9mZmxpbmVcIiwgdGhpcy5fcmVjb25uZWN0KTtcbiAgICB0aGlzLl93ZWJTb2NrZXQuY2xvc2UoKTtcbn07XG5cbk1vcGlkeS5wcm90b3R5cGUuX2hhbmRsZVdlYlNvY2tldEVycm9yID0gZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgdGhpcy5fY29uc29sZS53YXJuKFwiV2ViU29ja2V0IGVycm9yOlwiLCBlcnJvci5zdGFjayB8fCBlcnJvcik7XG59O1xuXG5Nb3BpZHkucHJvdG90eXBlLl9zZW5kID0gZnVuY3Rpb24gKG1lc3NhZ2UpIHtcbiAgICBzd2l0Y2ggKHRoaXMuX3dlYlNvY2tldC5yZWFkeVN0YXRlKSB7XG4gICAgY2FzZSBNb3BpZHkuV2ViU29ja2V0LkNPTk5FQ1RJTkc6XG4gICAgICAgIHJldHVybiB3aGVuLnJlamVjdChcbiAgICAgICAgICAgIG5ldyBNb3BpZHkuQ29ubmVjdGlvbkVycm9yKFwiV2ViU29ja2V0IGlzIHN0aWxsIGNvbm5lY3RpbmdcIikpO1xuICAgIGNhc2UgTW9waWR5LldlYlNvY2tldC5DTE9TSU5HOlxuICAgICAgICByZXR1cm4gd2hlbi5yZWplY3QoXG4gICAgICAgICAgICBuZXcgTW9waWR5LkNvbm5lY3Rpb25FcnJvcihcIldlYlNvY2tldCBpcyBjbG9zaW5nXCIpKTtcbiAgICBjYXNlIE1vcGlkeS5XZWJTb2NrZXQuQ0xPU0VEOlxuICAgICAgICByZXR1cm4gd2hlbi5yZWplY3QoXG4gICAgICAgICAgICBuZXcgTW9waWR5LkNvbm5lY3Rpb25FcnJvcihcIldlYlNvY2tldCBpcyBjbG9zZWRcIikpO1xuICAgIGRlZmF1bHQ6XG4gICAgICAgIHZhciBkZWZlcnJlZCA9IHdoZW4uZGVmZXIoKTtcbiAgICAgICAgbWVzc2FnZS5qc29ucnBjID0gXCIyLjBcIjtcbiAgICAgICAgbWVzc2FnZS5pZCA9IHRoaXMuX25leHRSZXF1ZXN0SWQoKTtcbiAgICAgICAgdGhpcy5fcGVuZGluZ1JlcXVlc3RzW21lc3NhZ2UuaWRdID0gZGVmZXJyZWQucmVzb2x2ZXI7XG4gICAgICAgIHRoaXMuX3dlYlNvY2tldC5zZW5kKEpTT04uc3RyaW5naWZ5KG1lc3NhZ2UpKTtcbiAgICAgICAgdGhpcy5lbWl0KFwid2Vic29ja2V0Om91dGdvaW5nTWVzc2FnZVwiLCBtZXNzYWdlKTtcbiAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgfVxufTtcblxuTW9waWR5LnByb3RvdHlwZS5fbmV4dFJlcXVlc3RJZCA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGxhc3RVc2VkID0gLTE7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGFzdFVzZWQgKz0gMTtcbiAgICAgICAgcmV0dXJuIGxhc3RVc2VkO1xuICAgIH07XG59KCkpO1xuXG5Nb3BpZHkucHJvdG90eXBlLl9oYW5kbGVNZXNzYWdlID0gZnVuY3Rpb24gKG1lc3NhZ2UpIHtcbiAgICB0cnkge1xuICAgICAgICB2YXIgZGF0YSA9IEpTT04ucGFyc2UobWVzc2FnZS5kYXRhKTtcbiAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoXCJpZFwiKSkge1xuICAgICAgICAgICAgdGhpcy5faGFuZGxlUmVzcG9uc2UoZGF0YSk7XG4gICAgICAgIH0gZWxzZSBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eShcImV2ZW50XCIpKSB7XG4gICAgICAgICAgICB0aGlzLl9oYW5kbGVFdmVudChkYXRhKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2NvbnNvbGUud2FybihcbiAgICAgICAgICAgICAgICBcIlVua25vd24gbWVzc2FnZSB0eXBlIHJlY2VpdmVkLiBNZXNzYWdlIHdhczogXCIgK1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UuZGF0YSk7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBTeW50YXhFcnJvcikge1xuICAgICAgICAgICAgdGhpcy5fY29uc29sZS53YXJuKFxuICAgICAgICAgICAgICAgIFwiV2ViU29ja2V0IG1lc3NhZ2UgcGFyc2luZyBmYWlsZWQuIE1lc3NhZ2Ugd2FzOiBcIiArXG4gICAgICAgICAgICAgICAgbWVzc2FnZS5kYXRhKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuTW9waWR5LnByb3RvdHlwZS5faGFuZGxlUmVzcG9uc2UgPSBmdW5jdGlvbiAocmVzcG9uc2VNZXNzYWdlKSB7XG4gICAgaWYgKCF0aGlzLl9wZW5kaW5nUmVxdWVzdHMuaGFzT3duUHJvcGVydHkocmVzcG9uc2VNZXNzYWdlLmlkKSkge1xuICAgICAgICB0aGlzLl9jb25zb2xlLndhcm4oXG4gICAgICAgICAgICBcIlVuZXhwZWN0ZWQgcmVzcG9uc2UgcmVjZWl2ZWQuIE1lc3NhZ2Ugd2FzOlwiLCByZXNwb25zZU1lc3NhZ2UpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGVycm9yO1xuICAgIHZhciByZXNvbHZlciA9IHRoaXMuX3BlbmRpbmdSZXF1ZXN0c1tyZXNwb25zZU1lc3NhZ2UuaWRdO1xuICAgIGRlbGV0ZSB0aGlzLl9wZW5kaW5nUmVxdWVzdHNbcmVzcG9uc2VNZXNzYWdlLmlkXTtcblxuICAgIGlmIChyZXNwb25zZU1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJyZXN1bHRcIikpIHtcbiAgICAgICAgcmVzb2x2ZXIucmVzb2x2ZShyZXNwb25zZU1lc3NhZ2UucmVzdWx0KTtcbiAgICB9IGVsc2UgaWYgKHJlc3BvbnNlTWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcImVycm9yXCIpKSB7XG4gICAgICAgIGVycm9yID0gbmV3IE1vcGlkeS5TZXJ2ZXJFcnJvcihyZXNwb25zZU1lc3NhZ2UuZXJyb3IubWVzc2FnZSk7XG4gICAgICAgIGVycm9yLmNvZGUgPSByZXNwb25zZU1lc3NhZ2UuZXJyb3IuY29kZTtcbiAgICAgICAgZXJyb3IuZGF0YSA9IHJlc3BvbnNlTWVzc2FnZS5lcnJvci5kYXRhO1xuICAgICAgICByZXNvbHZlci5yZWplY3QoZXJyb3IpO1xuICAgICAgICB0aGlzLl9jb25zb2xlLndhcm4oXCJTZXJ2ZXIgcmV0dXJuZWQgZXJyb3I6XCIsIHJlc3BvbnNlTWVzc2FnZS5lcnJvcik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoXCJSZXNwb25zZSB3aXRob3V0ICdyZXN1bHQnIG9yICdlcnJvcicgcmVjZWl2ZWRcIik7XG4gICAgICAgIGVycm9yLmRhdGEgPSB7cmVzcG9uc2U6IHJlc3BvbnNlTWVzc2FnZX07XG4gICAgICAgIHJlc29sdmVyLnJlamVjdChlcnJvcik7XG4gICAgICAgIHRoaXMuX2NvbnNvbGUud2FybihcbiAgICAgICAgICAgIFwiUmVzcG9uc2Ugd2l0aG91dCAncmVzdWx0JyBvciAnZXJyb3InIHJlY2VpdmVkLiBNZXNzYWdlIHdhczpcIixcbiAgICAgICAgICAgIHJlc3BvbnNlTWVzc2FnZSk7XG4gICAgfVxufTtcblxuTW9waWR5LnByb3RvdHlwZS5faGFuZGxlRXZlbnQgPSBmdW5jdGlvbiAoZXZlbnRNZXNzYWdlKSB7XG4gICAgdmFyIHR5cGUgPSBldmVudE1lc3NhZ2UuZXZlbnQ7XG4gICAgdmFyIGRhdGEgPSBldmVudE1lc3NhZ2U7XG4gICAgZGVsZXRlIGRhdGEuZXZlbnQ7XG5cbiAgICB0aGlzLmVtaXQoXCJldmVudDpcIiArIHRoaXMuX3NuYWtlVG9DYW1lbCh0eXBlKSwgZGF0YSk7XG59O1xuXG5Nb3BpZHkucHJvdG90eXBlLl9nZXRBcGlTcGVjID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9zZW5kKHttZXRob2Q6IFwiY29yZS5kZXNjcmliZVwifSlcbiAgICAgICAgLnRoZW4odGhpcy5fY3JlYXRlQXBpLmJpbmQodGhpcykpXG4gICAgICAgIC5jYXRjaCh0aGlzLl9oYW5kbGVXZWJTb2NrZXRFcnJvcik7XG59O1xuXG5Nb3BpZHkucHJvdG90eXBlLl9jcmVhdGVBcGkgPSBmdW5jdGlvbiAobWV0aG9kcykge1xuICAgIHZhciBieVBvc2l0aW9uT3JCeU5hbWUgPSAoXG4gICAgICAgIHRoaXMuX3NldHRpbmdzLmNhbGxpbmdDb252ZW50aW9uID09PSBcImJ5LXBvc2l0aW9uLW9yLWJ5LW5hbWVcIik7XG5cbiAgICB2YXIgY2FsbGVyID0gZnVuY3Rpb24gKG1ldGhvZCkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSB7bWV0aG9kOiBtZXRob2R9O1xuICAgICAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fc2VuZChtZXNzYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghYnlQb3NpdGlvbk9yQnlOYW1lKSB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5wYXJhbXMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9zZW5kKG1lc3NhZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHdoZW4ucmVqZWN0KG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgICAgICAgXCJFeHBlY3RlZCB6ZXJvIGFyZ3VtZW50cywgYSBzaW5nbGUgYXJyYXksIFwiICtcbiAgICAgICAgICAgICAgICAgICAgXCJvciBhIHNpbmdsZSBvYmplY3QuXCIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShhcmd1bWVudHNbMF0pICYmXG4gICAgICAgICAgICAgICAgYXJndW1lbnRzWzBdICE9PSBPYmplY3QoYXJndW1lbnRzWzBdKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB3aGVuLnJlamVjdChuZXcgVHlwZUVycm9yKFxuICAgICAgICAgICAgICAgICAgICBcIkV4cGVjdGVkIGFuIGFycmF5IG9yIGFuIG9iamVjdC5cIikpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbWVzc2FnZS5wYXJhbXMgPSBhcmd1bWVudHNbMF07XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc2VuZChtZXNzYWdlKTtcbiAgICAgICAgfS5iaW5kKHRoaXMpO1xuICAgIH0uYmluZCh0aGlzKTtcblxuICAgIHZhciBnZXRQYXRoID0gZnVuY3Rpb24gKGZ1bGxOYW1lKSB7XG4gICAgICAgIHZhciBwYXRoID0gZnVsbE5hbWUuc3BsaXQoXCIuXCIpO1xuICAgICAgICBpZiAocGF0aC5sZW5ndGggPj0gMSAmJiBwYXRoWzBdID09PSBcImNvcmVcIikge1xuICAgICAgICAgICAgcGF0aCA9IHBhdGguc2xpY2UoMSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBhdGg7XG4gICAgfTtcblxuICAgIHZhciBjcmVhdGVPYmplY3RzID0gZnVuY3Rpb24gKG9ialBhdGgpIHtcbiAgICAgICAgdmFyIHBhcmVudE9iaiA9IHRoaXM7XG4gICAgICAgIG9ialBhdGguZm9yRWFjaChmdW5jdGlvbiAob2JqTmFtZSkge1xuICAgICAgICAgICAgb2JqTmFtZSA9IHRoaXMuX3NuYWtlVG9DYW1lbChvYmpOYW1lKTtcbiAgICAgICAgICAgIHBhcmVudE9ialtvYmpOYW1lXSA9IHBhcmVudE9ialtvYmpOYW1lXSB8fCB7fTtcbiAgICAgICAgICAgIHBhcmVudE9iaiA9IHBhcmVudE9ialtvYmpOYW1lXTtcbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgcmV0dXJuIHBhcmVudE9iajtcbiAgICB9LmJpbmQodGhpcyk7XG5cbiAgICB2YXIgY3JlYXRlTWV0aG9kID0gZnVuY3Rpb24gKGZ1bGxNZXRob2ROYW1lKSB7XG4gICAgICAgIHZhciBtZXRob2RQYXRoID0gZ2V0UGF0aChmdWxsTWV0aG9kTmFtZSk7XG4gICAgICAgIHZhciBtZXRob2ROYW1lID0gdGhpcy5fc25ha2VUb0NhbWVsKG1ldGhvZFBhdGguc2xpY2UoLTEpWzBdKTtcbiAgICAgICAgdmFyIG9iamVjdCA9IGNyZWF0ZU9iamVjdHMobWV0aG9kUGF0aC5zbGljZSgwLCAtMSkpO1xuICAgICAgICBvYmplY3RbbWV0aG9kTmFtZV0gPSBjYWxsZXIoZnVsbE1ldGhvZE5hbWUpO1xuICAgICAgICBvYmplY3RbbWV0aG9kTmFtZV0uZGVzY3JpcHRpb24gPSBtZXRob2RzW2Z1bGxNZXRob2ROYW1lXS5kZXNjcmlwdGlvbjtcbiAgICAgICAgb2JqZWN0W21ldGhvZE5hbWVdLnBhcmFtcyA9IG1ldGhvZHNbZnVsbE1ldGhvZE5hbWVdLnBhcmFtcztcbiAgICB9LmJpbmQodGhpcyk7XG5cbiAgICBPYmplY3Qua2V5cyhtZXRob2RzKS5mb3JFYWNoKGNyZWF0ZU1ldGhvZCk7XG4gICAgdGhpcy5lbWl0KFwic3RhdGU6b25saW5lXCIpO1xufTtcblxuTW9waWR5LnByb3RvdHlwZS5fc25ha2VUb0NhbWVsID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICByZXR1cm4gbmFtZS5yZXBsYWNlKC8oX1thLXpdKS9nLCBmdW5jdGlvbiAobWF0Y2gpIHtcbiAgICAgICAgcmV0dXJuIG1hdGNoLnRvVXBwZXJDYXNlKCkucmVwbGFjZShcIl9cIiwgXCJcIik7XG4gICAgfSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1vcGlkeTtcbiIsInZhciB0ZW1wbGF0ZXIgPSByZXF1aXJlKFwiaGFuZGxlYmFycy9ydW50aW1lXCIpLmRlZmF1bHQudGVtcGxhdGU7bW9kdWxlLmV4cG9ydHMgPSB0ZW1wbGF0ZXIoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJcXG48bGkgY2xhc3M9XFxcInRyYWNrX2xpc3RfaXRlbSBlbXB0eS1saXN0XFxcIj5ObyBBbGJ1bXM8L2xpPlxcblwiO1xuICB9XG5cbiAgc3RhY2sxID0gaGVscGVycy51bmxlc3MuY2FsbChkZXB0aDAsIChkZXB0aDAgJiYgZGVwdGgwLmNvbGxlY3Rpb24pLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pOyIsInZhciB0ZW1wbGF0ZXIgPSByZXF1aXJlKFwiaGFuZGxlYmFycy9ydW50aW1lXCIpLmRlZmF1bHQudGVtcGxhdGU7bW9kdWxlLmV4cG9ydHMgPSB0ZW1wbGF0ZXIoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGhlbHBlciwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cblxuICBidWZmZXIgKz0gXCI8c3BhbiBjbGFzcz1cXFwiYWxidW1fdGl0bGVcXFwiPlwiO1xuICBpZiAoaGVscGVyID0gaGVscGVycy5uYW1lKSB7IHN0YWNrMSA9IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IGhlbHBlciA9IChkZXB0aDAgJiYgZGVwdGgwLm5hbWUpOyBzdGFjazEgPSB0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pIDogaGVscGVyOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPC9zcGFuPiA8c3BhbiBjbGFzcz1cXFwiYWxidW1fYXJ0aXN0XFxcIj5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSAoZGVwdGgwICYmIGRlcHRoMC5hcnRpc3RzKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMVswXSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubmFtZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9zcGFuPlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KTsiLCJ2YXIgdGVtcGxhdGVyID0gcmVxdWlyZShcImhhbmRsZWJhcnMvcnVudGltZVwiKS5kZWZhdWx0LnRlbXBsYXRlO21vZHVsZS5leHBvcnRzID0gdGVtcGxhdGVyKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbjtcblxuXG4gIGJ1ZmZlciArPSBcIjxpbWcgc3JjPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSAoZGVwdGgwICYmIGRlcHRoMC5pbWFnZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazFbMl0pKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxWycjdGV4dCddKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KTsiLCJ2YXIgdGVtcGxhdGVyID0gcmVxdWlyZShcImhhbmRsZWJhcnMvcnVudGltZVwiKS5kZWZhdWx0LnRlbXBsYXRlO21vZHVsZS5leHBvcnRzID0gdGVtcGxhdGVyKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICBcblxuXG4gIHJldHVybiBcIjxkaXYgY2xhc3M9XFxcImNvbHVtbnMgb25lLWhhbGZcXFwiPlxcbjxzZWN0aW9uIGNsYXNzPVxcXCJ2aWV3LXNlY3Rpb24gYWxidW1fdHJhY2tzXFxcIj5cXG48aDE+VHJhY2tzPC9oMT5cXG48dWwgY2xhc3M9XFxcImFjdGlvbi10b29sYmFyXFxcIj5cXG4gIDxsaT48c3BhbiByb2xlPVxcXCJidXR0b25cXFwiIGNsYXNzPVxcXCJxdWV1ZV9hbGxcXFwiIHRhYmluZGV4PVxcXCIwXFxcIj5RdWV1ZSBBbGJ1bTwvc3Bhbj4gPHNwYW4gcm9sZT1cXFwiYnV0dG9uXFxcIiBjbGFzcz1cXFwicXVldWVfc2VsZWN0ZWRcXFwiIHRhYmluZGV4PVxcXCIwXFxcIj5RdWV1ZSBTZWxlY3RlZDwvc3Bhbj48L2xpPlxcbjwvdWw+XFxuPC9zZWN0aW9uPlxcbjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcImNvbHVtbnMgb25lLWhhbGZcXFwiPlxcbjxzZWN0aW9uIGNsYXNzPVxcXCJ2aWV3LXNlY3Rpb24gYWxidW1fZGVzY3JpcHRpb25cXFwiPlxcbjwvc2VjdGlvbj5cXG48L2Rpdj5cXG5cIjtcbiAgfSk7IiwidmFyIHRlbXBsYXRlciA9IHJlcXVpcmUoXCJoYW5kbGViYXJzL3J1bnRpbWVcIikuZGVmYXVsdC50ZW1wbGF0ZTttb2R1bGUuZXhwb3J0cyA9IHRlbXBsYXRlcihmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc2VsZj10aGlzO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIlxcbjxsaSBjbGFzcz1cXFwiaW50ZXJhY3RpdmUtbGlzdC1pdGVtIGVtcHR5LWxpc3RcXFwiPk5vIEFydGlzdHM8L2xpPlxcblwiO1xuICB9XG5cbiAgc3RhY2sxID0gaGVscGVycy51bmxlc3MuY2FsbChkZXB0aDAsIChkZXB0aDAgJiYgZGVwdGgwLmNvbGxlY3Rpb24pLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pOyIsInZhciB0ZW1wbGF0ZXIgPSByZXF1aXJlKFwiaGFuZGxlYmFycy9ydW50aW1lXCIpLmRlZmF1bHQudGVtcGxhdGU7bW9kdWxlLmV4cG9ydHMgPSB0ZW1wbGF0ZXIoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGhlbHBlciwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cblxuICBidWZmZXIgKz0gXCI8c3BhbiBjbGFzcz1cXFwiYXJ0aXN0X3RpdGxlXFxcIj5cIjtcbiAgaWYgKGhlbHBlciA9IGhlbHBlcnMubmFtZSkgeyBzdGFjazEgPSBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBoZWxwZXIgPSAoZGVwdGgwICYmIGRlcHRoMC5uYW1lKTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvc3Bhbj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSk7IiwidmFyIHRlbXBsYXRlciA9IHJlcXVpcmUoXCJoYW5kbGViYXJzL3J1bnRpbWVcIikuZGVmYXVsdC50ZW1wbGF0ZTttb2R1bGUuZXhwb3J0cyA9IHRlbXBsYXRlcihmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgaGVscGVyLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbjtcblxuXG4gIGJ1ZmZlciArPSBcIjxhIGhyZWY9XFxcIiNhcnRpc3RzL1wiO1xuICBpZiAoaGVscGVyID0gaGVscGVycy51cmkpIHsgc3RhY2sxID0gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgaGVscGVyID0gKGRlcHRoMCAmJiBkZXB0aDAudXJpKTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIi9cIjtcbiAgaWYgKGhlbHBlciA9IGhlbHBlcnMubmFtZSkgeyBzdGFjazEgPSBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBoZWxwZXIgPSAoZGVwdGgwICYmIGRlcHRoMC5uYW1lKTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+XCI7XG4gIGlmIChoZWxwZXIgPSBoZWxwZXJzLm5hbWUpIHsgc3RhY2sxID0gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgaGVscGVyID0gKGRlcHRoMCAmJiBkZXB0aDAubmFtZSk7IHN0YWNrMSA9IHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSkgOiBoZWxwZXI7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L2E+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pOyIsInZhciB0ZW1wbGF0ZXIgPSByZXF1aXJlKFwiaGFuZGxlYmFycy9ydW50aW1lXCIpLmRlZmF1bHQudGVtcGxhdGU7bW9kdWxlLmV4cG9ydHMgPSB0ZW1wbGF0ZXIoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG48aW1nIHNyYz1cXFwiXCI7XG4gIHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSAoKHN0YWNrMSA9IChkZXB0aDAgJiYgZGVwdGgwLmltYWdlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMVszXSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazFbJyN0ZXh0J10pKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXFwiIGFsdD1cXFwiQXJ0aXN0IGltYWdlXFxcIiBjbGFzcz1cXFwiY292ZXItYXJ0XFxcIj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuPHA+XCI7XG4gIHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSAoZGVwdGgwICYmIGRlcHRoMC5iaW8pKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnN1bW1hcnkpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L3A+XFxuXFxuPHA+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IChkZXB0aDAgJiYgZGVwdGgwLmJpbykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucGxhY2Vmb3JtZWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKGRlcHRoMCAmJiBkZXB0aDAuYmlvKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS55ZWFyZm9ybWVkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L3A+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoZGVwdGgwICYmIGRlcHRoMC5pbWFnZSksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKGRlcHRoMCAmJiBkZXB0aDAuYmlvKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KTsiLCJ2YXIgdGVtcGxhdGVyID0gcmVxdWlyZShcImhhbmRsZWJhcnMvcnVudGltZVwiKS5kZWZhdWx0LnRlbXBsYXRlO21vZHVsZS5leHBvcnRzID0gdGVtcGxhdGVyKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICBcblxuXG4gIHJldHVybiBcIjx1bD5cXG48bGkgY2xhc3M9XFxcInBsYXliYWNrLWNvbnRyb2xzLWJhY2tcXFwiIHJvbGU9XFxcImJ1dHRvblxcXCI+QmFjazwvbGk+PGxpIGNsYXNzPVxcXCJwbGF5YmFjay1jb250cm9scy1wbGF5XFxcIiByb2xlPVxcXCJidXR0b25cXFwiPlBsYXk8L2xpPjxsaSBjbGFzcz1cXFwicGxheWJhY2stY29udHJvbHMtcGF1c2VcXFwiIHJvbGU9XFxcImJ1dHRvblxcXCI+UGF1c2U8L2xpPjxsaSBjbGFzcz1cXFwicGxheWJhY2stY29udHJvbHMtbmV4dFxcXCIgcm9sZT1cXFwiYnV0dG9uXFxcIj5OZXh0PC9saT5cXG48L3VsPlxcblwiO1xuICB9KTsiLCJ2YXIgdGVtcGxhdGVyID0gcmVxdWlyZShcImhhbmRsZWJhcnMvcnVudGltZVwiKS5kZWZhdWx0LnRlbXBsYXRlO21vZHVsZS5leHBvcnRzID0gdGVtcGxhdGVyKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICBcblxuXG4gIHJldHVybiBcIjxpbnB1dCB0eXBlPVxcXCJzZWFyY2hcXFwiPlxcblwiO1xuICB9KTsiLCJ2YXIgdGVtcGxhdGVyID0gcmVxdWlyZShcImhhbmRsZWJhcnMvcnVudGltZVwiKS5kZWZhdWx0LnRlbXBsYXRlO21vZHVsZS5leHBvcnRzID0gdGVtcGxhdGVyKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBoZWxwZXI7XG4gIGJ1ZmZlciArPSBcIiBcIjtcbiAgaWYgKGhlbHBlciA9IGhlbHBlcnMudm9sdW1lKSB7IHN0YWNrMSA9IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IGhlbHBlciA9IChkZXB0aDAgJiYgZGVwdGgwLnZvbHVtZSk7IHN0YWNrMSA9IHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSkgOiBoZWxwZXI7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCItXCI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8dWw+XFxuPGxpIHJvbGU9YnV0dG9uIGNsYXNzPVxcXCJ2b2x1bWUtY29udHJvbCB2b2x1bWUtZG93blxcXCI+RG93bjwvbGk+PGxpIGNsYXNzPVxcXCJ2b2x1bWUtY29udHJvbCB2b2x1bWUtbGV2ZWxcXFwiPlwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoZGVwdGgwICYmIGRlcHRoMC52b2x1bWUpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvbGk+PGxpIHJvbGU9XFxcImJ1dHRvblxcXCIgY2xhc3M9XFxcInZvbHVtZS1jb250cm9sIHZvbHVtZS11cFxcXCI+VXA8L2xpPlxcbjwvdWw+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pOyIsInZhciB0ZW1wbGF0ZXIgPSByZXF1aXJlKFwiaGFuZGxlYmFycy9ydW50aW1lXCIpLmRlZmF1bHQudGVtcGxhdGU7bW9kdWxlLmV4cG9ydHMgPSB0ZW1wbGF0ZXIoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGhlbHBlciwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb24sIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGhlbHBlcjtcbiAgYnVmZmVyICs9IFwiXFxuICAgIDxkaXYgY2xhc3M9XFxcIm1vZGFsLWhlYWRlclxcXCI+XFxuICAgICAgPGgxIGNsYXNzPVxcXCJtb2RhbC10aXRsZVxcXCI+XCI7XG4gIGlmIChoZWxwZXIgPSBoZWxwZXJzLmhlYWRlcikgeyBzdGFjazEgPSBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBoZWxwZXIgPSAoZGVwdGgwICYmIGRlcHRoMC5oZWFkZXIpOyBzdGFjazEgPSB0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pIDogaGVscGVyOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPC9oMT5cXG4gICAgPC9kaXY+XFxuICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPGRpdiBjbGFzcz1cXFwibW9kYWwtZGlhbG9nXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcIm1vZGFsLWNvbnRlbnRcXFwiPlxcbiAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKGRlcHRoMCAmJiBkZXB0aDAuaGVhZGVyKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJtb2RhbC1ib2R5XFxcIj5cXG4gICAgICBcIjtcbiAgaWYgKGhlbHBlciA9IGhlbHBlcnMubWVzc2FnZSkgeyBzdGFjazEgPSBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBoZWxwZXIgPSAoZGVwdGgwICYmIGRlcHRoMC5tZXNzYWdlKTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KTsiLCJ2YXIgdGVtcGxhdGVyID0gcmVxdWlyZShcImhhbmRsZWJhcnMvcnVudGltZVwiKS5kZWZhdWx0LnRlbXBsYXRlO21vZHVsZS5leHBvcnRzID0gdGVtcGxhdGVyKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICBcblxuXG4gIHJldHVybiBcIjxwPjxzdHJvbmc+anVrZTxzcGFuIGNsYXNzPVxcXCJwaW5rXFxcIj5QaTwvc3Bhbj48L3N0cm9uZz4gaXMgY29ubmVjdGluZyB0byB0aGUgUGkgaW4gdGhlIFNreS4gUGxlYXNlIGhvbGQuPC9wPlxcblwiO1xuICB9KTsiLCJ2YXIgdGVtcGxhdGVyID0gcmVxdWlyZShcImhhbmRsZWJhcnMvcnVudGltZVwiKS5kZWZhdWx0LnRlbXBsYXRlO21vZHVsZS5leHBvcnRzID0gdGVtcGxhdGVyKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICBcblxuXG4gIHJldHVybiBcIjxoZWFkZXIgcm9sZT1cXFwiYmFubmVyXFxcIj48aDE+SnVrZVBpPC9oMT48L2hlYWRlcj5cXG5cIjtcbiAgfSk7IiwidmFyIHRlbXBsYXRlciA9IHJlcXVpcmUoXCJoYW5kbGViYXJzL3J1bnRpbWVcIikuZGVmYXVsdC50ZW1wbGF0ZTttb2R1bGUuZXhwb3J0cyA9IHRlbXBsYXRlcihmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb24sIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcblwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IChkZXB0aDAgJiYgZGVwdGgwLmFsYnVtKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pbWFnZSksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcblwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gKGRlcHRoMCAmJiBkZXB0aDAuYWxidW0pKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmltYWdlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMVsxXSksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcblwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSAoZGVwdGgwICYmIGRlcHRoMC5hbGJ1bSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaW1hZ2UpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxWzFdKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMVsnI3RleHQnXSksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg0LCBwcm9ncmFtNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGhlbHBlcjtcbiAgYnVmZmVyICs9IFwiXFxuPGltZyBzcmM9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gKGRlcHRoMCAmJiBkZXB0aDAuYWxidW0pKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmltYWdlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMVsxXSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazFbJyN0ZXh0J10pKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgYWx0PVxcXCJDb3ZlciBhcnQgZm9yIFwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSAoZGVwdGgwICYmIGRlcHRoMC5hbGJ1bSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubmFtZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiBjbGFzcz1cXFwiY292ZXItYXJ0XFxcIj5cXG5cIjtcbiAgaWYgKGhlbHBlciA9IGhlbHBlcnMubmFtZSkgeyBzdGFjazEgPSBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBoZWxwZXIgPSAoZGVwdGgwICYmIGRlcHRoMC5uYW1lKTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjxicj5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKGRlcHRoMCAmJiBkZXB0aDAuYWxidW0pKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLm5hbWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjxicj5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKGRlcHRoMCAmJiBkZXB0aDAuYWxidW0pKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmFydGlzdCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoZGVwdGgwICYmIGRlcHRoMC5hbGJ1bSksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSk7IiwidmFyIHRlbXBsYXRlciA9IHJlcXVpcmUoXCJoYW5kbGViYXJzL3J1bnRpbWVcIikuZGVmYXVsdC50ZW1wbGF0ZTttb2R1bGUuZXhwb3J0cyA9IHRlbXBsYXRlcihmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG5cblxuICByZXR1cm4gYnVmZmVyO1xuICB9KTsiLCJ2YXIgdGVtcGxhdGVyID0gcmVxdWlyZShcImhhbmRsZWJhcnMvcnVudGltZVwiKS5kZWZhdWx0LnRlbXBsYXRlO21vZHVsZS5leHBvcnRzID0gdGVtcGxhdGVyKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbiwgc2VsZj10aGlzO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSxkZXB0aDEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgPGxpIGlkPVxcXCJ0YWItXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoZGVwdGgxICYmIGRlcHRoMS5iYXNlTmFtZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiLVwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKGRhdGEgPT0gbnVsbCB8fCBkYXRhID09PSBmYWxzZSA/IGRhdGEgOiBkYXRhLmluZGV4KSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIHJvbGU9XFxcInRhYlxcXCIgYXJpYS1jb250cm9scz1cXFwicGFuZWwtXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoZGVwdGgxICYmIGRlcHRoMS5iYXNlTmFtZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiLVwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKGRhdGEgPT0gbnVsbCB8fCBkYXRhID09PSBmYWxzZSA/IGRhdGEgOiBkYXRhLmluZGV4KSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIHRhYmluZGV4PVxcXCJcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKGRhdGEgPT0gbnVsbCB8fCBkYXRhID09PSBmYWxzZSA/IGRhdGEgOiBkYXRhLmZpcnN0KSwge2hhc2g6e30saW52ZXJzZTpzZWxmLnByb2dyYW0oNCwgcHJvZ3JhbTQsIGRhdGEpLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXFwiPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCh0eXBlb2YgZGVwdGgwID09PSBmdW5jdGlvblR5cGUgPyBkZXB0aDAuYXBwbHkoZGVwdGgwKSA6IGRlcHRoMCkpXG4gICAgKyBcIjwvbGk+XFxuICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIwXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCItMVwiO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPHVsIHJvbGU9XFxcInRhYmxpc3RcXFwiPlxcbiAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgKGRlcHRoMCAmJiBkZXB0aDAudGFicyksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbVdpdGhEZXB0aCgxLCBwcm9ncmFtMSwgZGF0YSwgZGVwdGgwKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbjwvdWw+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pOyIsInZhciB0ZW1wbGF0ZXIgPSByZXF1aXJlKFwiaGFuZGxlYmFycy9ydW50aW1lXCIpLmRlZmF1bHQudGVtcGxhdGU7bW9kdWxlLmV4cG9ydHMgPSB0ZW1wbGF0ZXIoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJcXG48bGkgY2xhc3M9XFxcImludGVyYWN0aXZlLWxpc3QtaXRlbSBlbXB0eS1saXN0XFxcIj5ObyBUcmFja3M8L2xpPlxcblwiO1xuICB9XG5cbiAgc3RhY2sxID0gaGVscGVycy51bmxlc3MuY2FsbChkZXB0aDAsIChkZXB0aDAgJiYgZGVwdGgwLmNvbGxlY3Rpb24pLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pOyIsInZhciB0ZW1wbGF0ZXIgPSByZXF1aXJlKFwiaGFuZGxlYmFycy9ydW50aW1lXCIpLmRlZmF1bHQudGVtcGxhdGU7bW9kdWxlLmV4cG9ydHMgPSB0ZW1wbGF0ZXIoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIFxuXG5cbiAgcmV0dXJuIFwiPHVsIGNsYXNzPVxcXCJhY3Rpb24tdG9vbGJhclxcXCI+XFxuICA8bGk+PGlucHV0IHR5cGU9XFxcImNoZWNrYm94XFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1wcmltYXJ5XFxcIj48L2xpPlxcbiAgPGxpPjxzcGFuIHJvbGU9XFxcImJ1dHRvblxcXCIgY2xhc3M9XFxcInF1ZXVlX3NlbGVjdGVkIGJ0biBidG4tcHJpbWFyeVxcXCIgdGFiaW5kZXg9XFxcIjBcXFwiPkFkZCB0byBxdWV1ZTwvc3Bhbj48L2xpPlxcbjwvdWw+XFxuXCI7XG4gIH0pOyIsInZhciB0ZW1wbGF0ZXIgPSByZXF1aXJlKFwiaGFuZGxlYmFycy9ydW50aW1lXCIpLmRlZmF1bHQudGVtcGxhdGU7bW9kdWxlLmV4cG9ydHMgPSB0ZW1wbGF0ZXIoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGhlbHBlciwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb24sIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJjdXJyZW50X3RyYWNrXCI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8aW5wdXQgdHlwZT1cXFwiY2hlY2tib3hcXFwiIGRhdGEtdHJhY2staWQ9XFxcIlwiO1xuICBpZiAoaGVscGVyID0gaGVscGVycy51cmkpIHsgc3RhY2sxID0gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgaGVscGVyID0gKGRlcHRoMCAmJiBkZXB0aDAudXJpKTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgdGFiaW5kZXg9XFxcIi0xXFxcIj5cXG48c3BhbiBjbGFzcz1cXFwibGlzdC1pdGVtLXRpdGxlIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoZGVwdGgwICYmIGRlcHRoMC5jdXJyZW50KSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCI+XCI7XG4gIGlmIChoZWxwZXIgPSBoZWxwZXJzLm5hbWUpIHsgc3RhY2sxID0gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgaGVscGVyID0gKGRlcHRoMCAmJiBkZXB0aDAubmFtZSk7IHN0YWNrMSA9IHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSkgOiBoZWxwZXI7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L3NwYW4+IDxzcGFuIGNsYXNzPVxcXCJsaXN0LWl0ZW0tYXJ0aXN0XFxcIj5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSAoZGVwdGgwICYmIGRlcHRoMC5hcnRpc3RzKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMVswXSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubmFtZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9zcGFuPlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KTsiLCJ2YXIgdGVtcGxhdGVyID0gcmVxdWlyZShcImhhbmRsZWJhcnMvcnVudGltZVwiKS5kZWZhdWx0LnRlbXBsYXRlO21vZHVsZS5leHBvcnRzID0gdGVtcGxhdGVyKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiXFxuPGxpIGNsYXNzPVxcXCJpbnRlcmFjdGl2ZS1saXN0LWl0ZW0gZW1wdHktbGlzdFxcXCI+Tm8gU29uZ3MgaW4gUXVldWU8L2xpPlxcblwiO1xuICB9XG5cbiAgc3RhY2sxID0gaGVscGVycy51bmxlc3MuY2FsbChkZXB0aDAsIChkZXB0aDAgJiYgZGVwdGgwLmNvbGxlY3Rpb24pLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pOyIsInZhciB0ZW1wbGF0ZXIgPSByZXF1aXJlKFwiaGFuZGxlYmFycy9ydW50aW1lXCIpLmRlZmF1bHQudGVtcGxhdGU7bW9kdWxlLmV4cG9ydHMgPSB0ZW1wbGF0ZXIoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIFxuXG5cbiAgcmV0dXJuIFwiICA8dWwgY2xhc3M9XFxcImFjdGlvbi10b29sYmFyXFxcIj5cXG4gICAgPGxpPjxzcGFuIHJvbGU9XFxcImJ1dHRvblxcXCIgY2xhc3M9XFxcImNsZWFyX3F1ZXVlIGJ0biBidG4tcHJpbWFyeVxcXCIgdGFiaW5kZXg9XFxcIjBcXFwiPkNsZWFyIFF1ZXVlPC9zcGFuPjwvbGk+XFxuICAgIDxsaT48c3BhbiByb2xlPVxcXCJidXR0b25cXFwiIGNsYXNzPVxcXCJkZWxldGVfc2VsZWN0ZWQgYnRuIGJ0bi1wcmltYXJ5XFxcIiB0YWJpbmRleD1cXFwiMFxcXCI+RGVsZXRlIFNlbGVjdGVkPC9zcGFuPjwvbGk+XFxuICA8L3VsPlxcblwiO1xuICB9KTsiLCJ2YXIgdGVtcGxhdGVyID0gcmVxdWlyZShcImhhbmRsZWJhcnMvcnVudGltZVwiKS5kZWZhdWx0LnRlbXBsYXRlO21vZHVsZS5leHBvcnRzID0gdGVtcGxhdGVyKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBoZWxwZXIsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiY3VycmVudF90cmFja1wiO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPGlucHV0IHR5cGU9XFxcImNoZWNrYm94XFxcIiBkYXRhLXRyYWNrbGlzdC1pZD1cXFwiXCI7XG4gIGlmIChoZWxwZXIgPSBoZWxwZXJzLnRsaWQpIHsgc3RhY2sxID0gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgaGVscGVyID0gKGRlcHRoMCAmJiBkZXB0aDAudGxpZCk7IHN0YWNrMSA9IHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSkgOiBoZWxwZXI7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIHRhYmluZGV4PVxcXCItMVxcXCI+XFxuPHNwYW4gY2xhc3M9XFxcImxpc3QtaXRlbS10aXRsZSBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKGRlcHRoMCAmJiBkZXB0aDAuY3VycmVudCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXFwiPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSAoZGVwdGgwICYmIGRlcHRoMC50cmFjaykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubmFtZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9zcGFuPiA8c3BhbiBjbGFzcz1cXFwibGlzdC1pdGVtLWFydGlzdFxcXCI+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSAoZGVwdGgwICYmIGRlcHRoMC50cmFjaykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuYXJ0aXN0cykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazFbMF0pKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLm5hbWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvc3Bhbj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSk7Il19
(1)
});
