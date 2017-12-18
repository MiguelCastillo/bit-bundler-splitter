/*eslint no-console: ["off"]*/
const path = require("path");
const z = require("./z");
const X = require("./X");

function Y() {
  console.log(X, typeof X);
  console.log("Say Y");
  z().potatoes();
}

module.exports = Y;
