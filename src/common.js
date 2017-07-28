const Converter = require('./converter.js');

/**
 * Bosch Integrated Environmental Unit
 * bmp280 / bme280
 */
class Common {
  static id(bus, chip){
    return bus.read(chip.REG_ID).then(buffer => {
      // console.log(buffer);
      return buffer.readInt8(0);
    });
  }

  static version(bus, chip){
    return bus.read(chip.REG_VERSION).then(buffer => {
      return buffer.readUInt8(0);
    });
  }

  static calibration(bus, chip) {
    return Promise.all([
      Common.calibrationM(bus, chip),
      Common.calibrationH(bus, chip)]
    ).then(([M, H]) => {
      return { P: M.P, T: M.T, H: H.H };
    });
  }

  static calibration(bus, chip) {
    return bus.read(chip.REG_CALIBRATION, 26).then(buffer => {
      // console.log(buffer);

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

      if(!chip.supportsHumidity){
        return {
          P: P,
          T: T,
          H: []
        };
      }

      // free from previous read after blank byte
      const dig_H1 = buffer.readUInt8(25)

      return bus.read(chip.REG_CALIBRATION_HUMIDITY, 7).then(buffer => {
        // console.log(buffer);

        const dig_H2 = buffer.readInt16LE(0);
        const dig_H3 = buffer.readUInt8(2);

        const e4 = buffer.readUInt8(3);
        const e5 = buffer.readUInt8(4);
        const e6 = buffer.readUInt8(5);

        const dig_H4 = (e4 << 4) | (e5 & 0b1111);
        const dig_H5 = (e6 << 4)| (e5 >> 4);

        const dig_H6 = buffer.readInt8(6);

        return {
          P: P,
          T: T,
          H: [dig_H1, dig_H2, dig_H3, dig_H4, dig_H5, dig_H6]
        }
      });
    });
  }

  static calibrationH(bus, chip) {

  }

  static reset(bus, chip){
    return bus.write(chip.REG_RESET, chip.RESET_MAGIC);
  }

  static status(bus, chip) {
    return bus.read(chip.REG_STATUS).then(buffer => {
      const status = buffer.readUInt8(0);
      return Converter.fromStatus(status);
    });
  }

  static controlMeasurment(bus, chip) {
    return bus.read(chip.REG_CTRL).then(buffer => {
      const control = buffer.readUInt8(0);
      // console.log('ctrlM raw', buffer);
      return Converter.fromControlMeasurment(control);
    });
  }

  static controlHumidity(bus, chip) {
    return bus.read(chip.REG_CTRL_HUM).then(buffer => {
      const control = buffer.readUInt8(0);
      return Converter.fromControlHumidity(control)
    });
  }

  static config(bus, chip) {
    return bus.read(chip.REG_CONFIG).then(buffer => {
      const config = buffer.readUInt8(0);
      return Converter.fromConfig(config);
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
      .then(bus.write(chip.REG_CTRL, controlM));
  }

  static sleep(bus, chip) {
    return Common.setProfile(bus, chip, Profiles.chipProfile(Profiles.profile('SLEEP'), chip));
  }

  static force(bus, chip, press, temp, humi) {
    return Common.setProfile(bus, chip, Profiles.chipProfile(Profiles.profile('FORCED'), chip));
/*
    if(press === undefined) { press = true; }
    if(temp === undefined) { temp = true; }

    const osrs_p = press ? chip.OVERSAMPLE_X1 : chip.OVERSAMPLE_OFF;
    const osrs_t = temp ? chip.OVERSAMPLE_X1 : chip.OVERSAMPLE_OFF;
    const osrs_h = humi ? chip.OVERSAMPLE_X1 : chip.OVERSAMPLE_OFF;

    const control = Converter.ctrlMeasFromSamplingMode(osrs_p, osrs_t, chip.MODE_FORCED);
    return bus.write(chip.REG_CTRL, control);
*/
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
