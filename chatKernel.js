var redisClient = require('redisClient.js');
  var uuid = require('node-uuid');

var nicknameRegex = /[a-zA-Z][a-zA-Z\d-_]{2,15}/;
        
exports.reserveNickname = function(nickname, callback){
  var reservedKey = "reservedNickname:" + nickname;

  redisClient.store.multi()
    .get(reservedKey)
    .sismember("activeNicknames", nickname)
    .exec(function (err, replies){
      if(replies[0] || replies[1]){
        callback({error: "Nickname was already selected by another user"})
      }
      else {
        if(nicknameRegex.exec(nickname)){
          var reservedToken = uuid.v4();
          var ttl = 10000;
          redisClient.store.set([reservedKey, reservedToken, "PX", ttl], function (err, reply){
            callback({nickname: nickname, token: reservedToken});
          })          
        }
        else{
          callback({error: "Invalid format for nickname"}); // Server-side validation.  Can't tolerate bad-written clients.
        }
      }
    });
}

exports.connectClient = function(nickname, token, callback){
  var reservedKey = "reservedNickname:" + nickname;

  redisClient.store.get(reservedKey, function (err, reply){
    if(reply == token){
      redisClient.store.multi()
        .persist(reservedKey)
        .sadd("activeNicknames", nickname)
        .hset("user:" + token, "nickname", nickname)
        .exec(function (err, replies){
          callback("OK");
        })
    } else {
      callback({error: "Invalid token"});
    }
  })
}

exports.cleanupDisconnectedClient = function(nickname, token, callback){
  var reservedKey = "reservedNickname:" + nickname;

  redisClient.store.get(reservedKey, function (err, reply){
    if(reply == token){
      redisClient.store.multi()
        .del(reservedKey)
        .srem("activeNicknames", nickname)
        .exec(function (err, replies){
          callback("OK");
        })
    } else {
      callback({error: "Invalid token"});
    }
  })
}