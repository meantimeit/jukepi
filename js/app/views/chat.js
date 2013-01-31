App.View.ChatView = App.View.CoreView.extend({
  tagName: 'div',
  events: {
    'keypress [name=chat_text]': 'sendChat'
  },
  initialize: function (attributes, options) {
    App.View.CoreView.prototype.initialize.call(this, attributes, options);
    this._template = this._getTemplate('chat_index');
    App.socket.on('chat', this.displayChatMessage.bind(this));
  },
  sendChat: function (event) {
    var textInput = this.$('[name=chat_text]'),
        text = textInput.val();
    if (event.keyCode === 13 && text !== '') {
      App.socket.emit('chat', { message: text, who: 'Someone' });
      this.displayChatMessage({
        message: text,
        who: 'You'
      });
      textInput.val('');
    }
  },
  displayChatMessage: function (context) {
    var messageView = new App.View.ChatMessageView(context);
    this.$('.messages').html(messageView.render().el);

  }
});

App.View.ChatMessageView = App.View.ModelView.extend({
  tagName: 'p',
  initialize: function (attributes, options) {
    App.View.CoreView.prototype.initialize.call(this, attributes, options);
    this._template = App.Templates.chat_message;
    this.model = {
      attributes: {
        who: attributes.who,
        message: attributes.message
      }
    };
  },
  render: function () {
    this.$el.html(this._template(this.model.attributes));
    return this;
  }
});
