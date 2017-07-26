
const chipLib = require('./chip.js');
const Chip = chipLib.chip;
const chips = chipLib.chips;

const Profiles = require('./profiles.js');

/**
 * Bosch Integrated Environmental Unit
 * bmp280 / bme280
 */
class BoschIEU {
  static sensor(bus) {
    return Promise.resolve(new BoschSensor(bus));
  }
}

/**
 *
 */
class BoschSensor {
  constructor(bus) {
    this._bus = bus;
    this._calibration;
    this._id;
    this._chip = chips.unknown;
  }

  get chip(){ return this._chip; }

  id(){
    return Common.id(this._bus, this._chip)
      .then(id => {
        this._id = id;
        this._chip = Chip.fromId(this._id);
        // console.log('caching chip id: ', id, this._chip);
        return id;
      });
  }

  valid(){
    return this._id !== undefined && this._id !== 0;
  }

  calibrated() {
    return this.valid() && this._calibration !== undefined;
  }

  version() { return Common.version(this._bus, this._chip); }
  calibration() {
    return Common.calibration(this._bus, this._chip)
      .then(cali => {
        // console.log(cali);
        this._calibration = cali;
        return cali;
      });
  }

  reset() { return Common.reset(this._bus, this._chip); }
  force() { return Common.force(this._bus, this._chip); }
  sleep() { return Common.sleep(this._bus, this._chip); }

  config() { return Common.config(this._bus, this._chip); }
  controlMeasurment() { return Common.controlMeasurment(this._bus, this._chip); }
  controlHumidity() { return Common.controlHumidity(this._bus, this._chip); }
  status() { return Common.status(this._bus, this._chip); }
  profile() { return Common.profile(this._bus, this._chip); }
  setProfile(profile) { return Common.setProfile(this._bus, this._chip, profile); }

  get _p9() {
    return this._calibration.P;
  }

  get _t3() {
    return this._calibration.T;
  }

  get _h6() {
    return this._calibration.H;
  }


  measurement() {
    return Common.measurment(this._bus, this._chip, true, true, true).then(result => {
      return [
        Converter.compensateP(this._chip, result.adcP, result.adcT, ...this._p9),
        Converter.compensateT(this._chip, result.adcT, ...this._t3),
        Converter.compensateH(this._chip, result.adcH, this._h6)
      ];
    });
  }

  pressure() {
    return Common.measurment(this._bus, this._chip, true, true, false).then(result => {
      return Converter.compensateP(this._chip, result.adcP, result.adcT, ...this._p9);
    });
  }

  tempature() {
    return Common.measurment(this._bus, this._chip, false, true, false).then(result => {
      return Converter.compensateT(this._chip, result.adcT, ...this._t3);
    });
  }

  humidity(){
    return Common.measurment(this._bus, this._chip, false, false, true).then(result => {
      return Converter.compensateH(this._bus, result.adcH, ...this._h6);
    });
  }
}

/**
 *
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

  static calibrationM(bus, chip) {
    return bus.read(chip.REG_CALIBRATION, 24).then(buffer => {
      // console.log(buffer);
      const dig_T1 = buffer.readUInt16LE(0);
      const dig_T2 = buffer.readInt16LE(2);
      const dig_T3 = buffer.readInt16LE(4);

      const dig_P1 = buffer.readUInt16LE(6);
      const dig_P2 = buffer.readInt16LE(8);
      const dig_P3 = buffer.readInt16LE(10);
      const dig_P4 = buffer.readInt16LE(11);
      const dig_P5 = buffer.readInt16LE(14);
      const dig_P6 = buffer.readInt16LE(16);
      const dig_P7 = buffer.readInt16LE(18);
      const dig_P8 = buffer.readInt16LE(20);
      const dig_P9 = buffer.readInt16LE(22);

      return {
        T: [dig_T1, dig_T2, dig_T3],
        P: [dig_P1, dig_P2, dig_P3, dig_P4, dig_P5, dig_P6, dig_P7, dig_P8, dig_P9]
      };
    });
  }

  static calibrationH(bus, chip) {
    return Promise.resolve({ H: [] });

    if(!chip.supportsHumidity){ return Promise.resolve({ H: [] });};

    return bus.read(chip.REG_CALIBRATION_HUMIDITY, 9).then(buffer => {
      // console.log(buffer);

      const dig_H1 = buffer.readInt8(0);
      const dig_H2 = buffer.readInt16LE(1);
      const dig_H3 = buffer.readInt8(3);
      const dig_H4 = buffer.readInt16LE(4);
      const dig_H5 = buffer.readInt16LE(6);
      const dig_H6 = buffer.readInt8(8);

      return {
        H: [dig_H1, dig_H2, dig_H3, dig_H4, dig_H5, dig_H6]
      }
    });
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
    const control = Converter.ctrlMeasFromSamplingMode(profile.oversampling_p, profile.oversampling_t, profile.mode);
    const config = Converter.configFromTimingFilter(profile.standby_time, profile.filter_coefficient);
    // console.log(control, config);
    return bus.write(chip.REG_CONFIG, config)
      .then(bus.write(chip.REG_CTRL, control));
  }

  static sleep(bus, chip) {
    return Common.setProfile(bus, chip, Profiles.chipProfile(Profiles.profile('SLEEP'), chip));
  }

  static force(bus, chip, press, temp) {
    if(press === undefined) { press = true; }
    if(temp === undefined) { temp = true; }

    const osrs_p = press ? chip.OVERSAMPLE_X1 : chip.OVERSAMPLE_OFF;
    const osrs_t = temp ? chip.OVERSAMPLE_X1 : chip.OVERSAMPLE_OFF

    const control = Converter.ctrlMeasFromSamplingMode(osrs_p, osrs_t, chip.MODE_FORCED);
    return bus.write(chip.REG_CTRL, control);
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
        adcH = buffer.readUInt16LE(6);
      }

      return { adcP: adcP, adcT: adcT, adcH: adcH };
    });
  }
}

/**
 *
 */
