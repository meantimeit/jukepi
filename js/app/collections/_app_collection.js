App.Collection.CoreCollection = Backbone.Collection.extend({
  mopidy: App.mopidy,
  initialize: function (models, options) {
    Backbone.Collection.prototype.initialize.apply(this, arguments);
  },
  modelAttributes: function () {
    return this.map(this._modelAttributes.bind(this));
  },
  _modelAttributes: function (model) {
    return modelAttributes;
  }
});
