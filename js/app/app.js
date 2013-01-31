$(function () {
  App.lastfm = new LastFM({
    apiKey: App.config.lastfm.key,
    apiSecret: App.config.lastfm.secret
    //cache: new LastFMCache()
  });
  App.mopidy.once('state:online', function () {
    App.notifications = new App.Collection.Notifications();
    App.notificationView = new App.View.Notifications({
      collection: App.notifications
    });
    App.router = new App.Router();
    App.mainNavigation = new App.View.Navigation({
      current: '',
      menu: App.config.navigationLists.standard
    });
    App.utils.appendToNavMain(App.mainNavigation.render().el);
    Backbone.history.start(App.config.backboneHistory);
  });
  App.mopidy.on('state:online', function () {
    window.setTimeout(function () {
      $('html').addClass('mopidy-connected');
    }, 2000);
  });
  App.mopidy.on('state:offline', function () {
    $('html').removeClass('mopidy-connected');
  });
});
