var View = require('../view');
var SearchControlView = View.extend({
  tagName: 'nav',
  className: 'search-controls',
  template: function (data) {
    return '<input type="search">';
  },
  events: {
    'keyup [type=search]': 'search'
  },
  search: function (event) {
    var query = encodeURIComponent(event.target.value);

    if (event.which === 13 && query !== '') {
      this.router.navigate('search/' + query, { trigger: true });
    }
  }
});

module.exports = SearchControlView;
