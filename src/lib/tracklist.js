var View = require('./view/view');
var TracklistListView = require('./view/tracklist-list-view');
var TracklistCollection = require('./collection/tracklist-collection');

function tracklist(app, tabIndex) {
  var collection = new TracklistCollection([], {
    mopidy: app.mopidy
  });

  var t = {
  	icon: 'data:image/svg+xml;charset=utf-8;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+DQo8c3ZnIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgd2lkdGg9IjUxMiIgaGVpZ2h0PSI1MTIiIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj4NCjxnPg0KPC9nPg0KCTxwYXRoIGQ9Ik0xNTIuNDQzIDEzNi40MTdsMjA3LjExNCAxMTkuNTczLTIwNy4xMTQgMTE5LjU5M3oiIGZpbGw9IiMwMDAwMDAiIC8+DQo8L3N2Zz4=',
    name: 'Playing',
    routePrefix: '',
    view: new TracklistListView({
      app: app,
      mopidy: app.mopidy,
      lastfm: app.lastfm,
      collection: collection,
      tabIndex: tabIndex
    })
  };

  var views = [];

  views.push(t);

  var v = new View({
    views: views
  });

  return t;
}


module.exports = tracklist;