var ModelView = require('../model/view.js');
var ModelItemView = ModelView.extend({
  initialize: function (options) {
    ModelView.prototype.initialize.call(this, options);
    this._collectionView = options.collectionView;
    this._selected = false;
    this._checked = false;
  },
  attributes: function () {
    var attrs = {
      'role': 'option',
      'aria-selected': 'false',
      'tabindex': '-1'
    };

    if (this._checkable) {
      attrs['aria-checked'] = 'false';
    }

    return attrs;
  },
  events: {
    'keydown': '_onKeyDown',
    'click': '_onClick',
    'click input[type=checkbox]': '_onClickCheckbox',
    'focus': '_onFocus'
  },
  isSelected: function () {
    return this._selected;
  },
  isChecked: function () {
    return this._checked;
  },
  setSelected: function (selected) {
    var alreadySelected = this.isSelected();
    if (selected) {
      this._selected = true;
      this.el.setAttribute('aria-selected', 'true');
      this.el.setAttribute('tabindex', 0);

      if (!alreadySelected) {
        this.$el.focus();
      }
    }
    else {
      this._selected = false;
      this.el.setAttribute('aria-selected', 'false');
      this.el.setAttribute('tabindex', -1);
    }
  },
  setChecked: function (checked) {
    if (checked) {
      this._checked = true;
      this.el.setAttribute('aria-checked', 'true');
      this.$('input[type=checkbox]').prop('checked', true);
    }
    else {
      this._checked = false;
      this.el.setAttribute('aria-checked', 'false');
      this.$('input[type=checkbox]').prop('checked', false);
    }
  },
  toggleChecked: function () {
    this.setChecked(!this.isChecked());
  },
  _onKeyDown: function (event) {
    var j = 74, k = 75, up = 38, down = 40, space = 32;

    if (event.which === j || event.which === down) {
      event.preventDefault();
      this._collectionView.next(this);
    }
    else if (event.which === k || event.which === up) {
      event.preventDefault();
      this._collectionView.prev(this);
    }
    else if (this._checkable && event.which === space) {
      event.preventDefault();
      this.toggleChecked();
    }
  },
  _onClick: function (event) {
    this._collectionView.updateSelected(this);
  },
  _onClickCheckbox: function (event) {
    this.toggleChecked();
  },
  _onFocus: function (event) {
    this._collectionView.updateSelected(this);
  }
});

module.exports = ModelItemView;
