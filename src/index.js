"use strict";

const createShardTreeBuilder = require("./shard/treeBuilder");
const createShardRepository = require("./shard/repository");
const Splitter = require("./splitter");
const Shard = require("./shard/shard");
const path = require("path");
const getHash = require("./hash");
const staticLoader = require("fs").readFileSync(path.join(__dirname, "/loaders/static.js"));
const dynamicLoader = require("fs").readFileSync(path.join(__dirname, "/loaders/dynamic.js"));

const dynamicBundleLoader = {
  id: "$splitter$dl",
  name: "$splitter$dl",
  source: dynamicLoader.toString(),
  deps: []
};


//
// Ugh - I wish we had actual support for macros in JS. Anyways,
// this flag for an experimental/temporary switch to generate
// a separate common bundle instead of stuffing common modules
// in the best suitable bundle. Separate bundle create an extra
// request to load... But it's a bit cleaner of a mental model.
// Stuffing modules in the best suitable bundle removes the extra
// bundle that needs to be loaded, but it isn't obviously clear
// which bundle a common module will end in.
//
const createCommonBundle = false;

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
  const shardRepository = buildShardRepository(shardTree, mainBundle);
  const rootShards = buildRootShards(shardRepository, mainBundle);

  //
  // Currently we stuff all common modules either in "common-main" or in "main"
  // depending on whether or not we should create a separate "common" bundle.
  // In the future the plan is to create a separate "common" bundle for dynamically
  // loaded bundles.
  //
  normalizeCommonModules(createCommonBundle ? "common-main" : "main", rootShards.map(shard => shard.name), shardRepository, shardTree.stats);

  const dynamicShards = rootShards
    .map(shardInfo => buildDynamicShards(shardInfo, shardRepository, context))
    .filter(Boolean);

  dynamicShards
    .map(r => r.shard)
    .forEach(shard => shardRepository.setShard(shard));

  const updatedContext = dynamicShards
    .map(r => r.modules)
    .reduce((ctx, modules) => ctx.setCache(modules.reduce((acc, mod) => (acc[mod.id] = mod, acc), ctx.getCache())), context);

  rootShards
    .filter(shard => !shard.dynamic)
    .map(shard => buildStaticShardLoader(shard, shardRepository))
    .filter(Boolean)
    .forEach(shard => shardRepository.setShard(shard));

  // Rebuild the context with the current shards.
  return shardRepository
    .getAllShards()
    .filter(shard => shard.modules.length || shard.content)
    .reduce((ctx, shard) => ctx.setBundle(shard.toBundle()), updatedContext);
}

function buildDynamicShards(shardInfo, shardRepository, context) {
  const modules = getDynamicShards(shardInfo.name, shardRepository).reduce((accumulator, dynamicShard) => {
    return dynamicShard.entries.reduce((acc, entry) => {
      const mod = context.getModules(entry);
      const id = getHash(mod.id);
      const loadOrder = buildShardLoadOrder(dynamicShard.name, shardRepository)
        .map(o => shardRepository.getShard(o))
        .map(shard => `"./${path.basename(dynamicShard.dest)}"`);

      const updateModules = context
        .getModules(dynamicShard.references)
        .map(parent => parent.configure({
          deps: parent.deps.map(dep => (dep.id === mod.id ? { name: mod.name, id: id, deps: [] } : dep))
        }));

      // Here we are swapping the ID of dynamic modules with the ID of the
      // module that will load things up.
      return acc.concat(updateModules, {
        id: id,
        name: mod.name,
        source: `module.exports = require("${dynamicBundleLoader.id}")([${loadOrder}]).then(function() { return require("${mod.name}"); });`,
        deps: [dynamicBundleLoader, mod]
      });
    }, accumulator);
  }, []);

  if (modules.length) {
    modules.push(dynamicBundleLoader);

    return {
      shard: shardRepository.getShard(shardInfo.name).addModules(modules.map(mod => mod.id)),
      modules: modules
    };
  }
}

function buildStaticShardLoader(shardInfo, shardRepository) {
  const shard = shardRepository.getShard(shardInfo.name);
  const dest = shard.dest && typeof shard.dest === "string" ? shard.dest : null;

  if (!dest || !shard.modules.length) {
    return;
  }

  const dirname = path.dirname(dest);
  const filename = "loader-" + path.basename(dest);

  const shardPaths = shardRepository
    .getShard(shardInfo.loadOrder)
    .filter(shard => shard.modules.length || shard.content)
    .map(shard => shard.dest)
    .filter(shardPath => shardPath && typeof shardPath === "string")
    .map(shardPath => `"./${path.relative(dirname, shardPath)}"`);

  return {
    name: filename,
    content: `(function(){\n${staticLoader}\n;load([${shardPaths}]);\n})();`,
    dest: path.join(dirname, filename)
  };
}

