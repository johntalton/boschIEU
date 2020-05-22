const { BusUtil } = require('@johntalton/and-other-delights');

const { BoschFifo } = require('./fifo.js');
const { Chip } = require('./chip/chip.js');
/**
 * Acts as a cache around the Chip implementation.
 */
class BoschSensor {
    constructor(bus) {
      this._bus = bus;
      this._chip = Chip.generic();
      this._calibration = undefined;
  
      this._fifo = new BoschFifo(this);
    }
  
    get chip(){ return this._chip; }
  
    get fifo() { return this._fifo; }
  
    // select chip is exposed over a setter here to explicitly
    //   relate it to the `detectChip` method
    // todo both select / detect chip should return a BoschSensorChip
    //   wrapper class to create a name space for the curried `Chip`
    // todo selectChip(chip) { this._chip = chip; }
  
    // cached promise version of the `_detectChip` call
    // forcing the detect will bypass the cached (valid check) and
    // re-detect and cache the chip (but it still assign the result
    // to the cache, so this is different from using`_detectChip`)
    detectChip(force) {
      const f = force === true;
      if(!f && this.valid()) { return Promise.resolve(this.chip); }
      return this._detectChip().then(chip => { this._chip = chip; return true; });
    }
  
    // detects the chip id using single byte reads. the generic chip no-longer
    //   supports a wider version of chip detection and thus appropriate location
    //   for generic chip detection has been abstracted here
    // @return promise that resolves to chip implementation class selected by id
    _detectChip() {
      function readid(bus, reg) { return BusUtil.readblock(bus, [reg]).then(buffer => buffer.readInt8(0)); }
  
      return readid(this._bus, 0xD0) // standard `generic` register id
        .then(result => {
          if(result === 0) {
            console.log('detect: initial buffer Zero, read alt register');
            return readid(this._bus, 0x00); // bmp388 register
          }
          return result;
        })
        .then(result => {
          const c = Chip.fromId(result);
          return c;
        });
    }
  
    valid() { return this._chip.chipId !== Chip.generic().chipId; }
  
    calibrated() { return this.valid() && (this._calibration !== undefined); }
  
    sensorTime() { return this._chip.sensorTime(this._bus); }
  
    // old code used call to `id` in order to force a chip identification
    //   and update the cached chip reference.
    // this assumed that the id register was stable across sensors, and thus
    //   the `generic` chips version of `id` worked.  this assumption is no-longer
    //   valid when the `id` function is not stable. Thus, elevating the "detection"
    //    functionality into the higher level Sensor code
    id() {
      // call cached detect
      // then call the chip id (redundant but provides consistent return)
      return this.detectChip()
        .then(() => this._id());
    }
  
    // directly calls the bus read id and returns hex value directly
    _id() {
      return this._chip.id(this._bus);
     }
  
    reset() { return this._chip.reset(this._bus); }
  
    calibration() {
      return this._chip.calibration(this._bus).then(cali => {
        this._calibration = cali;
        return cali;
      });
    }
  
    profile() { return this._chip.profile(this._bus); }
    setProfile(profile, only = true) {
      return Promise.resolve()
        .then(() => (only ? undefined : this._chip.patchProfile(this._bus, { mode: 'SLEEP' })))
        .then(() => this._chip.setProfile(this._bus, profile, this._calibration))
        .then(() => (only ? undefined : this._chip.patchProfile(this._bus, { mode: profile.mode })))
    }
    patchProfile(patch) { return this._chip.patchProfile(this._bus, patch); }
  
    ready() { return this._chip.ready(this._bus); }
  
    measurement() { return this._chip.measurement(this._bus, this._calibration); }
  
    estimateMeasurementWait(profile) { return this._chip.estimateMeasurementWait(profile); }
  }
  
  module.exports = { BoschSensor };