var View = require('./view/view');
var SearchRouter = require('./router/search-router');
var SearchView = require('./view/search-view');
var Collection = require('jpf').Collection;

function search(app, tabIndex) {
  var collection = new Collection();
  var view = new View({ views: collection });
  var router = new SearchRouter({
    app: app,
    collection: collection,
    tabIndex: tabIndex
  });
  var t = {
    name: 'Search',
    routePrefix: 'search',
    icon: 'data:image/svg+xml;charset=utf-8;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+DQo8c3ZnIHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KIDxnPg0KICA8dGl0bGU+TGF5ZXIgMTwvdGl0bGU+DQogIDxnIHN0cm9rZT0ibnVsbCIgaWQ9InN2Z18xIj4NCiAgIDxwYXRoIHN0cm9rZT0ibnVsbCIgZD0ibTM4Ny45NTc4MywzNDguMTE0NjJsLTM1LjY0MTksLTM1LjY0MTljLTEwLjM5MDI0LDE1LjI1NDU5IC0yMy41ODg2NCwyOC40NTI5NyAtMzguODQzMjEsMzguODQzMjFsMzUuNjQxOSwzNS42NDE5YzEwLjczMDE3LDEwLjczMDE3IDI4LjEzMDc5LDEwLjczMDE3IDM4Ljg0MzIxLDBjMTAuNzMwMTcsLTEwLjczMDE3IDEwLjczMDE3LC0yOC4xMTMwNCAwLC0zOC44NDMyMXoiIGlkPSJzdmdfMiIvPg0KICAgPHBhdGggc3Ryb2tlPSJudWxsIiBkPSJtMzU5LjM3OTUzLDIzMC4xODk3NmMwLC03MC44MDEzOCAtNTcuMzg4MzksLTEyOC4xODk3NiAtMTI4LjE4OTc2LC0xMjguMTg5NzZzLTEyOC4xODk3Niw1Ny4zODgzOSAtMTI4LjE4OTc2LDEyOC4xODk3NnM1Ny4zODgzOSwxMjguMTg5NzYgMTI4LjE4OTc2LDEyOC4xODk3NnMxMjguMTg5NzYsLTU3LjM4ODM5IDEyOC4xODk3NiwtMTI4LjE4OTc2em0tMTI4LjE4OTc2LDEwMC43MjA1M2MtNTUuNTM3NjQsMCAtMTAwLjcyMDUzLC00NS4xOTIwNCAtMTAwLjcyMDUzLC0xMDAuNzIwNTNjMCwtNTUuNTM3NjQgNDUuMTgyODgsLTEwMC43MjA1MyAxMDAuNzIwNTMsLTEwMC43MjA1M2M1NS41Mjg0OCwwIDEwMC43MjA1Myw0NS4xODI4OCAxMDAuNzIwNTMsMTAwLjcyMDUzYzAsNTUuNTI4NDggLTQ1LjE5MjA0LDEwMC43MjA1MyAtMTAwLjcyMDUzLDEwMC43MjA1M3oiIGlkPSJzdmdfMyIvPg0KICA8L2c+DQogPC9nPg0KPC9zdmc+',
    view: new SearchView({
      app: app,
      router: router,
      views: [ view ]
    })
  };

  return t;
};

module.exports = search;
