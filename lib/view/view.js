var templates = require('../templates.js');
var Backbone = require('backbone');
var View = Backbone.View.extend({
  initialize: function (options) {
    Backbone.View.prototype.initialize.call(this, options);

    options = options || {};

    options.templates = options.templates || templates;

    if (this.template) {
      this._setTemplate(templates);
    }

    if (options.mopidy) {
      this.mopidy = options.mopidy;
    }

    if (options.router) {
      this.router = options.router;
    }

    if (options.config) {
      this._config = options.config;
    }

    this._lastfm = options.lastfm;

    this.on('rendering', this._rendering, this);
    this.on('rendered', this._rendered, this);
  },
  remove: function (callback) {
    this.$el.toggleClass('hidden');
    Backbone.View.prototype.remove.apply(this, arguments);
  },
  render: function () {
    this.trigger('rendering');
    this.$el.html(this._template());
    this.trigger('rendered');
    return this;
  },
  _setTemplate: function (templates) {
    this._template = templates[this.template];
  },
  _rendering: function () {
    if (this._hideOnRender) {
      this.$el.addClass('hidden');
    }
  },
  _rendered: function () {
    if (this._hideOnRender) {
      this.$el.removeClass('hidden');
    }
  },
  _hideOnRender: false
});

Backbone.$ = require('../vendors/jquery.js');

module.exports = View;
