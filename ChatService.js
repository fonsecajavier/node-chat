var uuid = require('node-uuid');
var async = require('async');

// Please look at "Chat Kernel data-layout" for more info on the REDIS data structure
// that was implemented

// Constructor
// chatClient: hash with userToken and "send" callback function
function ChatService(chatClient, redisClient){
  var messageProcessor = {};

  /*
    messageOfTheDay

    This should be dynamic and/or stored somewhere else
    
    callback
      A string containing some sort of message that will be displayed to the user
      as soon as he connects
  */

  messageProcessor.messageOfTheDay = function(data, callback){
    var motd = "Thanks for joining our chat server. We hope you enjoy your stay.\n\nWarm regards,\n\n- Javier Fonseca";
    callback({messageOfTheDay: motd});
  }

  /*
    roomsList
    
    callback
      An array containing the list of rooms available in the server,
      sorted in descending order by their users count
  */
  messageProcessor.roomsList = function(outerCallback){
    redisClient.store.zrevrangebyscore(["roomsListRanked", "+inf", "-inf"], function(err, roomTokens){

      var rooms = [];
      async.map(roomTokens, function(roomToken, callback){
        redisClient.store.hgetall(["room:" + roomToken], function(err, roomData){
          roomData.token = roomToken;
          callback(err, roomData);
        })
      }, function(err, results){
        outerCallback({roomsList: results});
      });
    });
  }

  /*
    usersListByRoom
      roomToken: <room token>

    callback  
      An array containing the list of users in a room, in no particular order
  */
  messageProcessor.usersListByRoom = function(data, outerCallback){
    var key = "room:" + data.roomToken + ":users";

    redisClient.store.smembers(key, function(err, userTokens){

      var users = [];
      async.map(userTokens, function(userToken, callback){
        redisClient.store.hgetall(["user:" + userToken], function(err, user){
          user.token = userToken
          callback(err, user);
        })
      }, function(err, results){
        outerCallback({usersList: results});
      });
    });
  }

  /*
    createRoomByName
      roomName: <room name>
      roomTopic: <string> (optional)

    callback
      <room token>
    NOT EXPORTABLE TO ENSURE SECURITY, CLIENT MUST INVOKE joinRoomByName
  */
  var createRoomByName = function(data, callback){
    roomToken = uuid.v4();
    redisClient.store.multi()
      .hmset(
        "room:" + roomToken,
        "name", data.roomName,
        "topic", data.roomTopic || "",
        "usersCount", 0,
        "createdAt", Date.now()
      )
      .zadd(
        "roomsListRanked",
        0, // score (users count)
        "roomToken", roomToken
      )
      .set(
        "room:name:" + data.roomName,
        roomToken
      )
      .exec(function (err, replies){
        redisClient.pub.publish("chatService:sync:subscribeChannel", roomToken);
        callback(roomToken)
      })
  }

  /*
    findRoomByName
      roomName: <room name>

    callback
      <room token> or null

    NOT EXPORTABLE (NOT NEEDED IN THE NET PROTOCOL)
  */
  var findRoomByName = function(data, callback){
    redisClient.store.get("room:name:" + data.roomName, function(err, reply){
      callback(reply);
    });
  }

  /*
    findRoomByToken
      roomToken: <room token>

    callback
      <boolean>

    NOT EXPORTABLE (NOT NEEDED IN THE NET PROTOCOL)
  */
  var findRoomByToken = function(data, callback){
    redisClient.store.exists("room:" + data.roomToken, function(err, reply){
      callback(reply);
    });
  }

  /*
    findUserInRoom
      roomToken: <room token>
      userToken: <user token>

    callback
      <boolean>

    NOT EXPORTABLE (NOT NEEDED IN THE NET PROTOCOL)
  */
  var findUserInRoom = function(data, callback){
    var key = "user:" + data.userToken + ":room:" + data.roomToken;
    redisClient.store.exists(key, function (err, reply){
      callback(reply);
    });
  };

  /*
    joinUserToRoom
      roomToken: <room token>
      userToken: <user token>

    Assumes both room and user exist.

    callback
      A hash with the room token where the user entered
      Or a hash with an error key if user already joined

    NOT EXPORTABLE (NOT NEEDED IN THE NET PROTOCOL)
  */
  var joinUserToRoom = function(data, callback){
    var _this = this
    findUserInRoom(data, function(presenceExists){
      if(!presenceExists){
        redisClient.store.multi()
          .sadd(
            "user:" + data.userToken + ":rooms",
            data.roomToken
          )
          .zincrby(
            "roomsListRanked",
            1, // increment
            data.roomToken
          )
          .hincrby(
            "room:" + data.roomToken,
            "usersCount",
            1 // increment
          )
          .sadd(
            "room:" + data.roomToken + ":users",
            data.userToken
          )
          .hmset(
            "user:" + data.userToken + ":room:" + data.roomToken,
            "joinedAt", Date.now()
          )
          .exec(function (err, replies){
            callback({roomToken: data.roomToken});
          })
      } else {
        callback({error: "User already joined this room"});
      }
    });
  }

  /*
    unjoinUserFromRoom
      roomToken: <room token>
      userToken: <user token>

    Assumes both room and user exist.

    callback
      A hash with the room token where the user entered
      Or a hash with an error key if user hadn't joined

    NOT EXPORTABLE (NOT NEEDED IN THE NET PROTOCOL)
  */
  var unjoinUserFromRoom = function(data, callback){
    findUserInRoom(data, function(presenceExists){
      if(presenceExists){
        redisClient.store.multi()
          .srem(
            "user:" + data.userToken + ":rooms",
            data.roomToken
          )
          .zincrby(
            "roomsListRanked",
            -1, // decrement
            data.roomToken
          )
          .hincrby(
            "room:" + data.roomToken,
            "usersCount",
            -1 // decrement
          )        
          .srem(
            "room:" + data.roomToken + ":users",
            data.userToken
          )
          .del(
            "user:" + data.userToken + ":room:" + data.roomToken
          )
          .exec(function (err, replies){
            callback({status: "OK"});
          })
      } else {
        callback({error: "User hasn't joined to this room"});
      }
    });
  }

  var embedUserToken = function(data){
    data.userToken = chatClient.userToken;
  }

  /*
    joinRoomByName
      roomName: <room name>

    Joins an existing room, or creates one if it doesn't exist yet

    callback
      
      Returns a hash with an error if user already joined an existing room
  */
  messageProcessor.joinRoomByName = function(data, callback){
    embedUserToken(data);
    findRoomByName(data, function(roomToken){
      if(!roomToken){
        createRoomByName(data, function(newRoomToken){
          data.roomToken = newRoomToken;
          joinUserToRoom(data, function(reply){
            callback(reply);
          });
        });
      }
      else {
        data.roomToken = roomToken;
        joinUserToRoom(data, function(reply){
          callback(reply);
        });
      }
    });
  }

  /*
    joinRoomByToken
      roomToken: <room token>

    Joins a room by its token.
    Returns a hash with the room token if correct
    Returns a hash with an error key if room token doesn't exist
    or if user already joined that room
  */
  messageProcessor.joinRoomByToken = function(data, callback){
    embedUserToken(data);
    findRoomByToken(data, function(roomExists){
      if(roomExists){
        joinUserToRoom(data, function(reply){
          callback(reply)
        });
      } else {
        callback({error: "Room with such token doesn't exist"});
      }
    });
  }

  /*
    unjoinRoomByToken
      roomToken: <room token>

    Joins a room by its token.
    Returns a hash with a status "OK"
    Returns a hash with an error key if room token doesn't exist
    or if user hadn't joined this room.
  */
  messageProcessor.unjoinRoomByToken = function(data, callback){
    embedUserToken(data);
    findRoomByToken(data, function(roomExists){
      if(roomExists){
        unjoinUserFromRoom(data, function(reply){
          callback(reply)
        });
      } else {
        callback({error: "Room with such token doesn't exist"});
      }
    });
  }

  /*
    subscribe
  */
  this.subscribe = function(){
    redisClient.sub.on("message", function(channel, message){
      if(!(/^room:/).test(channel)){
        return;
      }

      data = JSON.parse(message);

      findUserInRoom({roomToken: data.roomToken, userToken: chatClient.userToken}, function(presenceExists){
        if(presenceExists){
          chatClient.client.send(data);
        }
      });
    });
  }

  /*
    publishUserMessage
      roomToken: <room token>

    Uses the Redis PUB/SUB API in order to publish a message from an user to
    the channel identified by the room token.

    callback
      {status: "OK"}
      or hash with error key in case the user doesn't exist anymore or if he
      doesn't belong to that room
  */
  messageProcessor.publishUserMessage = function(data, callback){
    var _this = this;
    redisClient.store.multi()
      .hgetall("user:" + chatClient.userToken)
      .exists("room:" + data.roomToken)
      .exists("user:" + chatClient.userToken + ":room:" + data.roomToken)
      .exec(function(err, replies){
        user = replies[0];
        roomExists = replies[1];
        userExistsInRoom = replies[2];
        if(!user){
          callback({error: "Can't publish message because user doesn't exist"});
          return;
        }
        if(!roomExists){
          callback({error: "Can't publish message because room doesn't exist"});
          return;
        }
        if(!userExistsInRoom){
          callback({error: "User doesn't exist in this room"});
          return;
        }
        var channel = "room:" + data.roomToken;
        var payload = JSON.stringify({
            type: "userMessage",
            userToken: chatClient.userToken,
            userNickname: user.nickname,
            message: data.msg,
            roomToken: data.roomToken
          })

        redisClient.pub.publish(channel, payload);
        callback({status: "OK"});
      });
  }

  // Functions map and possible aliases.
  this.validMessages = {
    "messageOfTheDay": "messageOfTheDay",
    "motd": "messageOfTheDay",
    "roomsList": "roomsList",
    "usersListByRoom": "usersListByRoom",
    "joinRoomByName": "joinRoomByName",
    "joinRoomByToken": "joinRoomByToken",
    "unjoinRoomByToken": "unjoinRoomByToken",
    "publishUserMessage": "publishUserMessage"
  };

  this.processMessage = function(msg, callback){
    var fnName = this.validMessages[msg.type];
    if(!fnName){
      callback({error: "Invalid message. Don't know how to process this type of message"});
      return;
    }

    var stringifiedData = JSON.stringify(msg) || "";
    console.log("processing protocol message from userToken " + chatClient.userToken + " [" + msg.type + "] " + stringifiedData);

    var fn = messageProcessor[fnName];
    if(fn.length == 1){
      fn.call(this, callback);
    } else if(fn.length == 2){
      fn.call(this, msg, callback);
    }
  }

  this.cleanupDisconnectedClient = function(nickname, token, callback){
    // Have to better deal with this:
    /*
    redisClient.store.multi()
      .del("user:" + token)
      .del("user:nickname:" + nickname)
      .exec(function (err, replies){
        callback("OK");
      });
    */
  }
}

