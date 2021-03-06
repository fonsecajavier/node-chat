NodeChat.Controllers.Init = NodeChat.Controllers.Base.extend({
  app: null,

  init: function( app, $container ){
    this._super( app );

    this.app.$container = $container;
    this.app.server = {};
    this.loadTemplates();
    this.loadNavbar();
    this.loadChatRoomsManager();
    this.showNicknamePrompt();
    this.app.mediator.subscribe("proceedConnecting", this.proceedConnecting, {}, this);
    this.app.mediator.subscribe("chatApp:reconnect", this.processReconnect, {}, this);
    this.app.mediator.subscribe("chatApp:disconnected", this.processDisconnected, {}, this);
    this.app.mediator.subscribe("chatApp:invalidToken", this.processInvalidToken, {}, this);
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

  loadNavbar: function(){
    this.app.navbar = new NodeChat.Controllers.Navbar( this.app );
  },

  loadChatRoomsManager: function(){
    new NodeChat.Controllers.ChatRoomsManager( this.app );
  },

  showNicknamePrompt: function(){
    new NodeChat.Controllers.Modals.NicknamePrompt( this.app ).openModal();
  },

  proceedConnecting: function(data){
    var _this = this;
    this.app.connect(data, function(){
      console.log("connected as " + data.nickname + " [" + data.token + "]");
      if(_this.app.showMOTD){
        _this.app.getMessageOfTheDay(function(message){
          new NodeChat.Controllers.Modals.MessageOfTheDay( _this.app, message ).openModal();
        });
        _this.app.showMOTD = false;
      }
    }.bind(this));
  },

  processReconnect: function(){
    $.growl.notice({ message: "Reconnecting to the server...", duration: 3000});
  },

  processDisconnected: function(msg){
    if(msg == "transport close"){
      $.growl.warning({ message: "Connection with the server has been lost.  Attempting to reconnect...", duration: 6000});
    }
  },

  processInvalidToken: function(){
    $.growl.warning({ message: "Cannot reconnect to the server because your connection token has been invalidated.  Please reconnect manually.", duration: 6000});
  }

});