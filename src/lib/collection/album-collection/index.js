var Collection = require('jpf').Collection;
var Album = require('../../model/album');
var AlbumCollection = Collection.extend({
  model: Album
});

module.exports = AlbumCollection;
