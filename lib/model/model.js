var Backbone = require('backbone');
var Model = Backbone.Model.extend({
  initialize: function (attributes, options) {
    Backbone.Model.prototype.initialize.call(this, attributes, options);
    options = options || {};
    this.mopidy = options.mopidy;
    this._lastfm = options.lastfm;
  }
});

module.exports = Model;
