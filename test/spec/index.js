/*eslint quotes: ["off"]*/

import { expect } from "chai";
import BitBundler from "bit-bundler";
import loggers from "bit-bundler/loggers";
import bundleSplitter from "../../index";

describe("BitBundler test suite", function() {
  const createBundler = (config) => new BitBundler(Object.assign({ log: { stream: loggers.through() } }, config || {}));

  describe("When spitting bundles with shared modules", function() {
    var bitbundler;

    before(function() {
      bitbundler = createBundler({
        loader: ["bit-loader-builtins"],
        bundler: [
          bundleSplitter([
            // { name: "test/dist/X.js", match: { fileName: "X.js" }},
            { name: "test/dist/basic/c.js", match: { fileName: "c.js" }},
            { name: "test/dist/basic/W.js", match: { fileName: "w.js" }},
            { name: "test/dist/basic/Y.js", match: { fileName: "Y.js" }},
            { name: "test/dist/basic/deep/Z.js", match: { fileName: "z.js" }},
            { name: "test/dist/basic/deep/vendor.js", match: { path: /\/node_modules\// } }
          ])
        ]
      });
    });

    it("then the bundler is an instance of Bundler", function() {
      expect(bitbundler).to.be.an.instanceof(BitBundler);
    });

    describe("and bundling two entry modules", function() {
      var result;

      before(function() {
        return bitbundler.bundle({src: ["test/sample/basic/a.js", "test/sample/basic/c.js"], dest: "test/dist/basic/main.js"}).then(function(ctx) {
          result = ctx;
        });
      });

      it("then the result has two modules", function() {
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

      it("then splitter created a shard for 'test/dist/basic/c.js'", function() {
        expect(result.shards).to.have.property("test/dist/basic/c.js");
      });

      it("then splitter created a shard for 'test/dist/basic/c.js' with the correct bundle result", function() {
        expect(trimResult(result.shards["test/dist/basic/c.js"].content)).to.be.equal(`require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({2:[function(require,module,exports){require("./w");module.exports = require("./Y");},{"./Y":7,"./w":9}]},{},[2])`);
      });

      it("then splitter created a shard for 'test/dist/basic/W.js'", function() {
        expect(result.shards).to.have.property("test/dist/basic/W.js");
      });

      it("then splitter created a shard for 'test/dist/basic/W.js' with the correct bundle result", function() {
        expect(trimResult(result.shards["test/dist/basic/W.js"].content)).to.be.equal(`require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({9:[function(require,module,exports){module.exports = require("./X");const path = require("path");},{"./X":8,"path":5}]},{},[9])`);
      });

      it("then splitter created a shard for 'test/dist/basic/Y.js'", function() {
        expect(result.shards).to.have.property("test/dist/basic/Y.js");
      });

      it("then splitter created a shard for 'test/dist/basic/Y.js' with the correct bundle result", function() {
        expect(trimResult(result.shards["test/dist/basic/Y.js"].content)).to.be.equal(`require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({7:[function(require,module,exports){/*eslint no-console: ["off"]*/const path = require("path");const z = require("./z");const X = require("./X");function Y() {  console.log(X, typeof X);  console.log("Say Y");  z().potatoes();}module.exports = Y;},{"./X":8,"./z":4,"path":5}],8:[function(require,module,exports){/*eslint no-console: ["off"]*/var Y = require("./Y");function X() {  console.log("Say X");  this._y = new Y();}module.exports = new X();},{"./Y":7}]},{},[7])`);
      });

      it("then splitter created a shard for 'test/dist/basic/deep/Z.js'", function() {
        expect(result.shards).to.have.property("test/dist/basic/deep/Z.js");
      });

      it("then splitter created a shard for 'test/dist/basic/deep/Z.js' with the correct bundle result", function() {
        expect(trimResult(result.shards["test/dist/basic/deep/Z.js"].content)).to.be.equal(`require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({4:[function(require,module,exports){/*eslint no-console: ["off"]*/module.exports = function() {  return {    roast: "this",    potatoes: function() {      console.log("Say potatoes");    }  };};},{}]},{},[4])`);
      });
    });
  });

  describe("When creating a bundle where the root module has a circular reference", function() {
    var bitbundler;

    before(function() {
      bitbundler = createBundler({
        loader: ["bit-loader-builtins"],
        bundler: [
          bundleSplitter([
            { name: "vendor", dest: "test/dist/circular-reference/deep/vendor.js", match: { path: /\/node_modules\// } },
            { name: "renderer", dest: "test/dist/circular-reference/renderer.js", match: { path: /\/renderer\// } },
            { name: "other", dest: "test/dist/circular-reference/other.js", match: { fileName: "other.js" } }
          ])
        ]
      });
    });

    it("then the bundler is an instance of Bundler", function() {
      expect(bitbundler).to.be.an.instanceof(BitBundler);
    });

    describe("and bundling two entry modules", function() {
      var result;

      before(function() {
        return bitbundler
          .bundle({
            src: ["test/sample/circular-reference/main.js"],
            dest: "test/dist/circular-reference/main.js"
          })
          .then((ctx) => result = ctx);
      });

      it("then splitter created a shard for 'main'", function() {
        expect(result.shards).to.have.property("main");
      });

      it("then splitter created a shard for 'main' with the correct bundle result", function() {
        expect(trimResult(result.shards["main"].content)).to.be.equal(`require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){import Other from './other';import log2console from 'log2console';class Main {  constructor() {    this._other = new Other();  }  render() {    log2console('render:main');    this._other.render();  }}(new Main()).render();},{"./other":2,"log2console":3}]},{},[1])`);
      });

      it("then the result has one module", function() {
        expect(result.shards["main"].modules).to.have.lengthOf(1);
      });

      it("then splitter created a shard for 'other'", function() {
        expect(result.shards).to.have.property("other");
      });

      it("then splitter created a shard for 'other' with the correct bundle result", function() {
        expect(trimResult(result.shards["other"].content)).to.be.equal(`require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({2:[function(require,module,exports){import RenderIt from './renderer/render-it';import mainRecursive from './main';import log2console from 'log2console';class Other extends RenderIt {  constructor() {    super();  }  render() {    super.render();    log2console('render:other');    log2console('test recursive', mainRecursive);  }}export default Other;},{"./main":1,"./renderer/render-it":8,"log2console":3}]},{},[2])`);
      });

      it("then splitter created a shard for 'renderer'", function() {
        expect(result.shards).to.have.property("renderer");
      });

      it("then splitter created a shard for 'renderer' with the correct bundle result", function() {
        expect(trimResult(result.shards["renderer"].content)).to.be.equal(`require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({8:[function(require,module,exports){import log2console from 'log2console';class RenderIt {  constructor() {  }  render() {    log2console('base render-it!');  }}export default RenderIt;},{"log2console":3}]},{},[8])`);
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
