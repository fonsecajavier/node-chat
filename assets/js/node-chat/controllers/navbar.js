NodeChat.Controllers.Navbar = NodeChat.Controllers.Base.extend({
  $container: null,
  $roomsListOption: null,

  init: function(app){
    this._super( app );
    this.render();
    this.bindEvents();
  },

  render: function(){
    var rendered = Mustache.render(this.app.templates.navbar, {})

    this.$container = $(rendered).prependTo(this.app.$container);

    this.$roomsListOption = this.$container.find("[data-rooms-list-option]");
  },

  setNickname: function(nickname){
    var nicknameLi = this.$container.find("[data-nickname]");
    nicknameLi.addClass("active");
    nicknameLi.find("a").text("Connected as " + nickname);
  },

  bindEvents: function(){
    this.bindRoomsListOption();
  },

  bindRoomsListOption: function(){
    var _this = this;
    this.$roomsListOption.on("click", function(evt){
      new NodeChat.Controllers.Modals.RoomsList( _this.app ).openModal();
    });
  }
});