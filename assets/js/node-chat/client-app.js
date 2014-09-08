NodeChat.ClientApp = Class.extend({
  lastDebugSocketResponse: null,
  mediator: null,
  joinedRooms: {},

  init: function(){
    this.initializeMediator();
  },

  initializeMediator: function(){
    this.mediator = new Mediator();
  },

  connect: function(data, callback){
    var _this = this;

    this.handshakeData = data;

    this.socket = new io.connect('http://localhost', {
      query: $.param(this.handshakeData)
    });

    this.socket.on('connect', function() {
      console.log("Connected");
      _this.mediator.publish("clientConnected");
      callback();
    });

    this.socket.on("message", function(message) {
      console.log("message received from server: " + JSON.stringify(message));
      if(message.roomToken){
        _this.mediator.publish("chatRoom:message:" + message.roomToken, message);
      }
    });
  },

  getMessageOfTheDay: function(callback){
    var _this = this;
    this.socket.json.send({type: "messageOfTheDay"}, function(ackData){
      callback(ackData.messageOfTheDay);
    });
  },

  getRoomsList: function(callback){
    this.socket.json.send({type: "roomsList"}, function(roomsListReply){
      callback(roomsListReply);
    });
  },

  findRoomByToken: function(roomToken, callback){
    this.socket.json.send({type: "findRoomByToken", roomToken: roomToken}, function(roomData){
      callback(roomData);
    });
  },

  getUsersListByRoom: function(roomToken, callback){
    this.socket.json.send({type: "usersListByRoom", roomToken: roomToken}, function(response){
      callback(response.usersList);
    });
  },

  changeRoomTopic: function(roomToken, roomTopic, callback){
    this.socket.json.send({type: "changeRoomTopic", roomToken: roomToken, roomTopic: roomTopic}, function(response){
      callback(response);
    });
  },


  sendUserMessageToRoom: function(roomToken, message, callback){
    this.socket.json.send({type: "publishUserMessage", roomToken: roomToken, message: message}, function(response){
      callback(response);
    });
  },

  joinRoomByToken: function(roomToken){
    var _this = this;
    // TODO: We should verify with the tab manager that user hasn't joined, before sending the command to the server
    this.socket.json.send({type: "joinRoomByToken", roomToken: roomToken}, function(roomData){
      _this.mediator.publish("chatRoom:setup", roomToken);
    });
  },

  joinRoomByName: function(roomName){
    var _this = this;
    this.socket.json.send({type: "joinRoomByName", roomName: roomName}, function(roomData){
      _this.mediator.publish("chatRoom:setup", roomData.roomToken);
    });
  },

  unjoinRoomByToken: function(roomToken){
    var _this = this;
    this.socket.json.send({type: "unjoinRoomByToken", roomToken: roomToken}, function(response){
    });
  },

  // debug tool:
  sendCommand: function(data){
    var _this = this;
    this.socket.json.send(data, function(ackData){
      _this.lastDebugSocketResponse = ackData;
      console.log(_this.lastDebugSocketResponse);
    });
  }
});