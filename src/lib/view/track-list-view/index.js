var Collection = require('jpf').Collection;
var ButtonView = require('../button-view');
var ListView = require('jpf').ListView;
var TrackCollectionView = require('../track-collection-view');
var TrackModelView = require('../track-model-view');
var TrackListView = ListView.extend({
  CollectionViewClass: TrackCollectionView,
  ModelViewClass: TrackModelView,
  events: {
    'click .queue_all': '_queueAll',
    'click .queue_selected': '_queueSelected',
    'change .action-toolbar input[type=checkbox]': '_toggleChecked'
  },
  initialize: function (options) {
    options = options || {};

    var buttons = [];

    buttons.push(ButtonView.create('add_circle', this._queueChecked.bind(this), 'Add to queue', 'material-icons'));

    if (options.artistButtonLabel) {
      buttons.push(ButtonView.create('More by ' + options.artistButtonLabel, this._navigateArtist.bind(this)));
    }

    options.tools = new Collection(buttons);

    this._mopidy = options.mopidy;

    return ListView.prototype.initialize.call(this, options);
  },
  _queueChecked: function () {
    var selectedModelViews = this._views.at(1).get('view').getCheckedViews();
    var tracks;

    if (selectedModelViews.length) {
      tracks = selectedModelViews.map(function (view) {
        return view.model.toJSON();
      });

      this._app.mopidy.tracklist.add(tracks);
    }
  },
  _navigateArtist: function () {
    var artistData = this._views.at(1).get('view').collection.at(0).get('artists')[0]
    this._router.navigate('/search/artists/' + artistData.uri + '/' + encodeURIComponent(artistData.name), { trigger: true });
  }
});

module.exports = TrackListView;

