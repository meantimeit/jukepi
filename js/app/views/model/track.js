App.View.Track = App.View.ModelView.extend({
  tagName: 'li',
  events: {
    'dblclick li': 'addToTracklist',
    'keydown li': 'toggleSelected'
  },
  template: 'track_item',
  className: 'track_list_item',
  initialize: function (attributes, options) {
    App.View.ModelView.prototype.initialize.apply(this, arguments);
  },
  addToTracklist: function (event) {
    this.model.save();
  },
  toggleSelected: function (event) {
    var checkbox;

    if (this._extended && event.which === 32) {
      event.preventDefault();
      checkbox = this.$('input[type=checkbox]')[0];
      checkbox.checked = !checkbox.checked;
    }
  }
});
App.View.TrackListTrack = App.View.ModelView.extend({
  tagName: 'li',
  className: 'track_list_item',
  template: 'tracklist_item',
  events: {
    'dblclick li': 'play',
    'keydown li': 'play'
  },
  initialize: function (attributes, options) {
    App.View.ModelView.prototype.initialize.apply(this, arguments);
    this.on('rendered', this._toggleCurrentTrackIfCurrent.bind(this));
  },
  play: function (event) {
    var isKeyDownPlay = event.type === 'keydown' && event.which === 13;
    var isDoubleClick = event.type === 'dblclick';

    if (isKeyDownPlay || isDoubleClick) {
      event.preventDefault();
      this.mopidy.playback.play(this.model.attributes);
    }
  },
  _toggleCurrentTrackIfCurrent: function () {
    if (this.model.current) {
      this.$el.addClass('current_track');
    }
    else {
      this.$el.removeClass('current_track');
    }
  }
});
