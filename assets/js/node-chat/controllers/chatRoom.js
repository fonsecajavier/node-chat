NodeChat.Controllers.ChatRoom = NodeChat.BaseController.extend({
  $titleContainer: null,
  $contentContainer: null,
  $tabsManager: null,
  $tabTitles: null,
  $tabContents: null,
  roomData: null,
  
  init: function(app, $tabsManager, roomToken, context, initCompleted){
    this._super( app );
    var _this = this;

    this.$tabsManager = $tabsManager;
    this.$tabTitles = this.$tabsManager.find("[data-chat-room-tab-titles]");
    this.$tabContents = this.$tabsManager.find("[data-chat-room-tab-contents]");

    this.app.findRoomByToken(roomToken, function(roomData){
      _this.roomData = _.extend({roomToken: roomToken}, roomData);
      _this.render();
      _this.bindEvents();
      if(_.isFunction(initCompleted)){
        initCompleted.call(context, _this.roomData);
      }
    });
  },

  render: function(){
    var renderedTitle = Mustache.render(this.app.templates.chatRoomTabTitle, this.roomData);
    this.$titleContainer = $(renderedTitle).appendTo(this.$tabTitles);

    var renderedContent = Mustache.render(this.app.templates.chatRoomTabContent, this.roomData);
    this.$contentContainer = $(renderedContent).appendTo(this.$tabContents);
  },

  bindEvents: function(){
    this.app.mediator.subscribe("chatRoom:" + this.roomData.roomToken, this.processMediatorMessage, {}, this);
    this.bindAfterCloseTab();
  },

  bindAfterCloseTab: function(){
    var _this = this;

    // TODO FIXME: Current event should be: 'closed.fndtn.reveal', but foundation has a bug that fires it twice.  See https://github.com/zurb/foundation/issues/5482
    // $(document).on('closed', this.selector, function(){
    //  _this.app.mediator.remove("chatRoom:" + _this.roomData.roomToken, this.processMediatorMessage);
    // });
  },

  processMediatorMessage: function(data){
    switch(data.type){
    //case "bla"
    //  return this.bla();
    default:
      console.log("ChatRoom " + this.roomData.roomToken + " - Don't know how to process message " + data.type);
    }
  },

  focus: function(){
    console.log("setting focus for room " + this.roomData.roomToken);
    this.$titleContainer.addClass("active");
    this.$contentContainer.addClass("active");
  }
});