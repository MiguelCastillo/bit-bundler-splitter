const createNodeBuilder = require("./nodeBuilder");

function treeBuilder(moduleCache, splitters, shardRepository) {
  /** the tree is built using a breadth first traversal */
  function buildTree(rootShards) {
    const nodeBuilder = createNodeBuilder(moduleCache, splitters);
    var shardList = [].concat(rootShards).map(shard => shard.setModules([]));
    var builtNode;

    for (var shardIndex = 0; shardList.length !== shardIndex; shardIndex++) {
      builtNode = nodeBuilder.buildNode(shardList[shardIndex]);

      shardList = shardList.concat(
        Object
          .keys(builtNode.splitPoints)
          .map(key => builtNode.splitPoints[key])
      );

      var shard = shardRepository.getShard(builtNode.node.name);
      shardRepository.setShard(shard ? shard.merge(builtNode.node) : builtNode.node);
    }

    return nodeBuilder.getStats();
  }

  return {
    buildTree: buildTree
  };
}


module.exports = treeBuilder;
