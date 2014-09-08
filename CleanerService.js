var ChatService = require('ChatService');
var async = require('async');

function CleanerService(redisClient){

  this.chatService = new ChatService(null, redisClient);

  var usersLoop = function(){
    var _this = this;
    redisClient.store.smembers("disconnectedUsersList", function(err, userTokens){
      userTokens.forEach(function(userToken){
        redisClient.store.hgetall(["user:" + userToken], function(err, userData){
          if(userData){
            var millisecondsLeft = Date.now() - userData.disconnectedAt - 6000;
            console.log(-millisecondsLeft + " ms left for user " + userToken + " before disconnection timeout");
            if(millisecondsLeft >= 0){  // Timeout! free all resources for this user:
              console.log("Connection with user " + userData.nickname + " (" + userToken + ") has been lost.  Unjoining from rooms and removing all keys" )
              // start by sending unjoin signal from all channels
              redisClient.store.smembers("user:" + userToken + ":rooms", function(err, roomTokens){
                var unjoinFns = roomTokens.map(function(roomToken){
                  return function(callback){
                    var data = {
                      userToken: userToken,
                      roomToken: roomToken
                    }
                    _this.chatService.unjoinUserFromRoom(data, function(result){
                      callback(null, result);
                    }) 
                  }
                });

                async.parallel(unjoinFns, function(err, results){
                  // right after all rooms were unjoined, delete all associated redis keys that are left
                  redisClient.store.multi()
                    .del("user:" + userToken)
                    .del("user:nickname:" + userData.nickname.toLowerCase())
                    .srem("usersList", userToken)
                    .del("user:" + userToken + ":rooms")
                    .srem("disconnectedUsersList", userToken)
                    .exec(function (err, replies){
                      // nothing else to do
                    });
                })
              });
            }
          } else {
            // User was non-existant for some reason.  Just remove it from the disconnected users sslist.
            console.log("User with token " + userToken + " was marked for deletion but is already non-existant for some reason.")
            redisClient.store.srem(["disconnectedUsersList", userToken], function(err, remCount){
              // nothing else to do
            });

          }
        })
      });
    });    
  }

  this.run = function(){
    console.log("Starting CleanerService...")
    setInterval(usersLoop.bind(this), 5000);
  }
}

module.exports = CleanerService;