ChatService.connectClient = function(redisClient, nickname, token, callback){
  var reservedKey = "user:nickname:" + nickname;

  redisClient.store.get(reservedKey, function (err, reply){
    if(reply == token){
      redisClient.store.multi()
        .persist(reservedKey)
        .hmset(
          "user:" + token,
          "nickname", nickname,
          "connectedAt", Date.now()
        )
        .exec(function (err, replies){
          callback("OK");
        })
    } else {
      callback({error: "Invalid token"});
    }
  })
};

ChatService.nicknameRegex = /[a-zA-Z][a-zA-Z\d-_]{2,15}/;

ChatService.reserveNickname = function(redisClient, nickname, callback){
  var _this = this;
  var reservedKey = "user:nickname:" + nickname;

  redisClient.store.multi()
    .get(reservedKey)
    .exec(function (err, replies){
      if(replies[0]){
        callback({error: "Nickname was already selected by another user"})
      }
      else {
        if(_this.nicknameRegex.test(nickname)){
          var reservedToken = uuid.v4();
          var ttl = 10000; // milliseconds
          redisClient.store.set([reservedKey, reservedToken, "PX", ttl], function (err, reply){
            callback({nickname: nickname, token: reservedToken});
          })          
        }
        else{
          callback({error: "Invalid format for nickname"}); // Server-side validation.  Can't tolerate bad-written clients.
        }
      }
    });
};

/*
  roomsListTokens

  callback
    An array containing the tokens for all rooms in the DB
*/
ChatService.roomsListTokens = function(redisClient, callback){
  redisClient.store.zrange(["roomsListRanked", 0, -1], function(err, roomTokens){
    callback(roomTokens)
  });
}

ChatService.subscribeExistingChannels = function(redisClient){
  this.roomsListTokens(redisClient, function(roomTokens){
    roomTokens.forEach(function(roomToken){
      console.log("Subscribing to existing room " + roomToken);
      redisClient.sub.subscribe("room:" + roomToken);
    });

    // a worker will notify all the others about subscribing to a specific channel by publishing to this one:
    redisClient.sub.subscribe("chatService:sync:subscribeChannel");
    redisClient.sub.on("message", function(channel, message){
      if(channel != "chatService:sync:subscribeChannel"){
        return;
      }
      var channel = "room:" + message;
      console.log("subscribing to channel: " + channel);
      redisClient.sub.subscribe(channel);
    });
  })
}

module.exports = ChatService;