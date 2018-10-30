const { BusUtil } = require('@johntalton/and-other-delights');

const { Chip } = require('./chip/chip.js');
const { Converter } = require('./converter.js');

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

  // cached promise version
  chipDetect() {
    if(this.valid()) { return Promise.resolve(this.chip); }
    return this._chipDetect().then(chip => this._chip = chip);
  }

  // detects the chip id using single byte reads. the generic chip nolonger
  //   supports a wider version of chip detection and thus appropriate location
  //   for generic chip detection has been abstrated here
  _chipDetect() {
    function readid(bus, reg) { return BusUtil.readblock(bus, [reg]).then(buffer => buffer.readInt8(0)); }

    return readid(this._bus, 0xD0) // standard `generic` register id
      .then(result => {
        if(result === 0) {
          console.log('inital buffer Zero, read alt register');
          return readid(this._bus, 0x00); // bmp388 register
        }
        return result;
      })
      .then(result => {
        const c = Chip.fromId(result);
        return c;
      });
  }

  valid() { return this._chip.chip_id !== undefined; }

  calibrated() { return this.valid() && (this._calibration !== undefined); }


  // old code used call to `id` in order to force a chip identification
  //   and update the cached chip reference.
  // this assumed that the id register was stable accross sensors, and thus
  //   the `generic` chips version of `id` worked.  this assumption is nolonger
  //   valid when the `id` function is not stable. Thus, elevating the "detection"
  //    functionality into the higher level Sensor code
  id() {
    return this.chipDetect()
      .then(chip => chip.chip_id);
  }

  _id() {
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

  estimateMeasurementWait(profile) { return this._chip.estimateMeasurementWait(profile); }
}

/**
 * Bosch Integrated Environmental Unit
 * bmp280 / bme280 / bme680
 */
class BoschIEU {
  static sensor(bus) {
    return Promise.resolve(new BoschSensor(bus));
  }
}

module.exports.BoschIEU = BoschIEU;
module.exports.BoschSensor = BoschSensor;
module.exports.Converter = Converter;
