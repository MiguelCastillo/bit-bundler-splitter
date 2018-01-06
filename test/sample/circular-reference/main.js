const Other = require('./other');
const log2console = require('log2console');

class Main {
  constructor() {
    this._other = new Other();
  }

  render() {
    log2console('render:main');
    this._other.render();
  }
}

(new Main()).render();
