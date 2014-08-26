NodeChat.ClientApp = Class.extend({
  lastDebugSocketResponse: null,
  mediator: null,
  joinedRooms: {},

  init: function(){
    this.initializeMediator();
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

  initializeMediator: function(){
    this.mediator = new Mediator();
  },

  joinRoomByToken: function(roomToken){
    this.mediator.publish("chatRoom:setup", roomToken);
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