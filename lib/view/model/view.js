var View = require('../view.js');
var ModelView = View.extend({
  className: 'view-model',
  initialize: function (options) {
    View.prototype.initialize.call(this, options);
    if (options.extended) {
      this._extended = !!options.extended;
    }
    this.model = options.model;
    this.listenTo(this.model, 'change', this.render);
    this.listenTo(this.model, 'remove', this.remove);
  },
  render: function () {
    var model = this.model.toJSON();
    this.trigger('rendering');
    this.$el.html(this._template(model));
    this.trigger('rendered');
    return this;
  },
  remove: function () {
    View.prototype.remove.apply(this);
  },
  _hideOnRender: false
});

module.exports = ModelView;
