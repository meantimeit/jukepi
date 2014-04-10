var View = require('../view.js');
var SearchControlView = View.extend({
  tagName: 'nav',
  className: 'search-controls',
  template: 'home_search_control',
  events: {
    'keyup [type=search]': 'search'
  },
  search: function (event) {
    var query = encodeURIComponent(event.currentTarget.value);

    if (event.which === 13 && query !== '') {
      this.router.navigate('search/' + query, { trigger: true });
    }
    
  }
});

module.exports = SearchControlView;
