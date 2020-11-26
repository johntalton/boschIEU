const { BusUtil } = require('@johntalton/and-other-delights');

// const { Compensate } = require('./compensate.js');
const { genericChip } = require('./generic.js');
const { Bmp3Fifo } = require('./fifo');

/**
 *
 **/
class bmp390 extends genericChip {
  static get name() { return 'bmp390'; }
  static get chipId() { return 0x50; }

  static get features() {
    return {
      pressure: true,
      tempature: true,
      humidity: false,
      gas: false,
      normalMode: true,
      interrupt: true,
      fifo: true,
      time: true
    };
  }

  static id(bus) { return BusUtil.readBlock(bus, [0x00]).then(buffer => buffer.readInt8(0)); }
  static reset(bus) { return bus.write(0x7E, Buffer.from([0xB6])); }

  static get fifo() { return Bmp3Fifo; }

  static sensorTime(bus) {
    return BusUtil.readBlock(bus, [[0xC0, 3]]).then(buffer => { throw new Error('read24'); });
  }

}

module.exports = { bmp390 };
