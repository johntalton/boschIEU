const { bmp3xx } = require('./bmp3xx.js');

/**
 *
 **/
class bmp388 extends bmp3xx {
  static get name() { return 'bmp388'; }
  static get chipId() { return 0x50; }
}

module.exports = { bmp388 };
