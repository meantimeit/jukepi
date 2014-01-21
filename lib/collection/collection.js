var Backbone = require('backbone');
var Collection = Backbone.Collection.extend({
  initialize: function (models, options) {
    Backbone.Collection.prototype.initialize.call(this, models, options);

    if (options.mopidy) {
      this.mopidy = options.mopidy;
    }

    if (options.lastfm) {
      this._lastfm = options.lastfm;
    }
  },
  move: function (model, toIndex) {
    var fromIndex = this.indexOf(model);

    if (fromIndex === -1) {
      throw new Error("Can't move a model that's not in the collection");
    }
    if (fromIndex !== toIndex) {
      this.models.splice(toIndex, 0, this.models.splice(fromIndex, 1)[0]);
    }

    this.trigger('sort');
  },
  modelAttributes: function () {
    return this.map(this._modelAttributes.bind(this));
  },
  _modelAttributes: function (model) {
    return modelAttributes;
  }
});

module.exports = Collection;
