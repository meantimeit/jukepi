var Collection = require('./collection.js');
var Track = require('../model/track.js');
var TrackCollection = Collection.extend({
  model: Track
});

module.exports = TrackCollection;
