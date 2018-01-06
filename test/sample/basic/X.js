/*eslint no-console: ["off"]*/
var Y = require("./Y");
require("./aa");

function X() {
  console.log("Say X");
  this._y = new Y();
}

module.exports = new X();
