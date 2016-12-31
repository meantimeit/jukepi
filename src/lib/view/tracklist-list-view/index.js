var Collection = require('jpf').Collection;
var ListView = require('jpf').ListView;
var TracklistCollectionView = require('../tracklist-collection-view');
var TracklistModelView = require('../tracklist-model-view');
var ButtonView = require('../button-view');
var PlaypauseButtonView = require('../playpause-button-view');
var AutoclearButtonView = require('../autoclear-button-view');
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
      VolumeView.create(options.mopidy),
      AutoclearButtonView.create(options.mopidy),
      ButtonView.create('delete_sweep', this._clearQueue.bind(this), 'Clear queue', 'material-icons'),
      ButtonView.create('remove_circle', this._deleteChecked.bind(this), 'Remove selected', 'material-icons')
    ];

    this.mopidy = options.mopidy;
    options.tools = new Collection(buttons);

    ListView.prototype.initialize.call(this, options);
  },
  _clearQueue: function () {
    var message1 = 'If you click OK to this, you WILL wipe the queue. Are you sure?',
        message2 = 'Really Sure? With great power, comes great responsibility.';

    if (confirm(message1) && confirm(message2)) {
      this.mopidy.tracklist.clear();
    }
  },
  _deleteChecked: function (event) {
    var collView = this._views.at(1).get('view');
    var checkedIndices = collView.getChecked();
    var tlids = checkedIndices.map(function (i) {
      return collView._views.at(i).get('view').model.get('tlid');
    }.bind(this));
    this.mopidy.tracklist.remove({ tlid: tlids });
  },
  _nextTrack: function () {
    this.mopidy.playback.next();
  },
  _prevTrack: function () {
    this.mopidy.playback.previous();
  }
});

module.exports = TracklistListView;
