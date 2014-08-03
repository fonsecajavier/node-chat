NodeChat.Controllers.Init = Class.extend({
  templates: {},
  $container: null,
  navBar: null,
  nicknamePrompt: null,
  mediator: null,
  handshakeData: null,
  socket: null,

  init: function($container){
    this.$container = $container;
    this.loadTemplates();
    this.loadNavBar();
    this.loadNicknamePrompt();
    this.showNicknamePrompt();
    this.initializeMediator();
  },

  loadTemplates: function(){
    var _this = this; 
    _.each($("[data-node-chat-tmpl]"), function(htmlElement){
      var key = $(htmlElement).attr("data-node-chat-tmpl");
      _this.templates[key] = $(htmlElement).html();
      Mustache.parse(_this.templates[key]);
    });
  },

  loadNavBar: function(){
    this.navBar = new NodeChat.Controllers.NavBar( this );
  },

  loadNicknamePrompt: function(){
    this.nicknamePrompt = new NodeChat.Controllers.NicknamePrompt( this );
  },

  showNicknamePrompt: function(){
    this.nicknamePrompt.openModal();
  },

  initializeMediator: function(){
    this.mediator = new Mediator();
    this.mediator.subscribe("proceedConnecting", this.proceedConnecting, {}, this);
  },

  proceedConnecting: function(data){
    var _this = this;
    this.handshakeData = data;

    this.socket = new io.connect('http://localhost', {
      query: $.param(this.handshakeData)
    });

    this.socket.on('connect', function() {
      console.log("Connected");
      _this.mediator.publish("clientConnected");
    });
  }
});