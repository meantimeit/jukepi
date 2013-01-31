marked.setOptions({
  gfm: true
});

Handlebars.registerHelper('markdown', function (options) {
  var content = options.fn(this);
  return marked(content);
});

App.utils.copyProperties(App.env, App.config);
if (App.config.mopidyWebSocketUrl !== null) {
  App.mopidy = new Mopidy({ webSocketUrl: App.config.mopidyWebSocketUrl });
}
else {
  App.mopidy = new Mopidy();
}

App.Router = Backbone.Router.extend({
  initialize: function (options) {
    Backbone.Router.prototype.initialize.call(this, options);
    //this.on('route', this._authCheck, this);
  },
  routes: {
    '': 'dashboard',
    'albums/:id': 'albums',
    'artists/:uri/:name': 'artists',
    'auth': 'auth',
    'dashboard': 'dashboard'
  },
  index: function () {
    this.trigger('beforeRoute');
    this.navigate('auth', { trigger: true });
  },
  auth: function () {
    this.trigger('beforeRoute');
    var view = new App.View.LoginView({
      router: this
    });
    App.mainNavigation.setCurrent('auth');
    App.utils.appendToMain(view.render().el);
  },
  dashboard: function () {
    this.trigger('beforeRoute');
    var view = new App.View.HomePage({
      router: this
    });
    App.mainNavigation.setCurrent('');
    App.utils.appendToMain(view.render().el);
  },
  albums: function (id) {
    this.trigger('beforeRoute');
    var view = new App.View.AlbumPage({
      router: this,
      id: id
    });
    App.mainNavigation.setCurrent('albums');
    App.utils.appendToMain(view.render().el);
  },
  artists: function (uri, name) {
    this.trigger('beforeRoute');
    var view = new App.View.ArtistPage({
      router: this,
      uri: uri,
      name: name
    });
    App.mainNavigation.setCurrent('artists');
    App.utils.appendToMain(view.render().el);
  },
  _authCheck: function (currentRoute) {
    if (currentRoute === 'auth') {
      return true;
    }

    if (!App.currentUser) {
      this.navigate('/auth', { trigger: true });
    }
  }
});

App.Model.Album = Backbone.Model.extend({
    idAttribute: 'uri',
    initialize: function (attributes, options) {
      Backbone.Model.prototype.initialize.apply(this, arguments);
      this.tracks = new App.Collection.Tracks();
      this.artist = new App.Model.Artist();
    },
    sync: function (method, model, options) {
      var success = options.success;
      var error = options.error;
      var xhr;

      options.success = function(resp) {
        if (resp[0] && resp[0].album) {
          var lastfm;
          var images;

          if (resp.lastfm) {
            lastfm = resp.lastfm.album;
            images = resp.lastfm.album.image.map(function (image) {
              return {
                url: image['#text'],
                size: image.size
              };
            });
          }

          resp = {
            name: resp[0].album.name,
            uri: resp[0].album.uri,
            date: resp[0].album.date,
            artist: resp[0].album.artists[0],
            lastfm: lastfm,
            images: images,
            tracks: resp
          };
        }

        if (success) {
          success(model, resp, options);
          this._syncResponseToSubClasses(resp);
        }
        model.trigger('sync', model, resp, options);
      }.bind(this);
      options.error = function(xhr) {
        if (error) {
          error(model, xhr, options);
        }
        model.trigger('error', model, xhr, options);
      }.bind(this);

      xhr = App.mopidy.library.lookup(this.id);
      //xhr.then(options.success, options.error);
      xhr.then(function (mResp) {
        App.lastfm.album.getInfo({
          artist: mResp[0].artists[0].name,
          album: mResp[0].album.name
        }, { success: function (lfmResp) {
          mResp.lastfm = lfmResp;
          options.success(mResp);
        }, error: function () {
          options.success(mResp);
        } });
      }, options.error);
      return xhr;
    },
    _syncResponseToSubClasses: function (resp) {
      var tracks;
      var artist;

      if (resp.tracks) {
        tracks = resp.tracks;

        if (resp.artist) {
          artist = resp.artist;
        }
      }
      else if (Object.prototype.toString.call(resp) === '[object Array]') {
        tracks = resp;
      }

      this.tracks.reset(tracks);
      this.artist.set(artist);
    }
});

