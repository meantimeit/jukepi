var Collection = require('jpf').Collection;
var Track = require('../../model/track-model');
var TrackCollection = Collection.extend({
  model: Track
});

module.exports = TrackCollection;
