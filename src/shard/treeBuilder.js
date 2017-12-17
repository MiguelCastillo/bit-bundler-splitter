const createNodeBuilder = require("./nodeBuilder");

function treeBuilder(moduleCache, splitters, shardRepository) {
  function buildTree(rootShardName, rootModuleIds) {
    shardRepository.setShard({ name: rootShardName, entries: rootModuleIds });

    var shardNodeBuilder = createNodeBuilder(moduleCache, splitters, shardRepository);
    var shardList = [rootShardName];
    var shardIndex = 0;
    var processedShards = {};
    var currentShard;
  
    for (shardIndex = 0; shardList.length !== shardIndex; shardIndex++) {
      if (!processedShards[shardList[shardIndex]]) {
        shardNodeBuilder.buildNode(shardList[shardIndex]);
        currentShard = shardRepository.getShardByName(shardList[shardIndex]);
        shardList = shardList.concat(currentShard.children);
        processedShards[shardList[shardIndex]] = true;
      }
    }

    return shardRepository.getShardByName(rootShardName);
  }

  return {
    buildTree: buildTree
  };
}


module.exports = treeBuilder;
