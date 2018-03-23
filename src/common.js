"use strict";

const Converter = require('./converter.js');

/**
 * Bosch Integrated Environmental Unit
 * bmp280 / bme280 / bme680
 */
class Common {
  static id(bus, chip){
    return bus.read(chip.REG_ID).then(buffer => {
      // console.log(buffer);
      return buffer.readInt8(0);
    });
  }

  static calibration(bus, chip) {
    const block = chip.CALIBRATION_BLOCK.map(item => {
      console.log('fixup', item);
      if(Array.isArray(item)) {
        if(item.length !== 2) { return [item[0], 1]; }
        return item;
      }
      return [item, 1];
    });
    const totalLength = block.reduce((out, [reg, len]) => out += len, 0);

    return Promise.all(block.map(([reg, len]) => {
      return bus.read(reg, len);
    }))
    .then(all => {
      const calibuf = Buffer.concat(all, totalLength);
      return Common.calibrationFromBuffer(calibuf);
    });
  }

  static calibrationFromBuffer(buffer) {
    switch(buffer.length) { // todo test for chip.calibrationMap() or supports?
      case 24:
      case 32:
        return Common.classicCalibrationFromBuffer(buffer);
        break;
      case 44:
        return Common.newCalibrationFromBuffer(buffer);
        break;
     default:
       throw Error('unknown calibration length: ' + buffer.length);
    }
  }

  static classicCalibrationFromBuffer(buffer) {
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

    if(buffer.length === 24) {
      return {
        T: T, P: P, H: [], G: []
      };
    }

    // free from previous read after blank byte
    const dig_H1 = buffer.readUInt8(25)

    const dig_H2 = buffer.readInt16LE(0);
    const dig_H3 = buffer.readUInt8(2);

    const e4 = buffer.readUInt8(3);
    const e5 = buffer.readUInt8(4);
    const e6 = buffer.readUInt8(5);

    const dig_H4 = (e4 << 4) | (e5 & 0b1111);
    const dig_H5 = (e6 << 4)| (e5 >> 4);

    const dig_H6 = buffer.readInt8(6);

    const H = [dig_H1, dig_H2, dig_H3, dig_H4, dig_H5, dig_H6];

    return {
      P: P,
      T: T,
      H: H,
      G: []
    };
  }

  static newCalibrationFromBuffer(buffer) {
    const t1 = buffer.readUInt16LE(33);
    const t2 = buffer.readInt16LE(1);
    const t3 = buffer.readInt8(3);

    const T = [t1, t2, t3];

    const p1 = buffer.readUInt16LE(5);
    const p2 = buffer.readInt16LE(7);
    const p3 = buffer.readInt8(9);
    const p4 = buffer.readUInt16LE(11);
    const p5 = buffer.readUInt16LE(13);
    const p6 = buffer.readInt8(16);
    const p7 = buffer.readInt8(15);
    const p8 = buffer.readInt16LE(19);
    const p9 = buffer.readInt16LE(21);
    const p10 = buffer.readInt8(23);

    const P = [p1, p2, p3, p4, p5, p6, p7, p8, p9, p10];

    const h1 = buffer.readUInt16LE(26); // TODO
    const h2 = buffer.readUInt16BE(25); // TODO
    const h3 = buffer.readInt8(28);
    const h4 = buffer.readInt8(29);
    const h5 = buffer.readInt8(30);
    const h6 = buffer.readUInt8(31);
    const h7 = buffer.readInt8(32);

    const H = [h1, h2, h3, h4, h5, h6, h7];

    const g1 = buffer.readInt8(37);
    const g2 = buffer.readInt16LE(35);
    const g3 = buffer.readInt8(38);

    const G = [g1, g2, g3];

    return { P: P, T: T, H: H, G: G };
  }

  static reset(bus, chip){
    return bus.write(chip.REG_RESET, chip.RESET_MAGIC);
  }

