var uuid = require('node-uuid');
var async = require('async');
var und = require('lodash');  // Same underscore functionality but includes some other goodies

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
          var retUser = {};
          retUser.token = userToken;
          retUser.nickname = user.nickname;
          callback(err, retUser);
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
    TO ENSURE SECURITY, CLIENT MUST INVOKE joinRoomByName
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
        "room:name:" + data.roomName.toLowerCase(),
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
      the room token if found, or null if not found

    NOT DIRECTLY USED IN THE NET PROTOCOL
  */
  var findRoomByName = function(data, callback){
    redisClient.store.get("room:name:" + data.roomName.toLowerCase(), function(err, roomToken){
      callback(roomToken);
    });
  }

  /*
    findRoomByToken
      roomToken: <room token>

    callback
      a hash with the room information, or null
  */
  var findRoomByToken = function(data, callback){
    redisClient.store.hgetall(["room:" + data.roomToken], function(err, roomData){
      callback(roomData);
    });
  }

  /*
    findUserInRoom
      roomToken: <room token>
      userToken: <user token>

    callback
      <boolean>

    NOT DIRECTLY USED IN THE NET PROTOCOL
  */
  var findUserInRoom = function(data, callback){
    ChatService.findUserInRoom(redisClient, data, callback);
  };

  /*
    joinUserToRoom
      roomToken: <room token>
      userToken: <user token>

    Assumes both room and user exist.

    callback
      A hash with the room token where the user entered
      Or a hash with an error key and the room token if user already joined

    NOT DIRECTLY USED IN THE NET PROTOCOL
  */
  var joinUserToRoom = function(data, callback){
    var _this = this
    findUserInRoom(data, function(presenceExists){
      if(!presenceExists){
        redisClient.store.multi()
          .hget(
            "user:" + data.userToken,
            "nickname"
          )
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
            data.userNickname = replies[0];
            publishUserJoinedMessage(data);
            callback({roomToken: data.roomToken});
          })
      } else {
        callback({error: "User already joined this room", roomToken: data.roomToken});
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

    NOT DIRECTLY USED IN THE NET PROTOCOL
  */
  this.unjoinUserFromRoom = function(data, callback){
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
            publishUserUnjoinedMessage(data);
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
    findRoomByToken
      roomToken: <room token>

    callback
      
      Returns a hash with the room information, null if it doesn't exist
  */
  messageProcessor.findRoomByToken = function(data, callback){
    findRoomByToken(data, callback);
  }

  /*
    changeRoomTopic
      userToken: <user token>
      roomToken: <room token>
      roomTopic: <string>

    callback
      A hash with an "ok" status
      Or a hash with an error key and the room token if user doesn't belong to the given room
  */
  messageProcessor.changeRoomTopic = function(data, callback){
    var _this = this
    embedUserToken(data);

    findUserInRoom(data, function(presenceExists){
      if(presenceExists){
        redisClient.store.hset(["room:" + data.roomToken, "topic", data.roomTopic], function(err, response){
          publishTopicChangedMessage(data);
          callback({status: "ok"});
        })
      } else {
        callback({error: "User doesn't belong to this room", roomToken: data.roomToken});
      }
    });
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
    var _this = this;
    embedUserToken(data);
    findRoomByToken(data, function(roomExists){
      if(roomExists){
        _this.unjoinUserFromRoom(data, function(reply){
          callback(reply)
        });
      } else {
        callback({error: "Room with such token doesn't exist"});
      }
    });
  }

  var publishUserJoinedMessage = function(data){
    var channel = "room:" + data.roomToken;
    var payload = JSON.stringify({
        type: "userJoined",
        userToken: chatClient.userToken,
        userNickname: data.userNickname,
        roomToken: data.roomToken
      })

    redisClient.pub.publish(channel, payload);
  }

  var publishUserUnjoinedMessage = function(data){
    var channel = "room:" + data.roomToken;
    var payload = JSON.stringify({
        type: "userUnjoined",
        userToken: data.userToken || chatClient.userToken,
        roomToken: data.roomToken
      })

    redisClient.pub.publish(channel, payload);
  }

  var publishTopicChangedMessage = function(data){
    var channel = "room:" + data.roomToken;
    var payload = JSON.stringify({
        type: "topicChanged",
        userToken: chatClient.userToken,
        roomToken: data.roomToken,
        topic: data.roomTopic
      })

    redisClient.pub.publish(channel, payload);
  }

  // Performs full existence and coexistence verification on both userToken and roomToken
  // that are passed in tha data hash param.  If everything looks right, it invokes a passed
  // function "fn" with no arguments.  Otherwise, invokes "callback" with an error key
  var publishFromUser = function(data, callback, fn) {
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

        fn();
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
    publishFromUser(data, callback, function(){
      var channel = "room:" + data.roomToken;
      var payload = JSON.stringify({
          type: "userMessage",
          userToken: chatClient.userToken,
          message: data.message,
          roomToken: data.roomToken
        })

      redisClient.pub.publish(channel, payload);
      callback({status: "OK"});
    });
  }

  /*
    publishUserTyping
      roomToken: <room token>

    Uses the Redis PUB/SUB API in order to publish a typing notification from an user to
    the channel identified by the room token.

    callback
      {status: "OK"}
      or hash with error key in case the user doesn't exist anymore or if he
      doesn't belong to that room
  */
  messageProcessor.publishUserTyping = function(data, callback){
    publishFromUser(data, callback, function(){
      var channel = "room:" + data.roomToken;
      var payload = JSON.stringify({
          type: "userTyping",
          userToken: chatClient.userToken,
          roomToken: data.roomToken
        })

      redisClient.pub.publish(channel, payload);
      callback({status: "OK"});
    });
  }

  /*
    publishUserStoppedTyping
      roomToken: <room token>

    Uses the Redis PUB/SUB API in order to publish a stopped-typing notification from an user to
    the channel identified by the room token.

    callback
      {status: "OK"}
      or hash with error key in case the user doesn't exist anymore or if he
      doesn't belong to that room
  */
  messageProcessor.publishUserStoppedTyping = function(data, callback){
    publishFromUser(data, callback, function(){
      var channel = "room:" + data.roomToken;
      var payload = JSON.stringify({
          type: "userStoppedTyping",
          userToken: chatClient.userToken,
          roomToken: data.roomToken
        })

      redisClient.pub.publish(channel, payload);
      callback({status: "OK"});
    });
  }

  this.disconnectClient = function(data, callback){
    var _this = this;
    redisClient.store.hgetall(["user:" + data.userToken], function(err, userData){
      if(userData){
        console.log("Connection with user " + userData.nickname + " (" + data.userToken + ") has been lost.  Unjoining from rooms and removing all keys" )
        // start by sending unjoin signal from all channels
        redisClient.store.smembers("user:" + data.userToken + ":rooms", function(err, roomTokens){
          async.map(roomTokens, function(roomToken, callback){
            var data = {
              userToken: this.data.userToken,
              roomToken: roomToken
            }
            this.chatService.unjoinUserFromRoom(data, function(result){
              callback(null, result);
            });
          }.bind({chatService: _this, data: data}), function(err, results){
            // right after all rooms were unjoined, delete all associated redis keys that are left
            redisClient.store.multi()
              .del("user:" + data.userToken)
              .del("user:nickname:" + (userData.nickname || "").toLowerCase())
              .srem("usersList", data.userToken)
              .del("user:" + data.userToken + ":rooms")
              .srem("disconnectedUsersList", data.userToken)
              .exec(function (err, replies){
                callback("OK");
              });
          })
        });
      } else {
        // User was non-existant for some reason.  Just remove it from the disconnected users sslist.
        console.log("User with token " + data.userToken + " was marked for deletion but is already non-existant for some reason.")
        redisClient.store.srem(["disconnectedUsersList", data.userToken], function(err, remCount){
          callback("OK");
        });

      }
    });
  },

  /*
    disconnectClient
      userToken: <user token>

    Unjoin user from all rooms and remove all keys from the Redis DB.
    Send "user unjoined" notification to those rooms.

    callback
      {status: "OK"}
  */
  messageProcessor.disconnectClient = function(callback){
    var data = {};
    embedUserToken(data);
    this.disconnectClient(data, function(response){
      console.log("Handled user [" + data.userToken + "] disconnection request: " + response);
      callback({status: response});
    });
  }


  // Functions map and possible aliases.
  this.validMessages = {
    "messageOfTheDay": "messageOfTheDay",
    "motd": "messageOfTheDay",
    "roomsList": "roomsList",
    "usersListByRoom": "usersListByRoom",
    "findRoomByToken": "findRoomByToken",
    "joinRoomByName": "joinRoomByName",
    "joinRoomByToken": "joinRoomByToken",
    "unjoinRoomByToken": "unjoinRoomByToken",
    "publishUserMessage": "publishUserMessage",
    "publishUserTyping": "publishUserTyping",
    "publishUserStoppedTyping": "publishUserStoppedTyping",
    "changeRoomTopic": "changeRoomTopic",
    "disconnectClient": "disconnectClient"
  };

  this.onUserExists = function(userToken, onExistsFn, onNotExistsFn){
    var _this = this;
    redisClient.store.exists("user:" + chatClient.userToken, function (err, reply){
      if(reply){
        if(und.isFunction(onExistsFn)){
          onExistsFn.call(_this);
        }
      } else {
        if(und.isFunction(onExistsFn)){
          onNotExistsFn.call(_this);
        }
      }
    });
  };

  this.processMessage = function(msg, callback){
    var _this = this;

    this.onUserExists(chatClient.userToken, function(){
      var fnName = _this.validMessages[msg.type];
      if(!fnName){
        var errorMsg = "Invalid message type '" + msg.type + "'. Don't know how to process this type of message";
        console.log(errorMsg);
        callback({error: errorMsg});
        return;
      }

      var stringifiedData = JSON.stringify(msg) || "";
      console.log("processing protocol message from userToken " + chatClient.userToken + " [" + msg.type + "] " + stringifiedData);

      var fn = messageProcessor[fnName];
      if(fn.length == 1){
        fn.call(_this, callback);
      } else if(fn.length == 2){
        fn.call(_this, msg, callback);
      }
    }, function(){
      console.log("Ignoring message "+ JSON.stringify(msg) + " from user with invalid token: " + chatClient.userToken);
    });
  }

  this.setDisconnectedClient = function(token, callback){
    redisClient.store.multi()
      .hmset(
        "user:" + token,
        "disconnectedAt", Date.now()
      )
      .sadd("disconnectedUsersList", token)
      .exec(function (err, replies){
        callback("OK");
      });
    // CleanerService should take care of the rest
  }
}

ChatService.connectClient = function(redisClient, nickname, token, callback){
  var reservedKey = "user:nickname:" + nickname.toLowerCase();

  redisClient.store.get(reservedKey, function (err, reply){
    if(reply == token){
      redisClient.store.multi()
        .persist(reservedKey)
        .del("user:" + token)
        .hmset(
          "user:" + token,
          "nickname", nickname,
          "connectedAt", Date.now()
        )
        .srem("disconnectedUsersList", token)
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
  var reservedKey = "user:nickname:" + nickname.toLowerCase();

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
    // a worker will notify all the others about subscribing to a specific channel by publishing to this one:
    redisClient.sub.subscribe("chatService:sync:subscribeChannel");

    roomTokens.forEach(function(roomToken){
      console.log("Subscribing to existing room " + roomToken);
      redisClient.sub.subscribe("room:" + roomToken);
    });

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

ChatService.findUserInRoom = function(redisClient, data, callback){
  var key = "user:" + data.userToken + ":room:" + data.roomToken;
  redisClient.store.exists(key, function (err, reply){
    callback(reply);
  });
};

ChatService.channelMessagesHandler = function(redisClient, socketClients){
  redisClient.sub.on("message", function(channel, message){
    if(!(/^room:/).test(channel)){
      return;
    }
    data = JSON.parse(message);

    Object.keys(socketClients).forEach(function(userToken){
      var socketClient = socketClients[userToken];

      ChatService.findUserInRoom(redisClient, {roomToken: data.roomToken, userToken: userToken}, function(presenceExists){
        //console.log("sending message " + JSON.stringify(data) + " to " + userToken)
        if(presenceExists){
          socketClient.send(data);
        }
      });
    });
  });
}

module.exports = ChatService;