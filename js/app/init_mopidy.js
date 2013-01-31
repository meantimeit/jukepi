App.utils.copyProperties(App.env, App.config);
if (App.config.mopidyWebSocketUrl !== null) {
  App.mopidy = new Mopidy({ webSocketUrl: App.config.mopidyWebSocketUrl });
}
else {
  App.mopidy = new Mopidy();
}
