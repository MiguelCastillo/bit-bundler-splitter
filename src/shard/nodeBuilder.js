const Shard = require("./shard");
const getHash = require("../hash");
const path = require("path");
const cwd = process.cwd();

module.exports = function nodeBuilder(moduleCache, splitters) {
  var moduleStats = {};

  function buildSplitPoint(mod, stats) {
    var splitter = splitters.find(splitter => splitter.isMatch(mod, stats));

    if (splitter) {
      return {
        name: splitter.name,
        dest: splitter.dest,
        dynamic: splitter.dynamic
      };
    }
  }

  function nodesNotEqual(node1, node2) {
    return node1 && node2 && node1.name !== node2.name;
  }

  function buildNode(node) {
    var currentNode = node;
    var moduleIndex = 0, moduleList = node.entries.slice(0);
    var currentModule;
    var entries = [];
    var splitPoints = {};
    var splitPoint;

    for (moduleIndex = 0; moduleList.length !== moduleIndex; moduleIndex++) {
      currentModule = moduleCache[moduleList[moduleIndex]];

      if (!currentModule) {
        continue;
      }

      // If module is already processed, then we just update shards
      // keeping track of this particular modules. Make sure to exclude
      // dynamic modules since they go in different shards.
      if (moduleStats[currentModule.id]) {
        if (moduleStats[currentModule.id].shards[currentNode.name]) {
          moduleList[moduleIndex] = null;
        }
        else {
          moduleStats[currentModule.id].shards[currentNode.name] = true;
          moduleList = moduleList.concat(currentModule.deps.filter(dep => !dep.dynamic).map(dep => dep.id));
        }
      }
      else {
        splitPoint = buildSplitPoint(currentModule, moduleStats[currentModule.id]);

        if (nodesNotEqual(currentNode, splitPoint)) {
          if (!splitPoints[splitPoint.name]) {
            splitPoints[splitPoint.name] = new Shard(splitPoint);
          }

          currentNode = currentNode.addChildren(splitPoint.name);
          splitPoints[splitPoint.name] = splitPoints[splitPoint.name].merge({ parents: currentNode.name, entries: currentModule.id });
          moduleList[moduleIndex] = null;
        }
        else {
          moduleList = moduleList.concat(currentModule.deps.filter(dep => !dep.dynamic).map(dep => dep.id));
          moduleStats[currentModule.id] = { shards: { [currentNode.name]: true } };

          // iterate through the dynamic deps and create shards for dynamic loading
          currentModule.deps
            .filter(dep => dep.dynamic)
            .forEach(dep => {
              const name = dep.path ? configureName(dep.path) : getHash(dep.id);
              splitPoints[name] = new Shard({ name: name, dynamic: true, entries: [dep.id], implicit: true });
            });

          // If a splitPoint is found it means that the currentNode is the split point.
          // So add the module as an entry.
          if (splitPoint) {
            entries.push(currentModule.id);
          }
        }
      }
    }

    return {
      node: currentNode.addModules(moduleList.filter(Boolean)).addEntries(entries),
      splitPoints: splitPoints
    };
  }

  return {
    buildNode: buildNode,
    getStats: () => moduleStats
  };
};

function configureName(filepath) {
  return getHash(filepath.replace(cwd, "")) + path.extname(filepath);
}
