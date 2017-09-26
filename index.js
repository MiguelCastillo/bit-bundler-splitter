var Rule = require("roolio");
var utils = require("belty");

function createMatcher(matches) {
  matches = matches || { name: /^\w+/ };

  var rules = Object
    .keys(matches)
    .reduce((rules, matchName) => {
      rules[matchName] = (new Rule()).addMatcher(matches[matchName]);
      return rules;
    }, {});

  return function matcher(mod) {
    return !rules || Object.keys(rules).some(function(rule) {
      return rules[rule].match(mod[rule]);
    });
  };
}

function hasMatches(context, matcher) {
  return Object.keys(context.cache)
    .map(key => context.cache[key])
    .some(matcher);
}

function getModules(context, matcher) {
  var result = [], processed = {}, i = 0, currentModule;
  var stack = context.modules.slice(0);

  while (stack.length !== i) {
    currentModule = stack[i++];

    if (!processed.hasOwnProperty(currentModule.id)) {
      currentModule = context.cache[currentModule.id];
      processed[currentModule.id] = currentModule;

      if (matcher(currentModule)) {
        result.push(currentModule);
      }
      else {
        stack.push.apply(stack, currentModule.deps);
      }
    }
  }

  return result;
}

function splitBundle(options) {
  var splitters = []
    .concat(options)
    .map(buildOptions)
    .map(makeSplitter);

  function buildOptions(options) {
    options = options || {};
    options.name = options.name || options.dest;
    return options;
  }

  function makeSplitter(options) {
    var matcher = createMatcher(options.match);

    return function splitter(bundler, context) {
      if (!hasMatches(context, matcher)) {
        return context;
      }

      var browserPackOptions = utils.merge({ standalone: false }, options.options);
      var splitModules = getModules(context, matcher);
      var splitExclude = splitModules.map((mod) => mod.id);
      var splitContext = context.configure({ modules: splitModules });

      return Promise
        .resolve(bundler.bundle(splitContext, { browserPack: browserPackOptions }))
        .then((bundle) => context.addExclude(splitExclude).setShard(options.name, bundle, options.dest));
    };
  }

  function splitBundleDelegate(bundler, context) {
    return splitters
      .map(splitter => (context) => splitter(bundler, context))
      .reduce((deferred, current) => deferred.then(current), Promise.resolve(context));
  }

  return {
    prebundle: splitBundleDelegate
  };
}

module.exports = splitBundle;
