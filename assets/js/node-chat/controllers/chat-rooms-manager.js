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
    this.bindToggledTabs();
  },

  bindToggledTabs: function(){
    var _this = this;
    this.$container.find("[data-tab]").on('toggled', function (event, tab) {
      var controller = _this.joinedRooms[tab.attr("data-room-token")].controller;
      controller.scrollToTheBottom();
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
  },

  roomInitCompleted: function(roomData){
    this.unFocusAllTabs();
    var controller = this.joinedRooms[roomData.roomToken].controller;
    controller.focusTab();
    controller.scrollToTheBottom();
  },

  unFocusAllTabs: function(){
    this.$container.find("[data-chat-room-tab-titles]").find("[data-tab-title]").removeClass("active");
    this.$container.find("[data-chat-room-tab-contents]").find("[data-tab-content]").removeClass("active");
  }

});