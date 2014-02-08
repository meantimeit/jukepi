var View = require('../view.js');
var AlertView = View.extend({
  className: 'modal in',
  initialize: function (options) {
    View.prototype.initialize.call(this, options);
    options = options || {};
    this._data = {
      header: options.header,
      message: options.message
    };
  },
  render: function () {
    this._overlayElement = this._createOverlay();
    document.body.appendChild(this._overlayElement);
    this.el.innerHTML = this._template(this._data);
    this.el.style.display = 'block';
    return this;
  },
  remove: function () {
    this.$el.fadeOut('fast', View.prototype.remove.bind(this));
    this._overlayElement.parentElement.removeChild(this._overlayElement);
  },
  _template: require('../../../templates/modal/alert.hbs'),
  _createOverlay: function () {
    var overlay = document.createElement('div');
    overlay.className = 'modal-backdrop in';
    return overlay;
  }
});

module.exports = AlertView;
