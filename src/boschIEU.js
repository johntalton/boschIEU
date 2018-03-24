"use strict";

const Chip = require('./chip.js');
const Profiles = require('./profiles.js');

const Common = require('./common.js');
const Converter = require('./converter.js');

/**
 * Bosch Integrated Environmental Unit
 * bmp280 / bme280 / bme680
 */
class BoschIEU {
  static sensor(bus) {
    return Promise.resolve(new BoschSensor(bus));
  }
}

/**
 * Acts as a cache around the Common / Chip implmentation
 */
class BoschSensor {
  constructor(bus) {
    this._bus = bus;
    this._chip = Chip.unknown();
    this._calibration = [];
  }

  get chip(){ return this._chip; }

  valid(){
    return this._chip.chip_id !== undefined;
  }

  calibrated() {
    return this.valid() && (this._calibration.length !== 0);
  }

  id(){
    return Common.id(this._bus, this._chip)
      .then(id => {
        this._id = id;
        this._chip = Chip.fromId(this._id);
        return id;
      });
  }

  reset() { return Common.reset(this._bus, this._chip); }

  calibration() {
    return Common.calibration(this._bus, this._chip)
      .then(cali => {
        this._calibration = cali;
        return cali;
      });
  }

  profile() { return Common.profile(this._bus, this._chip); }
  setProfile(profile) { return Common.setProfile(this._bus, this._chip, profile); }

  ready() { return Common.ready(this._bus, this._chip); }

  measurement() {
    return Common.measurment(this._bus, this._chip, this._calibration);
  }
}

module.exports.BoschIEU = BoschIEU;
module.exports.BoschSensor = BoschSensor;
module.exports.Converter = Converter;
module.exports.Profiles = Profiles;
