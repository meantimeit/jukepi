var extend = require('backbone/node_modules/underscore').extend;
var ModelItemView = require('./view.js');
var TrackView = ModelItemView.extend({
  tagName: 'li',
  events: function () {
    return extend({}, ModelItemView.prototype.events, {
      'dblclick li': '_addToTracklist'
    });
  },
  template: 'track_model_item',
  className: 'interactive-list-item',
  initialize: function (options) {
    ModelItemView.prototype.initialize.call(this, options);
  },
  _checkable: true,
  _addToTracklist: function (event) {
    this.model.save();
  }
});

module.exports = TrackView;
