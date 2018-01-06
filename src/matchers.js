const Rule = require("roolio");

module.exports = function createMatcher(matches) {
  matches = matches || { name: /^\w+/ };

  if (typeof matches === "function") {
    return matches;
  }

  if (matches.constructor !== Object) {
    matches = [].concat(matches).reduce((accumulator, match) => {
      var target;

      if (typeof match === "string") {
        target = "path";
        match = new RegExp(match);
      }
      else if (match instanceof RegExp) {
        target = "path";
      };

      if (target) {
        if (!accumulator[target]) {
          accumulator[target] = [];
        }

        accumulator[target].push(match);
      }
      
      return accumulator;
    }, {});
  }

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
};
