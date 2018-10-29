const winston = require('winston');

class globalData {
  constructor() {
    this.data = {};
  }

  set(key, value) {
    if (!this.data[key] || this.data.key !== value) {
      winston.info({
        key,
        value
      });
    }
    this.data[key] = value;
  }

  get(key) {
    return this.data[key];
  }
}

module.exports = new globalData();