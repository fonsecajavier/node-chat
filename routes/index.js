var express = require('express');
var router = express.Router();
var fs = require('fs');
var async = require('async');

function loadMustacheTemplates(outerCallback){
  var tmplPath = "./views/mustache-tmpl/";
  fs.readdir(tmplPath, function(err, files){
    async.map(files, function(fileName, callback){
      fs.readFile(tmplPath + fileName, {encoding: "utf8"}, function(err, data){
        callback(err, { content: data,  id: /(.+)\.mustache/.exec(fileName)[1] });
      });
    }, function(err, results){
      outerCallback(err, results);
    })
  })
}

router.get('/', function (req, res) {
  // Waits for a global callback before rendering, just in case in the future we want to wait some more
  // things beside mustache templates loading for example
  async.parallel({
    mustacheTemplates: function(callback){
      loadMustacheTemplates(callback);
    }
  }, function(err, results){
    res.render('index', { mustacheTemplates: results.mustacheTemplates });
  })
});

module.exports = router;