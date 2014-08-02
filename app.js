var express = require('express');
var app = express();

// gzip/deflate outgoing responses
var compression = require('compression');
app.use(compression());

var oneDay = 86400000;
app.use(express.static(__dirname + '/public', { maxAge: oneDay }));

app.use('/bower_components',  express.static(__dirname + '/bower_components'));

var httpPort = process.env.PORT || 3000;
app.listen(httpPort, function(){
  console.log("Listening on *:" + httpPort);
});

