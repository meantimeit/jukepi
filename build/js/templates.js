this["App"] = this["App"] || {};
this["App"]["Templates"] = this["App"]["Templates"] || {};

this["App"]["Templates"]["album_index"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, stack2, self=this;

function program1(depth0,data) {
  
  
  return "\n<li class=\"track_list_item empty_list\">No Albums</li>\n";}

  stack1 = depth0.collection;
  stack2 = {};
  stack1 = helpers.unless.call(depth0, stack1, {hash:stack2,inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;});

this["App"]["Templates"]["album_item"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, foundHelper, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<span class=\"album_title\">";
  foundHelper = helpers.name;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.name; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1) + "</span> <span class=\"album_artist\">";
  stack1 = depth0.artists;
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1[0];
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1.name;
  stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1;
  buffer += escapeExpression(stack1) + "</span>\n";
  return buffer;});

this["App"]["Templates"]["album_page"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers; data = data || {};
  


  return "<div class=\"columns one-half\">\n<section class=\"app_page album_tracks\">\n<h1>Tracks</h1>\n<ul class=\"action_group\">\n  <li><span role=\"button\" class=\"queue_all\" tabindex=\"0\">Queue Album</span> <span role=\"button\" class=\"queue_selected\" tabindex=\"0\">Queue Selected</span></li>\n</ul>\n</section>\n</div>\n\n<div class=\"columns one-half\">\n<section class=\"app_page album_description\">\n</section>\n</div>\n";});

this["App"]["Templates"]["album_view"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, stack2, foundHelper, functionType="function", self=this, blockHelperMissing=helpers.blockHelperMissing, escapeExpression=this.escapeExpression;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n<img src=\"";
  stack1 = depth0.images;
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1[4];
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1.url;
  stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1;
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\" alt=\"Album cover\" class=\"cover_art\">\n";
  return buffer;}

function program3(depth0,data) {
  
  var buffer = "", stack1, stack2, foundHelper;
  buffer += "\n<div class=\"app_page_pad\">\n";
  foundHelper = helpers.markdown;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{},inverse:self.noop,fn:self.program(4, program4, data),data:data}); }
  else { stack1 = depth0.markdown; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  stack2 = {};
  if (!helpers.markdown) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:stack2,inverse:self.noop,fn:self.program(4, program4, data),data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n</div>\n";
  return buffer;}
function program4(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n";
  stack1 = depth0.lastfm;
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1.wiki;
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1.content;
  stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1;
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;}

  buffer += "<h1>";
  foundHelper = helpers.name;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.name; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1) + "</h1>\n";
  stack1 = depth0.images;
  stack2 = {};
  stack1 = helpers['if'].call(depth0, stack1, {hash:stack2,inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n<p class=\"action_group\">\n<a href=\"#artists/";
  stack1 = depth0.artist;
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1.uri;
  stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1;
  buffer += escapeExpression(stack1) + "/";
  stack1 = depth0.artist;
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1.name;
  stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1;
  buffer += escapeExpression(stack1) + "\" class=\"action_url\" data-artist-name=\"";
  stack1 = depth0.artist;
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1.name;
  stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1;
  buffer += escapeExpression(stack1) + "\">\n";
  stack1 = depth0.artist;
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1.name;
  stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1;
  buffer += escapeExpression(stack1) + "\n</a>\n</p>\n";
  stack1 = depth0.lastfm;
  stack2 = {};
  stack1 = helpers['if'].call(depth0, stack1, {hash:stack2,inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;});

this["App"]["Templates"]["artist_index"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, stack2, self=this;

function program1(depth0,data) {
  
  
  return "\n<li class=\"track_list_item empty_list\">No Artists</li>\n";}

  stack1 = depth0.collection;
  stack2 = {};
  stack1 = helpers.unless.call(depth0, stack1, {hash:stack2,inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;});

this["App"]["Templates"]["artist_item"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, foundHelper, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<span class=\"artist_title\">";
  foundHelper = helpers.name;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.name; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1) + "</span>\n";
  return buffer;});

this["App"]["Templates"]["artist_page"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers; data = data || {};
  


  return "<div class=\"columns one-half\">\n<section class=\"app_page artist_localtracks\">\n<h1>Local Tracks</h1>\n<ul class=\"action_group\">\n  <li><span role=\"button\" class=\"queue_all_local\" tabindex=\"0\">Queue All</span> <span role=\"button\" class=\"queue_selected\" tabindex=\"0\">Queue Selected</span></li>\n</ul>\n</section>\n<section class=\"app_page artist_tracks\">\n<h1>Tracks</h1>\n<ul class=\"action_group\">\n  <li><span role=\"button\" class=\"queue_all\" tabindex=\"0\">Queue All</span> <span role=\"button\" class=\"queue_selected\" tabindex=\"0\">Queue Selected</span></li>\n</ul>\n</section>\n</div>\n\n<div class=\"columns one-half\">\n<section class=\"app_page artist_description\">\n</section>\n<section class=\"app_page artist_albums\">\n<h1>Albums</h1>\n</section>\n</div>\n";});

