var Collection = require('jpf').Collection;
var Artist = require('../../model/artist');

var ArtistCollection = Collection.extend({
  model: Artist
});
module.exports = ArtistCollection;