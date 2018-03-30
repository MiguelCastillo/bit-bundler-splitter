"use strict";

const createShardTreeBuilder = require("./shard/treeBuilder");
const createShardRepository = require("./shard/repository");
const Splitter = require("./splitter");
const Shard = require("./shard/shard");
const path = require("path");
const moduleHash = require("./moduleHash");
const staticLoader = require("fs").readFileSync(path.join(__dirname, "/loaders/static.js"));
const dynamicLoader = require("fs").readFileSync(path.join(__dirname, "/loaders/dynamic.js"));

const dynamicBundleLoader = {
  id: "$dl$",
  name: "$dl$",
  source: dynamicLoader.toString(),
  deps: []
};

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
  const rootShards = getRootShards(shardRepository, mainBundle);

  normalizeCommonModules(
    shardRepository.getShard(mainBundle.name).shards["common"],
    rootShards.map(shard => shard.name),
    shardRepository,
    shardTree.stats
  );

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
    .filter(shard => !shard.isDynamic)
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
    return dynamicShard.entries
      .map(entryModuleId => context.getModules(entryModuleId))
      .reduce((acc, mod) => {
        const id = moduleHash(mod);

        const shardPaths = buildShardLoadOrder(dynamicShard.name, shardRepository)
          .map(shardName => shardRepository.getShard(shardName))
          .map(shard => `"./${path.basename(dynamicShard.dest)}"`);

        const modulesWithDynamicDeps = context
          .getModules(dynamicShard.references)
          .map(parentModule => parentModule.configure({
            deps: parentModule.deps.map(dep => (dep.id === mod.id ? { name: mod.name, id: id, deps: [] } : dep))
          }));

        // Here we are swapping the ID of dynamic modules with the ID of the
        // module that will load things up.
        return acc.concat(modulesWithDynamicDeps, {
          id: id,
          name: mod.name,
          source: `module.exports = require("${dynamicBundleLoader.id}")([${shardPaths}]).then(function() { return require("${mod.name}"); });`,
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
    shardList = shardList.concat(shard.filter(child => !child.isDynamic).map(child => child.name));
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
      const owner = shardsWithDuplicates.find(shardName => shardRepository.getShard(shardName).entries.indexOf(moduleId) !== -1);

      if (!owner) {
        result.commonModules.push(moduleId);
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
    shardList = shardList.concat(children.filter(child => !child.isDynamic).map(child => child.name));
    dynamicShards = dynamicShards.concat(children.filter(child => child.isDynamic));
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
  return shard.isDynamic && shard.isImplicit ? shard.merge({ dest: path.join(rootDir, shard.dest) }) : shard;
}

function configureLoadOrder(shard, shardRepository) {
  return shard.isDynamic || shard.isMain ? shard.merge({ loadOrder: buildShardLoadOrder(shard.name, shardRepository) }) : shard;
}

function buildShardRepository(shardTree, mainBundle) {
  const shardRepository = Object
    .keys(shardTree.nodes)
    .map(shardName => shardTree.nodes[shardName])
    .reduce((repository, shard) => (repository.setShard(shard), repository), createShardRepository());

  const rootDir = getDirname(mainBundle.dest);

  shardRepository
    .getAllShards()
    .map(shard => updateDynamicShardDest(shard, rootDir))
    .map(shard => configureLoadOrder(shard, shardRepository))
    .forEach(shard => shardRepository.setShard(shard));

  // TODO(miguel) When we add logic for having dynamic bundles
  // load their own common bundle then we can enable the lines
  // below to autogen common shards for the dynamic bundles.
  // shardRepository
  //   .getAllShards()
  //   .filter(shard => typeof shard.dest === "string" && shard.isDynamic)
  //   .concat(shardRepository.getShard(mainBundle.name))
  [shardRepository.getShard(mainBundle.name)]
    .forEach(shard => {
      ["common"].forEach((type) => {
        const dest = shard.dest;
        const dirname = path.dirname(dest);
        const filename = type + "-" + path.basename(dest);
        const name = type + "-" + path.basename(dest);

        shardRepository.setShard({
          name: name,
          dest: path.join(dirname, filename)
        });

        shardRepository.setShard(Object.assign({}, shard, {
          loadOrder: [name].concat(shard.loadOrder),
          shards: Object.assign({[type]: name}, shard.shards)
        }));
      });
    });

  return shardRepository;
}

function getRootShards(shardRepository, mainBundle) {
  return shardRepository
    .getAllShards()
    .filter(shard => shard.isDynamic)
    .concat(shardRepository.getShard(mainBundle.name));
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
