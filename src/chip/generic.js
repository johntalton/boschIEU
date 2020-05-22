/* eslint max-classes-per-file: ["error", 2] */

const { BusUtil } = require('@johntalton/and-other-delights');

const { Compensate } = require('./compensate.js');

const enumMap = {
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
class genericFifo {
  static flush(bus) { throw new Error('fifo flush not supported'); }
  static read(bus) { throw new Error('fifo read not supported'); }
}

//
class genericChip {
  static get features() {
    return {
      pressure: false,
      tempature: false,
      humidity: false,
      gas: false,
      normalMode: false,
      interrupt: false,
      fifo: false,
      time: false
    };
  }

  static get name() { return 'generic'; }
  static get chipId() { return undefined; }
  static get skip_value() { return 0x80000; }
  static id(bus) { return BusUtil.readblock(bus, [0xD0]).then(buffer => buffer.readInt8(0)); } // todo remove and add detectChip
  static reset(bus) { return bus.write(0xE0, 0xB6); }

  static get fifo() { return genericChip; } // return the class as a shorthand

  // calibrate
  // profile
  // measure
  // estimateMeasurementWait
  // ready
  // setProfile

  // todo the following require knowledge of the system state
  //   or need to read the chip before updating, thus they
  //   belong to a higher level API and should be moved out
  // patchProfile
  // force
  // sleep


  // eslint-disable-next-line class-methods-use-this
  get ranges() {
    return {
      tempatureC: [0, 60],
      pressurehP: [900, 1100],
      humidityPercent: [20, 80]
    };
  }
}

module.exports = { genericChip, genericFifo, Compensate, enumMap };
