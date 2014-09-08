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

    this.$tabTitles = this.$container.find("[data-chat-room-tab-titles]");
    this.$tabContents = this.$container.find("[data-chat-room-tab-contents]");
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
      this.app.unjoinRoomByToken(roomToken);
      var controller = this.joinedRooms[roomToken].controller;
      controller.removeFromDOM();
      delete this.joinedRooms[roomToken];

      // sets focus on last tab if necessary
      if(!this.$tabTitles.find("[data-tab-title].active").length){
        var $lastTab = this.$tabTitles.find("[data-tab-title]:last");
        if($lastTab.length){
          this.joinedRooms[$lastTab.attr("data-room-token")].controller.focusTab();
        }
      }
    }
  },

  roomInitCompleted: function(roomData){
    this.unFocusAllTabs();
    this.joinedRooms[roomData.roomToken].controller.focusTab();
  },

  unFocusAllTabs: function(){
    this.$tabTitles.find("[data-tab-title]").removeClass("active");
    this.$tabContents.find("[data-tab-content]").removeClass("active");
  }

});