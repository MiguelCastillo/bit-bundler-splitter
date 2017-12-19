module.exports = function nodeBuilder(moduleCache, splitters, shardRepository) {
  var moduleStats = {};

  function createShardForModule(mod, stats) {
    var splitter = splitters.find(splitter => splitter.isMatch(mod, stats));

    if (splitter) {
      if (!shardRepository.getShard(splitter.name)) {
        shardRepository.setShard({ name: splitter.name, splitter: splitter });
      }

      return shardRepository.getShard(splitter.name);
    }
  }

  function appendChildNode(parent, child) {
    if (parent && child && parent.name !== child.name) {
      if (hasCircularReference(parent, child)) {
        throw new Error(`Bundler splitter: circular reference detected while processing splitter ${parent.splitter.name} with child splitter ${child.splitter.name}`);
      }
  
      return {
        parent: parent.addChildren(child.name),
        child: child.addParents(parent.name)
      };
    }
  }
  
  function hasCircularReference(tree, node) {
    if (!tree || !node || tree.name === node.name) {
      return false;
    }
  
    var parents = tree.parents;
  
    while (parents.length) {
      if (parents.indexOf(node.name) !== -1) {
        return true;
      }
      else {
        parents = parents.reduce((accumulator, parent) => accumulator.concat(shardRepository.getShard(parent).parents), []);
      }
    }
  }
  
  function nodesNotEqual(shard1, shard2) {
    return shard1 && shard2 && shard1.name !== shard2.name;
  }  

  function buildNode(shardName) {
    var currentNode = shardRepository.getShard(shardName);
    var moduleIndex = 0, moduleIdList = currentNode.entries.slice(0);     
    var currentModule, newNode, nodeUpdate;

    for (moduleIndex = 0; moduleIdList.length !== moduleIndex; moduleIndex++) {
      currentModule = moduleCache[moduleIdList[moduleIndex]];

      if (!currentModule) {
        moduleIdList[moduleIndex] = null;
        continue;
      }

      nodeUpdate = appendChildNode(currentNode, createShardForModule(currentModule, moduleStats[currentModule.id]));

      if (nodeUpdate) {
        currentNode = nodeUpdate.parent;
        newNode = nodeUpdate.child;
      }
      else {
        newNode = null;
      }

      if (moduleStats[currentModule.id]) {
        moduleIdList[moduleIndex] = null;
        moduleStats[currentModule.id].shards[currentNode.name] = true;
      }
      else if (nodesNotEqual(currentNode, newNode)) {
        moduleIdList[moduleIndex] = null;
        shardRepository.setShard(newNode.addEntries(currentModule.id));
      }
      else {
        moduleIdList = moduleIdList.concat(currentModule.deps.map(dep => dep.id));
        moduleStats[currentModule.id] = { shards: { [currentNode.name]: true } };
      }
    }

    shardRepository.setShard(currentNode.addModules(moduleIdList.filter(Boolean)));
  }

  return {
    buildNode: buildNode,
    getStats: () => moduleStats
  };
};
