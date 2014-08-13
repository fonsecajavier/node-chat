var redis = require('redis');

var dbIndex = 10;

var redisClient = {
  store: redis.createClient(),
  pub: redis.createClient(),
  sub: redis.createClient()
}

redisClient.store.select(dbIndex);
redisClient.pub.select(dbIndex);
redisClient.sub.select(dbIndex);

module.exports = redisClient;