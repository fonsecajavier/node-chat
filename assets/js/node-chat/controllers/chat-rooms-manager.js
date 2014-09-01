NodeChat.Controllers.ChatRoomsManager = NodeChat.Controllers.Base.extend({
  $container: null,
  joinedRooms: {},
  
  init: function(app){
    this._super( app );
    this.render();
    this.bindEvents();
  },

  render: function(){
    var rendered = Mustache.render(this.app.templates.chatRoomTabsManager, {})

    this.$container = $(rendered).appendTo(this.app.$container);
    $(document).foundation('tab', 'reflow'); // reflow binds listeners to dynamically generated content.
  },

  bindEvents: function(){
    //this.bindRoomsListOption();
    this.app.mediator.subscribe("chatRoom:setup", this.setupChatRoomUI, {}, this);
    this.app.mediator.subscribe("chatRoom:remove", this.removeChatRoomUI, {}, this);
    this.bindToggledTabs();
  },

  bindToggledTabs: function(){
    var _this = this;
    this.$container.find("[data-tab]").on('toggled', function (event, tab) {
      var controller = _this.joinedRooms[tab.attr("data-room-token")].controller;
      controller.scrollToTheBottom();
      controller.clearRoomMsgCount(); // need to this because sometimes the scroll is not big enough for this to be triggerred
      controller.focusMessageInput();
    });
  },

  setupChatRoomUI: function(roomToken){
    if(!this.joinedRooms[roomToken]){
      console.log("setting up chat room " + roomToken);
      this.joinedRooms[roomToken] = {
        joinedAt: new Date(),
        controller: new NodeChat.Controllers.ChatRoom(this.app, this.$container, roomToken, this.roomInitCompleted.bind(this))
      }
    }
    else {
      this.unFocusAllTabs();
      this.joinedRooms[roomToken].controller.focusTab();
    }
  },

  removeChatRoomUI: function(roomToken){
    if(this.joinedRooms[roomToken]){
      console.log("removing chat room " + roomToken);
      console.log("TODO: Handle the case when the unjoined room was the active.  Set the first one as active if there's one")
      this.app.unjoinRoomByToken(roomToken);
      var controller = this.joinedRooms[roomToken].controller;
      controller.removeFromDOM();
      delete this.joinedRooms[roomToken];
    }
  },

  roomInitCompleted: function(roomData){
    this.unFocusAllTabs();
    this.joinedRooms[roomData.roomToken].controller.focusTab();
  },

  unFocusAllTabs: function(){
    this.$container.find("[data-chat-room-tab-titles]").find("[data-tab-title]").removeClass("active");
    this.$container.find("[data-chat-room-tab-contents]").find("[data-tab-content]").removeClass("active");
  }

});