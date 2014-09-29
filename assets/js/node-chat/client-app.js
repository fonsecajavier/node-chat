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

    this.socket = new io.connect(window.location.origin, {
      query: $.param(this.handshakeData)
    });

    this.socket.on('connect', function() {
      console.log("Connected");
      _this.mediator.publish("chatApp:connected");
      _this.mediator.publish("clientConnected");
      callback();
    });

    this.socket.on("message", function(message) {
      console.log("message received from server: " + JSON.stringify(message));
      if(message.roomToken){
        _this.mediator.publish("chatRoom:message:" + message.roomToken, message);
      }
    });

    this.socket.on('disconnect', function(msg) {
      console.log("clientDisconnected: " + msg);
      _this.mediator.publish("chatApp:disconnected", msg);
    });

    this.socket.on('reconnect', function(number) {
      _this.mediator.publish("chatApp:reconnect");
    });

    this.socket.on('error', function(msg) {
      if(msg == "Invalid token"){
        _this.socket.io.disconnect();
        _this.mediator.publish("chatApp:invalidToken");
      }
    });

/*

    this.socket.on('connect_failed', function(error) {
      console.log(error);
      debugger;
    });

    this.socket.on('connect_error', function(error) {
      console.log(error);
      debugger;
    });

    this.socket.on('reconnect_error', function(error) {
      console.log(error);
      debugger;
    });

    this.socket.on('reconnecting', function(number) {
      console.log("reconnecting " + number);
      debugger;
    });
*/
  },

  friendlyDisconnect: function(){
    var _this = this;
    this.socket.json.send({type: "disconnectClient"}, function(ackData){
      _this.socket.io.disconnect();
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

  sendUserTypingToRoom: function(roomToken, callback){
    this.socket.json.send({type: "publishUserTyping", roomToken: roomToken}, function(response){
      callback(response);
    });
  },

  sendUserStoppedTypingToRoom: function(roomToken, callback){
    this.socket.json.send({type: "publishUserStoppedTyping", roomToken: roomToken}, function(response){
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