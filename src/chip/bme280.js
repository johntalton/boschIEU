"use strict";

const { genericChip, enumMap, Compensate } = require('./generic.js');
const { Util } = require('./util.js');

class bme280 extends genericChip {
  static get name() { return 'bme280'; }
  static get chip_id() { return 0x60; }

  static get features() {
    return {
      pressure: true,
      tempature: true,
      humidity: true,
      gas: false,
      normalMode: true
    }
  }

  static calibration(bus) {
    return Util.readblock(bus, [[0x88, 25], [0xE1, 7]]).then(buffer => {
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

      const dig_H1 = buffer.readUInt8(24);
      // boundry packed
      const dig_H2 = buffer.readInt16LE(25);
      const dig_H3 = buffer.readUInt8(27);
      const e4 = buffer.readUInt8(28);
      const e5 = buffer.readUInt8(29);
      const e6 = buffer.readUInt8(30);
      const dig_H6 = buffer.readInt8(31);

      const dig_H4 = (e4 << 4) | (e5 & 0b1111);
      const dig_H5 = (e6 << 4)| (e5 >> 4);

      const H = [dig_H1, dig_H2, dig_H3, dig_H4, dig_H5, dig_H6];

      return { T: T, P: P, H: H, G: [] };
    });
  }

  static profile(bus) {
    return Util.readblock(bus, [[0xF2, 4]]).then(buffer => {
      const ctrl_hum =  buffer.readUInt8(0);
      const status =    buffer.readUInt8(1);
      const ctrl_meas = buffer.readUInt8(2);
      const config =    buffer.readUInt8(3);

      const osrs_h = Util.mapbits(ctrl_hum, 2, 3);

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
        oversampling_h: Util.enumify(osrs_h, enumMap.oversamples),
        filter_coefficient: Util.enumify(filter, enumMap.filters),
        standby_time: Util.enumify(t_sb, enumMap.standbys_hires),

        spi: {
          enable3w: spi_3w_en,
        },
        ready: {
          ready: !measuring,
          measuring: measuring,
          updating: updating
        }
      };
    });
  }

  static setProfile(bus, profile) {
    const mode = Util.deenumify(profile.mode, enumMap.modes);
    const os_p = Util.deenumify(profile.oversampling_p, enumMap.oversamples);
    const os_t = Util.deenumify(profile.oversampling_t, enumMap.oversamples);
    const os_h = Util.deenumify(profile.oversampling_h, enumMap.oversamples);
    const sb_t = Util.deenumify(profile.standby_time, enumMap.standbys_hires);
    const filter = Util.deenumify(profile.filter_coefficient, enumMap.filters);
    const en3w = profile.spi.enable3w;

    const ctrl_hum = Util.packbits([[2, 3]], os_h);
    const ctrl_meas = Util.packbits([[7, 3], [4, 3], [1, 2]], os_t, os_p, mode);
    const config = Util.packbits([[7, 3], [4, 3], [0, 1]], sb_t, filter, en3w);

    return Promise.all([
      bus.write(0xF2, ctrl_hum),
      bus.write(0xF4, ctrl_meas),
      bus.write(0xF5, config)
    ]);
  }

  static measurment(bus, calibration) {
    return Util.readblock(bus, [[0xF7, 8]]).then(buffer => {
      const pres_msb = buffer.readUInt8(0);
      const pres_lsb = buffer.readUInt8(1);
      const pres_xlsb = buffer.readUInt8(2);
      const adcP = Util.reconstruct20bit(pres_msb, pres_lsb, pres_xlsb);

      const temp_msb = buffer.readUInt8(3);
      const temp_lsb = buffer.readUInt8(4);
      const temp_xlsb = buffer.readUInt8(5);
      const adcT = Util.reconstruct20bit(temp_msb, temp_lsb, temp_xlsb);

      const adcH = buffer.readUInt16BE(6);

      const P = (bme280.skip_value === adcP) ? false : adcP;
      const T = (bme280.skip_value === adcT) ? false : adcT;
      const H = (bme280.skip_value === adcH) ? false : adcH;

      return Compensate.from({ adcP: P, adcT: T, adcH: H, type: '2xy' }, calibration);
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

  static estimateMeasurementWait(profile) {
    return { totalWaitMs: 0 };
  }
}

module.exports.bme280 = bme280;

