var redisClient = require('redisClient.js');
var uuid = require('node-uuid');
var async = require('async');


redisClient.sub.subscribe("message");
        
// Please look at "Chat Kernel data-layout" for more info

exports.nicknameRegex = /[a-zA-Z][a-zA-Z\d-_]{2,15}/;

exports.reserveNickname = function(nickname, callback){
  var reservedKey = "user:nickname:" + nickname;

  redisClient.store.multi()
    .get(reservedKey)
    .exec(function (err, replies){
      if(replies[0]){
        callback({error: "Nickname was already selected by another user"})
      }
      else {
        if(exports.nicknameRegex.exec(nickname)){
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
}

exports.connectClient = function(nickname, token, callback){
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
}

exports.cleanupDisconnectedClient = function(nickname, token, callback){
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

exports.messageProcessor = {};

/*
  messageOfTheDay

  This should be dynamic and/or stored somewhere else
  
  callback
    A string containing some sort of message that will be displayed to the user
    as soon as he connects
*/

exports.messageProcessor.messageOfTheDay = function(data, callback){
  var motd = "Thanks for joining our chat server. We hope you enjoy your stay.\n\nWarm regards,\n\n- Javier Fonseca";
  callback({messageOfTheDay: motd});
}

/*
  roomsList
  
  callback
    An array containing the list of rooms available in the server,
    sorted in descending order by their users count
*/
exports.messageProcessor.roomsList = function(data, outerCallback){
  redisClient.store.zrevrangebyscore(["roomsListRanked", "+inf", "-inf"], function(err, roomsList){

    var rooms = [];
    async.map(roomsList, function(roomToken, callback){
      redisClient.store.hgetall(["room:" + roomToken], function(err, roomData){
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
exports.messageProcessor.usersListByRoom = function(data, outerCallback){
  var key = "room:" + data.roomToken + ":users";

  redisClient.store.smembers(key, function(err, usersList){

    var users = [];
    async.map(usersList, function(userToken, callback){
      redisClient.store.hgetall(["user:" + userToken], function(err, userData){
        callback(err, userData);
      })
    }, function(err, results){
      outerCallback({usersList: results});
    });
  });
}

/*
  _createRoomByName
    roomName: <room name>
    roomTopic: <string> (optional)

  callback
    <room token>
  NOT EXPORTABLE TO ENSURE SECURITY, CLIENT MUST INVOKE joinRoomByName
*/
var _createRoomByName = function(data, callback){
  roomToken = uuid.v4();
  redisClient.store.multi()
    .hmset(
      "room:" + roomToken,
      "name", data.roomName,
      "topic", data.roomTopic || "",
      "usersCount", 0,
      "connectedAt", Date.now()
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
      //redisClient.sub.subscribe("room:" + roomToken);
      callback(roomToken)
    })
}

/*
  _findRoomByName
    roomName: <room name>

  callback
    <room token> or null

  NOT EXPORTABLE (NOT NEEDED IN THE NET PROTOCOL)
*/
var _findRoomByName = function(data, callback){
  redisClient.store.get("room:name:" + data.roomName, function(err, reply){
    callback(reply);
  });
}

/*
  _findRoomByToken
    roomToken: <room token>

  callback
    <boolean>

  NOT EXPORTABLE (NOT NEEDED IN THE NET PROTOCOL)
*/
var _findRoomByToken = function(data, callback){
  redisClient.store.exists("room:" + data.roomToken, function(err, reply){
    callback(reply);
  });
}

/*
  _findUserInRoom
    roomToken: <room token>
    userToken: <user token>

  callback
    <boolean>

  NOT EXPORTABLE (NOT NEEDED IN THE NET PROTOCOL)
*/
var _findUserInRoom = function(data, callback){
  var key = "user:" + data.userToken + ":room:" + data.roomToken;
  redisClient.store.exists(key, function (err, reply){
    callback(reply);
  });
};

/*
  _joinUserToRoom
    roomToken: <room token>
    userToken: <user token>

  Assumes both room and user exist.

  callback
    A hash with the room token where the user entered
    Or a hash with an error key if user already joined

  NOT EXPORTABLE (NOT NEEDED IN THE NET PROTOCOL)
*/
var _joinUserToRoom = function(data, callback){
  _findUserInRoom(data, function(presenceExists){
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
  _unjoinUserFromRoom
    roomToken: <room token>
    userToken: <user token>

  Assumes both room and user exist.

  callback
    A hash with the room token where the user entered
    Or a hash with an error key if user hadn't joined

  NOT EXPORTABLE (NOT NEEDED IN THE NET PROTOCOL)
*/
var _unjoinUserFromRoom = function(data, callback){
  _findUserInRoom(data, function(presenceExists){
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

/*
  joinRoomByName
    roomName: <room name>
    userToken: <user token>

  Joins an existing room, or creates one if it doesn't exist yet

  callback
    
    Returns a hash with an error if user already joined an existing room
*/
exports.messageProcessor.joinRoomByName = function(data, callback){
  _findRoomByName(data, function(roomToken){
    if(!roomToken){
      _createRoomByName(data, function(newRoomToken){
        data.roomToken = newRoomToken;
        _joinUserToRoom(data, function(reply){
          callback(reply);
        });
      });
    }
    else {
      data.roomToken = roomToken;
      _joinUserToRoom(data, function(reply){
        callback(reply);
      });
    }
  });
}

/*
  joinRoomByToken
    roomToken: <room token>
    userToken: <user token>

  Joins a room by its token.
  Returns a hash with the room token if correct
  Returns a hash with an error key if room token doesn't exist
  or if user already joined that room
*/
exports.messageProcessor.joinRoomByToken = function(data, callback){
  _findRoomByToken(data, function(roomExists){
    if(roomExists){
      _joinUserToRoom(data, function(reply){
        callback(reply)
      });
    } else {
      callback({error: "Room with such token doesn't exist"});
    }
  });
}

/*
  joinRoomByToken
    roomToken: <room token>
    userToken: <user token>

  Joins a room by its token.
  Returns a hash with a status "OK"
  Returns a hash with an error key if room token doesn't exist
  or if user hadn't joined this room.
*/
exports.messageProcessor.unjoinRoomByToken = function(data, callback){
  _findRoomByToken(data, function(roomExists){
    if(roomExists){
      _unjoinUserFromRoom(data, function(reply){
        callback(reply)
      });
    } else {
      callback({error: "Room with such token doesn't exist"});
    }
  });
}


exports.subscribe = function(callback){
  redisClient.sub.on("message", function(channel, message){
    data = JSON.parse(message);
    console.log("hola amiguitos");
    
    console.log(channel);
    console.log(data);


    _findUserInRoom(data, function(presenceExists){
      console.log( "usuario existe " + presenceExists);
      if(presenceExists){
        callback(message);
      }
    });
  });
}
/*
  publishUserMessage
    roomToken: <room token>
    userToken: <user token>

  Uses the Redis PUB/SUB API in order to publish a message from an user to
  the channel identified by the room token.

  callback
    {status: "OK"}
    or hash with error key in case the user doesn't exist anymore.
*/
exports.messageProcessor.publishUserMessage = function(data, callback){
  redisClient.store.hgetall("user:" + data.userToken, function(err, user){
    if(user){
      redisClient.pub.publish(
        "message",//"room:" + data.roomToken,
        JSON.stringify({
          type: "userMessage",
          userToken: data.userToken,
          message: data.msg,
          roomToken: data.roomToken
        })
      );
      callback({status: "OK"});
    }
    else{
      callback({error: "Can't publish message because user doesn't exist anymore"});
    }
  });
}

// Functions map and possible aliases.
exports.validMessages = {
  "messageOfTheDay": "messageOfTheDay",
  "motd": "messageOfTheDay",
  "roomsList": "roomsList",
  "usersListByRoom": "usersListByRoom",
  "joinRoomByName": "joinRoomByName",
  "joinRoomByToken": "joinRoomByToken",
  "unjoinRoomByToken": "unjoinRoomByToken",
  "publishUserMessage": "publishUserMessage"
};

exports.processMessage = function(msg, callback){
  if(!msg.userToken){
    callback({error: "Invalid message. Should provide userToken"});
    return;
  }

  if(!exports.validMessages[msg.type]){
    callback({error: "Invalid message. Don't know how to process this type of message"});
    return;
  }

  var stringifiedData = JSON.stringify(msg) || "";
  console.log("processing protocol message from userToken " + msg.userToken + " [" + msg.type + "] " + stringifiedData);

  exports.messageProcessor[exports.validMessages[msg.type]](msg, callback);
}
