NodeChat.ClientApp = Class.extend({
  lastDebugSocketResponse: null,

  init: function(){

  },

  getRoomsList: function(callback){
    this.socket.json.send({type: "roomsList"}, function(roomsListReply){
      callback(roomsListReply);
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