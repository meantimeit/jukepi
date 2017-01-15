var Collection = require('jpf').Collection;
var ListView = require('jpf').ListView;
var TracklistCollectionView = require('../tracklist-collection-view');
var TracklistModelView = require('../tracklist-model-view');
var ButtonView = require('../button-view');
var PopButtonView = require('../pop-button-view');
var PlaypauseButtonView = require('../playpause-button-view');
var TracklistSettingsView = require('../tracklist-settings-view');
var VolumeView = require('../volume-view');
var TracklistListView = ListView.extend({
  CollectionViewClass: TracklistCollectionView,
  ModelViewClass: TracklistModelView,
  selectable: true,
  checkable: true,
  initialize: function (options) {
    options = options || {};

    var buttons = [
      ButtonView.create('skip_previous', this._prevTrack.bind(this), 'Previous', 'material-icons'),
      PlaypauseButtonView.create(options.mopidy),
      ButtonView.create('skip_next', this._nextTrack.bind(this), 'Next', 'material-icons'),
      PopButtonView.create('volume_up', VolumeView.create(options.mopidy, 'volume-view').view, 'Change volume', 'material-icons'),
      ButtonView.create('delete', this._deleteChecked.bind(this), 'Remove selected', 'material-icons'),
      PopButtonView.create('settings', TracklistSettingsView.create({mopidy: options.mopidy}), 'Settings', 'material-icons')
    ];

    this.mopidy = options.mopidy;
    options.tools = new Collection(buttons);

    ListView.prototype.initialize.call(this, options);
  },
  _deleteChecked: function (event) {
    var collView = this._views.at(1).get('view');
    var checkedIndices = collView.getChecked();
    var tlids = checkedIndices.map(function (i) {
      return collView._views.at(i).get('view').model.get('tlid');
    }.bind(this));
    if (tlids.length) {
      this.mopidy.tracklist.remove({tlid: tlids});
    }
  },
  _nextTrack: function () {
    this.mopidy.playback.next();
  },
  _prevTrack: function () {
    this.mopidy.playback.previous();
  }
});

module.exports = TracklistListView;
