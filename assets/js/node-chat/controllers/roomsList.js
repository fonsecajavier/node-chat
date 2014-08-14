NodeChat.Controllers.RoomsList = NodeChat.ModalController.extend({
  selector: "[data-rooms-list-modal]",
  jsListId: null,
  $joinRoomButton: null,
  roomsListHandler: null,

  init: function(app){
    this._super( app );
    this.render();
    this.bindEvents();
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
        var renderedList = Mustache.render(this.app.templates.roomsListData, _.extend({jsListId: _this.jsListId}, roomsListReply));
        _this.$modal.find("[data-rooms-list]").html(renderedList);

        var opts = {valueNames: ["name", "topic"]};
        _this.roomsListHandler = new List(_this.jsListId, opts);

        _this.bindListItem();
        _this.$joinRoomButton = _this.$modal.find("[data-join-room-button]");
        _this.bindJoinRoomButton();
      } else {
        var renderedContent = Mustache.render(this.app.templates.roomsListEmpty, {});
        _this.$modal.find("[data-rooms-list]").html(renderedContent);

        _this.bindCreateFirstChannel();
      };
    })
  },

  bindEvents: function(){
    
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
    this.$modal.find("[data-create-first-channel]").on("click", function(evt){
      console.log("show the other popup");
    });
    console.log("pending bindCreateFirstChannel")
  },

  bindJoinRoomButton: function(){
    var _this = this;
    this.$joinRoomButton.on("click", function(evt){
      var $selectedItem = _this.$modal.find("[data-list]").find("li[data-selected]");
      if($selectedItem.length > 0){
        console.log($selectedItem.attr("data-room-token"));
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