const { bmp3xx } = require('./bmp3xx.js');

/**
 *
 **/
class bmp390 extends bmp3xx {
  static get name() { return 'bmp390'; }
  static get chipId() { return 0x60; }

  static revId(bus) {
    return bus.readBlock(bus, [[0x00, 1]])
      .then(buffer => {
        const revId = buffer.readUInt8(0);
        // split between major and minor
        const major = revId >> 4;
        const minor = revId & 0xF0;
        return { revId, major, minor };
      });
  }
}

module.exports = { bmp390 };
