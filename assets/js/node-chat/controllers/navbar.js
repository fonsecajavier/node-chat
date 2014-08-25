NodeChat.Controllers.NavBar = NodeChat.Controllers.Base.extend({
  $container: null,
  $roomsListOption: null,

  init: function(app){
    this._super( app );
    this.render();
    this.bindEvents();
  },

  render: function(){
    var rendered = Mustache.render(this.app.templates.navBar, {})

    this.$container = $(rendered).prependTo(this.app.$container);

    this.$roomsListOption = this.$container.find("[data-rooms-list-option]");
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