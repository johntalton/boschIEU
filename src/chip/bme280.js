
const {
  BusUtil,
  BitUtil,
  NameValueUtil
} = require('@johntalton/and-other-delights');

const { genericChip, enumMap, Compensate } = require('./generic.js');

// Chip ID
const CHIP_ID = 0x60;

// Registers
const PRESS_MSB = 0xF7;
const CONFIG = 0xF5;
const CTRL_MEAS = 0xF4;
const STATUS = 0xF3;
const CTRL_HUM = 0xF2;
const CALIB26 = 0xE1;
//const CHIIP_ID = 0xE0;
//const RESET = 0xD0;
const CALIB00 = 0x88;

// Registers
const REGISTER = {
  PRESS_MSB,
  CONFIG,
  CTRL_MEAS,
  STATUS,
  CTRL_HUM,
  CALIB26,
  CALIB00
};

// Calibration
const CALIBRATION_TP_START_ADDRESS = REGISTER.CALIB00;
const CALIBRATION_H_START_ADDRESS = REGISTER.CALIB26;
const CALIBRATION_TP_LENGTH = 25;
const CALIBRATION_H_LENGTH = 7;
const CALIBRATION_BLOCK = [
  [CALIBRATION_TP_START_ADDRESS, CALIBRATION_TP_LENGTH],
  [CALIBRATION_H_START_ADDRESS, CALIBRATION_H_LENGTH]
];

// Profile
const PROFILE_START_ADDRESS = REGISTER.CTRL_HUM;
const PROFILE_LENGTH = 4;
const PROFILE_BLOCK = [[PROFILE_START_ADDRESS, PROFILE_LENGTH]];

// Measurement
const MEASUREMENT_START_ADDRESS = REGISTER.PRESS_MSB;
const MEASUREMENT_LENGTH = 8;
const MEASUREMENT_BLOCK = [[MEASUREMENT_START_ADDRESS, MEASUREMENT_LENGTH]];

// Status
const STATUS_START_ADDRESS = REGISTER.STATUS;
const STATUS_LENGTH = 1;
const STATUS_BLOCK = [[STATUS_START_ADDRESS, STATUS_LENGTH]];

//
class bme280 extends genericChip {
  static get name() { return 'bme280'; }
  static get chipId() { return CHIP_ID; }

  static get features() {
    return {
      pressure: true,
      tempature: true,
      humidity: true,
      gas: false,
      normalMode: true,
      interrupt: false,
      fifo: false,
      time: false
    };
  }

  static calibration(bus) {
    return BusUtil.readblock(bus, CALIBRATION_BLOCK).then(buffer => {
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
    return BusUtil.readblock(bus, PROFILE_BLOCK).then(buffer => {
      const ctrl_hum = buffer.readUInt8(0);
      const status = buffer.readUInt8(1);
      const ctrl_meas = buffer.readUInt8(2);
      const config = buffer.readUInt8(3);

      const osrs_h = BitUtil.mapbits(ctrl_hum, 2, 3);

      const measuring = BitUtil.mapbits(status, 3, 1) === 1;
      const updating = BitUtil.mapbits(status, 0, 1) === 1;

      const osrs_t = BitUtil.mapbits(ctrl_meas, 7, 3);
      const osrs_p = BitUtil.mapbits(ctrl_meas, 4, 3);
      const mode = BitUtil.mapbits(ctrl_meas, 1, 2);

      const t_sb = BitUtil.mapbits(config, 7, 3);
      const filter = BitUtil.mapbits(config, 4, 3);
      const spi_3w_en = BitUtil.mapbits(config, 0, 1) === 1;

      return {
        mode: NameValueUtil.toName(mode, enumMap.modes),
        oversampling_p: NameValueUtil.toName(osrs_p, enumMap.oversamples),
        oversampling_t: NameValueUtil.toName(osrs_t, enumMap.oversamples),
        oversampling_h: NameValueUtil.toName(osrs_h, enumMap.oversamples),
        filter_coefficient: NameValueUtil.toName(filter, enumMap.filters),
        standby_time: NameValueUtil.toName(t_sb, enumMap.standbys_hires),

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
    const mode = NameValueUtil.toValue(profile.mode, enumMap.modes);
    const os_p = NameValueUtil.toValue(profile.oversampling_p, enumMap.oversamples);
    const os_t = NameValueUtil.toValue(profile.oversampling_t, enumMap.oversamples);
    const os_h = NameValueUtil.toValue(profile.oversampling_h, enumMap.oversamples);
    const sb_t = NameValueUtil.toValue(profile.standby_time, enumMap.standbys_hires);
    const filter = NameValueUtil.toValue(profile.filter_coefficient, enumMap.filters);
    const en3w = profile.spi !== undefined ? profile.spi.enable3w : false;

    const ctrl_hum = BitUtil.packbits([[2, 3]], os_h);
    const ctrl_meas = BitUtil.packbits([[7, 3], [4, 3], [1, 2]], os_t, os_p, mode);
    const config = BitUtil.packbits([[7, 3], [4, 3], [0, 1]], sb_t, filter, en3w);

    return Promise.all([
      bus.write(REGISTER.CTRL_HUM, ctrl_hum),
      bus.write(REGISTER.CTRL_MEAS, ctrl_meas),
      bus.write(REGISTER.CONFIG, config)
    ]);
  }

  static patchProfile(bus, patch) {
    throw Error('patch profile impl');
  }

  static measurement(bus, calibration) {
    return BusUtil.readblock(bus, MEASUREMENT_BLOCK).then(buffer => {
      const pres_msb = buffer.readUInt8(0);
      const pres_lsb = buffer.readUInt8(1);
      const pres_xlsb = buffer.readUInt8(2);
      const adcP = BitUtil.reconstruct20bit(pres_msb, pres_lsb, pres_xlsb);

      const temp_msb = buffer.readUInt8(3);
      const temp_lsb = buffer.readUInt8(4);
      const temp_xlsb = buffer.readUInt8(5);
      const adcT = BitUtil.reconstruct20bit(temp_msb, temp_lsb, temp_xlsb);

      const adcH = buffer.readUInt16BE(6);

      const P = (bme280.skip_value === adcP) ? false : adcP;
      const T = (bme280.skip_value === adcT) ? false : adcT;
      const H = (bme280.skip_value === adcH) ? false : adcH;

      const base = { adcP: P, adcT: T, adcH: H, type: '2xy' };

      return Compensate.from(base, calibration);
    });
  }

  static ready(bus) {
    return BusUtil.readblock(bus, STATUS_BLOCK).then(buffer => {
      const status = buffer.readUInt8(0);
      const measuring = BitUtil.mapbits(status, 3, 1) === 1;
      const updating = BitUtil.mapbits(status, 0, 1) === 1;
      return {
        ready: !measuring,
        measuring: measuring,
        updating: updating
      };
    });
  }

  static estimateMeasurementWait(profile) {
    // TODO
    return { totalWaitMs: 0 };
  }
}

module.exports.bme280 = bme280;

