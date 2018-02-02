"use strict";

const createShardTreeBuilder = require("./src/shard/treeBuilder");
const createShardRepository = require("./src/shard/repository");
const Splitter = require("./src/splitter");
const Shard = require("./src/shard/shard");
const path = require("path");
const loaderJS = require("fs").readFileSync(path.join(__dirname, "loader.js"));

function createSplitter(options) {
  return new Splitter(options);
}

function normalizeOptions(options) {
  options = options || {};
  options.name = options.name || options.dest;
  return options;
}

function splitContext(bundler, context, splitters) {
  const mainBundle = context.getBundles("main");
  const shardTree = createShardTreeBuilder(context.getCache(), splitters).buildTree(new Shard(mainBundle));
  const shardRepository = createShardRepository();

  // Setup the shard repository to make it easier to make changes to
  // the shards.
  Object.keys(shardTree.nodes).forEach(shard => shardRepository.setShard(shardTree.nodes[shard]));

  var shardLoadOrder = buildShardLoadOrder(shardRepository, mainBundle.name);

  // Move things around in the shard tree based on load order.
  normalizeCommonModules(shardRepository, shardLoadOrder, shardTree.stats);

  const updatedContext = shardRepository
    .getShard(shardLoadOrder)
    .map(shard => shard.toBundle())
    .filter(Boolean)
    .reduce((context, bundle) => context.setBundle(bundle), context);

  // Once the shards are all normalized and the bundles created,
  // make sure to remove from the loader any bundles that no
  // longer have any modules in it.
  shardLoadOrder = shardLoadOrder.filter(shardName => shardRepository.getShard(shardName).modules.length);

  return {
    context: updatedContext,
    shardLoadOrder: shardLoadOrder
  };
}

function buildShardLoader(splitData) {
  const context = splitData.context;
  const mainBundle = context.getBundles("main");
  const loaderPath = mainBundle.dest && typeof mainBundle.dest === "string" ? path.join(path.dirname(mainBundle.dest), "loader.js") : null;

  const shardPaths = splitData.shardLoadOrder
    .map(shardName => context.getBundles(shardName).dest)
    .filter(dest => dest && typeof dest === "string")
    .map(shardPath => `"./${path.relative(path.dirname(loaderPath || ""), shardPath)}"`);

  const loadEntries = `(function(){\n${loaderJS}\n;load([${shardPaths}]);\n})();`;
  return context.setBundle({ name: "loader", content: loadEntries, dest: loaderPath });
}

function buildShardLoadOrder(shardRepository, shardNames) {
  var visited = {}, shardDependencyOrder = [], shardList = [].concat(shardNames);
  var shardName, children;

  for (var shardIndex = 0; shardList.length > shardIndex; shardIndex++) {
    children = [shardList[shardIndex]].reduce((accumulator, parent) => accumulator.concat(shardRepository.getShard(parent).children), []);
    shardList = shardList.concat(children);
  }

  for (var index = shardList.length; index; index--) {
    shardName = shardList[index - 1];
    if (!visited[shardName]) {
      visited[shardName] = true;
      shardDependencyOrder.push(shardName);
    }
  }

  return shardDependencyOrder;
}

function normalizeCommonModules(shardRepository, shardOrderedList, moduleStats) {
  Object
    .keys(moduleStats)
    .filter(moduleId => Object.keys(moduleStats[moduleId].shards).length > 1)
    .forEach(moduleId => {
      var shards = shardOrderedList.filter(shardId => moduleStats[moduleId].shards[shardId]);
      var entry = shards.find(shardId => shardRepository.getShard(shardId).entries.indexOf(moduleId) !== -1);

      // If the module is NOT an entry module, then we will store in the first
      // shard in the rotation so that the module gets loaded early in the
      // dependency tree.
      if (entry === undefined) {
        shards.shift();
      }

      shards
        .filter(shardId => entry !== shardId)
        .forEach(shardId => {
          const shard = shardRepository.getShard(shardId);
          shardRepository.setShard(shard.setModules(shard.modules.filter(id => id !== moduleId)));
        });
    });
}

function createBundlerSplitter(options) {
  var splitters = []
    .concat(options)
    .map(normalizeOptions)
    .map(createSplitter);

  function bundleSplitterRun(bundler, context) {
    return buildShardLoader(splitContext(bundler, context, splitters));
  }

  return {
    prebundle: bundleSplitterRun
  };
}

module.exports = createBundlerSplitter;
