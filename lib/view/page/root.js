var $ = require('../../vendors/jquery.js');
var View = require('../view.js');
var PageView = require('./view.js');
var JoinView = require('../misc/join.js');
var SearchControlView = require('../misc/search_control.js');
var MainControlView = require('../misc/main_control.js');
var NowPlayingView = require('../misc/now_playing.js');
var TrackListListView = require('../list/track_list.js');
var TrackListCollection = require('../../collection/track_list.js');
var RootView = PageView.extend({
  initialize: function (options) {
    View.prototype.initialize.call(this, options);
    this._initSubViews();
  },
  _template: require('../../../templates/root/index.hbs'),
  _initSubViews: function () {
    this.views = [
      {
        name: 'MainContent',
        view: new JoinView({
          router: this.router,
          mopidy: this.mopidy,
          config: this._config,
          lastfm: this._lastfm,
          views: [
            {
              name: 'NowPlaying',
              view: new NowPlayingView({
                router: this.router,
                mopidy: this.mopidy,
                config: this._config,
                lastfm: this._lastfm
              })
            },
            {
              name: 'Queue',
              view: new TrackListListView({
                router: this.router,
                collection: new TrackListCollection(null, {
                  mopidy: this.mopidy
                }),
                mopidy: this.mopidy,
                config: this._config,
                lastfm: this._lastfm
              })
            }
          ]
        })
      }
    ];
  },
  render: function () {
    var i;
    var col;

    this.trigger('rendering');
    this.$el.html(this._template());

    col = $('<div class="view-section"></div>').appendTo(this.el);
    this.views[0].view.render().$el.appendTo(col);

    this.trigger('rendered');
    return this;
  }
});

module.exports = RootView;