App.Model.Artist = Backbone.Model.extend({
    idAttribute: 'uri',
    initialize: function (attributes, options) {
      Backbone.Model.prototype.initialize.apply(this, arguments);
      this.tracks = new App.Collection.Tracks();
      this.localTracks = new App.Collection.Tracks();
      this.albums = new App.Collection.Albums();
    },
    sync: function (method, model, options) {
        var success = options.success;
        var error = options.error;
        var artistUri = this.id;
        var artistName = this.get('name');
        var xhrTasks = {
          lastfm: false,
          lookup: false,
          search: false
        };
        var response = {};
        var xhr;

        var processLookup = function (resp) {
          var tracks = resp;
          var _tracks = _(tracks);
          var albums = _tracks.chain().pluck('album').uniq(false, function (album) { return album.uri; }).value();
          var artist = _tracks.chain().map(function (track) { return track.artists;  }).flatten().uniq(false, function (artist) { return artist.uri;  }).find(function (artist) { return artist.uri === artistUri;  }).value() || { uri: artistUri, name: artistName };
          _(response).extend(artist);

          xhrTasks.lookup = true;
          this.tracks.reset(tracks);
          this.albums.reset(albums);
          options.success(response);
        }.bind(this);

        function processLastfm(resp) {
          xhrTasks.lastfm = true;
          response.lastfm = resp.artist;
          response.images = resp.artist.image.map(function (image) {
            return { size: image.size, url: image['#text'] };
          });

          options.success(response);
        }

        function lastfmError() {
          xhrTasks.lastfm = true;
          options.success(response);
        }

        var processSearch = function (resp) {
          xhrTasks.search = true;
          this.localTracks.reset(resp[0].tracks);
        }.bind(this);

        function searchError(resp) {
        }

        options.success = function(resp) {
          if (xhrTasks.lookup && xhrTasks.lastfm) {
            if (success) {
              success(model, resp, options);
            }
            model.trigger('sync', model, resp, options);
          }
        }.bind(this);
        options.error = function(xhr) {
          if (error) {
            error(model, xhr, options);
          }
          model.trigger('error', model, xhr, options);
        }.bind(this);

        App.lastfm.artist.getInfo({ artist: artistName }, { success: processLastfm, error: lastfmError });
        xhr = App.mopidy.library.lookup(this.id);
        xhr.then(processLookup, options.error);
        App.mopidy.library.search({ artist: artistName, uri: 'file://' }).then(processSearch, searchError);

        return xhr;
    }
});

App.Model.Authenticate = Backbone.Model.extend({
    idAttribute: 'user_id',
    url: function () {
        return App.config.baseAddress + App.config.apiPath + '/login.php';
    }
});

App.Model.Notification = Backbone.Model.extend({

});

App.Model.Search = Backbone.Model.extend({
  collections: {},
  initialize: function (attributes, options) {
    Backbone.Model.prototype.initialize.apply(this, arguments);
    this.localTracks = new App.Collection.Tracks();
    this.tracks = new App.Collection.Tracks();
    this.albums = new App.Collection.Albums();
    this.artists = new App.Collection.Artists();
  },
  sync: function (method, model, options) {
    var success = options.success;
    var error = options.error;
    var timestamp = Date.now();

    this._searchTimestamp = timestamp;

    options.success = function(resp) {
      if (timestamp === this._searchTimestamp) {
        if (success) {
          success(model, resp, options);
          this._syncResponseToCollections(resp);
        }
        model.trigger('sync', model, resp, options);
      }
    }.bind(this);
    options.error = function(xhr) {
      if (error) {
        error(model, xhr, options);
      }
      model.trigger('error', model, xhr, options);
    }.bind(this);

    var xhr = App.mopidy.library.search({
      any: [options.query]
    });
    xhr.then(options.success, null, options.error);
    return xhr;
  },
  _searchTimestamp: 0,
  _syncResponseToCollections: function (resp) {
    if (resp[0] && resp[0].tracks && resp[0].tracks.length) {
      this.localTracks.reset(resp[0].tracks);
    }
    else {
      this.localTracks.reset();
    }

    if (resp[1]) {
      if (resp[1].tracks && resp[1].tracks.length) {
        this.tracks.reset(resp[1].tracks);
      }
      else {
        this.tracks.reset();
      }

      if (resp[1].albums && resp[1].albums.length) {
        this.albums.reset(resp[1].albums);
      }
      else {
        this.albums.reset();
      }

      if (resp[1].artists && resp[1].artists.length) {
        this.artists.reset(resp[1].artists);
      }
      else {
        this.artists.reset();
      }
    }
  }
});

