var chatKernel = require('chatKernel');

module.exports = function(http){
  var io = require('socket.io')(http);

  io.sockets.on("connection", function(client){
    var nickname = client.handshake.query.nickname;
    var token = client.handshake.query.token;
    console.log("client connected: " + nickname + "#" + token);

    client.on("message", function(msg, ackFn){
      if(Object.prototype.toString.call(msg) != '[object Object]'){
        ackFn({error: "Invalid message. Should be a hash"});
        return;
      }

      if(!msg.type){
        ackFn({error: "Invalid message. Should provide a type"});
        return;
      }

      msg.userToken = token;

      chatKernel.processMessage(msg, ackFn);
    });

    client.on("disconnect", function(){
      // NOTE: we might now want to delete the user immediately, but wait a reasonable
      // amount of time before declaring him dead, giving them a chance to reconnect.
      chatKernel.cleanupDisconnectedClient(nickname, token, function(status){
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

    chatKernel.connectClient(nickname, token, function(status){
      if(status == "OK"){
        console.log("connection token validated for " + nickname + "#" + token);
        next();
      } else {
        console.log("invalid connection token received: " + nickname + "#" + token);
        next(new Error(status.error));
      }
    })
  });

};