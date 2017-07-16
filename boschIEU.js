
function _writeMask(value){ return value & ~0x80; }

/**
 * Bosch Integrated Environmental Unit
 * bmp280 / bmp280
 * SPI
 */
class BoschIEU {
  static sensor(name, bus) {
    return Promise.resolve(new BoschSensor(name, bus));
  }
}


/**
 *
 */
class BoschSensor {
  constructor(name, bus) {
    this._name = name;
    this._bus = bus;
    this._calibration_data;
    this._id;
    this._chip = UnknownChip;
  }

  get chip(){ return this._chip; }

  id(){
    return Common.id(this._bus, this._chip)
      .then(id => {
        // console.log('caching chip id: ', id);
        this._id = id;
        this._chip = Chip.fromId(this._id);
        return id;
      });
  }

  valid(){
    return true;
  }

  version() { return Common.version(this._bus, this._chip); }
  calibration() {
    return Common.calibration(this._bus, this._chip)
      .then(cali => {
        // console.log(cali);
        this._calibration_data = cali;
        return cali;
      });
  }

  reset() { return Common.reset(this._bus, this._chip); }
  force() { return Common.force(this._bus, this._chip); }
  sleep() { return Common.sleep(this._bus, this._chip); }

  config() { return Common.config(this._bus, this._chip); }
  control() { return Common.control(this._bus, this._chip); }
  status() { return Common.status(this._bus, this._chip); }
  profile() { return Common.profile(this._bus, this._chip); }
  setProfile(profile) { return Common.setProfile(this._bus, this._chip, profile); }

  get _p9() {
    return this._calibration_data.slice(3, 9);
  }

  get _t3() {
    return this._calibration_data.slice(0, 3);
  }

  get _h2() {
    return this._calibration_data.slice(9, 12);
  }


  measurement() {
    return Common.measurment(this._bus, this._chip, true, true, true).then(([P, T, H]) => {
      return [
        Converter.compensateP(P, T, ...this._p9),
        Converter.compensateT(T, ...this._t3),
        Converter.compensateH(H, this._h2)
      ];
    });
  }

  pressure() {
    return Common.measurment(this._bus, this._chip, true, false, false).then(([P, T, H]) => {
      return Converter.compensateP(P, T, ...this._p9);
    });
  }

  tempature() {
    return Common.measurment(this._bus, this._chip, false, true, false).then(([P, T, H]) => {
      return Converter.compensateT(T, ...this._t3);
    });
  }

  humidity(){
    return Common.measurment(this._bus, this._chip, false, false, true).then(([P, T, H]) => {
      return Converter.compensateH(H, ...this._h2);
    });
  }
}

/**
 *
 */
class Common {
  static id(bus, chip){
    return bus.read(chip.REG_ID).then(buffer => {
      return buffer.readInt8(1);
    });
  }

  static version(bus, chip){
    return this.spi.read(chip.REG_VERSION).then(buffer => {
      return buffer.readUInt8(1);
    });
  }

  static calibration(bus, chip) {
    return bus.read(chip.REG_CALIBRATION, 24).then(buffer => {
      const dig_T1 = buffer.readUInt16LE(1);
      const dig_T2 = buffer.readInt16LE(3);
      const dig_T3 = buffer.readInt16LE(5);

      const dig_P1 = buffer.readUInt16LE(7);
      const dig_P2 = buffer.readInt16LE(9);
      const dig_P3 = buffer.readInt16LE(11);
      const dig_P4 = buffer.readInt16LE(13);
      const dig_P5 = buffer.readInt16LE(15);
      const dig_P6 = buffer.readInt16LE(17);
      const dig_P7 = buffer.readInt16LE(19);
      const dig_P8 = buffer.readInt16LE(21);
      const dig_P9 = buffer.readInt16LE(23);

      return [
        dig_T1, dig_T2, dig_T3, 
        dig_P1, dig_P2, dig_P3, dig_P4, dig_P5, dig_P6, dig_P7, dig_P8, dig_P9];
    });
  }

  static reset(bus, chip){
    return bus.write(_writeMask(chip.REG_RESET), chip.RESET_MAGIC);
  }

