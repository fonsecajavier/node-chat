var redisClient = require('redisClient');
var ChatService = require('ChatService');

module.exports = function(http){
  var io = require('socket.io')(http);

  io.sockets.on("connection", function(client){
    var nickname = client.handshake.query.nickname;
    var token = client.handshake.query.token;
    console.log("client connected: " + nickname + "#" + token);

    var chatClient = {
      userToken: token,
      client: client // callback function that receives a message hash as parameter
    }

    var chatService = new ChatService(chatClient, redisClient);
    chatService.subscribe();

    client.on("message", function(msg, ackFn){
      if(Object.prototype.toString.call(msg) != '[object Object]'){
        ackFn({error: "Invalid message. Should be a hash"});
        return;
      }

      if(!msg.type){
        ackFn({error: "Invalid message. Should provide a type"});
        return;
      }

      chatService.processMessage(msg, ackFn);
    });

    client.on("disconnect", function(){
      // NOTE: we might now want to delete the user immediately, but wait a reasonable
      // amount of time before declaring him dead, giving them a chance to reconnect.
      chatService.setDisconnectedClient(token, function(status){
        if(status == "OK"){
          console.log("client disconnected: " + nickname + "#" + token);
        }
      });
    });

  })

  // Authentication
  io.use(function(socket, next) {
    var nickname = socket.request._query.nickname;
    var token = socket.request._query.token;

    ChatService.connectClient(redisClient, nickname, token, function(status){
      if(status == "OK"){
        console.log("connection token validated for " + nickname + "#" + token);
        next();
      } else {
        console.log("invalid connection token received: " + nickname + "#" + token);
        next(new Error(status.error));
      }
    });
  });

};