App.Model.Track = Backbone.Model.extend({
    idAttribute: 'uri',
    sync: function (method, model, options) {
      var success = options.success;
      var error = options.error;
      var xhr;

      options.success = function(resp) {
        if (success) {
          success(model, resp, options);
        }
        model.trigger('sync', model, resp, options);
      }.bind(this);
      options.error = function(xhr) {
        if (error) {
          error(model, xhr, options);
        }
        model.trigger('error', model, xhr, options);
      }.bind(this);

      if (method === 'update') {
        xhr = App.mopidy.tracklist.add([ model ]);
        xhr.then(options.success, null, options.error);
      }

      return xhr;
    }
});
App.Model.TrackListTrack = Backbone.Model.extend({
    idAttribute: 'tlid',
    current: false,
    initialize: function (attributes, options) {
      Backbone.Model.prototype.initialize.apply(this, arguments);
      this.current = attributes.tlid === options.activeTlid;
      this.track = new App.Model.Track(attributes.track);
      this._initListeners();
    },
    _initListeners: function () {
      var callback = this._onTrackPlaybackStarted.bind(this);

      App.mopidy.on('event:trackPlaybackStarted', callback);
      this.on('remove', function () {
        App.mopidy.off('event:trackPlaybackStarted', callback);
      });
    },
    _onTrackPlaybackStarted: function (event) {
      if (this.current !== (this.id === event.tl_track.tlid)) {
        this.current = !this.current;
        this.trigger('change');
      }
    }
});

App.Collection.CoreCollection = Backbone.Collection.extend({
  mopidy: App.mopidy,
  initialize: function (models, options) {
    Backbone.Collection.prototype.initialize.apply(this, arguments);
  },
  modelAttributes: function () {
    return this.map(this._modelAttributes.bind(this));
  },
  _modelAttributes: function (model) {
    return modelAttributes;
  }
});

App.Collection.Albums = App.Collection.CoreCollection.extend({
  model: App.Model.Album
});

App.Collection.Artists = App.Collection.CoreCollection.extend({
  model: App.Model.Artist
});

App.Collection.Notifications = App.Collection.CoreCollection.extend({
  model: App.Model.Notification
});

App.Collection.TrackList = App.Collection.CoreCollection.extend({
  mopidy: App.mopidy,
  model: App.Model.TrackListTrack,
  initialize: function (models, options) {
    App.Collection.CoreCollection.prototype.initialize.apply(this, arguments);
    this.listenTo(this.mopidy, 'event:tracklistChanged', this.fetch.bind(this));
  },
  sync: function (method, model, options) {
    var success = options.success;
    var error = options.error;

    options.success = function(resp) {
      if (success) {
        success(model, resp, options);
      }
      model.trigger('sync', model, resp, options);
    };
    options.error = function(xhr) {
      if (error) {
        error(model, xhr, options);
      }
      model.trigger('error', model, xhr, options);
    };

    var xhr = this.mopidy.tracklist.getTlTracks();
    this.mopidy.playback.getCurrentTlTrack().then(function (track) {
      track = track || {};
      options.activeTlid = track.tlid;
      xhr.then(options.success, null, options.error);
    }.bind(this));
    model.trigger('request', model, xhr, options);
    return xhr;
  }
});

App.Collection.Tracks = App.Collection.CoreCollection.extend({
  model: App.Model.Track
});

