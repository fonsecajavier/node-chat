var express = require('express');
var router = express.Router();

// TODO: delete me soon
router.get('/test-first-view', function (req, res) {
  res.render('my-first-view', { /* template locals context */ });
});

// TODO: also delete me soon
router.get('/test-second-view', function(req, res) {
  res.render('my-second-view', { });
});


module.exports = router;