App.View.Navigation = App.View.CoreView.extend({
  tagName: 'div',
  events: {
    'click a': '_navigateToUrl',
    'click .nav_main_next': 'nextTrack',
    'click [type=search]': 'search',
    'keyup [type=search]': 'search'
  },
  template: 'navigation_menu',
  initialize: function (attributes, options) {
    App.View.CoreView.prototype.initialize.apply(this, arguments);
    this.views = {};
    this.models = {};
    this.items = attributes.menu;
    this._current = attributes.current === undefined ? null : attributes.current;
    this.views = {
      controls: new App.View.Controls(),
      volumeControl: new App.View.VolumeControl()
    };
    this.on('rendered', function () {
      var $ul = $('<ul></ul>').append(this.views.controls.render().el);
      this.$('.columns.six').eq(1).html($ul);
      $ul.find('.nav_main_volume').append(this.views.volumeControl.render().el);
    }.bind(this));
  },
  render: function () {
    this.trigger('rendering');
    this.$el.html(this._template({ items: this._getItems() }));
    this.trigger('rendered');
    return this;
  },
  setCurrent: function (url) {
    this._current = url;

    if (this._isAttachedToDOM()) {
      this.render();
    }
  },
  updateMenu: function (menu) {
    this.items = menu;

    if (this._isAttachedToDOM()) {
      this.render();
    }
  },
  nextTrack: function () {
    this.mopidy.playback.next();
  },
  search: function (event) {
    var query = event.currentTarget.value;

    if (event.which === 13) {
      if (query !== '') {
        App.router.navigate('search/' + query, { trigger: true });
      }
    }
    
  },
  _cancelSearch: function () {
    if (typeof this._searchPromise === 'function') {
      this._searchPromise(null);
      this._searchPromise = null;
    }
  },
  _searchQuery: '',
  _getItems: function () {
    return _(this.items).map(this._mapItem.bind(this));
  },
  _mapItem: function (i) {
    return { name: i.name, url: i.url, current: i.url === this._current };
  },
  _isAttachedToDOM: function () {
    return this.el.parentNode !== null;
  },
  _navigateToUrl: function (event) {
    event.preventDefault();
    App.router.navigate(event.currentTarget.getAttribute('href'), { trigger: true });
  }
});
