var extend = require('underscore').extend;
var ModelItemView = require('./view.js');
var TracklistTrackModelItemView = ModelItemView.extend({
  tagName: 'li',
  className: 'interactive-list-item',
  template: 'tracklist_model',
  events: function () {
    return extend({}, ModelItemView.prototype.events, {
      'dblclick': 'play',
      'dragstart': '_onDragStart',
      'dragend': '_onDragEnd',
      'drop': '_onDrop',
      'dragenter': '_onDragEnter',
      'dragover': '_onDragOver',
      'dragleave': '_onDragLeave'
    });
  },
  initialize: function (options) {
    ModelItemView.prototype.initialize.call(this, options);
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
  _checkable: true,
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
    event.originalEvent.dataTransfer.setData('track_index', this.model.collection.indexOf(this.model));
  },
  _onDragEnd: function (event) {
    this.$el.removeClass('dragover');
  },
  _onDrop: function (event) {
    var index, sourceTrack, targetIndex, newIndex;

    if (this.model && this.model.collection) {
      index = +event.originalEvent.dataTransfer.getData('track_index');
      sourceTrack = this.model.collection.at(index);
      targetIndex = this.model.collection.indexOf(this.model);
      newIndex = targetIndex + (targetIndex < index ? 1 : 0);

      this.$el.removeClass('dragover');

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

module.exports = TracklistTrackModelItemView;
