/* eslint-disable fp/no-this */
/* eslint-disable immutable/no-this */
/* eslint-disable fp/no-mutation */
/* eslint-disable immutable/no-mutation */
//import { BusUtil } from '@johntalton/and-other-delights'

import { Chip } from './chip/chip.js'
import { BoschFifo } from './fifo.js'


/**
 * Acts as a cache around the Chip implementation.
 */
export class BoschSensor {
  // eslint-disable-next-line fp/no-nil
  constructor(bus, options = {}) {
    this._bus = bus
    this._options = options

    this._chip = options.chipId === undefined ?
      Chip.generic() :
      Chip.fromId(options.chipId, options.legacy ?? true)

    this._calibration = undefined

    this._fifo = new BoschFifo(this)
  }

  // exposed to allow for chip specific calls (390 `refId` etc)
  //  and to provide comparison of `.chip.chipId`
  get chip() { return this._chip }

  get fifo() { return this._fifo }

  // select chip is exposed over a setter here to explicitly
  //   relate it to the `detectChip` method
  // todo both select / detect chip should return a BoschSensorChip
  //   wrapper class to create a name space for the curried `Chip`
  // todo selectChip(chip) { this._chip = chip; }

  // cached promise version of the `_detectChip` call
  // forcing the detect will bypass the cached (valid check) and
  // re-detect and cache the chip (but it still assign the result
  // to the cache, so this is different from using`_detectChip`)
  async detectChip(force) {
    const f = force === true
    if(!f && this.valid()) { return Promise.resolve(this.chip) }
    return this._detectChip().then(chip => { this._chip = chip; return true })
  }

  // detects the chip id using single byte reads. the generic chip no-longer
  //   supports a wider version of chip detection and thus appropriate location
  //   for generic chip detection has been abstracted here
  // @return promise that resolves to chip implementation class selected by id
  async _detectChip() {
    async function readid(bus, reg) {
      const abuffer = await bus.readI2cBlock(reg, 1)
      const buffer = new Uint8Array(abuffer)
      return buffer[0]
    }

    // attempt to detect via the `legacy` Id register
    const legacyReadId = await readid(this._bus, 0xD0)
    if(legacyReadId !== 0) {
      console.log('detect: via legacy register read', legacyReadId);
      return Chip.fromId(legacyReadId, true)
    }

    console.log('detect: legacy resulted in Zero, attempt standard register');
    const atZeroReadId = await readid(this._bus, 0x00) // bmp388/bmp390 register
    return Chip.fromId(atZeroReadId, false)
  }

  valid() { return this._chip.chipId !== Chip.generic().chipId }

  calibrated() { return this.valid() && (this._calibration !== undefined) }

  async sensorTime() { return this._chip.sensorTime(this._bus) }

  // old code used call to `id` in order to force a chip identification
  //   and update the cached chip reference.
  // this assumed that the id register was stable across sensors, and thus
  //   the `generic` chips version of `id` worked.  this assumption is no-longer
  //   valid when the `id` function is not stable. Thus, elevating the "detection"
  //    functionality into the higher level Sensor code
  async id() {
    // call cached detect
    // then call the chip id (redundant but provides consistent return)
    return this.detectChip()
      .then(() => this._id())
  }

  // directly calls the bus read id and returns hex value directly
  async _id() {
    return this._chip.id(this._bus)
  }

  async reset() { return this._chip.reset(this._bus) }

  async calibration() {
    this._calibration = await this._chip.calibration(this._bus)
    return this._calibration
  }

  async profile() { return this._chip.profile(this._bus); }
  async setProfile(profile, only = true) {
    if(!only) { await this._chip.patchProfile(this._bus, { mode: 'SLEEP' }) }

    await this._chip.setProfile(this._bus, profile, this._calibration)

    if(!only) { await this._chip.patchProfile(this._bus, { mode: profile.mode }) }
  }
  async patchProfile(patch) { return this._chip.patchProfile(this._bus, patch); }

  async ready() { return this._chip.ready(this._bus); }

  async measurement() { return this._chip.measurement(this._bus, this._calibration); }

  estimateMeasurementWait(profile) { return this._chip.estimateMeasurementWait(profile); }
}