  static status(bus, chip) {
    return bus.read(chip.REG_STATUS).then(buffer => {
      const status = buffer.readUInt8(0);
      console.log('status raw', buffer);
      return Converter.fromStatus(status);
    });
  }

  static config(bus, chip) {
    return bus.read(chip.REG_CONFIG).then(buffer => {
      const config = buffer.readUInt8(0);
      return Converter.fromConfig(config);
    });
  }


  static controlMeasurment(bus, chip) {
    return bus.read(chip.REG_CTRL_MEAS).then(buffer => {
      const control = buffer.readUInt8(0);
      console.log('ctrlM raw', buffer);
      return Converter.fromControlMeasurment(control);
    });
  }

  static controlHumidity(bus, chip) {
    if(!chip.supportsHumidity) { throw Error('chip does not support humidity'); } // todo better return
    return bus.read(chip.REG_CTRL_HUM).then(buffer => {
      const control = buffer.readUInt8(0);
      return Converter.fromControlHumidity(control)
    });
  }

  static controlGas(bus, chip) {
    return bus.read(chip.REG_CTRL_GAS).then(buffer => {
      const control = buffer.readUInt8(0);
    });
  }



  static setProfile(bus, chip, profile) {
    // console.log(profile);
    const controlM = Converter.ctrlMeasFromSamplingMode(profile.oversampling_p, profile.oversampling_t, profile.mode);
    const controlH = Converter.ctrlHumiFromSampling(profile.oversampling_h);
    const config = Converter.configFromTimingFilter(profile.standby_time, profile.filter_coefficient);

    // console.log(controlM, controlH, config);
    const first = chip.supportsHumidity ? bus.write(chip.REG_CTRL_HUM, controlH) : Promise.resolve();

    return first
      .then(bus.write(chip.REG_CONFIG, config))
      .then(bus.write(chip.REG_CTRL_MEAS, controlM));
  }

  static profile(bus, chip) {
    return Promise.all([
      Common.controlMeasurment(bus, chip),
      Common.controlHumidity(bus, chip),
      Common.config(bus, chip)
    ]).then(([ctrlM, ctrlH, cfg]) => {
      // console.log(ctrlM, ctrlH, cfg);
      const [osrs_p, osrs_t, mode] = ctrlM;
      const [osrs_h] = ctrlH
      const [sb, filter, spi3en] = cfg;
      return {
        mode: mode,
        oversampling_p: osrs_p,
        oversampling_t: osrs_t,
        oversampling_h: osrs_h,
        filter_coefficient: filter,
        standby_time: sb
      }
    });
  }

  static measurment(bus, chip, press, temp, humi) {
    let length = 0;
    let reg;
    if(chip.supportsPressure){ if(length === 0) { reg = chip.REG_PRESS; } length += 3; }
    if(chip.supportsTempature){ if(length === 0) { reg = chip.REG_TEMP; } length += 3; }
    if(chip.supportsHumidity){ if(length === 0) { reg = chip.REG_HUMI; } length += 2; }

    if(length === 0) { return; }
    if(reg === undefined){ return; }

    return bus.read(reg, length).then(buffer => {
      let adcP, adcT, adcH;

      if(chip.supportsPressure) {
         const msbP = buffer.readUInt8(0);
         const lsbP = buffer.readUInt8(1);
         const xlsbP = buffer.readUInt8(2);
         adcP = Converter.reconstruct20bit(msbP, lsbP, xlsbP);
      }

      if(chip.supportsTempature) {
        const msbT = buffer.readUInt8(3);
        const lsbT = buffer.readUInt8(4);
        const xlsbT = buffer.readUInt8(5);
        adcT = Converter.reconstruct20bit(msbT, lsbT, xlsbT);
      }

      if(chip.supportsHumidity) {
        const msbH = buffer.readUInt8(6);
        const lsbH = buffer.readUInt8(7);
        adcH = msbH << 8 | lsbH;
      }

      // console.log('measurment', adcP, adcT, adcH);
      return { adcP: adcP, adcT: adcT, adcH: adcH };
    });
  }
}

module.exports = Common;
