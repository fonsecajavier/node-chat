var chatKernel = require('chatKernel');

module.exports = function(http){
  var io = require('socket.io')(http);

  io.sockets.on("connection", function(client){
    var nickname = client.handshake.query.nickname;
    var token = client.handshake.query.token;
    console.log("client connected: " + nickname + "#" + token);

    client.on("disconnect", function(){

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