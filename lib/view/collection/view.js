var View = require('../view.js');
var ModelView = require('../model/view.js');
var CollectionView = View.extend({
  attributes: {
    'role': 'listbox'
  },
  itemViewClass: ModelView,
  initialize: function (options) {
    View.prototype.initialize.call(this, options);
    this._checkable = !!options.checkable;
    this.views = [];
    this.collection = options.collection;
    this.on('rendering', this._removeViews.bind(this));
    this.on('rendered', this._renderViews.bind(this));
    this.listenTo(this.collection, 'sync', this.render.bind(this, 'sync'));
    this.listenTo(this.collection, 'change', this.render.bind(this, 'change'));
    this.listenTo(this.collection, 'reset', this.render.bind(this, 'reset'));
    //this.listenTo(this.collection, 'sort', this.render.bind(this, 'sort'));
    this.listenTo(this.collection, 'sync', this._hideLoadingMessage.bind(this));
    this.listenTo(this.collection, 'reset', this._hideLoadingMessage.bind(this, 'reset'));
  },
  render: function (type) {
    var data = {
      collection: this.collection.toJSON()
    };
    this.trigger('rendering');
    this.$el.html(this._template(data));
    this.trigger('rendered');
    return this;
  },
  remove: function () {
    View.prototype.remove.apply(this);
    this.collection.stopListening();
  },
  next: function (view) {
    var index = this._viewIndex(view);

    if (index !== undefined && index < this.views.length - 1) {
      this.updateSelected(this.views[index + 1]);
    }
  },
  prev: function (view) {
    var index = this._viewIndex(view);

    if (index !== undefined && index > 0) {
      this.updateSelected(this.views[index - 1]);
    }
  },
  updateSelected: function (view) {
    var length = this.views.length;
    var i;
    
    for (i = 0; i < length; i++) {
      this.views[i].setSelected(view.model.cid === this.views[i].model.cid);
    }
  },
  _viewIndex: function (view) {
    return this.views.reduce(function (previous, current, index) {
      if (previous !== undefined) {
        return previous;
      }

      return view.model.cid === current.model.cid ? index : undefined;
    }, undefined);
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
  _addModelView: function (model, index) {
    var view = new this.itemViewClass({
      mopidy: this.mopidy,
      router: this.router,
      model: model,
      collectionView: this,
      lastfm: this._lastfm,
      checkable: this._checkable
    });
    this.views.push(view);
    this.$el.append(view.render().el);

    if (index === 0) {
      view.el.setAttribute('tabindex', 0);
    }
  },
  _hideOnRender: false,
  _updateListItems: function ($current) {
    this.$('.interactive-list-item').each(function (i) {
      var $item = $(this);
      if ($item.is($current)) {
        $item.attr('tabindex', 0);
        $item.attr('aria-selected', 'true');
      }
      else {
        $item.attr('tabindex', -1);
        $item.attr('aria-selected', 'false');
      }
    });
  }
});

module.exports = CollectionView;