App.View.CoreView = Backbone.View.extend({
  mopidy: App.mopidy,
  initialize: function (attributes, options) {
    Backbone.View.prototype.initialize.call(this, attributes, options);
    if (this.template) {
      this._setTemplate(this.template);
    }
    this.on('rendering', this._rendering, this);
    this.on('rendered', this._rendered, this);
  },
  remove: function (callback) {
    this.$el.toggleClass('hidden');
    App.utils.delay(function () {
      Backbone.View.prototype.remove.apply(this, arguments);
    }.bind(this));
  },
  render: function () {
    this.trigger('rendering');
    this.$el.html(this._template());
    this.trigger('rendered');
    return this;
  },
  _getTemplate: function (name) {
    return Handlebars.template(App.Templates[name]);
  },
  _setTemplate: function (name) {
    this._template = App.Templates[name];
  },
  _rendering: function () {
    if (this._hideOnRender) {
      this.$el.addClass('hidden');
    }
  },
  _rendered: function () {
    if (this._hideOnRender) {
      App.utils.delay(function () {
        this.$el.removeClass('hidden');
      }.bind(this));
    }
  },
  _hideOnRender: false
});
App.View.PageView = App.View.CoreView.extend({
  initialize: function (attributes, options) {
    App.View.CoreView.prototype.initialize.apply(this, arguments);
    this.router = attributes.router;
    this.listenTo(this.router, 'beforeRoute', this.remove.bind(this));
  },
  render: function () {
    this._setTitle(this.title);
    return App.View.CoreView.prototype.render.apply(this, arguments);
  },
  remove: function () {
    this.stopListening();
    App.View.CoreView.prototype.remove.apply(this, arguments);
  },
  _setTitle: function (title) {
    $('title').text(title + ': ' + App.config.title);
  }
});
App.View.ModelView = App.View.CoreView.extend({
  initialize: function (attributes, options) {
    App.View.CoreView.prototype.initialize.apply(this, arguments);
    if (attributes.extended) {
      this._extended = !!attributes.extended;
    }
    this.model = attributes.model;
    this.listenTo(this.model, 'change', this.render.bind(this));
  },
  render: function () {
    var model = this.model.toJSON();
    model._extended = this._extended;
    this.trigger('rendering');
    this.$el.attr('tabindex', '0');
    this.$el.html(this._template(model));
    this.trigger('rendered');
    return this;
  },
  remove: function () {
    App.View.CoreView.prototype.remove.apply(this);
    this.model.stopListening();
  },
  _extended: false,
  _hideOnRender: false
});
App.View.CollectionView = App.View.CoreView.extend({
  events: {
    'keydown li[tabindex="0"]': '_focusNext'
  },
  _extended: false,
  itemViewClass: App.View.ModelView,
  initialize: function (attributes, options) {
    App.View.CoreView.prototype.initialize.apply(this, arguments);
    if (attributes.extended) {
      this._extended = !!attributes.extended;
    }
    this.views = [];
    this.collection = attributes.collection;
    this.on('rendering', this._removeViews.bind(this));
    this.on('rendered', this._renderViews.bind(this));
    this.listenTo(this.collection, 'reset', this.render.bind(this));
    this.listenTo(this.collection, 'reset', this._hideLoadingMessage.bind(this));
  },
  render: function () {
    var data = {
      collection: this.collection.toJSON(),
      extended: this.extended
    };
    this.trigger('rendering');
    this.$el.html(this._template(data));
    this.trigger('rendered');
    return this;
  },
  remove: function () {
    App.View.CoreView.prototype.remove.apply(this);
    this.collection.stopListening();
  },
  _hideLoadingMessage: function () {
    this.$el.removeClass('loading');
  },
  _resetViews: function () {
    this._removeViews();
    this.collection.each(this._addModelView.bind(this));
  },
  _removeViews: function () {
    var i = this.views.length;

    while (i--) {
      this.views.pop().remove();
    }
  },
  _renderViews: function () {
    this.collection.each(this._addModelView.bind(this));
  },
  _addModelView: function (model) {
    var view = new this.itemViewClass({
      model: model,
      extended: this._extended
    });
    this.views.push(view);
    this.$el.append(view.render().el);
  },
  _hideOnRender: false,
  _focusNext: function (event) {
    var j = 74, k = 75, up = 38, down = 40, method = null;

    if (event.which === down || event.which === j) {
      method = 'next';
    }
    else if (event.which === up || event.which === k) {
      method = 'prev';
    }

    if (method !== null) {
      event.preventDefault();
      $(document.activeElement)[method]('[tabindex="0"]').focus();
    }
  }
});

App.View.AlbumItem = App.View.ModelView.extend({
  tagName: 'li',
  template: 'album_item',
  className: 'track_list_item',
  events: {
    'click li': 'viewAlbum'
  },
  viewAlbum: function () {
    App.router.navigate('/albums/' + this.model.id, {
      trigger: true
    });
  }
});
App.View.Album = App.View.ModelView.extend({
  tagName: 'article',
  template: 'album_view'
});

App.View.ArtistItem = App.View.ModelView.extend({
  tagName: 'li',
  template: 'artist_item',
  className: 'track_list_item',
  events: {
    'click li': 'viewArtist'
  },
  viewArtist: function () {
    App.router.navigate('/artists/' + this.model.id + '/' + this.model.get('name'), { trigger: true });
  }
});
App.View.Artist = App.View.ModelView.extend({
  tagName: 'article',
  template: 'artist_view'
});

