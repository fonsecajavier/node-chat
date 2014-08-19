NodeChat.Controllers.Alert = NodeChat.BaseController.extend({
  $container: null,

  init: function(app, options){
    this._super( app );

    this.$container = options.$container
    this.render(options);
  },

  render: function(options){
    var rendered = Mustache.render(this.app.templates.alert, options)

    this.$container.html(rendered);

    $(document).foundation('alert', 'reflow');
  }
});