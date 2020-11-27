const { BusUtil } = require('@johntalton/and-other-delights');

const { bmp3xx } = require('./bmp3xx.js');

/**
 *
 **/
class bmp390 extends bmp3xx {
  static get name() { return 'bmp390'; }
  static get chipId() { return 0x60; }

  static sensorTime(bus) {
    return BusUtil.readBlock(bus, [[0xC0, 3]]).then(buffer => { throw new Error('read24'); });
  }

  static profile(bus) {
    return BusUtil.readBlock(bus, [[0x15, 11]]).then(buffer => {
      return {};
    });
  }
}

module.exports = { bmp390 };
