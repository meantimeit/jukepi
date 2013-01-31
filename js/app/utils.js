App.utils.copyProperties = function (source, destination) {
  var property;

  for (property in source) {
    if (source.hasOwnProperty(property)) {
      destination[property] = source[property];
    }
  }
};
App.utils.delay = function (callback) {
  window.setTimeout(callback, App.config.delayDuration);
};
App.utils.appendToMain = function (element) {
  App.config.mainEl.appendChild(element);
};
App.utils.appendToNavMain = function (element) {
  App.config.mainNavEl.appendChild(element);
};
App.utils.loadScript = function (url, callback) {
  var el = document.createElement('script'),
      head = document.getElementsByTagName('head')[0],
      loaded = false;

  el.onload = el.onreadystatechange = function () {
    if ((el.readyState && el.readyState !== 'complete' && el.readyState !== 'loaded') || loaded) {
      return false;
    }

    el.onload = el.onreadystatechange = null;
    loaded = true;
    if (typeof callback === 'function') {
      callback();
    }
  };
  el.async = true;
  el.src = url;
  head.insertBefore(el, head.firstChild);
};
