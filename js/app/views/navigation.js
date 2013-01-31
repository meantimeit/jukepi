App.View.Navigation = App.View.CoreView.extend({
  tagName: 'ul',
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
    this.models = {
      search: new App.Model.Search()
    };
    this.views = {
      search: new App.View.Search({
        model: this.models.search
      }),
      controls: new App.View.Controls()
    };
    this.on('rendered', function () {
      this.$el.append(this.views.controls.render().el);
    }.bind(this));
    $('#search').append(this.views.search.render().el);
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
      if (query === '') {
        this._searchQuery = '';
        this._cancelSearch();
        this.views.search.$el.addClass('hidden');
        $('#search').addClass('hidden');
      }
      else if (query !== this._searchQuery) {
        this._searchQuery = query;
        this._cancelSearch();
        this.views.search.resetResults();
        this.views.search.$el.removeClass('hidden');
        $('#search').removeClass('hidden');
        this._searchPromise = this.models.search.fetch({ query: query });
      }
      else if (query === this._searchQuery) {
        this.views.search.$el.removeClass('hidden');
        $('#search').removeClass('hidden');
      }
    }
    else if (query === '') {
      this._cancelSearch();
      this.views.search.$el.addClass('hidden');
        $('#search').addClass('hidden');
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
