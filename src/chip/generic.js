/* eslint-disable fp/no-nil */
/* eslint-disable fp/no-throw */
/* eslint-disable key-spacing */
/* eslint-disable no-magic-numbers */
/* eslint-disable no-multi-spaces */
/* eslint-disable import/group-exports */
/* eslint max-classes-per-file: ["error", 2] */

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
};

//
export class genericFifo {
  static flush(bus) { throw new Error('fifo flush not supported by generic chip'); }
  static read(bus) { throw new Error('fifo read not supported by generic chip'); }
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
    };
  }

  static isChipIdAtZero() { return false }

  static get name() { return 'generic'; }
  static get chipId() { return undefined; }
  static get skip_value() { return 0x80000; }
  static id(bus) { throw new Error('generic read for legacy, use Chip specific id implementation') }
  static reset(bus) { return bus.writeI2cBlock(0xE0, Uint8Array.from([ 0xB6 ])) }

  static get fifo() { return genericFifo; } // return the class as a shorthand

  // calibrate
  // profile
  // measure
  // estimateMeasurementWait
  // ready
  // setProfile

  // eslint-disable-next-line class-methods-use-this
  get ranges() {
    return {
      temperatureC: [0, 60],
      pressurehP: [900, 1100],
      humidityPercent: [20, 80]
    };
  }
}
