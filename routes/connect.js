var express = require('express');
var router = express.Router();
var chatKernel = require('chatKernel');

router.post('/', function (req, res) {
  chatKernel.reserveNickname(req.body.nickname, function(reply){
    if(reply.error){
      res.statusCode = 406; // Not acceptable
    }
    res.send(reply);
  });
});

module.exports = router;