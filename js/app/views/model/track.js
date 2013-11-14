App.View.Track = App.View.ModelView.extend({
  tagName: 'li',
  events: {
    'dblclick li': '_addToTracklist',
    'keydown li': '_toggleSelected'
  },
  template: 'track_item',
  className: 'track_list_item',
  initialize: function (attributes, options) {
    App.View.ModelView.prototype.initialize.apply(this, arguments);
  },
  _addToTracklist: function (event) {
    this.model.save();
  },
  _toggleSelected: function (event) {
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
    'keydown li': '_onKeydown',
    'dragstart li': '_onDragStart',
    'dragend li': '_onDragEnd',
    'drop li': '_onDrop',
    'dragenter li': '_onDragEnter',
    'dragover li': '_onDragOver',
    'dragleave li': '_onDragLeave'
  },
  initialize: function (attributes, options) {
    App.View.ModelView.prototype.initialize.apply(this, arguments);
    this.on('rendered', this._onRendered.bind(this));
  },
  play: function (event) {
    var isKeyDownPlay = event.type === 'keydown' && event.which === 13;
    var isDoubleClick = event.type === 'dblclick';

    if (isKeyDownPlay || isDoubleClick) {
      event.preventDefault();
      this.mopidy.playback.play(this.model.attributes);
    }
  },
  _onKeydown: function (event) {
    var enterKey = event.which === 13;
    var spaceKey = event.which === 32;

    if (enterKey) {
      this._play(event);
    }
    else if (spaceKey) {
      this._toggleSelected(event);
    }
  },
  _onRendered: function () {
    this._enableDraggableOnElement();
    this._toggleCurrentTrackIfCurrent();
  },
  _enableDraggableOnElement: function () {
    this.$el.attr('draggable', 'true');
  },
  _toggleCurrentTrackIfCurrent: function () {
    if (this.model.current) {
      this.$el.addClass('current_track');
    }
    else {
      this.$el.removeClass('current_track');
    }
  },
  _toggleSelected: function (event) {
    var checkbox = this.$('input[type=checkbox]')[0];
    checkbox.checked = !checkbox.checked;
    event.preventDefault();
  },
  _onDragStart: function (event) {
    event.dataTransfer.setData('track_index', this.model.collection.indexOf(this.model));
  },
  _onDragEnd: function (event) {
    this.$el.removeClass('dragover');
  },
  _onDrop: function (event) {
    var index, sourceTrack, targetIndex, newIndex;

    if (this.model && this.model.collection) {
      index = +event.dataTransfer.getData('track_index');
      sourceTrack = this.model.collection.at(index);
      targetIndex = this.model.collection.indexOf(this.model);
      newIndex = targetIndex + (targetIndex < index ? 1 : 0);

      this.$el.removeClass('current_track');

      if (index !== targetIndex) {
        this.model.collection.move(sourceTrack, newIndex);
      }
    }
  },
  _onDragEnter: function (event) {
    this.$el.addClass('dragover');
    event.preventDefault();
  },
  _onDragOver: function (event) {
    event.preventDefault();
  },
  _onDragLeave: function (event) {
    this.$el.removeClass('dragover');
  },
});
