import Bitbundler from "bit-bundler";
import loggers from "bit-bundler/loggers";
import { expect } from "chai";
import bundleSplitter from "../../src/index";

describe("Dynamic bundle Test Suite", function () {
  const createBundler = (config) => new Bitbundler(Object.assign({ log: { stream: loggers.through() } }, config || {}));

  describe("When bundling a module that is dyanmically loaded", function () {
    var result;

    describe("And the bundler has no splitters", function () {
      before(function () {
        return createBundler({
          bundler: [
            bundleSplitter()
          ]
        })
          .bundle({ src: "test/sample/dynamic-import/index.js", dest: "test/dist/dynamic-import/main.js" })
          .then(r => result = r);
      });

      it("then result has 3 bundles", function () {
        expect(Object.keys(result.shards)).to.have.lengthOf(3);
      });

      it("then result has a bundle 'main'", function () {
        expect(result.shards).to.have.property("main");
      });

      it("then result has a bundle loader for bundle 'main'", function () {
        expect(result.shards).to.have.property("loader-main.js");
      });

      it("then result has a bundle for the dynamic module '3e5a64d.js'", function () {
        expect(result.shards).to.have.property("3e5a64d.js");
      });

      it("then the 'main' bundle has 6 modules", function () {
        expect(result.getModules(result.shards["main"].modules)).to.have.lengthOf(6);
      });

      it("then the 'main' bundle has the module 'index.js'", function () {
        expect(result.getModules(result.shards["main"].modules[0])).to.deep.include({ filename: "index.js" });
      });

      it("then the 'main' bundle has the module 'hello.js'", function () {
        expect(result.getModules(result.shards["main"].modules[1])).to.deep.include({ filename: "hello.js" });
      });

      it("then the 'main' bundle has the module 'splita.js'", function () {
        expect(result.getModules(result.shards["main"].modules[2])).to.deep.include({ filename: "splita.js" });
      });

      it("then the 'main' bundle has the module 'moriarty.js'", function () {
        expect(result.getModules(result.shards["main"].modules[3])).to.deep.include({ filename: "moriarty.js" });
      });

      it("then the 'main' bundle has the module with id '3e5a64d.js' for loading `world`", function () {
        expect(result.getModules(result.shards["main"].modules[4])).to.deep.include({ id: "3e5a64d.js" });
      });

      it("then the 'main' bundle has the module with id '$dl$'", function () {
        expect(result.getModules(result.shards["main"].modules[5])).to.deep.include({ id: "$dl$" });
      });

      it("then the dynamic bundle '3e5a64d' has 1 module", function () {
        expect(result.getModules(result.shards["3e5a64d.js"].modules)).to.have.lengthOf(1);
      });

      it("then the dynamic bundle '3e5a64d' has the module 'world.js'", function () {
        expect(result.getModules(result.shards["3e5a64d.js"].modules[0])).to.deep.include({ filename: "world.js" });
      });
    });

    describe("And the dynamically loaded module also exists in a static bundle split", function () {
      var result;

      before(function () {
        return createBundler({
          bundler: [
            bundleSplitter([
              { name: "splita", dest: "test/dist/dynamic-import/splita.js", match: { filename: "splita.js" } }
            ])
          ]
        })
          .bundle({ src: "test/sample/dynamic-import/index.js", dest: "test/dist/dynamic-import/main.js" })
          .then(r => result = r);
      });

      it("then the result is OK", function () {
        expect(result).to.be.ok;
      });

      it("then the result has 4 bundles", function () {
        expect(Object.keys(result.shards)).to.have.lengthOf(4);
      });

      it("then result has a bundle 'main'", function () {
        expect(result.shards).to.have.property("main");
      });

      it("then the result has a bundle 'splita'", function () {
        expect(result.shards).to.have.property("splita");
      });

      it("then the result has a bundle loader for bundle 'main'", function () {
        expect(result.shards).to.have.property("loader-main.js");
      });

      it("then result has a bundle for the dynamic module '3e5a64d.js'", function () {
        expect(result.shards).to.have.property("3e5a64d.js");
      });

      it("then the 'main' bundle has 4 modules", function () {
        expect(result.getModules(result.shards["main"].modules)).to.have.lengthOf(4);
      });

      it("then the 'main' bundle has the module 'index.js'", function () {
        expect(result.getModules(result.shards["main"].modules[0])).to.deep.include({ filename: "index.js" });
      });

      it("then the 'main' bundle has the module 'hello.js'", function () {
        expect(result.getModules(result.shards["main"].modules[1])).to.deep.include({ filename: "hello.js" });
      });

      it("then the 'main' bundle has the module with id '3e5a64d.js' for loading `world`", function () {
        expect(result.getModules(result.shards["main"].modules[2])).to.deep.include({ id: "3e5a64d.js" });
      });

      it("then the 'main' bundle has the module with id '$dl$'", function () {
        expect(result.getModules(result.shards["main"].modules[3])).to.deep.include({ id: "$dl$" });
      });

      it("then the 'splita' bundle has 2 modules", function () {
        expect(result.getModules(result.shards["splita"].modules)).to.have.lengthOf(2);
      });

      it("then the 'main' bundle has the module 'splita.js'", function () {
        expect(result.getModules(result.shards["splita"].modules[0])).to.deep.include({ filename: "splita.js" });
      });

      it("then the 'splita' bundle has the module 'moriarty.js'", function () {
        expect(result.getModules(result.shards["splita"].modules[1])).to.deep.include({ filename: "moriarty.js" });
      });

      it("then the dynamic bundle '3e5a64d' has 1 module", function () {
        expect(result.getModules(result.shards["3e5a64d.js"].modules)).to.have.lengthOf(1);
      });

      it("then the dynamic bundle '3e5a64d' has the module 'world.js'", function () {
        expect(result.getModules(result.shards["3e5a64d.js"].modules[0])).to.deep.include({ filename: "world.js" });
      });
    });

    describe("And the dynamically loaded module also exists in a dynamic bundle split", function () {
      var result;

      before(function () {
        return createBundler({
          bundler: [
            bundleSplitter([
              { name: "splita", dest: "test/dist/dynamic-import/splita.js", match: { filename: "splita.js" }, dynamic: true }
            ])
          ]
        })
          .bundle({ src: "test/sample/dynamic-import/index.js", dest: "test/dist/dynamic-import/main.js" })
          .then(r => result = r);
      });

      it("then the result is OK", function () {
        expect(result).to.be.ok;
      });

      it("then the result has 4 bundles", function () {
        expect(Object.keys(result.shards)).to.have.lengthOf(4);
      });

      it("then result has a bundle 'main'", function () {
        expect(result.shards).to.have.property("main");
      });

      it("then the result has a bundle 'splita'", function () {
        expect(result.shards).to.have.property("splita");
      });

      it("then the result has a bundle loader for 'main' bundle", function () {
        expect(result.shards).to.have.property("loader-main.js");
      });

      it("then result has a bundle for the dynamic module called '3e5a64d.js'", function () {
        expect(result.shards).to.have.property("3e5a64d.js");
      });

      it("then the 'main' bundle has 6 modules", function () {
        expect(result.getModules(result.shards["main"].modules)).to.have.lengthOf(6);
      });

      it("then the 'main' bundle has the module 'index.js'", function () {
        expect(result.getModules(result.shards["main"].modules[0])).to.deep.include({ filename: "index.js" });
      });

      it("then the 'main' bundle has the module 'hello.js'", function () {
        expect(result.getModules(result.shards["main"].modules[1])).to.deep.include({ filename: "hello.js" });
      });

      it("then the 'main' bundle has the module 'moriarty.js'", function () {
        expect(result.getModules(result.shards["main"].modules[2])).to.deep.include({ filename: "moriarty.js" });
      });

      it("then the 'main' bundle has the module with id '3e5a64d.js' for loading `world`", function () {
        expect(result.getModules(result.shards["main"].modules[3])).to.deep.include({ id: "3e5a64d.js" });
      });

      it("then the 'main' bundle has the module with id '5097a30.js' for loading `splita`", function () {
        expect(result.getModules(result.shards["main"].modules[4])).to.deep.include({ id: "5097a30.js" });
      });

      it("then the 'main' bundle has the module with id '$dl$' for loading dynamic bundles", function () {
        expect(result.getModules(result.shards["main"].modules[5])).to.deep.include({ id: "$dl$" });
      });

      it("then the 'splita' bundle has 1 modules", function () {
        expect(result.getModules(result.shards["splita"].modules)).to.have.lengthOf(1);
      });

      it("then the 'splita' bundle has the module 'splita.js'", function () {
        expect(result.getModules(result.shards["splita"].modules[0])).to.deep.include({ filename: "splita.js" });
      });

      it("then the dynamic bundle '3e5a64d' has 1 module", function () {
        expect(result.getModules(result.shards["3e5a64d.js"].modules)).to.have.lengthOf(1);
      });

      it("then the dynamic bundle '3e5a64d' has the module 'world.js'", function () {
        expect(result.getModules(result.shards["3e5a64d.js"].modules[0])).to.deep.include({ filename: "world.js" });
      });
    });

    describe("And the dynamically loaded module also matches a dynamic bundle split", function () {
      var result;

      before(function () {
        return createBundler({
          bundler: [
            bundleSplitter([
              { name: "split-world", dest: "test/dist/dynamic-import/world.js", match: { filename: "world.js" }, dynamic: true }
            ])
          ]
        })
          .bundle({ src: "test/sample/dynamic-import/index.js", dest: "test/dist/dynamic-import/main.js" })
          .then(r => result = r);
      });

      it("then the result is OK", function () {
        expect(result).to.be.ok;
      });

      it("then the result has 3 bundles", function () {
        expect(Object.keys(result.shards)).to.have.lengthOf(3);
      });

      it("then result has bundle 'main'", function () {
        expect(result.shards).to.have.property("main");
      });

      it("then the result has a bundle loader for bundle 'main'", function () {
        expect(result.shards).to.have.property("loader-main.js");
      });

      it("then result has bundle 'split-world'", function () {
        expect(result.shards).to.have.property("split-world");
      });

      it("then the 'main' bundle has 6 modules", function () {
        expect(result.getModules(result.shards["main"].modules)).to.have.lengthOf(6);
      });

      it("then the 'main' bundle has the module 'index.js'", function () {
        expect(result.getModules(result.shards["main"].modules[0])).to.deep.include({ filename: "index.js" });
      });

      it("then the 'main' bundle has the module 'hello.js'", function () {
        expect(result.getModules(result.shards["main"].modules[1])).to.deep.include({ filename: "hello.js" });
      });

      it("then the 'main' bundle has the module 'splita.js'", function () {
        expect(result.getModules(result.shards["main"].modules[2])).to.deep.include({ filename: "splita.js" });
      });

      it("then the 'main' bundle has the module 'moriarty.js'", function () {
        expect(result.getModules(result.shards["main"].modules[3])).to.deep.include({ filename: "moriarty.js" });
      });

      it("then the 'main' bundle has the module with id '3e5a64d.js' for loading `world`", function () {
        expect(result.getModules(result.shards["main"].modules[4])).to.deep.include({ id: "3e5a64d.js" });
      });

      it("then the 'main' bundle has the module with id '$dl$'", function () {
        expect(result.getModules(result.shards["main"].modules[5])).to.deep.include({ id: "$dl$" });
      });

      it("then the 'split-world' bundle has 1 modules", function () {
        expect(result.getModules(result.shards["split-world"].modules)).to.have.lengthOf(1);
      });

      it("then the 'split-world' bundle has the module 'splita.js'", function () {
        expect(result.getModules(result.shards["split-world"].modules[0])).to.deep.include({ filename: "world.js" });
      });
    });
  });
});
