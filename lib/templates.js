var Handlebars = require('handlebars/runtime').default;
var marked = require('marked');
var templates = {};

marked.setOptions({
  gfm: true
});

Handlebars.registerHelper('markdown', function (options) {
  var content = options.fn(this);
  return marked(content);
});

Handlebars.registerHelper('debug', function (options) {
  console.log(this);
});

templates.tab_view = require('../templates/tab/view.hbs');

templates.album_collection = require('../templates/album/collection.hbs');
templates.album_item_model = require('../templates/album/item_model.hbs');
templates.album_page = require('../templates/album/page.hbs');
templates.album_model = require('../templates/album/model.hbs');

templates.artist_collection = require('../templates/artist/collection.hbs');
templates.artist_item_model = require('../templates/artist/item_model.hbs');
templates.artist_link_model = require('../templates/artist/link_model.hbs');
templates.artist_page = require('../templates/artist/page.hbs');
templates.artist_model = require('../templates/artist/model.hbs');

templates.home_volume_control = require('../templates/home/volume_control.hbs');
templates.home_search_control = require('../templates/home/search_control.hbs');
templates.home_playback_control = require('../templates/home/playback_control.hbs');

templates.nowplaying_view = require('../templates/nowplaying/view.hbs');

templates.search_page = require('../templates/search/page.hbs');

templates.track_list = require('../templates/track/list.hbs');
templates.track_collection = require('../templates/track/collection.hbs');
templates.track_model_item = require('../templates/track/model_item.hbs');

templates.tracklist_list = require('../templates/tracklist/list.hbs');
templates.tracklist_collection = require('../templates/tracklist/collection.hbs');
templates.tracklist_model = require('../templates/tracklist/model.hbs');


module.exports = templates;
