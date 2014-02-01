var $ = require('../../vendors/jquery.js');
var View = require('../view.js');
var PageView = require('./view.js');
var JoinView = require('../misc/join.js');
var SearchControlView = require('../misc/search_control.js');
var MainControlView = require('../misc/main_control.js');
var NavigationView = PageView.extend({
  initialize: function (options) {
    View.prototype.initialize.call(this, options);
    this._initSubViews();
  },
  _template: require('../../../templates/navigation/index.hbs'),
  _initSubViews: function () {
    this.views = [
      {
        name: 'Search',
        view: new SearchControlView({
          router: this.router,
          mopidy: this.mopidy,
          config: this._config,
          lastfm: this._lastfm
        })
      },
      {
        name: 'Controls',
        view: new MainControlView({
          router: this.router,
          mopidy: this.mopidy,
          config: this._config,
          lastfm: this._lastfm
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
    col = $('<div class="view-section"></div>').appendTo(this.el);
    this.views[1].view.render().$el.appendTo(col);

    this.trigger('rendered');
    return this;
  }
});

module.exports = NavigationView;
