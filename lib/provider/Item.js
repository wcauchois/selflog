
export default class Item {
  constructor(options) {
    this.date = options.date;
    this.domain = options.domain;
    this.props = options.props || {};
  }

  json() {
    return {
      domain: this.domain,
      props: this.props
    };
  }
}