App.View.Notification = App.View.ModelView.extend({
  tagName: 'article',
  template: 'notification_view',
  className: 'notification_item'
});

App.View.Track = App.View.ModelView.extend({
  tagName: 'li',
  events: {
    'dblclick li': 'addToTracklist',
    'keydown li': 'toggleSelected'
  },
  template: 'track_item',
  className: 'track_list_item',
  initialize: function (attributes, options) {
    App.View.ModelView.prototype.initialize.apply(this, arguments);
  },
  addToTracklist: function (event) {
    this.model.save();
  },
  toggleSelected: function (event) {
    var checkbox;

    if (this._extended && event.which === 32) {
      event.preventDefault();
      checkbox = this.$('input[type=checkbox]')[0];
      checkbox.checked = !checkbox.checked;
    }
  }
});
App.View.TrackListTrack = App.View.ModelView.extend({
  tagName: 'li',
  className: 'track_list_item',
  template: 'tracklist_item',
  events: {
    'dblclick li': 'play',
    'keydown li': 'play'
  },
  initialize: function (attributes, options) {
    App.View.ModelView.prototype.initialize.apply(this, arguments);
    this.on('rendered', this._toggleCurrentTrackIfCurrent.bind(this));
  },
  play: function (event) {
    var isKeyDownPlay = event.type === 'keydown' && event.which === 13;
    var isDoubleClick = event.type === 'dblclick';

    if (isKeyDownPlay || isDoubleClick) {
      event.preventDefault();
      this.mopidy.playback.play(this.model.attributes);
    }
  },
  _toggleCurrentTrackIfCurrent: function () {
    if (this.model.current) {
      this.$el.addClass('current_track');
    }
    else {
      this.$el.removeClass('current_track');
    }
  }
});

App.View.Albums = App.View.CollectionView.extend({
  tagName: 'ul',
  className: 'track_list loading',
  template: 'album_index',
  itemViewClass: App.View.AlbumItem,
  resetResults: function () {
    this.collection.reset();
    this.$el.addClass('loading');
  }
});

App.View.Artists = App.View.CollectionView.extend({
  tagName: 'ul',
  className: 'track_list loading',
  template: 'artist_index',
  itemViewClass: App.View.ArtistItem,
  resetResults: function () {
    this.collection.reset();
    this.$el.addClass('loading');
  }
});

App.View.Notifications = App.View.CollectionView.extend({
  tagName: 'section',
  className: 'notifications',
  template: 'notification_list',
  itemViewClass: App.View.Notification
});

App.View.TrackList = App.View.CollectionView.extend({
  tagName: 'ul',
  className: 'track_list loading',
  template: 'tracklist_list',
  itemViewClass: App.View.TrackListTrack,
  initialize: function (attributes, options) {
    App.View.CollectionView.prototype.initialize.apply(this, arguments);
  }
});

App.View.Tracks = App.View.CollectionView.extend({
  tagName: 'ul',
  className: 'track_list loading',
  template: 'track_index',
  itemViewClass: App.View.Track,
  initialize: function (attributes, options) {
    App.View.CollectionView.prototype.initialize.apply(this, arguments);
  },
  resetResults: function () {
    this.collection.reset();
    this.$el.addClass('loading');
  }

});

App.View.AlbumPage = App.View.PageView.extend({
  tagName: 'div',
  className: 'view',
  title: 'Albums',
  template: 'album_page',
  events: {
    'click .queue_all': 'queueAll',
    'click .queue_selected': 'queueSelected',
    'click [data-artist-uri]': 'viewArtist'
  },
  initialize: function (attributes, options) {
    App.View.PageView.prototype.initialize.apply(this, arguments);
    this.album = new App.Model.Album({ uri: attributes.id });
    this._initSubViews();
    this.on('rendered', function () {
      this.$('.album_description').append(this.views.albumView.render().el);
      this.$('.album_tracks').append(this.views.tracks.render().el);
    }.bind(this));
    this.album.fetch();
  },
  queueAll: function () {
    App.mopidy.tracklist.add(this.album.tracks.toJSON()).then(function () {
      App.notifications.add({message: 'Added tracks to queue'});
    });
  },
  queueSelected: function () {
    var selectedInputs = this.$('li input[type=checkbox]:checked');
    var selectedTracks = selectedInputs.map(function (i, track) {
      return this.album.tracks.get(track.getAttribute('data-track-id')).toJSON();
    }.bind(this));
    App.mopidy.tracklist.add(selectedTracks).then(function () {
      selectedInputs.each(function (i, input) {
        input.checked = false;
      });
      App.notifications.add({ message: 'Tracks added to queue.' });
    }.bind(this));
  },
  viewArtist: function (event) {
    var name = event.currentTarget.getAttribute('data-artist-name');

    event.preventDefault();
    App.router.navigate('/artists/' + name, { trigger: true });
  },
  _initSubViews: function () {
    this.views = {
      albumView: new App.View.Album({
        model: this.album
      }),
      tracks: new App.View.Tracks({
        collection: this.album.tracks,
        extended: true
      })
    };
  }
});

