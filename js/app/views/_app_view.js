App.View.CoreView = Backbone.View.extend({
  mopidy: App.mopidy,
  initialize: function (attributes, options) {
    Backbone.View.prototype.initialize.call(this, attributes, options);
    if (this.template) {
      this._setTemplate(this.template);
    }
    this.on('rendering', this._rendering, this);
    this.on('rendered', this._rendered, this);
  },
  remove: function (callback) {
    this.$el.toggleClass('hidden');
    App.utils.delay(function () {
      Backbone.View.prototype.remove.apply(this, arguments);
    }.bind(this));
  },
  render: function () {
    this.trigger('rendering');
    this.$el.html(this._template());
    this.trigger('rendered');
    return this;
  },
  _getTemplate: function (name) {
    return Handlebars.template(App.Templates[name]);
  },
  _setTemplate: function (name) {
    this._template = App.Templates[name];
  },
  _rendering: function () {
    if (this._hideOnRender) {
      this.$el.addClass('hidden');
    }
  },
  _rendered: function () {
    if (this._hideOnRender) {
      App.utils.delay(function () {
        this.$el.removeClass('hidden');
      }.bind(this));
    }
  },
  _hideOnRender: false
});
App.View.PageView = App.View.CoreView.extend({
  initialize: function (attributes, options) {
    App.View.CoreView.prototype.initialize.apply(this, arguments);
    this.router = attributes.router;
    this.listenTo(this.router, 'beforeRoute', this.remove.bind(this));
  },
  render: function () {
    this._setTitle(this.title);
    return App.View.CoreView.prototype.render.apply(this, arguments);
  },
  remove: function () {
    this.stopListening();
    App.View.CoreView.prototype.remove.apply(this, arguments);
  },
  _setTitle: function (title) {
    $('title').text(title + ': ' + App.config.title);
  }
});
App.View.ModelView = App.View.CoreView.extend({
  initialize: function (attributes, options) {
    App.View.CoreView.prototype.initialize.apply(this, arguments);
    if (attributes.extended) {
      this._extended = !!attributes.extended;
    }
    this.model = attributes.model;
    this.listenTo(this.model, 'change', this.render.bind(this));
  },
  render: function () {
    var model = this.model.toJSON();
    model._extended = this._extended;
    this.trigger('rendering');
    this.$el.attr('tabindex', '0');
    this.$el.html(this._template(model));
    this.trigger('rendered');
    return this;
  },
  remove: function () {
    App.View.CoreView.prototype.remove.apply(this);
    this.model.stopListening();
  },
  _extended: false,
  _hideOnRender: false
});
App.View.CollectionView = App.View.CoreView.extend({
  events: {
    'keydown li[tabindex="0"]': '_focusNext'
  },
  _extended: false,
  itemViewClass: App.View.ModelView,
  initialize: function (attributes, options) {
    App.View.CoreView.prototype.initialize.apply(this, arguments);
    if (attributes.extended) {
      this._extended = !!attributes.extended;
    }
    if (attributes.disableCollectionListenersOnRemove) {
      this._disableCollectionListenersOnRemove = attributes.disableCollectionListenersOnRemove;
    }
    this.views = [];
    this.collection = attributes.collection;
    this.on('rendering', this._removeViews.bind(this));
    this.on('rendered', this._renderViews.bind(this));
    this.listenTo(this.collection, 'reset', this.render.bind(this));
    this.listenTo(this.collection, 'remove', this.render.bind(this));
    this.listenTo(this.collection, 'sort', this.render.bind(this));
    this.listenTo(this.collection, 'reset', this._hideLoadingMessage.bind(this));
  },
  render: function () {
    var data = {
      collection: this.collection.toJSON(),
      extended: this.extended
    };
    this.trigger('rendering');
    this.$el.html(this._template(data));
    this.trigger('rendered');
    return this;
  },
  remove: function () {
    App.View.CoreView.prototype.remove.apply(this);
    if (this._disableCollectionListenersOnRemove) {
      this.collection.stopListening();
    }
  },
  _hideLoadingMessage: function () {
    this.$el.removeClass('loading');
  },
  _resetViews: function () {
    this._removeViews();
    this.collection.each(this._addModelView.bind(this));
  },
  _removeViews: function () {
    var i = this.views.length;

    while (i--) {
      this.views.pop().remove();
    }
  },
  _renderViews: function () {
    this.collection.each(this._addModelView.bind(this));
  },
  _addModelView: function (model) {
    var view = new this.itemViewClass({
      model: model,
      extended: this._extended
    });
    this.views.push(view);
    this.$el.append(view.render().el);
  },
  _hideOnRender: false,
  _disableCollectionListenersOnRemove: true,
  _focusNext: function (event) {
    var j = 74, k = 75, up = 38, down = 40, method = null;

    if (event.which === down || event.which === j) {
      method = 'next';
    }
    else if (event.which === up || event.which === k) {
      method = 'prev';
    }

    if (method !== null) {
      event.preventDefault();
      $(document.activeElement)[method]('[tabindex="0"]').focus();
    }
  }
});
