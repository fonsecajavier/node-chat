var redis = require('redis');

module.exports = {
  store: redis.createClient(),
  pub: redis.createClient(),
  sub: redis.createClient()
}