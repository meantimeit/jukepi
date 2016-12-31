var extend = require('underscore').extend;
function str_pad_left(n, c, s) {
  if (s.length >= n) {
    return s;
  }
  else {
    return str_pad_left(n, c, c + s);
  }
}
var ModelView = require('../model-view');
var TracklistModel = require('../../model/tracklist-model');
var TracklistModelView = ModelView.extend({
  model: TracklistModel,
  events: function () {
    return extend({}, ModelView.prototype.events, {
      'dblclick': 'play',
      'keydown': 'play',
      'dragstart': '_onDragStart',
      'dragend': '_onDragEnd',
      'drop': '_onDrop',
      'dragenter': '_onDragEnter',
      'dragover': '_onDragOver',
      'dragleave': '_onDragLeave'
    });
  },
  selectable: true,
  checkable: true,
  _template: function (data) {
    var h = data.track.name;
    var extra = [];

    if (data.track.length) {
      var time = Math.round(data.track.length / 1000);
      var minutes = '' + Math.floor(time / 60) + '';
      var seconds = '' + (time - minutes * 60) + '';
      var length = '(';
      length += str_pad_left(2, '0', minutes) + ':' + str_pad_left(2, '0', seconds);
      length += ')';

      h += ' ' + length;

    }

    if (data.track.album) {
      extra.push(data.track.album.name);
    }

    if (data.track.artists && data.track.artists.length) {
      extra.push(data.track.artists[0].name);
    }

    if (extra.length) {
      h += '<br><span class="option_extra_information">' + extra.join(' / ') + '</span>';
    }

    return h;
  },
  initialize: function (options) {
    ModelView.prototype.initialize.call(this, options);
    this.on('rendered', this._onRendered.bind(this));
  },
  play: function (event) {
    var isKeyDownPlay = event.type === 'keydown' && event.which === 13;
    var isDoubleClick = event.type === 'dblclick';

    if (isKeyDownPlay || isDoubleClick) {
      event.preventDefault();
      this.model.play();
    }
    else {
      ModelView.prototype._onKeydown.call(this, event);
    }
  },
  _initPlaybackStartedHandler: function () {
    var trackPlaybackStartedCallback = this._onTrackPlaybackStarted.bind(this);
    var mopidy = this._parent._parent.mopidy;

    mopidy.on('event:trackPlaybackStarted', trackPlaybackStartedCallback);
    this.on('remove', mopidy.off.bind(mopidy, 'event:trackPlaybackStarted', trackPlaybackStartedCallback));
    mopidy.playback.getCurrentTlTrack().then(function (resp) {
      if (resp && resp.tlid) {
        trackPlaybackStartedCallback({
          tl_track: resp
        });
      }
    });
  },
  _onTrackPlaybackStarted: function (event) {
    if (this.model.id === event.tl_track.tlid && !this.el.classList.contains('track-playing')) {
      this.el.classList.add('track-playing');
      this.render();
    }
    else if (this.model.id !== event.tl_track.tlid && this.el.classList.contains('track-playing')) {
      this.el.classList.remove('track-playing');
      this.render();
    }
  },
  _onRendered: function () {
    this._enableDraggableOnElement();
    this._initPlaybackStartedHandler();
  },
  _enableDraggableOnElement: function () {
    this.el.setAttribute('draggable', 'true');
  },
  _onDragStart: function (event) {
    event.dataTransfer.setData('track_index', this.model.collection.indexOf(this.model));
  },
  _onDragEnd: function (event) {
    this.el.classList.remove('dragover');
  },
  _onDrop: function (event) {
    var index, sourceTrack, targetIndex, newIndex;

    if (this.model && this.model.collection) {
      index = +event.dataTransfer.getData('track_index');
      sourceTrack = this.model.collection.at(index);
      targetIndex = this.model.collection.indexOf(this.model);
      newIndex = targetIndex + (targetIndex < index ? 1 : 0);

      this.el.classList.remove('dragover');

      if (index !== targetIndex) {
        this.model.collection.move(sourceTrack, newIndex);
      }
    }
  },
  _onDragEnter: function (event) {
    this.el.classList.add('dragover');
    event.preventDefault();
  },
  _onDragOver: function (event) {
    event.preventDefault();
  },
  _onDragLeave: function (event) {
    this.el.classList.remove('dragover');
  }
});

module.exports = TracklistModelView;
