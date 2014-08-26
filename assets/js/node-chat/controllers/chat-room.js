NodeChat.Controllers.ChatRoom = NodeChat.Controllers.Base.extend({
  $tabTitleContainer: null,
  $tabContentContainer: null,
  $tabsManager: null,
  $tabTitles: null,
  $tabContents: null,
  $messagesContainer: null,
  roomData: null,
  
  init: function(app, $tabsManager, roomToken, initCompleted){
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
        initCompleted(_this.roomData);
      }
    });
  },

  render: function(){
    var renderedTitle = Mustache.render(this.app.templates.chatRoomTabTitle, this.roomData);
    this.$tabTitleContainer = $(renderedTitle).appendTo(this.$tabTitles);

    var renderedContent = Mustache.render(this.app.templates.chatRoomTabContent, this.roomData);
    this.$tabContentContainer = $(renderedContent).appendTo(this.$tabContents);

    this.$messagesContainer = this.$tabContentContainer.find("[data-room-messages-container]");
  },

  bindEvents: function(){
    this.app.mediator.subscribe("chatRoom:message:" + this.roomData.roomToken, this.processMediatorMessage, {}, this);
    this.bindAfterCloseTab();
    this.bindMessagesScrolled();
  },

  bindMessagesScrolled: function(){
    var _this = this;
    this.$messagesContainer.on('scroll', function(evt){
      if(_this.isScrollingToTheBottom()){
        _this.publishScrolledToTheBottom();
      }
    });
  },

  bindAfterCloseTab: function(){
    var _this = this;

    // TODO FIXME: Current event should be: 'closed.fndtn.reveal', but foundation has a bug that fires it twice.  See https://github.com/zurb/foundation/issues/5482
    // $(document).on('closed', this.selector, function(){
    //  _this.app.mediator.remove("chatRoom:" + _this.roomData.roomToken, this.processMediatorMessage);
    // });
  },

  publishScrolledToTheBottom: function(){
    this.app.mediator.publish("chatRoom:scrolledToTheBottom", this.roomData.roomToken);
  },

  processMediatorMessage: function(data){
    switch(data.type){
      case "userMessage":
      case "userJoined":
      case "userLeft":
      case "topicChanged":
      case "global":
        var messageKlass = _.capitalizeFirstLetter(data.type);

        var msgController = new NodeChat.Controllers.ChatMessages[messageKlass](
          this.app,
          data
        );

        var wasInTheBottom = this.isScrollingToTheBottom();
        $(msgController.generateHTML()).appendTo(this.$messagesContainer);    

        if(wasInTheBottom){
          this.scrollToTheBottom();
          this.publishScrolledToTheBottom();
        }
        break;
    default:
      console.log("ChatRoom " + this.roomData.roomToken + " - Don't know how to process message " + data.type);
    }
  },

  focus: function(){
    console.log("setting focus for room " + this.roomData.roomToken);
    this.$tabTitleContainer.addClass("active");
    this.$tabContentContainer.addClass("active");
  },

  isScrollingToTheBottom: function(){
    var $elem = this.$messagesContainer; // shortcut
    return ($elem[0].scrollHeight - $elem.scrollTop() == $elem.outerHeight());
  },

  scrollToTheBottom: function(){
    var elem = this.$messagesContainer[0]; // shortcut
    elem.scrollTop = elem.scrollHeight;
  }
});