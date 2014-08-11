NodeChat.Controllers.Init = NodeChat.BaseController.extend({
  app: null,
  handshakeData: null,

  init: function( app, $container ){
    this._super( app );

    this.app.$container = $container;
    this.app.server = {};
    this.loadTemplates();
    this.loadNavBar();
    this.showNicknamePrompt();
    this.initializeMediator();
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

  initializeMediator: function(){
    this.app.mediator = new Mediator();
    this.app.mediator.subscribe("proceedConnecting", this.proceedConnecting, {}, this);
  },

  proceedConnecting: function(data){
    var _this = this;
    this.app.handshakeData = data;

    this.app.socket = new io.connect('http://localhost', {
      query: $.param(this.app.handshakeData)
    });

    this.app.socket.on('connect', function() {
      console.log("Connected");
      _this.app.mediator.publish("clientConnected");
    });

    this.app.socket.on("message", function(message) {
      console.log("message received from server: " + JSON.stringify(message));
    });

    this.app.socket.json.send({type: "messageOfTheDay"}, function(ackData){
      _this.app.server.messageOfTheDay = ackData.messageOfTheDay;
      new NodeChat.Controllers.MessageOfTheDay( _this.app).openModal();
    });
  }
});