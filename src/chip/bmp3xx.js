const { BusUtil } = require('@johntalton/and-other-delights');

const { genericChip } = require('./generic.js');
const { Bmp3Fifo } = require('./fifo');

/**
 *
 **/
class bmp3xx extends genericChip {
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

  static calibration(bus) {
    console.log('bmp3xx calibration');
    return BusUtil.readBlock(bus, [[0x31, 21]]).then(buffer => {
      const nvm_par_T1 = buffer.readUInt16LE(0);
      const nvm_par_T2 = buffer.readUInt16LE(2);
      const nvm_par_T3 = buffer.readInt8(4);

      const nvm_par_P1 = buffer.readInt16LE(5);
      const nvm_par_P2 = buffer.readInt16LE(7);
      const nvm_par_P3 = buffer.readInt8(9);
      const nvm_par_P4 = buffer.readInt8(10);
      const nvm_par_P5 = buffer.readUInt16LE(11);
      const nvm_par_P6 = buffer.readUInt16LE(13);
      const nvm_par_P7 = buffer.readInt8(15);
      const nvm_par_P8 = buffer.readInt8(16);
      const nvm_par_P9 = buffer.readInt16LE(17);
      const nvm_par_P10 = buffer.readInt8(19);
      const nvm_par_P11 = buffer.readInt8(20);

      const par_T1 = nvm_par_T1 / Math.pow(2, -8);
      const par_T2 = nvm_par_T2 / Math.pow(2, 30);
      const par_T3 = nvm_par_T3 / Math.pow(2, 48);

      const par_P1 = (nvm_par_P1 - Math.pow(2, 14)) / Math.pow(2, 20);
      const par_P2 = (nvm_par_P2 - Math.pow(2, 14)) / Math.pow(2, 29);
      const par_P3 = nvm_par_P3 / Math.pow(2, 32);
      const par_P4 = nvm_par_P4 / Math.pow(2, 37);
      const par_P5 = nvm_par_P5 / Math.pow(2, -3);
      const par_P6 = nvm_par_P6 / Math.pow(2, 6);
      const par_P7 = nvm_par_P7 / Math.pow(2, 8);
      const par_P8 = nvm_par_P8 / Math.pow(2, 15);
      const par_P9 = nvm_par_P9 / Math.pow(2, 48);
      const par_P10 = nvm_par_P10 / Math.pow(2, 48);
      const par_P11 = nvm_par_P11 / Math.pow(2, 65);

      const T = [par_T1, par_T2, par_T3];
      const P = [par_P1, par_P2, par_P3, par_P4, par_P5, par_P6, par_P7, par_P8, par_P9, par_P10, par_P11];

      return {
        T: T, P: P,
        H: [], G: []
      };
    });
  }

}

module.exports = { bmp3xx };

