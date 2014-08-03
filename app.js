var express = require('express');
var app = express();
var http = require('http').Server(app);

// uses swig templating engine for views
// http://paularmstrong.github.io/swig/
var swig = require('swig');
// This is where all the magic happens!
app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');

// gzip/deflate outgoing responses
var compression = require('compression');
app.use(compression());

// parses body from incoming requests
var bodyParser = require('body-parser');
app.use(bodyParser.json({extended: true}));
app.use(bodyParser.urlencoded({extended: true}));
//app.user(express.bodyParser());

// this middleware is supposed to go right before the static configuration
var sass = require('node-sass');

app.use(sass.middleware({
  src: __dirname + '/bower_components/foundation/scss',
  dest: __dirname + '/public',
  debug: true,
  outputStyle: 'expanded'
}));

app.use(sass.middleware({
  src: __dirname + '/scss',
  dest: __dirname + '/public',
  debug: true,
  outputStyle: 'expanded'
}));

app.use(require("connect-assets")());

// serve and cache static content from /public folder
var oneDay = 86400000;
//app.use(express.static(__dirname + '/public', { maxAge: oneDay }));
app.use(express.static(__dirname + '/public', {  }));

// serves bower_components static content
app.use('/bower_components',  express.static(__dirname + '/bower_components'));

var defaultRoutes = require('./routes/index.js');
app.use('/', defaultRoutes);
var connectRoutes = require('./routes/connect.js');
app.use('/connect', connectRoutes);

var SocketService = require('socketService.js');
var socketService = new SocketService(http);

var httpPort = process.env.PORT || 3000;
http.listen(httpPort, function(){
  console.log("Listening on *:" + httpPort);
});