function normalizeCommonModules(targetShardName, sourceShardNames, shardRepository, moduleStats) {
  const shardLoadOrder = buildShardLoadOrder(sourceShardNames, shardRepository);
  const commonShardInfo = buildCommonShard(shardLoadOrder, shardRepository, moduleStats);

  shardRepository.setShard(shardRepository.getShard(targetShardName).addModules(commonShardInfo.commonModules));

  Object
    .keys(commonShardInfo.shardMap)
    .forEach(shardName => {
      const shard = shardRepository.getShard(shardName);
      const modules = shard.modules.filter(moduleId => !commonShardInfo.shardMap[shardName].modules[moduleId]);
      shardRepository.setShard(shard.setModules(modules));
    });
}

function buildShardLoadOrder(shardNames, shardRepository) {
  var visited = {}, loadOrder = [], shardList = [].concat(shardNames);
  var parent, shard, shardName;

  for (var shardIndex = 0; shardList.length > shardIndex; shardIndex++) {
    parent = shardList[shardIndex];
    shard = shardRepository.getShard(shardRepository.getShard(parent).children);
    shardList = shardList.concat(shard.filter(child => !child.dynamic).map(child => child.name));
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

function buildCommonShard(shardNames, shardRepository, moduleStats) {
  var result = {
    commonModules: [],
    shardMap: {}
  };

  Object
    .keys(moduleStats)
    .filter(moduleId => Object.keys(moduleStats[moduleId].shards).length > 1)
    .forEach(moduleId => {
      const shardsWithDuplicates = shardNames.filter(shardName => moduleStats[moduleId].shards[shardName]);
      var owner = shardsWithDuplicates.find(shardName => shardRepository.getShard(shardName).entries.indexOf(moduleId) !== -1);

      if (!owner) {
        if (createCommonBundle || shardsWithDuplicates.every((shardName) => shardRepository.getShard(shardName).dynamic)) {
          result.commonModules.push(moduleId);
        }
        else {
          owner = shardsWithDuplicates[0];
        }
      }

      shardsWithDuplicates
        .filter(shardName => owner !== shardName)
        .forEach(shardName => {
          if (!result.shardMap[shardName]) {
            result.shardMap[shardName] = { modules: {} };
          }

          result.shardMap[shardName].modules[moduleId] = true;
        });
    });

  return result;
}

function getDynamicShards(shardNames, shardRepository) {
  var shardList = [].concat(shardNames), dynamicShards = [];
  var parent, children;

  for (var shardIndex = 0; shardList.length > shardIndex; shardIndex++) {
    parent = shardList[shardIndex];
    children = shardRepository.getShard(shardRepository.getShard(parent).children);
    shardList = shardList.concat(children.filter(child => !child.dynamic).map(child => child.name));
    dynamicShards = dynamicShards.concat(children.filter(child => child.dynamic));
  }

  return dynamicShards;
}

function getDirname(filepath) {
  return filepath && typeof filepath === "string" ? path.dirname(filepath) : null;
}

function updateDynamicShardDest(shard, rootDir) {
  // Implicit dynamic bundles dont have a valid dest since the split
  // occurs because of a dynamically loaded module rather than a split
  // rule in which you specify a destination.
  return shard.dynamic && shard.implicit ? shard.setDest(path.join(rootDir, shard.dest)) : shard;
}

function buildShardRepository(shardTree, mainBundle) {
  const rootDir = getDirname(mainBundle.dest);

  return Object
    .keys(shardTree.nodes)
    .map(shardName => updateDynamicShardDest(shardTree.nodes[shardName], rootDir))
    .reduce((repository, shard) => (repository.setShard(shard), repository), createShardRepository());
}

function buildRootShards(shardRepository, mainBundle) {
  const rootShards = shardRepository
    .getAllShards()
    .filter(shard => shard.dynamic)
    .concat(shardRepository.getShard(mainBundle.name))
    .map(shard => shard.merge({ loadOrder: buildShardLoadOrder(shard.name, shardRepository) }));

    /*
  rootShards
    .filter(shard => typeof shard.dest === "string")
    .forEach(shard => {
      ["dynamic", "common"].forEach((type) => {
        const dest = shard.dest;
        const dirname = path.dirname(dest);
        const filename = type + "-" + path.basename(dest);
        const name = type + "-" + path.basename(dest);

        shardRepository.setShard({ name: name, dest: path.join(dirname, filename) });
        shard.loadOrder.unshift(name);
        shard.shards[type] = name;
      });
    });
    */

  return rootShards;
}

function createBundlerSplitter(options) {
  var splitters = []
    .concat(options)
    .map(normalizeOptions)
    .map(createSplitter);

  function bundleSplitterRun(bundler, context) {
    return splitContext(bundler, context, splitters);
  }

  return {
    prebundle: bundleSplitterRun
  };
}

module.exports = createBundlerSplitter;
