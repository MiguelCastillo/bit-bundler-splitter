function loadOrderBuilder(shardNames, shardRepository) {
  var visited = {}, loadOrder = [], shardList = [].concat(shardNames);
  var parentShard, childrenShards, shardName;

  for (var shardIndex = 0; shardList.length > shardIndex; shardIndex++) {
    parentShard = shardList[shardIndex];
    childrenShards = shardRepository.getShards(shardRepository.getShard(parentShard).children);
    shardList = shardList.concat(childrenShards.filter(child => !child.isDynamic).map(child => child.name));
  }

  for (var index = shardList.length; index; index--) {
    shardName = shardList[index - 1];
    if (!visited[shardName]) {
      visited[shardName] = true;
      loadOrder.push(shardName);
    }
  }

  return loadOrder;
}

module.exports = loadOrderBuilder;
