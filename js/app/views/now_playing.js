App.View.NowPlaying = App.View.CoreView.extend({
  tagName: 'div',
  template: 'nowplaying_view',
  initialize: function (attributes, options) {
    App.View.CoreView.prototype.initialize.apply(this, arguments);
    this._mopidy = attributes.mopidy || App.mopidy;
    this.listenTo(this._mopidy, 'event:trackPlaybackStarted', this._updateTrack.bind(this));

    if (attributes.tlTrack) {
      this.once('rendered', function () {
        this._updateTrack(attributes.tlTrack);
      }.bind(this));
    }
  },
  remove: function () {
    App.View.CoreView.prototype.remove.apply(this, arguments);
    this.stopListening();
  },
  render: function () {
    var data = this._track && this._track.toJSON ? this._track.toJSON() : {};
    this.trigger('rendering');
    this.$el.html(this._template(data));
    this.trigger('rendered');
    return this;
  },
  _updateTrack: function (data) {
    if (data && data.tl_track && data.tl_track.track) {
      this._track = new App.Model.Track(_(data.tl_track.track).clone());
      this._track.once('sync', this.render.bind(this));
      this._track.fetch();
    }
  }
});
