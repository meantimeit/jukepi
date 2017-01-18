var View = require('../view');
var PopView = View.extend({
  events: {
    'mouseout': '_onMouseOut',
    'mouseup': '_onMouseUp'
  },
  className: 'hidden pop-view',
  show: function () {
    this.el.classList.remove('hidden');
    this._correctPosition();
    this.el.focus();
  },
  hide: function () {
    this.el.classList.add('hidden');
  },
  isVisible: function () {
    return !this.el.classList.contains('hidden');
  },
  toggle: function () {
    if (!this.isVisible()) {
      this.show();
    }
    else {
      this.hide();
    }
  },
  _correctPosition: function () {
    var parentEl = this._parent.el;
    var parentLeft = parentEl.offsetLeft;
    var windowWidth = window.innerWidth;
    var viewWidth = this.el.offsetWidth;
    var totalOffset = parentLeft + viewWidth;

    if (totalOffset <= windowWidth) {
      this.el.style.top = (parentEl.offsetTop + parentEl.offsetHeight) + 'px';
      this.el.style.right = '';
      this.el.style.bottom = '';
      this.el.style.left = parentEl.offsetLeft + 'px';
    }
    else {
      this.el.style.top = (parentEl.offsetTop + parentEl.offsetHeight) + 'px';
      this.el.style.right = (windowWidth - (parentEl.offsetLeft + parentEl.offsetWidth)) + 'px';
      this.el.style.bottom = '';
      this.el.style.left = '';
    }
  },
  _onMouseUp: function (event) {
    this.hide();
  },
  _onMouseOut: function (event) {
    var target = event.toElement || event.relatedTarget;

    if (!this.el.contains(target)) {
      this.hide();
    }
  }
});

module.exports = PopView;