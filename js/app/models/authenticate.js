App.Model.Authenticate = Backbone.Model.extend({
    idAttribute: 'user_id',
    url: function () {
        return App.config.baseAddress + App.config.apiPath + '/login.php';
    }
});
