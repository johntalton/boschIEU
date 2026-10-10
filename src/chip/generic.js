
/** @import { I2CAddressedBus } from '@johntalton/and-other-delights' */
/** @import { Profile, ProfileReady } from '../types/profile.js' */
/** @import { Calibration } from '../types/calibration.js' */
/** @import { CompensateResult } from './compensate.js' */

export const enumMap = {
  oversamples: [ //
    { name: false, value: 0 },
    { name: 1,     value: 1 },
    { name: 2,     value: 2 },
    { name: 4,     value: 3 },
    { name: 8,     value: 4 },
    { name: 16,    value: 5 }
  ],
  filters: [ // bmp280 / bme280
    { name: false, value: 0 },
    { name: 2,     value: 1 },
    { name: 4,     value: 2 },
    { name: 8,     value: 3 },
    { name: 16,    value: 4 }
  ],
  filters_more: [ // bme680 / bmp388
    { name: false, value: 0 },
    { name: 1,     value: 1 },
    { name: 3,     value: 2 },
    { name: 7,     value: 3 },
    { name: 15,    value: 4 },
    { name: 31,    value: 5 },
    { name: 63,    value: 6 },
    { name: 127,   value: 7 }
  ],
  modes: [ // bmp280 / bme280 / bmp388
    { name: 'SLEEP',  value: 0 },
    { name: 'FORCED', value: 1 },
    { name: 'NORMAL', value: 3 }
  ],
  modes_sans_normal: [ // bme680
    { name: 'SLEEP',  value: 0 },
    { name: 'FORCED', value: 1 }
  ],
  standbys: [ // bmp280
    { name:  0.5, value: 0 }, //    0.5 ms
    { name: 62.5, value: 1 }, //   62.5
    { name:  125, value: 2 }, //  125
    { name:  250, value: 3 }, //  250
    { name:  500, value: 4 }, //  500
    { name: 1000, value: 5 }, // 1000
    { name: 2000, value: 6 }, // 2000
    { name: 4000, value: 7 }, // 4000
    // alias
    { name: true, value: 7 } // MAX
  ],
  standbys_hires: [ // bme280
    { name:  0.5, value: 0 }, //    0.5 ms
    { name:   10, value: 6 }, //   10
    { name:   20, value: 7 }, //   20
    { name: 62.5, value: 1 }, //   62.5
    { name:  125, value: 2 }, //  125
    { name:  250, value: 3 }, //  250
    { name:  500, value: 4 }, //  500
    { name: 1000, value: 5 }, // 1000
    // alias
    { name: true, value: 5 }  // MAX
  ]
}

//
export class genericFifo {
  /**
   * @param {I2CAddressedBus} _bus
   */
  static flush(_bus) { throw new Error('fifo flush not supported by generic chip') }

  /**
   * @param {I2CAddressedBus} _bus
   * @param {Array<any>} _options
   */
  static read(_bus, ..._options) { throw new Error('fifo read not supported by generic chip') }
}

//
export class genericChip {
  static get features() {
    return {
      pressure: false,
      temperature: false,
      humidity: false,
      gas: false,
      normalMode: false,
      interrupt: false,
      fifo: false,
      time: false
    }
  }

  static isChipIdAtZero() { return false }

  static get name() { return 'generic' }

  /** @returns {number|undefined} */
  static get chipId() { return undefined }

  static get skip_value() { return 0x08_00_00 }

  /**
   * @param {I2CAddressedBus} _bus
   * @returns {Promise<number>}
   */
  static async id(_bus) { throw new Error('generic read for legacy, use Chip specific id implementation') }

  /**
   * @param {I2CAddressedBus} bus
   */
  static reset(bus) { return bus.writeI2cBlock(0xE0, Uint8Array.from([ 0xB6 ])) }

  static get fifo() { return genericFifo } // return the class as a shorthand

  /**
   * @param {I2CAddressedBus} _bus
   * @returns {Promise<SensorTime>}
   */
  static async sensorTime(_bus) {
    throw new Error('sensorTime not defined for generic chip')
  }

  // estimateMeasurementWait

  /**
   * @param {I2CAddressedBus} _bus
   * @returns {Promise<ProfileReady>}
   */
  static async ready(_bus) { throw new Error('ready not defined for generic chip') }

  /**
   * @param {I2CAddressedBus} _bus
   * @param {Calibration} _calibration
   * @returns {Promise<CompensateResult>}
   */
  static async measurement(_bus, _calibration) { throw new Error('measurement not defined for generic chip') }

  /**
   * @param {I2CAddressedBus} _bus
   * @param {Partial<Profile>} _profile
   * @param {Calibration} [_calibration]
   */
  static async setProfile(_bus, _profile, _calibration) { throw new Error('setProfile not defined for generic chip') }

  /**
   * @param {I2CAddressedBus} _bus
   * @returns {Promise<Profile>}
   */
  static async profile(_bus) { throw new Error('profile not defined for generic chip') }

  /**
   * @param {I2CAddressedBus} _bus
   * @returns {Promise<Calibration>}
   */
  static async calibration(_bus) { throw new Error('calibration not defined for generic chip') }


  get ranges() {
    return {
      temperatureC: [0, 60],
      pressurehP: [900, 1100],
      humidityPercent: [20, 80]
    }
  }
}
