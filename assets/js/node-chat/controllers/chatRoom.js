NodeChat.Controllers.ChatRoom = NodeChat.BaseController.extend({
  $titleContainer: null,
  $contentContainer: null,
  $tabsManager: null,
  $tabTitles: null,
  $tabContents: null,
  roomToken: null,
  
  init: function(app, $tabsManager, roomToken){
    this._super( app );

    this.$tabsManager = $tabsManager;
    this.$tabTitles = this.$tabsManager.find("[data-chat-room-tab-titles]");
    this.$tabContents = this.$tabsManager.find("[data-chat-room-tab-contents]");

    this.roomToken = roomToken;
    this.render();
    this.bindEvents();
  },

  render: function(){
    var roomData = {roomToken: this.roomToken};

    var renderedTitle = Mustache.render(this.app.templates.chatRoomTabTitle, roomData);
    this.$titleContainer = $(renderedTitle).appendTo(this.$tabTitles);

    var renderedContent = Mustache.render(this.app.templates.chatRoomTabContent, roomData);
    this.$contentContainer = $(renderedContent).appendTo(this.$tabContents);
  },

  bindEvents: function(){
    this.app.mediator.subscribe("chatRoom:" + this.roomToken, this.processMediatorMessage, {}, this);
    this.bindAfterCloseTab();
  },

  bindAfterCloseTab: function(){
    var _this = this;

    // TODO FIXME: Current event should be: 'closed.fndtn.reveal', but foundation has a bug that fires it twice.  See https://github.com/zurb/foundation/issues/5482
    // $(document).on('closed', this.selector, function(){
    //  _this.app.mediator.remove("chatRoom:" + _this.roomToken, this.processMediatorMessage);
    // });
  },

  processMediatorMessage: function(data){
    switch(data.type){
    //case "bla"
    //  return this.bla();
    default:
      console.log("ChatRoom " + this.roomToken + " - Don't know how to process message " + data.type);
    }
  },

  focus: function(){
    console.log("setting focus for room " + this.roomToken);
    this.$titleContainer.addClass("active");
    this.$contentContainer.addClass("active");
  }

/*
  bindRoomsListOption: function(){
    var _this = this;
    this.$roomsListOption.on("click", function(evt){
      new NodeChat.Controllers.RoomsList( _this.app ).openModal();
    });
  }
*/
});