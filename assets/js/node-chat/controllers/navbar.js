NodeChat.Controllers.NavBar = NodeChat.BaseController.extend({
  init: function(app){
    this._super( app );
    this.render();
  },

  render: function(){
    var rendered = Mustache.render(this.app.templates.navBar, {})

    this.app.$container.prepend(rendered);
  }
});