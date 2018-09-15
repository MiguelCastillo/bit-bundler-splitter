const Shard = require("./shard");

const MAIN_BUNDLE_NAME = "main";

module.exports = function createRepository() {
  var shards = {};

  function getAllShards() {
    return Object.keys(shards).map(shardName => shards[shardName]);
  }

  function getMainShard() {
    return shards[MAIN_BUNDLE_NAME];
  }

  function getDynamicShards() {
    return getAllShards().filter(shard => shard.isDynamic);
  }

  function getEntryShards() {
    return getDynamicShards().concat(getMainShard());
  }

  function getShard(names) {
    return shards[names];
  }

  function getShards(names) {
    return names.map(name => shards[name]);
  }

  function createShard(name, entries, splitter) {
    return new Shard({
      name: name,
      entries: entries,
      splitter: splitter
    });
  }

  function setShard(shard) {
    shards[shard.name] = (
      shard instanceof Shard ?
        shard :
        shards[shard.name] ? shards[shard.name].configure(shard) : new Shard(shard)
    );

    return shards[shard.name];
  }

  return {
    getAllShards: getAllShards,
    getMainShard: getMainShard,
    getDynamicShards: getDynamicShards,
    getEntryShards: getEntryShards,
    getShard: getShard,
    getShards: getShards,
    createShard: createShard,
    setShard: setShard
  };
};
