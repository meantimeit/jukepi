var ListView = require('./view.js');
var TrackCollectionView = require('../collection/track.js');
var TrackListView = ListView.extend({
  _collectionViewClass: TrackCollectionView,
  template: 'track_list',
  events: {
    'click .queue_all': '_queueAll',
    'click .queue_selected': '_queueSelected',
    'change .action-toolbar input[type=checkbox]': '_toggleChecked'
  },
  _queueSelected: function () {
    var selectedModelViews = this._collectionView.getChecked();
    var tracks;

    if (selectedModelViews.length) {
      tracks = selectedModelViews.map(function (view) {
        return view.model.toJSON();
      });
      this.mopidy.tracklist.add(tracks).then(function () {
        selectedModelViews.forEach(function (view) {
          view.setChecked(false);
        });
      });
    }
  },
  _toggleChecked: function (event) {
    this._collectionView.checkAll(!this._collectionView.allChecked());
  }
});

module.exports = TrackListView;
