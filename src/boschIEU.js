"use strict";

const { Chip } = require('./chip/chip.js');
const { Converter } = require('./converter.js');

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
 * Acts as a cache around the Chip implmentation
 */
class BoschSensor {
  constructor(bus) {
    this._bus = bus;
    this._chip = Chip.generic();
    this._calibration = undefined;
  }

  get chip(){ return this._chip; }

  valid() { return this._chip.chip_id !== undefined; }

  calibrated() { return this.valid() && (this._calibration !== undefined); }

  id() {
    return this._chip.id(this._bus).then(id => {
      this._chip = Chip.fromId(id);
      return id;
    });
  }

  reset() { return this._chip.reset(this._bus); }

  calibration() {
    return this._chip.calibration(this._bus).then(cali => {
      this._calibration = cali;
      return cali;
    });
  }

  profile() { return this._chip.profile(this._bus); }
  setProfile(profile) { return this._chip.setProfile(this._bus, profile, this._calibration); }

  ready() { return this._chip.ready(this._bus); }

  measurement() { return this._chip.measurment(this._bus, this._calibration); }
}

module.exports.BoschIEU = BoschIEU;
module.exports.BoschSensor = BoschSensor;
module.exports.Converter = Converter;
