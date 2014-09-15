var ChatService = require('./ChatService');
var async = require('async');

function CleanerService(redisClient){
  this.chatService = new ChatService(null, redisClient);
  var usersLoop = function(){
    var _this = this;
    redisClient.store.smembers("disconnectedUsersList", function(err, userTokens){
      userTokens.forEach(function(userToken){
        redisClient.store.hget(["user:" + userToken, "disconnectedAt"], function(err, disconnectedAtTs){
          var millisecondsLeft = parseInt(disconnectedAtTs) + 6000 - (new Date().getTime());
          console.log(millisecondsLeft + " ms left for user " + userToken + " before disconnection timeout");
          if(millisecondsLeft <= 0){  // Timeout! free all resources from this user:
            _this.chatService.disconnectClient({userToken: userToken}, function(response){
              console.log("User [" + userToken + "] disconnection status: " + response);
            });
          }
        });
      });
    });    
  }

  this.run = function(){
    console.log("Starting CleanerService...")
    setInterval(usersLoop.bind(this), 5000);
  }
}

module.exports = CleanerService;