class Converter {
  static reconstruct20bit(msb, lsb, xlsb) {
    return  msb << 12 | lsb << 4 | xlsb >> 4;
  }

  static configFromTimingFilter(timing, filter) {
    const spi3wire = 0; // TODO 
    return (timing << 5) | (filter << 2) | spi3wire;
  }

  static ctrlMeasFromSamplingMode(osrs_p, osrs_t, mode){
    return (osrs_t << 5) | (osrs_p << 2) | mode;
  }

  static fromConfig(config) {
    const t_sb = (config >> 5) & 0b111;
    const filter = (config >> 2) & 0b111;
    const spi3w_en = config & 0b01 === 0b01;
    return [t_sb, filter, spi3w_en];
  }

  static fromControlMeasurment(control) {
    const osrs_t = (control >> 5) & 0b111;
    const osrs_p = (control >> 2) & 0b111;
    const mode = control & 0b11;
    return [osrs_p, osrs_t, mode];
  }

  static fromControlHumidity(control) {
    const osrs_h = control & 0b111;
    return [osrs_h];
  }

  static fromStatus(status) {
    const measuring = (status & 0b1000) === 0b1000;
    const im_update = (status & 0b0001) === 0b0001;
    return [measuring, im_update];
  }


  static compensateP(chip, P, T, dig_P1, dig_P2, dig_P3, dig_P4, dig_P5, dig_P6, dig_P7, dig_P8, dig_P9){
    if(P === chip.SKIPPED_SAMPLE_VALUE) { return { skip: true }; }
    if(dig_P1 === undefined){ return { undef: 'p1' }; }
    if(dig_P2 === undefined){ return { undef: 'p2' }; }
    if(dig_P3 === undefined){ return { undef: 'p3' }; }
    if(dig_P4 === undefined){ return { undef: 'p4' }; }
    if(dig_P5 === undefined){ return { undef: 'p5' }; }
    if(dig_P6 === undefined){ return { undef: 'p6' }; }
    if(dig_P7 === undefined){ return { undef: 'p7' }; }
    if(dig_P8 === undefined){ return { undef: 'p8' }; }
    if(dig_P9 === undefined){ return { undef: 'p9' }; }

    const var1 = T / 2.0 - 64000.0;

    if(var1 == 0){ return 0; }

    const var2 = var1 * var1 * dig_P6 / 32768.0;
    const var3 = var2 + var1 * dig_P5 * 2.0;
    const var4 = (var3 / 4.0) + (dig_P4 * 65536.0);

    const var5 = (dig_P3 * var1 * var1 / 524288.0 + dig_P2) / 524288.0;
    const var6 = (1.0 + var1 / 32768.0) * dig_P1;

    const p1 = 1048576.0 - P;
    const p2 = (p1 - (var4 / 4096.0)) * 6250.0 / var6;
    const p3 = dig_P9 * p2 * p2 / 2147483648.0;
    const p4 = p2 * dig_P8 / 32768.0;
    const p5 = p2 + (p3 + p4 + dig_P7) / 16.0;

    //console.log(dig_P9, p2 * p2);
    //console.log(var1, var2, var3, var4, var5, p1, p2, p3, p4, p5, p5/256.0);

    return p5 / 256.0;
  }

  static compensateT(chip, T, dig_T1, dig_T2, dig_T3){
    // console.log(T, dig_T1, dig_T2, dig_T3);
    if(T === chip.SKIPPED_SAMPLE_VALUE) { return { skip: true }; }
    if(dig_T1 === undefined){ return { undef: 't1' }; }
    if(dig_T2 === undefined){ return { undef: 't2' }; }
    if(dig_T3 === undefined){ return { undef: 't3' }; }

    const var1f = (T/16384.0 - dig_T1/1024.0) * dig_T2;
    const var2f = (T/131072.0 - dig_T1/8192.0) * (T/131072.0 - dig_T1/8192.0) * dig_T3;
    const finef = var1f + var2f;
    const cf = finef / 5120.0;

    const var1i = (((T >> 3) - (dig_T1 << 1)) * dig_T2) >> 11;
    const var2i = ( (( ((T >> 4) - dig_T1) * ((T >> 4) - dig_T1) ) >> 12) * dig_T3 ) >> 14;
    const finei = var1i + var2i;
    const ci = ((finei * 5 + 128) >> 8) / 100;

    // console.log(var1f, var2f, finef, cf);
    // console.log(var1i, var2i, finei, ci);

    return {
      cf: cf,
      finef: finef,
      ci: ci,
      finei: finei
    };
  }

  static compensateH(chip, H, dig_H1, dig_H2) {
    return;
  }

  static altitudeFromPressure(seaLevelPa, P){
    if(P === undefined){ return; }

    // https://en.wikipedia.org/wiki/Pressure_altitude
    const millibars = P;
    const ft = (1 - Math.pow( P / seaLevelPa), 0.190284) * 145366.45;

    const foo =  44330 * (1.0 * Math.pow(P / 100 / seaLevelPa, 0.1903));

    // 44330.0 * (1.0 - pow(pressure / sealevel_pa, (1.0/5.255)))

    console.log('alt:', ft, foo);

    return foo;
  }

  static ctof(c) {
    if(c === undefined){ return undefined; }
    return c * (9/5.0) + 32;
  }

  static trim(f, p) {
    if(f === undefined){ return undefined; }
    return Math.round(f * 10000) / 10000;
  }

}

module.exports.BoschIEU = BoschIEU;
module.exports.Converter = Converter;
