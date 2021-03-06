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
  lastTypingTs: null,
  typingCheckScheduled: null,
  typing: false,

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
        _this.roomData.usersList.forEach(function(user){
          user.fontColor = _this.generateRandomFontColor();
          user.lastTypingTs = null;
        });
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
    this.$messagesContainerRegular = this.$messagesContainer.find("[data-regular-messages]");
    this.$messagesContainerTyping = this.$messagesContainer.find("[data-typing-messages]");

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
    this.app.mediator.subscribe("chatApp:connected", this.processConnected, {}, this);
    this.app.mediator.subscribe("chatApp:disconnected", this.processDisconnected, {}, this);
    this.bindMessagesScrolled();
    this.bindSendMessageButton();
    this.bindCloseTabButton();
    this.bindInputTyping();
  },

  bindInputTyping: function(){
    var _this = this;

    this.$messageInput.on("input", function(){
      var currentTs = (new Date().getTime());
      if(currentTs >_this.lastTypingTs + 2000){
        _this.app.sendUserTypingToRoom(_this.roomData.roomToken, function(response){
          if(response.status != "OK"){
             console.log("Error sending typing notification to room " + _this.roomData.roomToken);
          }
        }.bind(_this));

      }
      _this.lastTypingTs = currentTs;

      if(!_this.typing){
        _this.typing = true;
        _this.typingCheckScheduled = setTimeout(_this.typingCheck.bind(_this), 3000);
      }
    });
  },

  typingCheck: function(){
    var currentTs = (new Date().getTime());
    if(currentTs > this.lastTypingTs + 2000){
      this.sendUserStoppedTyping();
    } else{
      this.typingCheckScheduled = setTimeout(this.typingCheck.bind(this), 3000);
    }
  },

  sendUserStoppedTyping: function(){
    var _this = this;
    
    this.app.sendUserStoppedTypingToRoom(this.roomData.roomToken, function(response){
      if(response.status != "OK"){
        console.log("Error sending stopped-typing notification to room " + _this.roomData.roomToken);
      }
    }.bind(_this));

    this.lastTypingTs = null;
    clearTimeout(this.typingCheckScheduled);
    this.typing = false;
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
      if(_this.$messageInput.prop("disabled")){
        return false;
      }

      var msg = _this.$messageInput.val();
      if(!msg.trim()){
        return false;
      }

      if(!_this.processCommand(msg)){ /* typed message was not a command like /topic, so it's a sendable message */
        _this.app.sendUserMessageToRoom(_this.roomData.roomToken, msg, function(response){
          if(response.status != "OK"){
            console.log("Error sending message to room " + _this.roomData.roomToken);
          }
        }.bind(_this));

        _this.sendUserStoppedTyping();
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

  processConnected: function(){
    this.$messageInput.prop("disabled", false);
  },

  processDisconnected: function(){
    this.$messageInput.prop("disabled", true);
  },

  processMediatorMessage: function(data){
    var _this = this;
    validMessages = ["userMessage", "userUnjoined", "userJoined", "topicChanged", "userTyping", "userStoppedTyping", "global"];

    console.log("Received message for chatRoom " + this.roomData.roomToken + " - " + JSON.stringify(data));

    if(_.indexOf(validMessages, data.type) == -1){
      console.log("ChatRoom " + this.roomData.roomToken + " - Don't know how to process message " + data.type); 
      return;
    }

    if(_.indexOf(["userTyping", "userStoppedTyping"], data.type) != -1 & data.userToken == this.app.handshakeData.token ){
      // don't show user typing notification for ourselves
      return;
    }

    if(data.userToken){
      var user = this.findUserInList(data.userToken);
    }

    if(_.indexOf(["userMessage", "userUnjoined", "topicChanged", "userTyping", "userStoppedTyping"], data.type) != -1){
      // adds the nickname to the hash so that it can also be rendered:
      data.userNickname = user.nickname;
      data.userFontColor = user.fontColor;
    }

    switch(data.type){
      case "userJoined":
        this.addUserToList({
          token: data.userToken,
          nickname: data.userNickname,
          fontColor: this.generateRandomFontColor(),
          lastTypingTs: null
        })
        break;
      case "userUnjoined":
        this.removeUserFromList(data.userToken);
        break;
      case "topicChanged":
        this.roomData.topic = data.topic;
        break;
      case "userTyping":
        user.lastTypingTs = (new Date()).getTime();
        // this delayed check ensures that typing notifications for bad clients (or that went offline) are properly removed and cleaned up
        user.typingCheck = _.delay(function(user){  // _.delay() is an underscore's cross-browser implementation of setTimeout that receives arguments
          if(!user){ return; }

          var currentTs = (new Date()).getTime();
          if(currentTs >= user.lastTypingTs + 5000){
            console.log("Removing typing notification for user " + user.nickname + " due to lastTypingTs timeout");
            user.lastTypingTs = null;
            _this.removeUserTypingNotification(user.token);
          }
        }.bind(this), 5000, user);
        break;
      case "userMessage":
        var $lastMsg = this.$messagesContainerRegular.find("> :last");
        // Don't show nickname again if last message was also an user message from that same user:
        if($lastMsg.hasClass("user-message") && $lastMsg.attr("data-userToken") == data.userToken){
          data.userNickname = "";
        }
        break;
      case "userStoppedTyping":
        user.lastTypingTs = null;
        clearTimeout(user.typingCheck);
        this.removeUserTypingNotification(data.userToken);
        return; // don't render anything
        break;
    }
    this.renderMessage(data);
  },

  removeUserTypingNotification: function(userToken){
    this.$messagesContainerTyping.find("[data-userToken='" + userToken + "']").fadeOut(300, function() { $(this).remove(); });
  },

  renderMessage: function(data){
    var messageKlass = _.capitalizeFirstLetter(data.type);

    var msgController = new NodeChat.Controllers.ChatMessages[messageKlass](
      this.app,
      data
    );

    var htmlMsg = msgController.generateHTML();
    var wasInTheBottom = this.isScrollingToTheBottom();

    if(data.type == "userTyping"){
      if(this.$messagesContainerTyping.find("[data-userToken='" + data.userToken + "']").length == 0){
        $(htmlMsg).appendTo(this.$messagesContainerTyping);
      }
    } else {
      $(htmlMsg).appendTo(this.$messagesContainerRegular);
    }

    if(wasInTheBottom){
      this.scrollToTheBottom();
    } else {
      if(_.indexOf(["userTyping", "userStoppedTyping"], data.type) == -1){
        this.countMessage();
      }
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
  },

  generateRandomFontColor: function(){
    var r = parseInt(Math.random()*128);
    var g = parseInt(Math.random()*128);
    var b = parseInt(Math.random()*128);
    return "rgb(" + r + "," + g + ","  + b + ")" ;
  }
});