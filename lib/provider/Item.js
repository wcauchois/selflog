
export default class Item {
  constructor(options) {
    this.date = options.date;
    this.domain = options.domain;
    this.props = options.props || {};
  }
}

