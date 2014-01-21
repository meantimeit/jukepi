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
    'click .delete_selected': '_deleteSelected'
  },
  _clearQueue: function () {
    var message1 = 'If you click OK to this, you WILL wipe the queue. Are you sure?',
        message2 = 'Really Sure? With great power, comes great responsibility.';

    if (confirm(message1) && confirm(message2)) {
      this.mopidy.tracklist.clear();
    }
  },
  _deleteSelected: function (event) {
    this._deleteSelectedTracks(this._getSelectedTracks());
  },
  _getSelectedTracks: function () {
      return this.$('[type=checkbox]:checked').map(function (index, input) {
        return +input.getAttribute('data-tracklist-id');
      }.bind(this)).toArray();
  },
  _deleteSelectedTracks: function (tlids) {
    var tlid, successCallback = null;

    if (tlids.length) {
      tlid = tlids.shift();
      this.mopidy.tracklist.remove({ tlid: tlid }).then(function () {
        this._trackList.remove(this._trackList.where({ tlid: tlid }));
        this._deleteSelectedTracks(tlids);
      }.bind(this));
      this.mopidy.tracklist.remove({ tlid: tlid }).then(this._deleteSelectedTracks.bind(this, tlids));
    }

  },
  _fetchTrackList: function () {
    this._collection.fetch();
  }
});

module.exports = TrackListListView;
