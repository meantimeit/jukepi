var extend = require('underscore').extend;
var ModelView = require('../model-view');
var TrackView = ModelView.extend({
  events: function () {
    return extend({}, ModelView.prototype.events, {
      'dblclick': '_addToTracklist'
    });
  },
  selectable: true,
  checkable: true,
  _template: function (data) {
    var h = this._model.get('name');
    var extra = [];

    if (data.album) {
      extra.push(data.album.name);
    }

    if (data.artists && data.artists.length) {
      extra.push(data.artists[0].name);
    }

    if (extra.length) {
      h += '<br><span class="option_extra_information">' + extra.join(' / ') + '</span>';
    }

    return h;
  },
  _addToTracklist: function () {
    this.model.save();
  }
});

module.exports = TrackView;
