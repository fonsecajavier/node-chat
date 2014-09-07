NodeChat.Controllers.Modals.RoomsList = NodeChat.Controllers.Modals.Base.extend({
  selector: "[data-rooms-list-modal]",
  jsListId: null,
  $joinRoomButton: null,
  roomsListHandler: null,

  init: function(app){
    this._super( app );
    this.render();
    this.renderRoomsList();
  },

  render: function(){
    var rendered = Mustache.render(this.app.templates.roomsList, {});
    this.appendDOM(rendered);

    this.$alertContainer = this.$modal.find("[data-alert-container]");
  },

  renderRoomsList: function(){
    var _this = this;
    this.app.getRoomsList(function(roomsListReply){
      if(roomsListReply.roomsList.length > 0){
        _this.jsListId = "roomsList-" + _this.id;
        var renderedList = Mustache.render(_this.app.templates.roomsListData, _.extend({jsListId: _this.jsListId}, roomsListReply));
        _this.$modal.find("[data-rooms-list]").html(renderedList);

        var opts = {valueNames: ["name", "topic"]};
        _this.roomsListHandler = new List(_this.jsListId, opts);

        _this.bindListItem();
        _this.$joinRoomButton = _this.$modal.find("[data-join-room-button]");
        _this.bindJoinRoomButton();
      } else {
        var renderedContent = Mustache.render(_this.app.templates.roomsListEmpty, {});
        _this.$modal.find("[data-rooms-list]").html(renderedContent);

        _this.bindCreateFirstChannel();
      };
    })
  },

  bindListItem: function(){
    var _this = this;
    var $listItems = this.$modal.find("[data-list]").find("li");
    $listItems.on("click", function(evt){
      $listItems.removeAttr("data-selected");
      $(this).attr("data-selected", "");
    });
  },

  bindCreateFirstChannel: function(){
    var _this = this;
    this.$modal.find("[data-create-first-channel]").on("click", function(evt){
      new NodeChat.Controllers.Modals.RoomJoin( _this.app ).openModal();
    });
  },

  bindJoinRoomButton: function(){
    var _this = this;
    this.$joinRoomButton.on("click", function(evt){
      var $selectedItem = _this.$modal.find("[data-list]").find("li[data-selected]");
      if($selectedItem.length > 0){
        _this.app.joinRoomByToken($selectedItem.attr("data-room-token"));
        _this.closeModal();
      } else {
        _this.showAlert("Please select a channel", "warning");        
      }
      return false;
    });
  },

  showAlert: function(msg, htmlClass){
    new NodeChat.Controllers.Alert(this.app, {
        htmlClass: htmlClass,
        content: msg,
        $container: this.$alertContainer
      });
  }

});