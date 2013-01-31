App.View.LoginView = App.View.PageView.extend({
  tagName: 'div',
  className: 'view',
  title: 'Sign In',
  events: {
    'submit .login': 'authenticate'
  },
  initialize: function (attributes, options) {
    App.View.PageView.prototype.initialize.call(this, attributes, options);
    this._template = this._getTemplate('main');
  },
  authenticate: function (event) {
    event.preventDefault();
    var credentials = this._getLoginDetails(), auth, homeView;

    if (credentials) {
      this._authenticate = new App.Model.Authenticate();
      this._authenticate.set(credentials);
      this._authenticate.save(null, {
        success: this._onAuthSaveSuccess.bind(this),
        error: this._onAuthSaveError.bind(this)
      });
    }
  },
  _onAuthSaveSuccess: function () {
    App.currentUser = this._authenticate;
    this.router.navigate('dashboard', { trigger: true });
  },
  _onAuthSaveError: function () {
    App.currentUser = null;
  },
  _getLoginDetails: function () {
    var email = this.$('[name=login_email]').val(),
        password = this.$('[name=login_password]').val();

    if (email !== '' && password !== '') {
      return {
        login_email: email,
        login_password: password
      };
    }

    return false;
  }
});