this["App"]["Templates"]["artist_view"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, stack2, foundHelper, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n<img src=\"";
  stack1 = depth0.images;
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1[4];
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1.url;
  stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1;
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\" alt=\"Artist image\" class=\"cover_art\">\n";
  return buffer;}

function program3(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n<div class=\"app_page_pad\">\n<p>";
  stack1 = depth0.lastfm;
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1.bio;
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1.content;
  stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1;
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</p>\n</div>\n";
  return buffer;}

  buffer += "<h1>";
  foundHelper = helpers.name;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.name; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1) + "</h1>\n";
  stack1 = depth0.images;
  stack2 = {};
  stack1 = helpers['if'].call(depth0, stack1, {hash:stack2,inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  stack1 = depth0.lastfm;
  stack2 = {};
  stack1 = helpers['if'].call(depth0, stack1, {hash:stack2,inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;});

this["App"]["Templates"]["chat_index"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers; data = data || {};
  


  return "<input type=\"text\" name=\"chat_text\" />\n<div class=\"messages\">\n</div>\n";});

this["App"]["Templates"]["chat_message"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, foundHelper, functionType="function";


  buffer += "<h1>";
  foundHelper = helpers.who;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.who; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</h1>\n<h2>";
  foundHelper = helpers.message;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.message; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</h2>\n\n";
  return buffer;});

this["App"]["Templates"]["home_page"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers; data = data || {};
  


  return "<div class=\"columns one-half\">\n<section class=\"app_page home-lhs\">\n  <h1>Queue</h1>\n  <ul class=\"action_group\">\n    <li><span role=\"button\" class=\"clear_queue\" tabindex=\"0\">Clear Queue</span></li>\n    <li><span role=\"button\" class=\"delete_selected\" tabindex=\"0\">Delete Selected</span></li>\n  </ul>\n  <div class=\"play_queue\">\n  </div>\n</section>\n</div>\n\n<div class=\"columns one-half home-rhs\">\n<section class=\"app_page now_playing\">\n</section>\n<div class=\"app_page general_controls\">\n</div>\n</div>\n";});

this["App"]["Templates"]["home_volume_control"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, stack2, functionType="function", self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1, foundHelper;
  buffer += " value=\"";
  foundHelper = helpers.volume;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.volume; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\"";
  return buffer;}

  buffer += "<input type=\"button\" value=\"-\" name=\"volume_down\" class=\"volume_down\"><input type=\"text\" pattern=\"\\d*\" name=\"volume\" id=\"volume\"";
  stack1 = depth0.volume;
  stack2 = {};
  stack1 = helpers['if'].call(depth0, stack1, {hash:stack2,inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " disabled=\"disabled\"><input type=\"button\" value=\"+\" name=\"volume_up\" class=\"volume_up\">\n";
  return buffer;});

this["App"]["Templates"]["main"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers; data = data || {};
  


  return "<div class=\"container\">\n\n<div class=\"columns one-half\">\n<div class=\"app_page\">\n<form class=\"login\">\n<div class=\"side_by_side\">\n<label for=\"appMainLoginUsername\">Email Address</label>\n<div><input type=\"text\" name=\"login_email\" id=\"appMainLoginUsername\"></div>\n</div>\n<div class=\"side_by_side\">\n<label for=\"appMainLoginPassword\">Password</label>\n<div><input type=\"password\" name=\"login_password\" id=\"appMainLoginPassword\"></div>\n</div>\n<div>\n<input type=\"submit\" id=\"appMainLoginSubmit\" value=\"Sign In\">\n</div>\n</form>\n</div>\n</div>\n\n<div class=\"columns one-half\">\n<div class=\"app_page\">\n    <p>To log in to the system, you must provide your email address and password.</p>\n</div>\n</div>\n\n</div>\n";});

this["App"]["Templates"]["navigation_controls"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers; data = data || {};
  


  return "<span class=\"nav_main_back\" role=\"button\">Back</span>\n<span class=\"nav_main_play\" role=\"button\">Play</span>\n<span class=\"nav_main_pause\" role=\"button\">Pause</span>\n<span class=\"nav_main_next\" role=\"button\">Next</span>\n<span class=\"nav_main_search\"><input type=\"search\" id=\"mopidy_search\" size=\"24\"></span>\n";});