App.View.ArtistPage = App.View.PageView.extend({
  tagName: 'div',
  className: 'view',
  title: 'Artists',
  template: 'artist_page',
  events: {
    'click .queue_all': 'queueAll',
    'click .queue_all_local': 'queueAllLocal',
    'click .queue_selected': 'queueSelected',
    'click [data-album-uri]': 'viewAlbum'
  },
  initialize: function (attributes, options) {
    App.View.PageView.prototype.initialize.apply(this, arguments);
    this.artist = new App.Model.Artist({ uri: attributes.uri, name: attributes.name });
    this._initSubViews();
    this.on('rendered', function () {
      this.$('.artist_description').append(this.views.artistView.render().el);
      this.$('.artist_tracks').append(this.views.tracks.render().el);
      this.$('.artist_localtracks').append(this.views.localTracks.render().el);
      this.$('.artist_albums').append(this.views.albums.render().el);
    }.bind(this));
    this.artist.fetch();
  },
  queueAll: function () {
    App.mopidy.tracklist.add(this.album.tracks.toJSON()).then(function () {
      App.notifications.add({message: 'Added tracks to queue'});
    });
  },
  queueAllLocal: function () {
    App.mopidy.tracklist.add(this.album.localTracks.toJSON()).then(function () {
      App.notifications.add({message: 'Added tracks to queue'});
    });
  },
  queueSelected: function () {
    var selectedInputs = this.$('li input[type=checkbox]:checked');
    var selectedTracks = selectedInputs.map(function (i, track) {
      return this.artist.tracks.get(track.getAttribute('data-track-id')).toJSON();
    }.bind(this));
    App.mopidy.tracklist.add(selectedTracks).then(function () {
      selectedInputs.each(function (i, input) {
        input.checked = false;
      });
      App.notifications.add({ message: 'Tracks added to queue.' });
    }.bind(this));
  },
  viewAlbum: function (event) {
    var uri = event.currentTarget.getAttribute('data-album-uri');

    event.preventDefault();
    App.router.navigate('/album/' + uri, { trigger: true });
  },
  _initSubViews: function () {
    this.views = {
      artistView: new App.View.Artist({
        model: this.artist
      }),
      albums: new App.View.Albums({
        collection: this.artist.albums
      }),
      tracks: new App.View.Tracks({
        collection: this.artist.tracks,
        extended: true
      }),
      localTracks: new App.View.Tracks({
        collection: this.artist.localTracks,
        extended: true
      })
    };
  }
});

App.View.HomePage = App.View.PageView.extend({
  tagName: 'div',
  className: 'view',
  title: 'Home',
  events: {
    'click .clear_queue': 'clearQueue'
  },
  template: 'home_page',
  views: {},
  initialize: function (attributes, options) {
    App.View.PageView.prototype.initialize.apply(this, arguments);
    this._initTrackList();
    this._initSubViews();
    this.on('rendered', this._fetchTrackList.bind(this));
    this.on('rendered', this._attachSubViews.bind(this));
  },
  clearQueue: function () {
    var message1 = 'If you click OK to this, you WILL wipe the queue. Are you sure?',
        message2 = 'Really Sure? With great power, comes great responsibility.';

    if (confirm(message1) && confirm(message2)) {
      App.mopidy.tracklist.clear();
    }
  },
  _initSubViews: function () {
    this.views.trackList = new App.View.TrackList({
      collection: this._trackList
    });
  },
  _initTrackList: function () {
    this._trackList = new App.Collection.TrackList();
  },
  _fetchTrackList: function () {
    this._trackList.fetch();
  },
  _attachSubViews: function () {
    this.$('.play_queue').append(this.views.trackList.render().el);
  },
  _trackList: null
});

