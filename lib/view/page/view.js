var View = require('../view.js');
var PageView = View.extend({
  initialize: function (options) {
    View.prototype.initialize.call(this, options);
    this._initSubViews();
    this.listenTo(this.router, 'beforeRoute', this.remove);
  },
  render: function () {
    var i;

    this.trigger('rendering');
    this.$el.html(this._template());

    for (i = 0; i < this.views.length; i++) {
      this.el.appendChild(this.views[i].view.render().el);
    }

    this._setTitle(this.title);
    this.trigger('rendered');

    return this;
  },
  remove: function () {
    this.stopListening();
    View.prototype.remove.apply(this, arguments);
  },
  _setTitle: function (title) {
    $('title').text(title + ': ' + this._config.title);
  }
});

module.exports = PageView;
