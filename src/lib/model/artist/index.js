var Model = require('jpf').Model;
var Artist = Model.extend({
  idAttribute: 'uri'
});

module.exports = Artist;