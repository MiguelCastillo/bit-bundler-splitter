const Rule = require("roolio");

module.exports = function createMatcher(matches) {
  matches = matches || { name: /^\w+/ };

  if (typeof matches === "function") {
    return matches;
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
