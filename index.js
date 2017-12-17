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
  const shardTree = shardTreeBuilder.buildTree("main", mainBundle.entries);
  const shardDependencyOrder = buildDependencyOrder(shardRepository, [shardTree.name]);

  //
  // .reduce((accumulator, items) => accumulator.concat(items), [])
  //   .reduce(incrementCounter(item => item.id), {});
  //
  // commonModules = Object
  //   .keys(commonModules)
  //   .filter(key => commonModules[key] !== 1)
  //   .reduce((accumulator, key) => (accumulator[key] = moduleCache[key], accumulator), {});
  //

  const updatedContext = shardRepository
    .getShardByName(shardDependencyOrder)
    .map(shard => shard.toBundle())
    .filter(Boolean)
    .reduce((context, bundle) => context.setBundle(bundle), context);

  return {
    context: updatedContext,
    shardDependencyOrder: shardDependencyOrder
  };
}

function buildAutoLoader(splitData) {
  const context = splitData.context;
  const shardDependencyOrder = splitData.shardDependencyOrder.map(dep => `"${dep}"`);
  const mainBundle = context.getBundle("main");
  const entryPath = mainBundle.dest ? path.join(path.dirname(mainBundle.dest), "entry.js") : false;
  const loadEntries = loaderJS + `;loadJS([${shardDependencyOrder}])`;

  return context.setBundle({ name: "__loader", content: loadEntries, dest: entryPath });
}

function buildDependencyOrder(shardRepository, shardList) {
  var processed = {}, shardDependencyOrder = [];
  var shardName;

  for (var childrenIndex = 0; shardList.length > childrenIndex; childrenIndex++) {
    shardList = shardList.concat([shardList[childrenIndex]].reduce((accumulator, parent) => {
      var children = shardRepository.getShardByName(parent).children;

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

/*
function incrementCounter(keyMapper) {
  return function(accumulator, item) {
    var key = keyMapper(item);
    if (!accumulator[key]) {
      accumulator[key] = 0;
    }

    accumulator[key]++;
    return accumulator;
  };
}

function toMap(items, keyMapper) {
  return items.reduce((accumulator, item) => (accumulator[keyMapper(item)] = item, accumulator), {});
}
*/

module.exports = createBundlerSplitter;
