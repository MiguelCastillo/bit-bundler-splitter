"use strict";

const createShardTreeBuilder = require("./src/shard/treeBuilder");
const createShardRepository = require("./src/shard/repository");
const Splitter = require("./src/splitter");
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
  const mainBundle = context.getBundle("main");
  const moduleCache = context.getCache();
  const shardRepository = createShardRepository();
  const shardTreeBuilder = createShardTreeBuilder(moduleCache, splitters, shardRepository);
  const shardStats = shardTreeBuilder.buildTree("main", mainBundle.entries);
  const shardOrder = buildDependencyOrder(shardRepository, ["main"]);

  // Move things around in the tree based on load order.
  normalizeCommonModules(shardRepository, shardOrder, shardStats);

  const updatedContext = shardRepository
    .getShard(shardOrder)
    .map(shard => shard.toBundle())
    .filter(Boolean)
    .reduce((context, bundle) => context.setBundle(bundle), context);

  return {
    context: updatedContext,
    shardOrder: shardOrder
  };
}

function buildAutoLoader(splitData) {
  const context = splitData.context;
  const mainBundle = context.getBundle("main");
  const loaderPath = mainBundle.dest && typeof mainBundle.dest === "string" ? path.join(path.dirname(mainBundle.dest), "loader.js") : null;

  const shardPaths = splitData.shardOrder
    .map(shardName => context.getBundle(shardName).dest)
    .filter(dest => dest && typeof dest === "string")
    .map(shardPath => `"${path.relative(path.dirname(loaderPath), shardPath)}"`);

  const loadEntries = loaderJS + `;loadJS([${shardPaths}]);`;
  return context.setBundle({ name: "loader", content: loadEntries, dest: loaderPath });
}

function buildDependencyOrder(shardRepository, shardList) {
  var processed = {}, shardDependencyOrder = [];
  var shardName;

  for (var childrenIndex = 0; shardList.length > childrenIndex; childrenIndex++) {
    shardList = shardList.concat([shardList[childrenIndex]].reduce((accumulator, parent) => {
      var children = shardRepository.getShard(parent).children;

      // Print
      // console.log(parent);
      // children.forEach((child) => console.log(" -", child));

      return accumulator.concat(children);
    }, []));
  }

  for (var index = shardList.length; index; index--) {
    shardName = shardList[index - 1];
    if (!processed[shardName]) {
      processed[shardName] = true;
      shardDependencyOrder.push(shardName);
    }
  }

  return shardDependencyOrder;
}

function normalizeCommonModules(shardRepository, shardList, moduleStats) {
  Object
    .keys(moduleStats)
    .filter(moduleId => Object.keys(moduleStats[moduleId].shards).length > 1)
    .forEach(moduleId => {
      var shards = shardList.filter(shardId => moduleStats[moduleId].shards[shardId]);
      shardRepository.setShard(shardRepository.getShard(shards.shift()).addModules(moduleId));

      shards.forEach(shardId => {
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
    return buildAutoLoader(splitContext(bundler, context, splitters));
  }

  return {
    prebundle: bundleSplitterRun
  };
}

module.exports = createBundlerSplitter;
