/*eslint quotes: ["off"]*/

import { expect } from "chai";
import BitBundler from "bit-bundler";
import loggers from "bit-bundler/loggers";
import bundleSplitter from "../../index";

describe("BitBundler test suite", function() {
  var createBundler, bitbundler;

  beforeEach(function() {
    createBundler = (config) => bitbundler = new BitBundler(Object.assign({ log: { stream: loggers.through() } }, config || {}));
  });

  describe("When spitting bundles", function() {
    beforeEach(function() {
      createBundler({
        loader: ["bit-loader-builtins"],
        bundler: [
          bundleSplitter([
            // { name: "test/dist/X.js", match: { fileName: "X.js" }},
            { name: "test/dist/c.js", match: { fileName: "c.js" }},
            { name: "test/dist/W.js", match: { fileName: "w.js" }},
            { name: "test/dist/Y.js", match: { fileName: "Y.js" }},
            { name: "test/dist/Z.js", match: { fileName: "z.js" }},
            { name: "test/dist/vendor.js", match: { path: /\/node_modules\// } }
          ])
        ]
      });
    });

    it("then the bundler is an instance of Bundler", function() {
      expect(bitbundler).to.be.an.instanceof(BitBundler);
    });

    describe("and bundling a module with a couple of dependencies", function() {
      var result;

      before(function() {
        return bitbundler.bundle({src: ["test/sample/a.js", "test/sample/c.js"], dest: "test/dist/main.js"}).then(function(ctx) {
          result = ctx;
        });
      });

      it("then the result has one root module", function() {
        expect(result.shards["main"].modules).to.have.lengthOf(2);
      });

      it("then the main bundle has a module with fileName a.js", function() {
        expect(result.getModules(result.shards["main"].modules)[0].fileName).to.be.equal("a.js");
      });

      it("then the main bundle has a module with fileName b.js", function() {
        expect(result.getModules(result.shards["main"].modules)[1].fileName).to.be.equal("b.js");
      });

      it("then result contains the correct bundle content", function() {
        expect(trimResult(result.shards["main"].content)).to.be.equal(`require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){const b = require("./b");console.log("a", b());},{"./b":3}],3:[function(require,module,exports){module.exports = function() {  return "b";};},{}]},{},[1])`);
      });

      it("then splitter created a shard for 'test/dist/c.js'", function() {
        expect(result.shards).to.have.property("test/dist/c.js");
      });

      it("then splitter created a shard for 'test/dist/c.js' with the correct bundle result", function() {
        expect(trimResult(result.shards["test/dist/c.js"].content)).to.be.equal(`require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({2:[function(require,module,exports){require("./w");module.exports = require("./Y");},{"./Y":7,"./w":9}]},{},[2])`);
      });

      it("then splitter created a shard for 'test/dist/W.js'", function() {
        expect(result.shards).to.have.property("test/dist/W.js");
      });

      it("then splitter created a shard for 'test/dist/W.js' with the correct bundle result", function() {
        expect(trimResult(result.shards["test/dist/W.js"].content)).to.be.equal(`require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({9:[function(require,module,exports){module.exports = require("./X");const path = require("path");},{"./X":8,"path":5}]},{},[9])`);
      });

      it("then splitter created a shard for 'test/dist/Y.js'", function() {
        expect(result.shards).to.have.property("test/dist/Y.js");
      });

      it("then splitter created a shard for 'test/dist/Y.js' with the correct bundle result", function() {
        expect(trimResult(result.shards["test/dist/Y.js"].content)).to.be.equal(`require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({7:[function(require,module,exports){/*eslint no-console: ["off"]*/const path = require("path");const z = require("./z");const X = require("./X");function Y() {  console.log(X, typeof X);  console.log("Say Y");  z().potatoes();}module.exports = Y;},{"./X":8,"./z":4,"path":5}],8:[function(require,module,exports){/*eslint no-console: ["off"]*/var Y = require("./Y");function X() {  console.log("Say X");  this._y = new Y();}module.exports = new X();},{"./Y":7}]},{},[7])`);
      });

      it("then splitter created a shard for 'test/dist/Z.js'", function() {
        expect(result.shards).to.have.property("test/dist/Z.js");
      });

      it("then splitter created a shard for 'test/dist/Z.js' with the correct bundle result", function() {
        expect(trimResult(result.shards["test/dist/Z.js"].content)).to.be.equal(`require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({4:[function(require,module,exports){/*eslint no-console: ["off"]*/module.exports = function() {  return {    roast: "this",    potatoes: function() {      console.log("Say potatoes");    }  };};},{}]},{},[4])`);
      });
    });
  });
});

function trimResult(data) {
  return data
    .toString()
    .replace(/\n/g, "")
    .replace(/\/\/# sourceMappingURL=.*/, "");
}
