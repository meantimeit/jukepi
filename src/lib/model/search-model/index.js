var url = require('url');
var concatStr = require('jpf').concatStr;
var concat = require('jpf').concat;
var map = require('jpf').map;
var unique = require('jpf').unique;
var filter = require('jpf').filter;
var compose = require('jpf').compose;
var appendColons = concatStr(':');
var mapColons = map(appendColons);
var elem = require('jpf').elem;

function lookupResultToSearchResult(result) {
  return [{tracks: result}];
}

var Model = require('jpf').Model;
var TrackCollection = require('../../collection/track-collection');
var AlbumCollection = require('../../collection/album-collection');
var ArtistCollection = require('../../collection/artist-collection');
var Search = Model.extend({
  initialize: function (attributes, options) {
    Model.prototype.initialize.call(this, attributes, options);
    this.tracks = new TrackCollection();
    this.albums = new AlbumCollection();
    this.artists = new ArtistCollection();
  },
  sync: function (method, model, options) {
    var isLookup = compose(mapColons, elem(url.parse(options.query).protocol));

    options.success = function(success, resp) {
      this._syncCollections(resp);
      success(model, resp, options);
    }.bind(this, options.success);

    return this.mopidy.getUriSchemes().then(isLookup).then(this._doSearch.bind(this, options.query)).then(options.success).catch(options.error);
  },
  _doSearch: function (query, isLookup) {
    if (isLookup) {
      return this.mopidy.library.lookup(query).then(lookupResultToSearchResult);
    }

    return this.mopidy.library.search({ any: query.split(' ') }, mapColons(this._getSearchUris()));
  },
  _getSearchUris: function () {
    var searchUris = this._config && this._config.searchUris && this._config.searchUris.length ? this._config.searchUris : [];
    return searchUris;
  },
  _syncCollections: function (resp) {
    resp = resp || [];

    var uriAlreadyTaken = function (acc, curr) {
      var uri = curr.uri;
      var uacc = map(function (i) {
        return i.uri;
      }, acc);

      return uacc.indexOf(uri) === -1;
    };
    var notNull = function (val) {
      return val != null;
    };

    var tracks = concat(map(function (sr) {
      return sr.tracks ? sr.tracks : [];
    }, resp));

    var albums = unique(uriAlreadyTaken, filter(notNull, map(function (t) {
      return !t.album ? null : {
        name: t.album.name,
        uri: t.album.uri,
        artists: t.artists || []
      };
    }, tracks)));
    var artists = unique(uriAlreadyTaken, concat(filter(notNull, map(function (t) {
      return !t.artists ? null : t.artists;
    }, tracks))));

    this.tracks[tracks.length ? 'set' : 'reset'](tracks);
    this.albums[albums.length ? 'set' : 'reset'](albums);
    this.artists[artists.length ? 'set' : 'reset'](artists);
  }
});

module.exports = Search;