App.View.ChatView = App.View.CoreView.extend({
  tagName: 'div',
  events: {
    'keypress [name=chat_text]': 'sendChat'
  },
  initialize: function (attributes, options) {
    App.View.CoreView.prototype.initialize.call(this, attributes, options);
    this._template = this._getTemplate('chat_index');
    App.socket.on('chat', this.displayChatMessage.bind(this));
  },
  sendChat: function (event) {
    var textInput = this.$('[name=chat_text]'),
        text = textInput.val();
    if (event.keyCode === 13 && text !== '') {
      App.socket.emit('chat', { message: text, who: 'Someone' });
      this.displayChatMessage({
        message: text,
        who: 'You'
      });
      textInput.val('');
    }
  },
  displayChatMessage: function (context) {
    var messageView = new App.View.ChatMessageView(context);
    this.$('.messages').html(messageView.render().el);

  }
});

App.View.ChatMessageView = App.View.ModelView.extend({
  tagName: 'p',
  initialize: function (attributes, options) {
    App.View.CoreView.prototype.initialize.call(this, attributes, options);
    this._template = App.Templates.chat_message;
    this.model = {
      attributes: {
        who: attributes.who,
        message: attributes.message
      }
    };
  },
  render: function () {
    this.$el.html(this._template(this.model.attributes));
    return this;
  }
});

