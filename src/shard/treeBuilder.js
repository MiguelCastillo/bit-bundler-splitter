const createNodeBuilder = require("./nodeBuilder");

function treeBuilder(moduleCache, splitters, shardRepository) {

  /** the tree is built using a breadth first traversal */
  function buildTree(rootShardName, rootModuleIds) {
    shardRepository.setShard({ name: rootShardName, entries: rootModuleIds });

    const nodeBuilder = createNodeBuilder(moduleCache, splitters, shardRepository);
    const visitedShards = {};
    var shardList = [rootShardName];
    var currentShard;

    for (var shardIndex = 0; shardList.length !== shardIndex; shardIndex++) {
      if (!visitedShards[shardList[shardIndex]]) {
        visitedShards[shardList[shardIndex]] = true;
        nodeBuilder.buildNode(shardList[shardIndex]);
        currentShard = shardRepository.getShard(shardList[shardIndex]);
        shardList = shardList.concat(currentShard.children);
      }
    }

    return nodeBuilder.getStats();
  }

  return {
    buildTree: buildTree
  };
}


module.exports = treeBuilder;
