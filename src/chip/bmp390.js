const { bmp3xx } = require('./bmp3xx.js');

/**
 *
 **/
class bmp390 extends bmp3xx {
  static get name() { return 'bmp390'; }
  static get chipId() { return 0x60; }

  static revId(bus) {
    return bus.readBlock()
      .then(block => {

      });
  }
}

module.exports = { bmp390 };
