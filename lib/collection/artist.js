var Collection = require('./collection.js');
var Artist = require('../model/artist.js');
var ArtistCollection = Collection.extend({
  model: Artist
});

module.exports = ArtistCollection;
