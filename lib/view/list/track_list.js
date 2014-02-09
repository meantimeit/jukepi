var ListView = require('./view.js');
var TrackListCollectionView = require('../collection/track_list.js');
var TrackListListView = ListView.extend({
  _collectionViewClass: TrackListCollectionView,
  initialize: function (options) {
    ListView.prototype.initialize.call(this, options);
    this.on('rendered', this._fetchTrackList.bind(this));
  },
  template: 'tracklist_list',
  events: {
    'click .clear_queue': '_clearQueue',
    'click .delete_selected': '_deleteChecked'
  },
  _clearQueue: function () {
    var message1 = 'If you click OK to this, you WILL wipe the queue. Are you sure?',
        message2 = 'Really Sure? With great power, comes great responsibility.';

    if (confirm(message1) && confirm(message2)) {
      this.mopidy.tracklist.clear();
    }
  },
  _deleteChecked: function (event) {
    this._deleteCheckedTracks(this._collectionView.getChecked().map(function (view) {
      return view.model.get('tlid');
    }));
  },
  _deleteCheckedTracks: function (tlids) {
    this.mopidy.tracklist.remove({ tlid: tlids });
  },
  _fetchTrackList: function () {
    this._collection.fetch();
  }
});

module.exports = TrackListListView;
