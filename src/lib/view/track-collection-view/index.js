var forEach = require('jpf').forEach;
var appendChild = require('jpf').appendChild;
var renderViews = require('jpf').renderViews;

var CollectionView = require('../collection-view');
var TrackModelView = require('../track-model-view');
var TrackCollectionView = CollectionView.extend({
  ModelViewClass: TrackModelView,
  checkable: true,
  selectable: true,
  events: {
    'click .show-more': '_onShowMore',
    'keyup .show-more': '_onKeyShowMore'
  },
  initialize: function (options) {
    this._showNumRows = 20;
    return CollectionView.prototype.initialize.call(this, options);
  },
  _renderViews: function () {
    forEach(appendChild(this.el), renderViews(this._views.slice(0, this._showNumRows)));

    if (this._views.length > this._showNumRows) {
      appendChild(this.el, this._showMoreEl());
    }

    return this;
  },
  _showMoreEl: function () {
    var li = document.createElement('li');
    var t = document.createTextNode('Show more…');

    li.setAttribute('role', 'option');
    li.setAttribute('tabindex', 0);
    li.className = 'show-more';
    li.appendChild(t);

    return li;
  },
  _onShowMore: function () {
    // Get the current last element
    var curEl = this._views.at(this._showNumRows - 1).get('view').el;

    // Increase the max num rows
    this._showNumRows = this._showNumRows + 20;

    // Re-render everything
    this.render();

    // Scroll directly to the current last element
    curEl.scrollIntoView();

    return this;
  },
  _onKeyShowMore: function (event) {
    if (event.which === 13) {
      this._onShowMore();
    }

    return this;
  }
});

module.exports = TrackCollectionView;