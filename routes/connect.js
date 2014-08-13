var express = require('express');
var router = express.Router();
var redisClient = require('redisClient');
var ChatService = require('chatService');

router.post('/', function (req, res) {
  ChatService.reserveNickname(redisClient, req.body.nickname, function(reply){
    if(reply.error){
      res.statusCode = 406; // Not acceptable
    }
    res.send(reply);
  });
});

module.exports = router;