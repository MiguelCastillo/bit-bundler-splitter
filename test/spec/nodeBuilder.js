/*eslint quotes: ["off"]*/

import { expect } from "chai";
import nodeBuilder from "../../src/shard/nodeBuilder";
import Shard from "../../src/shard/shard";
import Splitter from "../../src/splitter";

describe("Test suite for node builder", function () {
  describe("When node builder has no splitters and no cache", function () {
    var builder, moduleCache, inputShard;

    describe("And input is a shard with no modules", function () {
      var nodeResult;

      before(function () {
        moduleCache = {};

        inputShard = new Shard({
          name: "no-module-shard"
        });

        builder = nodeBuilder(moduleCache, []);
        nodeResult = builder.buildNode(inputShard);
      });

      it("then the node has no entries", function () {
        expect(nodeResult.node.entries).to.have.lengthOf(0);
      });

      it("then the node has no modules", function () {
        expect(nodeResult.node.modules).to.have.lengthOf(0);
      });

      it("then no shards are generated", function () {
        expect(Object.keys(nodeResult.splitPoints)).to.have.lengthOf(0);
      });
    });

    describe("And input is a shard with 1 modules", function () {
      var nodeResult;

      before(function () {
        moduleCache = {};

        inputShard = new Shard({
          name: "no-module-shard"
        });

        builder = nodeBuilder(moduleCache, [{ id: "some-id" }]);
        nodeResult = builder.buildNode(inputShard);
      });

      it("then the node has no entries", function () {
        expect(nodeResult.node.entries).to.have.lengthOf(0);
      });

      it("then the node has no modules", function () {
        expect(nodeResult.node.modules).to.have.lengthOf(0);
      });

      it("then no shards are generated", function () {
        expect(Object.keys(nodeResult.splitPoints)).to.have.lengthOf(0);
      });
    });

  });

  describe("When the node builder has a cache and no splitter", function () {
    var builder, moduleCache, inputShard;

    describe("And input is a shard with no modules", function () {
      var nodeResult;

      before(function () {
        moduleCache = {
          "1-module": {
            id: "1-module",
            deps: []
          }
        };

        inputShard = new Shard({
          name: "1-module-shard"
        });

        moduleCache = {};
        builder = nodeBuilder(moduleCache, []);
        nodeResult = builder.buildNode(inputShard);
      });

      it("then the node has no entries", function () {
        expect(nodeResult.node.entries).to.have.lengthOf(0);
      });

      it("then the node has no modules", function () {
        expect(nodeResult.node.modules).to.have.lengthOf(0);
      });

      it("then no shards are generated", function () {
        expect(Object.keys(nodeResult.splitPoints)).to.have.lengthOf(0);
      });
    });

    describe("And input is a shard with 1 modules", function () {
      var nodeResult;

      before(function () {
        moduleCache = {
          "1-module": {
            id: "1-module",
            deps: []
          }
        };

        inputShard = new Shard({
          name: "1-module-shard",
          entries: ["1-module"]
        });

        builder = nodeBuilder(moduleCache, []);
        nodeResult = builder.buildNode(inputShard);
      });

      it("then the node has 1 entry", function () {
        expect(nodeResult.node.entries).to.have.lengthOf(1);
      });

      it("then the node has 1 modules", function () {
        expect(nodeResult.node.modules).to.have.lengthOf(1);
      });

      it("then no shards are generated", function () {
        expect(Object.keys(nodeResult.splitPoints)).to.have.lengthOf(0);
      });
    });

    describe("And input a shard with 1 module that has a dynamic dependency", function () {
      var nodeResult;

      before(function () {
        moduleCache = {
          "1-module": {
            id: "1-module",
            deps: [{
              id: "2-module",
              dynamic: true
            }]
          },
          "2-module": {
            id: "2-module",
            deps: []
          }
        };

        inputShard = new Shard({
          name: "1-module-shard",
          entries: ["1-module"]
        });

        builder = nodeBuilder(moduleCache, []);
        nodeResult = builder.buildNode(inputShard);
      });

      it("then the node has 1 entry", function () {
        expect(nodeResult.node.entries).to.have.lengthOf(1);
      });

      it("then the node has an entry called '1-module'", function () {
        expect(nodeResult.node.entries).to.include("1-module");
      });

      it("then the node has 1 modules", function () {
        expect(nodeResult.node.modules).to.have.lengthOf(1);
      });

      it("then the node has 1 module called '1-module'", function () {
        expect(nodeResult.node.modules).to.include("1-module");
      });

      it("then 1 shards is generated", function () {
        expect(Object.keys(nodeResult.splitPoints)).to.have.lengthOf(1);
      });

      it("then the shard is called 'b4c7ebe'", function () {
        expect(nodeResult.splitPoints).to.have.property("b4c7ebe");
      });

      it("then the shard has 1 entry", function () {
        expect(nodeResult.splitPoints["b4c7ebe"].entries).to.have.lengthOf(1);
      });

      it("then the shard has entry called '2-module'", function () {
        expect(nodeResult.splitPoints["b4c7ebe"].entries).to.include("2-module");
      });

      it("then the shard has 'dynamic' set to be true", function () {
        expect(nodeResult.splitPoints["b4c7ebe"].isDynamic).to.be.true;
      });

      it("then the shard has 'implicit' set to be true", function () {
        expect(nodeResult.splitPoints["b4c7ebe"].isImplicit).to.be.true;
      });
    });
  });

  describe("When the node builder has a cache and splitters", function () {
    var builder, moduleCache, splitters, inputShard;

    describe("And input is a shard with a dynamic dependency and a splitter that matches 1 module by its ID", function () {
      var nodeResult;

      before(function () {
        moduleCache = {
          "1-module": {
            id: "1-module",
            deps: [{
              id: "2-module",
              dynamic: true
            }, {
              id: "3-module"
            }]
          },
          "2-module": {
            id: "2-module",
            deps: []
          },
          "3-module": {
            id: "3-module",
            deps: []
          }
        };

        splitters = [
          new Splitter({
            name: "1-splitter",
            match: { id: "3-module" }
          })
        ];

        inputShard = new Shard({
          name: "1-module-shard",
          entries: ["1-module"]
        });

        builder = nodeBuilder(moduleCache, splitters);
        nodeResult = builder.buildNode(inputShard);
      });

      it("then the node has 1 entry", function () {
        expect(nodeResult.node.entries).to.have.lengthOf(1);
      });

      it("then the node has an entry called '1-module'", function () {
        expect(nodeResult.node.modules).to.include("1-module");
      });

      it("then the node has 1 modules", function () {
        expect(nodeResult.node.modules).to.have.lengthOf(1);
      });

      it("then the node has 1 module called '1-module'", function () {
        expect(nodeResult.node.modules).to.include("1-module");
      });

      it("then 2 shards are generated", function () {
        expect(Object.keys(nodeResult.splitPoints)).to.have.lengthOf(2);
      });

      it("then a shard has name 'b4c7ebe'", function () {
        expect(nodeResult.splitPoints).to.have.property("b4c7ebe");
      });

      it("then shard 'b4c7ebe' has 1 entry", function () {
        expect(nodeResult.splitPoints["b4c7ebe"].entries).to.have.lengthOf(1);
      });

      it("then shard 'b4c7ebe' has an entry of '2-module'", function () {
        expect(nodeResult.splitPoints["b4c7ebe"].entries).to.include("2-module");
      });

      it("then shard 'b4c7ebe' has dynamic set to be true", function () {
        expect(nodeResult.splitPoints["b4c7ebe"].isDynamic).to.be.true;
      });

      it("then shard 'b4c7ebe' has implicit set to be true", function () {
        expect(nodeResult.splitPoints["b4c7ebe"].isImplicit).to.be.true;
      });

      it("then a shard has name '1-splitter'", function () {
        expect(nodeResult.splitPoints).to.have.property("1-splitter");
      });

      it("then shard '1-splitter' has 1 entry", function () {
        expect(nodeResult.splitPoints["1-splitter"].entries).to.have.lengthOf(1);
      });

      it("then shard '1-splitter' has an entry called '3-modules'", function () {
        expect(nodeResult.splitPoints["1-splitter"].entries).to.include("3-module");
      });

      it("then shard '1-splitter' has dynamic set to be false", function () {
        expect(nodeResult.splitPoints["1-splitter"].isDynamic).to.be.false;
      });

      it("then shard '1-splitter' has implicit set to be false", function () {
        expect(nodeResult.splitPoints["1-splitter"].isImplicit).to.be.false;
      });
    });

    describe("And input is a shard with a dynamic dependency and a splitter that matches the dynamic module", function () {
      var nodeResult;

      before(function () {
        moduleCache = {
          "1-module": {
            id: "1-module",
            deps: [{
              id: "2-module",
              dynamic: true
            }, {
              id: "3-module"
            }]
          },
          "2-module": {
            id: "2-module",
            deps: [{
              id: "4-module"
            }]
          },
          "3-module": {
            id: "3-module",
            deps: []
          },
          "4-module": {
            id: "4-module",
            deps: []
          }
        };

        splitters = [
          new Splitter({
            name: "1-splitter",
            match: { id: "2-module" }
          })
        ];

        inputShard = new Shard({
          name: "1-module-shard",
          entries: ["1-module"]
        });

        builder = nodeBuilder(moduleCache, splitters);
        nodeResult = builder.buildNode(inputShard);
      });

      it("then the node has 1 entry", function () {
        expect(nodeResult.node.entries).to.have.lengthOf(1);
      });

      it("then the node has an entry called '1-module'", function () {
        expect(nodeResult.node.modules).to.include("1-module");
      });

      it("then the node has 1 modules", function () {
        expect(nodeResult.node.modules).to.have.lengthOf(2);
      });

      it("then the node has 1 module called '1-module'", function () {
        expect(nodeResult.node.modules).to.include("1-module");
      });

      it("then 1 shards are generated", function () {
        expect(Object.keys(nodeResult.splitPoints)).to.have.lengthOf(1);
      });

      it("then a shard has name '1-splitter'", function () {
        expect(nodeResult.splitPoints).to.have.property("1-splitter");
      });

      it("then shard '1-splitter' has 1 entry", function () {
        expect(nodeResult.splitPoints["1-splitter"].entries).to.have.lengthOf(1);
      });

      it("then shard '1-splitter' has an entry of '2-module'", function () {
        expect(nodeResult.splitPoints["1-splitter"].entries).to.include("2-module");
      });

      it("then shard '1-splitter' has NO modules", function () {
        expect(nodeResult.splitPoints["1-splitter"].modules).to.have.lengthOf(0);
      });

      it("then shard '1-splitter' has dynamic set to be false", function () {
        expect(nodeResult.splitPoints["1-splitter"].isDynamic).to.be.false;
      });

      it("then shard '1-splitter' has implicit set to be false", function () {
        expect(nodeResult.splitPoints["1-splitter"].isImplicit).to.be.false;
      });
    });
  });
});
