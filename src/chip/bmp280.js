"use strict";

const { genericChip, enumMap } = require('./generic.js');
const { Util } = require('./util.js');

class bmp280 extends genericChip {
  static get name() { return 'bmp280'; }
  static get chip_id() { return  0x58; } // todo [56, 57, 58]

  static get features() {
    return {
      pressure: true,
      tempature: true,
      humidity: false,
      gas: false,
      normalMode: true
    }
  }

  static calibration(bus) {
    return Util.readblock(bus, [[0x88, 25]]).then(buffer => {
      const dig_T1 = buffer.readUInt16LE(0);
      const dig_T2 = buffer.readInt16LE(2);
      const dig_T3 = buffer.readInt16LE(4);

      const dig_P1 = buffer.readUInt16LE(6);
      const dig_P2 = buffer.readInt16LE(8);
      const dig_P3 = buffer.readInt16LE(10);
      const dig_P4 = buffer.readInt16LE(12);
      const dig_P5 = buffer.readInt16LE(14);
      const dig_P6 = buffer.readInt16LE(16);
      const dig_P7 = buffer.readInt16LE(18);
      const dig_P8 = buffer.readInt16LE(20);
      const dig_P9 = buffer.readInt16LE(22);

      const T = [dig_T1, dig_T2, dig_T3];
      const P = [dig_P1, dig_P2, dig_P3, dig_P4, dig_P5, dig_P6, dig_P7, dig_P8, dig_P9];

      return {
        T: T, P: P,
        H: [], G: []
      };
    });
  }

  static profile(bus) {
    return Util.readblock(bus, [[0xF3, 3]]).then(buffer => {
      const status =    buffer.readUInt8(0);
      const ctrl_meas = buffer.readUInt8(1);
      const config =    buffer.readUInt8(2);

      const measuring = Util.mapbits(status, 3, 1) === 1;
      const updating = Util.mapbits(status, 0, 1) === 1;

      const osrs_t = Util.mapbits(ctrl_meas, 7, 3);
      const osrs_p = Util.mapbits(ctrl_meas, 4, 3);
      const mode = Util.mapbits(ctrl_meas, 1, 2);

      const t_sb = Util.mapbits(config, 7, 3);
      const filter = Util.mapbits(config, 4, 3);
      const spi_3w_en = Util.mapbits(config, 0, 1) === 1;

      return {
        mode: Util.enumify(mode, enumMap.modes),
        oversampling_p: Util.enumify(osrs_p, enumMap.oversamples),
        oversampling_t: Util.enumify(osrs_t, enumMap.oversamples),
        filter_coefficient: Util.enumify(filter, enumMap.filters),
        standby_time: Util.enumify(t_sb, enumMap.standbys),
        spi: {
          enable3w: spi_3w_en
        },
        ready: {
          ready: !measuring,
          measuring: measuring,
          updating: updating
        }
      };
    });
  }

  static measurment(bus, calibration) {
    return Util.readblock(bus, [[0xF7, 6]]).then(buffer => {
      return {};
    });
  }

  static ready(bus) {
    return Util.readblock(bus, [0xF3]).then(buffer => {
      const status = buffer.readUInt8(0);
      const measuring = Util.mapbits(status, 3, 1) === 1;
      const updating = Util.mapbits(status, 0, 1) === 1;
      return {
        ready: !measuring,
        measuring: measuring,
        updating: updating
      };
    });
  }

  static setProfile(bus, profile) {

  }
}

module.exports.bmp280 = bmp280;

