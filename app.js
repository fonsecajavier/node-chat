var express = require('express');
var app = express();

// uses swig templating engine for views
// http://paularmstrong.github.io/swig/
var swig = require('swig');
// This is where all the magic happens!
app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');

// TODO: delete me soon
app.get('/test-view', function (req, res) {
  res.render('my-first-view', { /* template locals context */ });
});

// gzip/deflate outgoing responses
var compression = require('compression');
app.use(compression());

// this middleware is supposed to go right before the static configuration
var sass = require('node-sass');
app.use(sass.middleware({
  src: __dirname + '/sass',
  dest: __dirname + '/public',
  debug: true,
  outputStyle: 'compressed'
}));

// serve and cache static content from /public folder
var oneDay = 86400000;
app.use(express.static(__dirname + '/public', { maxAge: oneDay }));

// serves bower_components static content
app.use('/bower_components',  express.static(__dirname + '/bower_components'));

var httpPort = process.env.PORT || 3000;
app.listen(httpPort, function(){
  console.log("Listening on *:" + httpPort);
});

