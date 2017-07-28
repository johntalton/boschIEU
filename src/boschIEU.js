
const chipLib = require('./chip.js');
const Chip = chipLib.chip;
const chips = chipLib.chips;

const Profiles = require('./profiles.js');

const Common = require('./common.js');
const Converter = require('./converter.js');

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
        console.log(cali);
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
      const T = Converter.compensateT(this._chip, result.adcT, ...this._t3);
      const P = Converter.compensateP(this._chip, result.adcP, T.Tfine, ...this._p9);
      const H = Converter.compensateH(this._chip, result.adcH, T.Tfine, ...this._h6);

      return {
        pressure: P,
        tempature: T,
        humidity: H
      };
    });
  }

  pressure() {
    return Common.measurment(this._bus, this._chip, true, true, false).then(result => {
      const T = Converter.compensateT(this._chip, result.adcT, ...this._t3); // TODO validate T
      return Converter.compensateP(this._chip, result.adcP, T.Tfine, ...this._p9);
    });
  }

  tempature() {
    return Common.measurment(this._bus, this._chip, false, true, false).then(result => {
      return Converter.compensateT(this._chip, result.adcT, ...this._t3);
    });
  }

  humidity(){
    return Common.measurment(this._bus, this._chip, false, true, true).then(result => {
      const T = Converter.compensateT(this._chip, result.adcT, ...this._t3); // TODO validate T
      return Converter.compensateH(this._bus, result.adcH, T.Tfine, ...this._h6);
    });
  }
}

module.exports.BoschIEU = BoschIEU;
module.exports.Converter = Converter;
module.exports.Profiles = Profiles;
