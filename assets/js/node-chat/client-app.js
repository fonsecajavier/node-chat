NodeChat.ClientApp = Class.extend({
  lastDebugSocketResponse: null,

  init: function(){

  },

  // debug tools:
  sendCommand: function(data){
    var _this = this;
    this.socket.json.send(data, function(ackData){
      _this.lastDebugSocketResponse = ackData
      console.log(_this.lastDebugSocketResponse);
    });
  }
});