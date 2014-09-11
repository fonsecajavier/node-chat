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
      _this.app.connectionData = {
        nickname: data.nickname,
        token: data.token
      };
      _this.app.navbar.setNickname(data.nickname);
      _this.app.getMessageOfTheDay(function(message){
        new NodeChat.Controllers.Modals.MessageOfTheDay( _this.app, message ).openModal();
      });
    }.bind(this));
  }
});