this["App"]["Templates"]["navigation_menu"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, stack2, self=this, functionType="function", escapeExpression=this.escapeExpression;

function program1(depth0,data) {
  
  var buffer = "", stack1, stack2, foundHelper;
  buffer += "<li";
  stack1 = depth0.current;
  stack2 = {};
  stack1 = helpers['if'].call(depth0, stack1, {hash:stack2,inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "><a href=\"";
  foundHelper = helpers.url;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.url; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\">";
  foundHelper = helpers.name;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.name; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1) + "</a></li>";
  return buffer;}
function program2(depth0,data) {
  
  
  return " class=\"current\"";}

  stack1 = depth0.items;
  stack2 = {};
  stack1 = helpers.each.call(depth0, stack1, {hash:stack2,inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;});

this["App"]["Templates"]["notification_item"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, foundHelper, functionType="function", escapeExpression=this.escapeExpression;


  foundHelper = helpers.message;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.message; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1) + "\n";
  return buffer;});

this["App"]["Templates"]["notification_list"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "";


  return buffer;});

this["App"]["Templates"]["nowplaying_view"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, stack2, functionType="function", self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n<img src=\"";
  stack1 = depth0.images;
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1[3];
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1.url;
  stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1;
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\" alt=\"\" class=\"cover_art\">\n";
  return buffer;}

function program3(depth0,data) {
  
  var buffer = "", stack1, foundHelper;
  buffer += "\n<div class=\"app_page_pad\">\n<p>";
  foundHelper = helpers.name;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.name; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</p>\n</div>\n";
  return buffer;}

  buffer += "<h1>Now Playing</h1>\n";
  stack1 = depth0.images;
  stack2 = {};
  stack1 = helpers['if'].call(depth0, stack1, {hash:stack2,inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  stack1 = depth0.lastfm;
  stack2 = {};
  stack1 = helpers['if'].call(depth0, stack1, {hash:stack2,inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;});

this["App"]["Templates"]["search_list"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers; data = data || {};
  


  return "<div class=\"scrolling_container\">\n  <div class=\"row\">\n    <section class=\"search_results_albums columns six\"><h1>Albums</h1></section>\n    <section class=\"search_results_artists columns six\"><h1>Artists</h1></section>\n  </div>\n  <div class=\"row\">\n    <section class=\"search_results_tracks columns six\"><h1>Tracks</h1></section>\n    <section class=\"search_results_localtracks columns six\"><h1>Local Tracks</h1></section>\n  </div>\n</div>\n";});

this["App"]["Templates"]["track_index"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, stack2, self=this;

function program1(depth0,data) {
  
  
  return "\n<li class=\"track_list_item empty_list\">No Tracks</li>\n";}

  stack1 = depth0.collection;
  stack2 = {};
  stack1 = helpers.unless.call(depth0, stack1, {hash:stack2,inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;});

this["App"]["Templates"]["track_item"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, stack2, foundHelper, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1, foundHelper;
  buffer += "\n<input type=\"checkbox\" data-track-id=\"";
  foundHelper = helpers.uri;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.uri; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1) + "\">\n";
  return buffer;}

function program3(depth0,data) {
  
  
  return "current_track";}

  stack1 = depth0._extended;
  stack2 = {};
  stack1 = helpers['if'].call(depth0, stack1, {hash:stack2,inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n<span class=\"track_item_title ";
  stack1 = depth0.current;
  stack2 = {};
  stack1 = helpers['if'].call(depth0, stack1, {hash:stack2,inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\">";
  foundHelper = helpers.name;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.name; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1) + "</span> <span class=\"track_item_artist\">";
  stack1 = depth0.artists;
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1[0];
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1.name;
  stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1;
  buffer += escapeExpression(stack1) + "</span>\n";
  return buffer;});

this["App"]["Templates"]["tracklist_item"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, stack2, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1, foundHelper;
  buffer += "\n<input type=\"checkbox\" data-tracklist-id=\"";
  foundHelper = helpers.tlid;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.tlid; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1) + "\">\n";
  return buffer;}

function program3(depth0,data) {
  
  
  return "current_track";}

  stack1 = depth0._extended;
  stack2 = {};
  stack1 = helpers['if'].call(depth0, stack1, {hash:stack2,inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n<span class=\"track_item_title ";
  stack1 = depth0.current;
  stack2 = {};
  stack1 = helpers['if'].call(depth0, stack1, {hash:stack2,inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\">";
  stack1 = depth0.track;
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1.name;
  stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1;
  buffer += escapeExpression(stack1) + "</span> <span class=\"track_item_artist\">";
  stack1 = depth0.track;
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1.artists;
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1[0];
  stack1 = stack1 == null || stack1 === false ? stack1 : stack1.name;
  stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1;
  buffer += escapeExpression(stack1) + "</span>\n";
  return buffer;});

this["App"]["Templates"]["tracklist_list"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, stack2, self=this;

function program1(depth0,data) {
  
  
  return "\n<li class=\"track_list_item empty_list\">No Songs in Queue</li>\n";}

  stack1 = depth0.collection;
  stack2 = {};
  stack1 = helpers.unless.call(depth0, stack1, {hash:stack2,inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;});