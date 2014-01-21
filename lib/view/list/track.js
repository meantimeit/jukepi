var ListView = require('./view.js');
var TrackCollectionView = require('../collection/track.js');
var TrackListView = ListView.extend({
  _collectionViewClass: TrackCollectionView,
  template: 'track_list',
  events: {
    'click .queue_all': '_queueAll',
    'click .queue_selected': '_queueSelected'
  },
  _queueAll: function () {
    this.mopidy.tracklist.add(this._collection.toJSON()).then(function () {
    });
  },
  _queueSelected: function () {
    var selectedInputs = this.$('li input[type=checkbox]:checked');
    var selectedTracks = selectedInputs.map(function (i, track) {
      return this.album.tracks.get(track.getAttribute('data-track-id')).toJSON();
    }.bind(this));
    this.mopidy.tracklist.add(selectedTracks).then(function () {
      selectedInputs.each(function (i, input) {
        input.checked = false;
      });
    }.bind(this));
  }
});

module.exports = TrackListView;
