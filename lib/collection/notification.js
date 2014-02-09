var Collection = require('./collection.js');
var Notification = require('../model/notification.js');
var NotificationCollection = Collection.extend({
  model: Notification
});

module.exports = NotificationCollection;
