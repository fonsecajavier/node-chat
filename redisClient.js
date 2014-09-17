function singleRedisClient(){
  if (process.env.REDIS_URL) {
    var rtg   = require("url").parse(process.env.REDIS_URL);
    var redis = require("redis").createClient(rtg.port, rtg.hostname);
    redis.auth(rtg.auth.split(":")[1]);
    return redis;
  } else {
    return require("redis").createClient();
  }
}

if(process.env.REDIS_DB_INDEX === undefined){
  var dbIndex = 10;
} else {
  var dbIndex = process.env.REDIS_DB_INDEX;
}

var redisClient = {
  store: singleRedisClient(),
  pub: singleRedisClient(),
  sub: singleRedisClient()
}

if(dbIndex != "0"){
  redisClient.store.select(dbIndex);
  redisClient.pub.select(dbIndex);
  redisClient.sub.select(dbIndex);
}

module.exports = redisClient;