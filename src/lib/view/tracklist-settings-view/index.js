var View = require('../view');
var AutoclearButtonView = require('../autoclear-button-view');
var ActionView = require('../action-view');
var TracklistSettingsView = View.extend({
  tagName: 'ul',
  className: 'tracklist-settings-view'
});
var ItemView = View.extend({
  tagName: 'li',
  className: 'tracklist-settings-item-view'
});

function mkItem(view) {
  return new ItemView({
    views: [view]
  });
}

TracklistSettingsView.create = function (opts) {
  opts = opts || {};
  opts.views = [];
  opts.views.push(mkItem(AutoclearButtonView.create(opts.mopidy).view));
  opts.views.push(mkItem(ActionView.create('<span class=\"material-icons\">clear_all</span> Clear queue',function (event) {
    var message1 = 'If you click OK to this, you WILL wipe the queue. Are you sure?';
    var message2 = 'Really Sure? With great power, comes great responsibility.';

    if (confirm(message1) && confirm(message2)) {
      opts.mopidy.tracklist.clear();
    }
  }, 'Clear queue', '').view));

  return new TracklistSettingsView(opts);
};

module.exports = TracklistSettingsView;