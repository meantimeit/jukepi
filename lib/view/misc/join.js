var $ = require('../../vendors/jquery.js');
var View = require('../view.js');
var JoinView = View.extend({
  tagName: 'div',
  initialize: function (options) {
    View.prototype.initialize.call(this, options);
    this.views = options.views || [];
  },
  render: function () {
    var i;
    var wrap;

    this.trigger('rendering');

    for (i = 0; i < this.views.length; i++) {
      if (this.views[i].wrap) {
        wrap = $(this.views[i].wrap).appendTo(this.el);
        this.views[i].view.render().$el.appendTo(wrap);
      }
      else {
        this.el.appendChild(this.views[i].view.render().el);
      }
    }

    this.trigger('rendered');
    return this;
  }
});

module.exports = JoinView;
