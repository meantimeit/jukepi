App.View.Notifications = App.View.CollectionView.extend({
  tagName: 'section',
  className: 'notifications',
  template: 'notification_list',
  itemViewClass: App.View.Notification
});
