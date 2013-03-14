App.env.title = 'JukePi';
App.env.mopidyWebSocketUrl = null;
App.env.lastfm = {
  key: '2cf976142417f691e2bd09bd4061d241',
  secret: '92607e06587f9f3f3d343cfdc2a913ab'
};
App.config.mainEl = document.getElementsByTagName('main')[0];
App.config.mainNavEl = document.getElementById('nav_main');
App.config.mainFooterEl = document.querySelector('[role=contentinfo]');
App.config.mainHeaderEl = document.querySelector('[role=banner]');
App.config.delayDuration = 500;
App.config.backboneHistory = {
  pushState: false
};
App.config.navigationLists = {
  standard: [
    { name: 'Queue', url: '' },
    { name: 'Playlists', url: 'playlists' }
  ]
};
