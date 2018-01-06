const RenderIt = require('./renderer/render-it');
const mainRecursive = require('./main');
const log2console = require('log2console');

class Other extends RenderIt {
  constructor() {
    super();
  }

  render() {
    super.render();
    log2console('render:other');
    log2console('test recursive', mainRecursive);
  }
}

module.exports = Other;
