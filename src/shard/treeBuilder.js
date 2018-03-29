const createNodeBuilder = require("./nodeBuilder");

function treeBuilder(moduleCache, splitters) {
  /** the tree is built using a breadth first traversal */
  function buildTree(rootShards) {
    const nodeBuilder = createNodeBuilder(moduleCache, splitters);
    var shardList = [].concat(rootShards).map(shard => shard.setModules([]));
    var shardResult = {};
    var builtNode;

    for (var shardIndex = 0; shardList.length !== shardIndex; shardIndex++) {
      builtNode = nodeBuilder.buildNode(shardList[shardIndex]);

      shardList = shardList.concat(
        Object
          .keys(builtNode.splitPoints)
          .map(key => builtNode.splitPoints[key])
      );

      shardResult[builtNode.node.name] = (
        shardResult[builtNode.node.name] ?
          shardResult[builtNode.node.name].merge(builtNode.node) :
          builtNode.node
      );
    }

    return {
      stats: nodeBuilder.getStats(),
      nodes: shardResult
    };
  }

  return {
    buildTree: buildTree
  };
}


module.exports = treeBuilder;
