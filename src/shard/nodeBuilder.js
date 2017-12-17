module.exports = function nodeBuilder(moduleCache, splitters, shardRepository) {
  var processedModules = {};

  function createShardForModule(mod, stats) {
    var splitter = splitters.find(splitter => splitter.isMatch(mod, stats));

    if (splitter) {
      if (!shardRepository.getShardByName(splitter.name)) {
        shardRepository.setShard({ name: splitter.name, splitter: splitter });
      }

      return shardRepository.getShardByName(splitter.name);
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
        parents = parents.reduce((accumulator, parent) => accumulator.concat(shardRepository.getShardByName(parent).parents), []);
      }
    }
  }
  
  function nodesNotEqual(shard1, shard2) {
    return shard1 && shard2 && shard1.name !== shard2.name;
  }  

  function buildNode(shardName) {
    var currentNode = shardRepository.getShardByName(shardName);
    var moduleIndex = 0, moduleIdList = currentNode.entries.slice(0);     
    var currentModule, newNode, nodeUpdate;

    for (moduleIndex = 0; moduleIdList.length !== moduleIndex; moduleIndex++) {
      currentModule = moduleCache[moduleIdList[moduleIndex]];

      if (currentModule) {
        nodeUpdate = appendChildNode(currentNode, createShardForModule(currentModule, processedModules[currentModule.id]));

        if (nodeUpdate) {
          currentNode = nodeUpdate.parent;
          newNode = nodeUpdate.child;
        }

        if (processedModules[currentModule.id]) {
          moduleIdList[moduleIndex] = null;
        }
        else if (nodesNotEqual(currentNode, newNode)) {
          moduleIdList[moduleIndex] = null;
          shardRepository.setShard(newNode.addEntries(currentModule.id));

          if (processedModules[currentModule.id]) {
            Object
              .keys(processedModules[currentModule.id].shards)
              .filter(shardName => currentNode.name !== shardName)
              .forEach(shardName => {
                var shard = shardRepository.getShardByName(shardName);
                shardRepository.setShard(shard.setModules(shard.modules.filter(id => id !== currentModule.id)));
              });
          }
        }
        else {
          processedModules[currentModule.id] = {
            shards: { [currentNode.name]: true }
          };

          moduleIdList = moduleIdList.concat(currentModule.deps.map(dep => dep.id));
        }
      }
      else {
        moduleIdList[moduleIndex] = null;
      }
    }

    shardRepository.setShard(currentNode.addModules(moduleIdList.filter(Boolean)));
  }

  return {
    buildNode: buildNode
  };
};