  static status(bus, chip) {
    return bus.read(chip.REG_STATUS).then(buffer => {
      const status = buffer.readUInt8(1);
      return Converter.fromStatus(status);
    });
  }

  static control(bus, chip) {
    return bus.read(chip.REG_CTRL).then(buffer => {
      const control = buffer.readUInt8(1);
      return Converter.fromControl(control);
    });
  }

  static config(bus, chip) {
    return bus.read(chip.REG_CONFIG).then(buffer => {
      const config = buffer.readUInt8(1);
      return Converter.fromConfig(config);
    });
  }

  static setProfile(bus, chip, profile) {
    // console.log(profile);
    const control = Converter.ctrlMeasFromSamplingMode(profile.oversampling_p, profile.oversampling_t, profile.mode);
    const config = Converter.configFromTimingFilter(profile.standby_time, profile.filter_coefficient);
    return bus.write(_writeMask(chip.REG_CTRL), control)
      .then(bus.write(_writeMask(chip.REG_CONFIG), config));
  }

  static sleep(bus, chip) {
    return Common.setProfile(bus, chip.profiles().SLEEP);
  }

  static force(bus, chip, press, temp) {
    if(press === undefined) { press = true; }
    if(temp === undefined) { temp = true; }

    const osrs_p = press ? chip.OVERSAMPLE_X1 : chip.OVERSAMPLE_OFF;
    const osrs_t = temp ? chip.OVERSAMPLE_X1 : chip.OVERSAMPLE_OFF

    const control = Converter.ctrlMeasFromSamplingMode(osrs_p, osrs_t, chip.MODE_FORCED);
    return bus.write(_writeMask(chip.REG_CTRL), control);
  }

  static profile(bus, chip) {
    return Promise.all([Commob.control(bus, chip), Common.config(bus, chip)]).then(([ctrl, cfg]) => {
      const [osrs_p, osrs_t, mode] = ctrl;
      const [sb, filter, spi3en] = cfg;
      return {
        mode: mode,
        oversampling_p: osrs_p,
        oversampling_t: osrs_t,
        filter_coefficient: filter,
        standby_time: sb
      }
    });
  }

  static measurment(bus, chip, press, temp, humi) {
    let length = 0;
    if(press) { length += 3; }
    if(temp) { length += 3; }
    if(humi) { length += 2; }

    return bus.read(chip.REG_PRESS, 6).then(buffer => {
      //console.log('burst', buffer);
      const press_msb = buffer.readUInt8(1);
      const press_lsb = buffer.readUInt8(2);
      const press_xlsb = buffer.readUInt8(3);

      const adc_P = press_msb << 12 | press_lsb << 4 | press_xlsb >> 4;
      //console.log('P: ', adc_P);

      const msb = buffer.readUInt8(4);
      const lsb = buffer.readUInt8(5);
      const xlsb = buffer.readUInt8(6);

      const adc_T = msb << 12 | lsb << 4 | xlsb >> 4;
      //console.log('T: ', adc_T);

      //console.log(msb.toString(16), lsb.toString(16), xlsb.toString(16), adc_T.toString(16));

      return [adc_P, adc_T];
    });
  }
}

/**
 *
 */
class Converter {
  static configFromTimingFilter(timing, filter) {
    const spi3wire = 0; // TODO 
    return (timing << 5) | (filter << 2) | spi3wire; 
  }

  static ctrlMeasFromSamplingMode(osrs_p, osrs_t, mode){
    return (osrs_t << 5) | (osrs_p << 2) | mode;
  }

  static fromCofig(config) {
    const t_sb = (tmp >> 5) & 0b111;
    const filter = (tmp >> 2) & 0b111;
    const spi3w_en = tmp & 0b01 === 0b01;
    return [t_sb, filter, spi3w_en];
  }

  static fromControl(control) {
    const osrs_t = (tmp >> 5) & 0b111;
    const osrs_p = (tmp >> 2) & 0b111;
    const mode = tmp & 0b11;
    return [osrs_p, osrs_t, mode];
  }

