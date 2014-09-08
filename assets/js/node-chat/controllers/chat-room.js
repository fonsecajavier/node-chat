NodeChat.Controllers.ChatRoom = NodeChat.Controllers.Base.extend({
  $tabTitleContainer: null,
  $tabContentContainer: null,
  $tabsManager: null,
  $tabTitles: null,
  $tabContents: null,
  $messagesContainer: null,
  $usersContainer: null,
  $formMessage: null,
  roomData: null,
  newMessages: 0,

  init: function(app, $tabsManager, roomToken, initCompleted){
    this._super( app );
    var _this = this;

    this.$tabsManager = $tabsManager;
    this.$tabTitles = this.$tabsManager.find("[data-chat-room-tab-titles]");
    this.$tabContents = this.$tabsManager.find("[data-chat-room-tab-contents]");

    this.app.findRoomByToken(roomToken, function(roomData){
      _this.roomData = _.extend({roomToken: roomToken}, roomData);
      _this.app.getUsersListByRoom(roomToken, function(usersList){
        _this.roomData.usersList = usersList;
        _this.render();
        _this.bindEvents();
        if(_.isFunction(initCompleted)){
          initCompleted(_this.roomData);
        }        
      })
    });
  },

  render: function(){
    var renderedTitle = Mustache.render(this.app.templates.chatRoomTabTitle, this.roomData);
    this.$tabTitleContainer = $(renderedTitle).appendTo(this.$tabTitles);

    var renderedContent = Mustache.render(this.app.templates.chatRoomTabContent, this.roomData);
    this.$tabContentContainer = $(renderedContent).appendTo(this.$tabContents);

    this.$messagesContainer = this.$tabContentContainer.find("[data-room-messages-container]");

    this.$usersContainer =  this.$tabContentContainer.find("[data-room-users-container]");

    this.$formMessage = this.$tabContentContainer.find("[data-form-message]");

    this.$messageInput = this.$formMessage.find("[data-input]");
    this.$messageSend =  this.$formMessage.find("[data-send]");

    this.renderUsersList();
  },

  renderUsersList: function(){
    var _this = this;

    var sortedUsers = _.sortBy(this.roomData.usersList, function(user){
      return user.nickname.toLowerCase();
    });

    _.each(sortedUsers, function(user){
      var renderedUser = Mustache.render(_this.app.templates.chatRoomUser, user);
      $(renderedUser).appendTo(_this.$usersContainer);
    });
  },

  bindEvents: function(){
    this.app.mediator.subscribe("chatRoom:message:" + this.roomData.roomToken, this.processMediatorMessage, {}, this);
    this.bindMessagesScrolled();
    this.bindSendMessageButton();
    this.bindCloseTabButton();
  },

  bindMessagesScrolled: function(){
    var _this = this;
    this.$messagesContainer.on('scroll', function(evt){
      if(_this.isScrollingToTheBottom()){
        _this.clearRoomMsgCount();
      }
    });
  },

  bindCloseTabButton: function(){
    var _this = this;
    this.$tabTitleContainer.find("[data-close-tab]").on("click", function(event){
      _this.app.mediator.publish("chatRoom:remove", _this.roomData.roomToken); // we'll delegate it to the chatRoom tab manager
    });
  },

  removeFromDOM: function(){
    this.app.mediator.remove("chatRoom:message:" + this.roomData.roomToken, this.processMediatorMessage);
    this.$tabTitleContainer.remove();
    this.$tabContentContainer.remove();
  },

  bindSendMessageButton: function(){
    var _this = this;

    this.$messageInput.keydown(function(e){
      var keyCode = e.keyCode || e.which;

      if (keyCode == 13) {
        _this.$messageSend.trigger("click");
        return false;
      }
    });

    this.$messageSend.on("click", function(evt){
      var msg = _this.$messageInput.val();
      if(!msg.trim()){
        return false;
      }

      if(!_this.processCommand(msg)){
        _this.app.sendUserMessageToRoom(_this.roomData.roomToken, msg, function(response){
          if(response.status != "OK"){
            console.log("Error sending message from room " + _this.roomData.roomToken);
          }
        }.bind(_this));
      }

      _this.$messageInput.val("");
      return false;
    });
  },

  processCommand: function(msg){
    var regExp = /\/(\w+)(\s(.+))?/; // commands should start with slash, provide the name of the command in a single word, then the rest as arguments

    var parsedArr = regExp.exec(msg);

    if(parsedArr){
      var command = parsedArr[1].toLowerCase();
      var allArgs = parsedArr[3];
      switch(command){
        case 'topic':
          if(allArgs){
            // with args: set the topic
            this.app.changeRoomTopic(this.roomData.roomToken, allArgs, function(){});
          }
          else {
            // no args: show the topic
            this.processMediatorMessage({type: "global", message: "The topic for this room is '" + this.roomData.topic + "'"});
          }
          break;
        default:
          console.log("Invalid command '" + command + "' received from room " + this.roomData.roomToken);
      }
    }

    return parsedArr;
  },

  findUserInList: function(token){
    return _.find(this.roomData.usersList, function(user){ return(user.token == token) });
  },

  addUserToList: function(user){
    this.roomData.usersList.push(user);

    var renderedUser = Mustache.render(this.app.templates.chatRoomUser, user);
    $(renderedUser).appendTo(this.$usersContainer);
  },

  removeUserFromList: function(userToken){
    this.roomData.usersList == _.filter(this.roomData.usersList, function(user){ return user.token != userToken });

    this.$usersContainer.find("[data-user-token='" + userToken+ "']").remove();
  },

  processMediatorMessage: function(data){
    validMessages = ["userMessage", "userUnjoined", "userJoined", "topicChanged", "global"];

    console.log("Received message for chatRoom " + this.roomData.roomToken + " - " + JSON.stringify(data));

    if(_.indexOf(validMessages, data.type) == -1){
      console.log("ChatRoom " + this.roomData.roomToken + " - Don't know how to process message " + data.type); 
      return;
    }

    if(_.indexOf(["userMessage", "userUnjoined", "topicChanged"], data.type) != -1){
      var user = null;
      user = this.findUserInList(data.userToken);

      // adds the nickname to the hash so that it can also be rendered:
      data.userNickname = user.nickname;
    }

    if(data.type == "userJoined"){
      this.addUserToList({
        token: data.userToken,
        nickname: data.userNickname
      })
    }

    if(data.type == "userUnjoined"){
      this.removeUserFromList(data.userToken);
    }

    if(data.type == "topicChanged"){
      this.roomData.topic = data.topic;
    }

    this.renderMessage(data);
  },

  renderMessage: function(data){
    var messageKlass = _.capitalizeFirstLetter(data.type);

    var msgController = new NodeChat.Controllers.ChatMessages[messageKlass](
      this.app,
      data
    );

    var wasInTheBottom = this.isScrollingToTheBottom();
    $(msgController.generateHTML()).appendTo(this.$messagesContainer);    

    if(wasInTheBottom){
      this.scrollToTheBottom();
    } else {
      this.countMessage();
    }
  },

  countMessage: function(){
    this.newMessages += 1;
    this.refreshRoomNewMessagesDisplay();
    this.$tabTitleContainer.addClass("withNewMessages");
  },

  clearRoomMsgCount: function(roomToken){
    this.newMessages = 0;
    this.refreshRoomNewMessagesDisplay(); // not really needed as it should be made invisible, but just for consistency
    this.$tabTitleContainer.removeClass("withNewMessages");
  },

  refreshRoomNewMessagesDisplay: function(){
    this.$tabTitleContainer.find("[data-new-messages-display]").text("(" + this.newMessages + ")");
  },

  focusTab: function(){
    console.log("focusing tab for room " + this.roomData.roomToken);
    this.$tabTitleContainer.addClass("active");
    this.$tabContentContainer.addClass("active");

    this.scrollToTheBottom();
    this.focusMessageInput();
  },

  focusMessageInput: function(){
    this.$formMessage.find("[data-input]").focus();
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