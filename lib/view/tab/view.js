var $ = require('jquery');
var PageView = require('../page/view.js');
var TabView = PageView.extend({
  className: 'tab-view-section',
  template: 'tab_view',
  events: {
    'click [role=tab]': '_clickTab',
    'keydown [role=tab]': '_switchTab'
  },
  initialize: function (options) {
    PageView.prototype.initialize.call(this, options);
  },
  render: function () {
    var i;
    var baseName = Date.now();
    var panel;

    this.trigger('rendering');
    this.$el.html(this._template({
      baseName: baseName,
      tabs: this._getTabs()
    }));

    for (i = 0; i < this.views.length; i++) {
      panel = $(this._generateTabHTML(i, baseName)).appendTo(this.el);
      $(this.views[i].view.render().el).appendTo(panel);
    }

    this.trigger('rendered');
    return this;
  },
  _getTabs: function () {
    return this.views.map(function (v, index) {
      return v.name;
    }.bind(this));
  },
  _generateTabHTML: function (index, baseName) {
    var currentTabClass = '';
    var ariaHiddenAttribute = 'true';

    if (index === 0) {
      ariaHiddenAttribute = 'false';
    }

    return '<div class=\"tab-view-section-tab opaque\" id=\"panel-' + baseName + '-' + index + '\" aria-labeledby=\"tab-' + baseName + '-' + index + '\" role=\"tabpanel\" aria-hidden="' + ariaHiddenAttribute + '"></div>';
  },
  _clickTab: function (event) {
    var selected = event.target.getAttribute('aria-controls');
    this._updateTabs(selected);
  },
  _updateTabs: function (selected) {
    this.$('[role=tab]').each(function (i) {
      var $tab = $(this);
      var id = $tab.attr('aria-controls');

      if (id === selected) {
        $tab.attr('tabindex', 0);
      }
      else {
        $tab.attr('tabindex', -1);
      }
    });
    this.$('[role=tabpanel]').each(function (i) {
      var $panel = $(this);
      var id = $panel.attr('id');

      if (id === selected) {
        $panel.addClass('current-tab');
        $panel.attr('aria-hidden', 'false');
      }
      else {
        $panel.removeClass('current-tab');
        $panel.attr('aria-hidden', 'true');
      }
    });
  },
  _switchTab: function (event) {
    var selected;
    var right = 39, l = 76, h = 72, left = 37;

    // Right
    if (event.which === right || event.which === l) {
      selected = $(event.target).next('[role=tab]').eq(0);
      if (selected.length) {
        event.preventDefault();
        selected.focus();
        this._updateTabs(selected.attr('aria-controls'));
      }
    }
    // Left
    else if (event.which === left || event.which === h) {
      selected = $(event.target).prev('[role=tab]').eq(0);
      if (selected.length) {
        event.preventDefault();
        selected.focus();
        this._updateTabs(selected.attr('aria-controls'));
      }
    }
  }
});

module.exports = TabView;
