NodeChat.Controllers.Navbar = NodeChat.Controllers.Base.extend({
  $container: null,
  $nickname: null,
  $disconnectedTopMenu: null,
  $reconnectingTopMenu: null,
  $connectedTopMenu: null,
  $connect: null,
  $disconnect: null,
  $connectionNickname: null,
  $connectionConnect: null,
  $connectionDisconnect: null,
  $roomsTopMenu: null,
  $roomsListOption: null,
  $roomJoinOption: null,

  init: function(app){
    this._super( app );
    this.render();
    this.bindEvents();
  },

  render: function(){
    var rendered = Mustache.render(this.app.templates.navbar, {})

    this.$container = $(rendered).prependTo(this.app.$container);
    $(document).foundation('topbar', 'reflow'); // binds some listeners to this dynamically generated content

    this.$nickname = this.$container.find("[data-nickname]");
    this.$disconnectedTopMenu = this.$container.find("[data-disconnected-top-menu]");
    this.$reconnectingTopMenu = this.$container.find("[data-reconnecting-top-menu]");
    this.$connectedTopMenu = this.$container.find("[data-connected-top-menu]");

    this.$disconnect = this.$container.find("[data-disconnect]");

    this.$roomsTopMenu = this.$container.find("[data-rooms-top-menu]");
    this.$roomsListOption = this.$roomsTopMenu.find("[data-rooms-list-option]");
    this.$roomJoinOption = this.$roomsTopMenu.find("[data-room-join-option]");
  },

  setConnectedAs: function(){
    this.$connectionTopMenu.addClass("active");
    this.$connectionNickname.text("Connected as " + this.app.handshakeData.nickname);
  },

  bindEvents: function(){
    this.bindRoomsListOption();
    this.bindRoomJoinOption();
    this.bindConnect();
    this.bindDisconnect();
    this.app.mediator.subscribe("chatApp:connected", this.processConnected, {}, this);
    this.app.mediator.subscribe("chatApp:disconnected", this.processDisconnected, {}, this);
  },

  bindRoomsListOption: function(){
    var _this = this;
    this.$roomsListOption.on("click", function(evt){
      new NodeChat.Controllers.Modals.RoomsList( _this.app ).openModal();
    });
  },

  bindRoomJoinOption: function(){
    var _this = this;
    this.$roomJoinOption.on("click", function(evt){
      new NodeChat.Controllers.Modals.RoomJoin( _this.app ).openModal();
    });
  },

  processConnected: function(){
    this.$nickname.text(this.app.handshakeData.nickname);
    this.$roomsTopMenu.addClass("has-dropdown");

    this.$connectedTopMenu.show();
    this.$disconnectedTopMenu.hide();
    this.$reconnectingTopMenu.hide();
  },

  bindConnect: function(){

  },

  bindDisconnect: function(){
    var _this = this;

    this.$disconnect.on("click", function(evt){
      _this.app.friendlyDisconnect();
    });
  },

  processDisconnected: function(msg){
    this.$roomsTopMenu.removeClass("has-dropdown");

    this.$connectedTopMenu.hide();
    switch(msg){
      case "transport close":
        this.$disconnectedTopMenu.hide();
        this.$reconnectingTopMenu.show();
        break;
      case "forced close":
        this.$disconnectedTopMenu.show();
        this.$reconnectingTopMenu.hide();
        break;
    }
  }
});