  static formStatus(status) {
    const measuring = (tmp & 0b1000) === 0b1000;
    const im_update = (tmp & 0b0001) === 0b0001;
    return [measuring, im_update];
  }


  static compensateP(P, T, dig_P1, dig_P2, dig_P3, dig_P4, dig_P5, dig_P6, dig_P7, dig_P8, dig_P9){
    if(P === this.SKIPPED_SAMPLE_VALUE) { return { skip: true }; }
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

  static compensateT(T, dig_T1, dig_T2, dig_T3){
    if(T === this.SKIPPED_SAMPLE_VALUE) { return { skip: true }; }
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

  static compensateH(H, dig_H1, dig_H2) {
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
}

module.exports = BoschIEU;


class Chip {
  static fromId(id){
    if(id === bmp280Chip.CHIP_ID){ return bmp280Chip; }
    else if(id === bme280Chip.CHIP_ID){ return bme280Chip; }
    return UnknownChip;
  }
}

const UnknownChip = {
  name: 'Unknown',
  REG_ID:          0xD0
};

const bme280Chip = {
  name: 'bme280',
  CHIP_ID: 0x60,
  RESET_MAGIC: 0xB6,
  SKIPPED_SAMPLE_VALUE: 0x80000,

  MODE_SLEEP: 0b00,
  MODE_FORCED: 0b01, // alts 01 10
  MODE_NORMAL: 0b11,

  REG_CALIBRATION: 0x88,
  REG_ID:          0xD0,
  REG_VERSION:     0xD1,
  REG_RESET:       0xE0,
  REG_STATUS:      0xF3,
  REG_CTRL:        0xF4,
  REG_CONFIG:      0xF5,
  REG_PRESS:       0xF7,
  REG_TEMP:        0xFA,

  // https://github.com/drotek/BMP280/blob/master/Software/BMP280/BMP280.h
  REG_CAL26: 0xE1,  // R calibration stored in 0xE1-0xF0

  OVERSAMPLE_SKIP: 0b000,
  OVERSAMPLE_X1:   0b001,
  OVERSAMPLE_X2:   0b010,
  OVERSAMPLE_X4:   0b011,
  OVERSAMPLE_X8:   0b100,
  OVERSAMPLE_X16:  0b101, // t-alts 101 110 111, p-alts 101, Others <-- thanks docs

  COEFFICIENT_OFF: 0b000,
  COEFFICIENT_2:   0b001,
  COEFFICIENT_4:   0b010,
  COEFFICIENT_8:   0b011,
  COEFFICIENT_16:  0b100,

  STANDBY_05:   0b000, //    0.5 ms
  STANDBY_62:   0b001, //   62.5
  STANDBY_125:  0b010, //  125
  STANDBY_250:  0b011, //  250
  STANDBY_500:  0b100, //  500
  STANDBY_1000: 0b101, // 1000
  STANDBY_2000: 0b110, // 2000
  STANDBY_4000: 0b111, // 4000


};

const bmp280Chip = {
  name: 'bmp280',
  CHIP_ID: 0x58, // some suggest 0x56 and 0x57
  RESET_MAGIC: 0xB6,
  SKIPPED_SAMPLE_VALUE: 0x80000,

  MODE_SLEEP: 0b00,
  MODE_FORCED: 0b01, // alts 01 10
  MODE_NORMAL: 0b11,

  REG_CALIBRATION: 0x88,
  REG_ID:          0xD0,
  REG_VERSION:     0xD1,
  REG_RESET:       0xE0,
  REG_STATUS:      0xF3,
  REG_CTRL:        0xF4,
  REG_CONFIG:      0xF5,
  REG_PRESS:       0xF7,
  REG_TEMP:        0xFA,

  // https://github.com/drotek/BMP280/blob/master/Software/BMP280/BMP280.h
  REG_CAL26: 0xE1,  // R calibration stored in 0xE1-0xF0

  OVERSAMPLE_SKIP: 0b000,
  OVERSAMPLE_X1:   0b001,
  OVERSAMPLE_X2:   0b010,
  OVERSAMPLE_X4:   0b011,
  OVERSAMPLE_X8:   0b100,
  OVERSAMPLE_X16:  0b101, // t-alts 101 110 111, p-alts 101, Others <-- thanks docs

  COEFFICIENT_OFF: 0b000,
  COEFFICIENT_2:   0b001,
  COEFFICIENT_4:   0b010,
  COEFFICIENT_8:   0b011,
  COEFFICIENT_16:  0b100,

  STANDBY_05:   0b000, //    0.5 ms
  STANDBY_62:   0b001, //   62.5
  STANDBY_125:  0b010, //  125
  STANDBY_250:  0b011, //  250
  STANDBY_500:  0b100, //  500
  STANDBY_1000: 0b101, // 1000
  STANDBY_2000: 0b110, // 2000
  STANDBY_4000: 0b111, // 4000

  profiles: function() { 
    return  {
    // Sleep 
    SLEEP: {
      mode: this.MODE_SLEEP,
      oversampling_p: this.OVERSAMPLE_SKIP,
      oversampling_t: this.OVERSAMPLE_SKIP, 
      filter_coefficient: this.COEFFICIENT_OFF,
      standby_time: this.STANDBY_4000
    },

    // randoms
    TEMPATURE_ONLY: {
      mode: this.MODE_NORMAL,
      oversampling_p: this.OVERSAMPLE_OFF,
      oversampling_t: this.OVERSAMPLE_X16,
      filter_coefficient: this.COEFFICIENT_OFF,
      standby_time: this.STANDBY_05
    },
    TEMPATURE_MOSTLY: {
      mode: this.MODE_NORMAL,
      oversampling_p: this.OVERSAMPLE_X1,
      oversampling_t: this.OVERSAMPLE_X16,
      filter_coefficient: this.COEFFICIENT_2,
      standby_time: this.STANDBY_05
    },
    SLOW_TEMPATURE_MOSTLY: {
      mode: this.MODE_NORMAL,
      oversampling_p: this.OVERSAMPLE_X1,
      oversampling_t: this.OVERSAMPLE_X16,
      filter_coefficient: this.COEFFICIENT_2,
      standby_time: this.STANDBY_1000
    },
    MAX_STANDBY: {
      mode: this.MODE_NORMAL,
      oversampling_p: this.OVERSAMPLE_X1,
      oversampling_t: this.OVERSAMPLE_X1,
      filter_coefficient: this.COEFFICIENT_OFF,
      standby_time: this.STANDBY_4000
    },

    // from the spec
    HANDHELD_DEVICE_LOW_POWER: {
      mode: this.MODE_NORMAL,
      oversampling_p: this.OVERSAMPLE_X16,
      oversampling_t: this.OVERSAMPLE_X2,      
      filter_coefficient: 4,
      standby_time: this.STANDBY_62
    },
    HANDHELD_DEVICE_DYNAMIC: {
      mode: this.MODE_NORMAL,
      oversampling_p: this.OVERSAMPLE_X4,
      oversampling_t: this.OVERSAMPLE_X1,
      filter_coefficient: 16,
      standby_time: this.STANDBY_05
    },
    WEATHER_MONITORING: {
      mode: this.MODE_FORCED,
      oversampling_p: this.OVERSAMPLE_X1,
      oversampling_t: this.OVERSAMPLE_X1,
      filter_coefficient: 0,
      standby_time: this.STANDBY_1
    },
    ELEVATOR_FLOOR_CHAHGE: {
      mode: this.MODE_NORMAL,
      oversampling_p: this.OVERSAMPLE_X4,
      oversampling_t: this.OVERSAMPLE_X1,
      filter_coefficient: 4,
      standby_time: this.STANDBY_125
    },
    DROP_DETECTION: {
      mode: this.MODE_NORMAL,
      oversampling_p: this.OVERSAMPLE_X2,
      oversampling_t: this.OVERSAMPLE_X1,
      filter_coefficient: 0,
      standby_time: this.STANDBY_05
    },
    INDOR_NAVIGATION: {
      mode: this.MODE_NORMAL,
      oversampling_p: this.OVERSAMPLE_X16,
      oversampling_t: this.OVERSAMPLE_X2,
      filter_coefficient: 16,
      standby_time: this.STANDBY_05
    }
    }
  }
};

