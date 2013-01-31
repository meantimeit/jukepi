App.Router = Backbone.Router.extend({
  initialize: function (options) {
    Backbone.Router.prototype.initialize.call(this, options);
    //this.on('route', this._authCheck, this);
  },
  routes: {
    '': 'dashboard',
    'albums/:id': 'albums',
    'artists/:uri/:name': 'artists',
    'auth': 'auth',
    'dashboard': 'dashboard'
  },
  index: function () {
    this.trigger('beforeRoute');
    this.navigate('auth', { trigger: true });
  },
  auth: function () {
    this.trigger('beforeRoute');
    var view = new App.View.LoginView({
      router: this
    });
    App.mainNavigation.setCurrent('auth');
    App.utils.appendToMain(view.render().el);
  },
  dashboard: function () {
    this.trigger('beforeRoute');
    var view = new App.View.HomePage({
      router: this
    });
    App.mainNavigation.setCurrent('');
    App.utils.appendToMain(view.render().el);
  },
  albums: function (id) {
    this.trigger('beforeRoute');
    var view = new App.View.AlbumPage({
      router: this,
      id: id
    });
    App.mainNavigation.setCurrent('albums');
    App.utils.appendToMain(view.render().el);
  },
  artists: function (uri, name) {
    this.trigger('beforeRoute');
    var view = new App.View.ArtistPage({
      router: this,
      uri: uri,
      name: name
    });
    App.mainNavigation.setCurrent('artists');
    App.utils.appendToMain(view.render().el);
  },
  _authCheck: function (currentRoute) {
    if (currentRoute === 'auth') {
      return true;
    }

    if (!App.currentUser) {
      this.navigate('/auth', { trigger: true });
    }
  }
});
