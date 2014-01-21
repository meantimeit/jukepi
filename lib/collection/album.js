var Collection = require('./collection.js');
var Album = require('../model/album.js');
var AlbumCollection = Collection.extend({
  model: Album
});

module.exports = AlbumCollection;
