NodeChat.Controllers.RoomsList = NodeChat.ModalController.extend({
  selector: "[data-rooms-list-modal]",
  $joinRoomButton: null,

  init: function(app){
    this._super( app );
    this.render();
    this.bindEvents();
  },

  render: function(){
    var rendered = Mustache.render(this.app.templates.roomsList, {});
    this.appendDOM(rendered);

    this.$joinRoomButton = this.$modal.find("[data-join-room-button]");
  },

  bindEvents: function(){
    this.bindCloseModal();
  },

  bindCloseModal: function(){
    var _this = this;
    this.$joinRoomButton.on("click", function(evt){
      console.log("Hola");
    });
  }

});
