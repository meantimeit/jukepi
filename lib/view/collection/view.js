var View = require('../view.js');
var ModelView = require('../model/view.js');
var CollectionView = View.extend({
  tagName: 'ul',
  className: 'interactive-list loading',
  attributes: {
    'role': 'listbox'
  },
  itemViewClass: ModelView,
  initialize: function (options) {
    View.prototype.initialize.call(this, options);
    this._checkable = !!options.checkable;
    this.views = [];
    this.collection = options.collection;
    this.listenTo(this.collection, 'add', this._addModelView);
    this.listenTo(this.collection, 'change', this.render);
    this.listenTo(this.collection, 'reset', this.render);
    this.listenTo(this.collection, 'sort', this.render);
    this.listenTo(this.collection, 'sort', this._hideLoadingMessage);
    this.listenTo(this.collection, 'change', this._hideLoadingMessage);
    this.listenTo(this.collection, 'reset', this._hideLoadingMessage);
  },
  render: function () {
    this.trigger('rendering');
    var data = {
      collection: this.collection.toJSON()
    };
    if (!this.collection.length) {
      this.$el.html(this._template(data));
      this._initialRender = true;
    }
    else {
      if (!this._initialRender) {
        this.$el.html(this._template(data));
        this._initialRender = true;
      }
      this._renderViews();
      this.$('.empty-list').remove();
    }
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
  removeSubView: function (view) {
    var index = this.views.indexOf(view);

    if (index !== -1) {
      this.views.splice(index, 1);
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
  _removeViews: function () {
    var i = this.views.length;

    while (i--) {
      this.views.pop().remove();
    }
  },
  _renderViews: function () {
    var i;
    var collection = this.collection;

    if (this.views.length) {
      this.views.sort(function (a, b) {
        var ai = collection.indexOf(a.model);
        var bi = collection.indexOf(b.model);

        return ai - bi;
      });

      for (i = 0; i < this.views.length; i++) {
        this.el.appendChild(this.views[i].el);

        if (i === 0) {
          this.views[i].el.setAttribute('tabindex', 0);
        }
      }
    }
    else {
      this.$('.empty-list').remove();
    }
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
  },
  getChecked: function () {
    return this.views.filter(function (view) {
      return view.isChecked();
    });
  },
  allChecked: function () {
    return this.getChecked().length === this.collection.length;
  },
  checkAll: function (checked) {
    this.views.forEach(function (view) {
      view.setChecked(checked);
    });
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
