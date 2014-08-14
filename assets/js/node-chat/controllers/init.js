NodeChat.Controllers.Init = NodeChat.BaseController.extend({
  app: null,

  init: function( app, $container ){
    this._super( app );

    this.app.$container = $container;
    this.app.server = {};
    this.loadTemplates();
    this.loadNavBar();
    this.showNicknamePrompt();
    this.app.mediator.subscribe("proceedConnecting", this.proceedConnecting, {}, this);
  },

  loadTemplates: function(){
    var _this = this;
    this.app.templates = {};
    _.each($("[data-node-chat-tmpl]"), function(htmlElement){
      var key = $(htmlElement).attr("data-node-chat-tmpl");
      _this.app.templates[key] = $(htmlElement).html();
      Mustache.parse(_this.app.templates[key]);
    });
  },

  loadNavBar: function(){
    this.app.navBar = new NodeChat.Controllers.NavBar( this.app );
  },

  showNicknamePrompt: function(){
    new NodeChat.Controllers.NicknamePrompt( this.app ).openModal();
  },

  proceedConnecting: function(data){
    this.app.connect(data, this, function(){
      // we have recovered our 'this' context for the callback function
      this.app.getMessageOfTheDay(function(message){
        new NodeChat.Controllers.MessageOfTheDay( this.app, message ).openModal();
      });
    });
  }
});