App.View.Controls = App.View.CoreView.extend({
  tagName: 'li',
  className: 'nav_main_controls',
  template: 'navigation_controls',
  events: {
    'click .nav_main_back': 'previous',
    'click .nav_main_next': 'next',
    'click .nav_main_play': 'play',
    'click .nav_main_pause': 'pause'
  },
  initialize: function (attributes, options) {
    App.View.CoreView.prototype.initialize.apply(this, arguments);
    this.on('rendered', function () {
      App.mopidy.playback.getState().then(this._changePlaybackState.bind(this));
    }.bind(this));
    this.listenTo(App.mopidy, 'event:playbackStateChanged', this._onPlaybackStateChanged.bind(this));
  },
  play: function () {
    App.mopidy.playback.play().then(null, console.error.bind(console));
  },
  pause: function () {
    App.mopidy.playback.pause().then(null, console.error.bind(console));
  },
  next: function () {
    App.mopidy.playback.next().then(null, console.error.bind(console));
  },
  previous: function () {
    App.mopidy.playback.previous().then(null, console.error.bind(console));
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

App.View.LoginView = App.View.PageView.extend({
  tagName: 'div',
  className: 'view',
  title: 'Sign In',
  events: {
    'submit .login': 'authenticate'
  },
  initialize: function (attributes, options) {
    App.View.PageView.prototype.initialize.call(this, attributes, options);
    this._template = this._getTemplate('main');
  },
  authenticate: function (event) {
    event.preventDefault();
    var credentials = this._getLoginDetails(), auth, homeView;

    if (credentials) {
      this._authenticate = new App.Model.Authenticate();
      this._authenticate.set(credentials);
      this._authenticate.save(null, {
        success: this._onAuthSaveSuccess.bind(this),
        error: this._onAuthSaveError.bind(this)
      });
    }
  },
  _onAuthSaveSuccess: function () {
    App.currentUser = this._authenticate;
    this.router.navigate('dashboard', { trigger: true });
  },
  _onAuthSaveError: function () {
    App.currentUser = null;
  },
  _getLoginDetails: function () {
    var email = this.$('[name=login_email]').val(),
        password = this.$('[name=login_password]').val();

    if (email !== '' && password !== '') {
      return {
        login_email: email,
        login_password: password
      };
    }

    return false;
  }
});

App.View.Navigation = App.View.CoreView.extend({
  tagName: 'ul',
  events: {
    'click a': '_navigateToUrl',
    'click .nav_main_next': 'nextTrack',
    'click [type=search]': 'search',
    'keyup [type=search]': 'search'
  },
  template: 'navigation_menu',
  initialize: function (attributes, options) {
    App.View.CoreView.prototype.initialize.apply(this, arguments);
    this.views = {};
    this.models = {};
    this.items = attributes.menu;
    this._current = attributes.current === undefined ? null : attributes.current;
    this.models = {
      search: new App.Model.Search()
    };
    this.views = {
      search: new App.View.Search({
        model: this.models.search
      }),
      controls: new App.View.Controls()
    };
    this.on('rendered', function () {
      this.$el.append(this.views.controls.render().el);
    }.bind(this));
    $('#search').append(this.views.search.render().el);
  },
  render: function () {
    this.trigger('rendering');
    this.$el.html(this._template({ items: this._getItems() }));
    this.trigger('rendered');
    return this;
  },
  setCurrent: function (url) {
    this._current = url;

    if (this._isAttachedToDOM()) {
      this.render();
    }
  },
  updateMenu: function (menu) {
    this.items = menu;

    if (this._isAttachedToDOM()) {
      this.render();
    }
  },
  nextTrack: function () {
    this.mopidy.playback.next();
  },
  search: function (event) {
    var query = event.currentTarget.value;

    if (event.which === 13) {
      if (query === '') {
        this._searchQuery = '';
        this._cancelSearch();
        this.views.search.$el.addClass('hidden');
        $('#search').addClass('hidden');
      }
      else if (query !== this._searchQuery) {
        this._searchQuery = query;
        this._cancelSearch();
        this.views.search.resetResults();
        this.views.search.$el.removeClass('hidden');
        $('#search').removeClass('hidden');
        this._searchPromise = this.models.search.fetch({ query: query });
      }
      else if (query === this._searchQuery) {
        this.views.search.$el.removeClass('hidden');
        $('#search').removeClass('hidden');
      }
    }
    else if (query === '') {
      this._cancelSearch();
      this.views.search.$el.addClass('hidden');
        $('#search').addClass('hidden');
    }
  },
  _cancelSearch: function () {
    if (typeof this._searchPromise === 'function') {
      this._searchPromise(null);
      this._searchPromise = null;
    }
  },
  _searchQuery: '',
  _getItems: function () {
    return _(this.items).map(this._mapItem.bind(this));
  },
  _mapItem: function (i) {
    return { name: i.name, url: i.url, current: i.url === this._current };
  },
  _isAttachedToDOM: function () {
    return this.el.parentNode !== null;
  },
  _navigateToUrl: function (event) {
    event.preventDefault();
    App.router.navigate(event.currentTarget.getAttribute('href'), { trigger: true });
  }
});

App.View.Search = App.View.CoreView.extend({
  tagName: 'div',
  className: 'search_results_list triangle_border_top hidden',
  template: 'search_list',
  initialize: function (attributes, options) {
    App.View.CoreView.prototype.initialize.apply(this, arguments);
    this.model = attributes.model;
    this.views = {
      tracks: new App.View.Tracks({
        collection: this.model.tracks
      }),
      localTracks: new App.View.Tracks({
        collection: this.model.localTracks
      }),
      albums: new App.View.Albums({
        collection: this.model.albums
      }),
      artists: new App.View.Artists({
        collection: this.model.artists
      })
    };
    this.on('rendered', function () {
      this.$('.search_results_tracks').append(this.views.tracks.render().el);
      this.$('.search_results_localtracks').append(this.views.localTracks.render().el);
      this.$('.search_results_albums').append(this.views.albums.render().el);
      this.$('.search_results_artists').append(this.views.artists.render().el);
    }.bind(this));
    this.listenTo(App.router, 'beforeRoute', function () {
      $('#search').addClass('hidden');
      this.$el.addClass('hidden');
    }.bind(this));
  },
  resetResults: function () {
    this.views.albums.resetResults();
    this.views.artists.resetResults();
    this.views.tracks.resetResults();
    this.views.localTracks.resetResults();
  }
});

$(function () {
  App.lastfm = new LastFM({
    apiKey: App.config.lastfm.key,
    apiSecret: App.config.lastfm.secret
    //cache: new LastFMCache()
  });
  App.mopidy.once('state:online', function () {
    App.notifications = new App.Collection.Notifications();
    App.notificationView = new App.View.Notifications({
      collection: App.notifications
    });
    App.router = new App.Router();
    App.mainNavigation = new App.View.Navigation({
      current: '',
      menu: App.config.navigationLists.standard
    });
    App.utils.appendToNavMain(App.mainNavigation.render().el);
    Backbone.history.start(App.config.backboneHistory);
  });
  App.mopidy.on('state:online', function () {
    window.setTimeout(function () {
      $('html').addClass('mopidy-connected');
    }, 2000);
  });
  App.mopidy.on('state:offline', function () {
    $('html').removeClass('mopidy-connected');
  });
});
