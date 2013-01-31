Handlebars.registerHelper('markdown', function (options) {
  var content = options.fn(this);
  return marked(content);
});
