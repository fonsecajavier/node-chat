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
    this.app.mediator.subscribe("chatRoom:message", this.countMessage, {}, this);
    this.app.mediator.subscribe("chatRoom:scrolledToTheBottom", this.clearRoomMsgCount, {}, this);
  },

  setupChatRoomUI: function(roomToken){
    if(!this.joinedRooms[roomToken]){
      console.log("setting up chat room " + roomToken);
      this.joinedRooms[roomToken] = {
        joinedAt: new Date(),
        controller: new NodeChat.Controllers.ChatRoom(this.app, this.$container, roomToken, this.roomInitCompleted.bind(this))
      }
    }
  },

  countMessage: function(data){
    var $tabTitle = this.$container.find("[data-tab-title][data-room-token='" + data.roomToken + "']");
    var msgCount = parseInt($tabTitle.attr("data-new-messages")) + 1;
    $tabTitle.attr("data-new-messages", msgCount);
    this.refreshRoomNewMessagesDisplay($tabTitle);
    $tabTitle.addClass("withNewMessages");
  },

  clearRoomMsgCount: function(roomToken){
    var $tabTitle = this.$container.find("[data-tab-title][data-room-token='" + roomToken + "']");
    $tabTitle.attr("data-new-messages", 0);
    this.refreshRoomNewMessagesDisplay($tabTitle); // not really needed as it should be made invisible, but just for consistency
    $tabTitle.removeClass("withNewMessages");
  },

  refreshRoomNewMessagesDisplay: function($tabTitle){
    $tabTitle.find("[data-new-messages-display]").text("(" + $tabTitle.attr("data-new-messages") + ")");
  },

  roomInitCompleted: function(roomData){
    this.unFocusAllTabs();
    console.log("focusing chat room " + roomData.roomToken);
    this.joinedRooms[roomData.roomToken].controller.focus();
  },

  unFocusAllTabs: function(){
    this.$container.find("[data-chat-room-tab-titles]").find("[data-tab-title]").removeClass("active");
    this.$container.find("[data-chat-room-tab-contents]").find("[data-tab-content]").removeClass("active");
  }

});