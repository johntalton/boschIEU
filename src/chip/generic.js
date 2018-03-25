"use strict";

const { Util } = require('./util.js');

/**
 *
 **/
class Compensate {
  static humidity(adcH, Tfine, caliH) {
    if(adcH === chip.SKIPPED_SAMPLE_VALUE) { return { skip: true }; }
    if(Tfine === chip.SKIPPED_SAMPLE_VALUE) { return { skip: true, proxy: true }; }
    if(Tfine === undefined) { return { undef: 'Tfine' }; }
    if(dig_H1 === undefined) { return { undef: 'h1' }; }
    if(dig_H2 === undefined) { return { undef: 'h2' }; }
    if(dig_H3 === undefined) { return { undef: 'h3' }; }
    if(dig_H4 === undefined) { return { undef: 'h4' }; }
    if(dig_H5 === undefined) { return { undef: 'h5' }; }
    if(dig_H6 === undefined) { return { undef: 'h6' }; }

    const var1 = Tfine - 76800.0;
    const var2 = (adcH - (
                   dig_H4 * 64.0 + dig_H5 / 16384.0 * var1
                 )) *
                 (dig_H2 / 65536.0 * (
                   1.0 + dig_H6 / 67108864.0 * var1 * (
                     1.0 + dig_H3 / 67108864.0 * var1)
                 ));
    const var3 = var2 * (1.0 - dig_H1 * var2 / 524288.0);
    const h = Math.min(Math.max(var3, 0), 100); // clamp(0, 100)

    // console.log('compH', adcH, Tfine, var3, h);

    return {
      Hunclamped: var3,
      H: h
    };
  }


  static tempature(adcT, caliT) {
    // console.log(T, dig_T1, dig_T2, dig_T3);
    if(T === chip.SKIPPED_SAMPLE_VALUE) { return { skip: true }; }
    if(dig_T1 === undefined){ return { undef: 't1' }; }
    if(dig_T2 === undefined){ return { undef: 't2' }; }
    if(dig_T3 === undefined){ return { undef: 't3' }; }

    const var1f = (T/16384.0 - dig_T1/1024.0) * dig_T2;
    const var2f = (T/131072.0 - dig_T1/8192.0) * (T/131072.0 - dig_T1/8192.0) * dig_T3;
    const finef = var1f + var2f;
    const cf = finef / 5120.0;

/*
    const var1i = (((T >> 3) - (dig_T1 << 1)) * dig_T2) >> 11;
    const var2i = ( (( ((T >> 4) - dig_T1) * ((T >> 4) - dig_T1) ) >> 12) * dig_T3 ) >> 14;
    const finei = var1i + var2i;
    const ci = ((finei * 5 + 128) >> 8) / 100;
*/

    // console.log(var1f, var2f, finef, cf);
    // console.log(var1i, var2i, finei, ci);

    return {
      Tfine: finef,
      T: cf
    };
  }


  static pressure(adcP, Tfine, caliP) {
    let pvar1 = Tfine / 2 - 64000;
    let pvar2 = pvar1 * pvar1 * dig_P6 / 32768;
    pvar2 = pvar2 + pvar1 * dig_P5 * 2;
    pvar2 = pvar2 / 4 + dig_P4 * 65536;
    pvar1 = (dig_P3 * pvar1 * pvar1 / 524288 + dig_P2 * pvar1) / 524288;
    pvar1 = (1 + pvar1 / 32768) * dig_P1;

    let pressure_hPa = 0;

    if(pvar1 !== 0) {
      let p = 1048576 - adcP;
      p = ((p - pvar2 / 4096) * 6250) / pvar1;
      pvar1 = dig_P9 * p * p / 2147483648;
      pvar2 = p * dig_P8 / 32768;
      p = p + (pvar1 + pvar2 + dig_P7) / 16;
      pressure_hPa = p / 100;
    }
    return { P: pressure_hPa * 100 };
  }
}



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
  filters_more: [ // bme680
    { name: false, value: 0 },
    { name: 1,     value: 1 },
    { name: 3,     value: 2 },
    { name: 7,     value: 3 },
    { name: 15,    value: 4 },
    { name: 31,    value: 5 },
    { name: 63,    value: 6 },
    { name: 127,   value: 7 }
  ],
  modes: [ // bmp280 / bme280
    { name: 'sleep',  value: 0 },
    { name: 'forced', value: 1 },
    { name: 'normal', value: 3 }
  ],
  modes_sans_normal: [ // bme680
    { name: 'sleep',  value: 0 },
    { name: 'forced', value: 1 }
  ],
  standbys: [ // bmp280
    { name:  0.5, value: 0 }, //    0.5 ms
    { name: 62.5, value: 1 }, //   62.5
    { name:  125, value: 2 }, //  125
    { name:  250, value: 3 }, //  250
    { name:  500, value: 4 }, //  500
    { name: 1000, value: 5 }, // 1000
    { name: 2000, value: 6 }, // 2000
    { name: 4000, value: 7 }  // 4000
  ],
  standbys_hires: [ // bme280
    { name:  0.5, value: 0 }, //     0.5 ms
    { name:   10, value: 6 }, //    10
    { name:   20, value: 7 }, //    20
    { name: 62.5, value: 1 }, //    62.5
    { name:  125, value: 2 }, //   125
    { name:  250, value: 3 }, //   250
    { name:  500, value: 4 }, //   500
    { name: 1000, value: 5 }  //  1000
  ]
}

//
class genericChip {
  static get features() {
    return {
      pressure: false,
      tempature: false,
      humidity: false,
      gas: false,
      normalMode: false
    }
  }

  static get name() { return 'generic'; }
  static get chip_id() { return undefined; }
  static get skip_value() { return 0x80000; }
  static id(bus) { return Util.readblock(bus, [0xD0]).then(buffer => buffer.readInt8(0)); }
  static reset(bus) { return bus.write(0xE0, 0xB6); }

  // calibrate
  // profile
  // measure
  // ready
  // setProfile
}

module.exports.genericChip = genericChip;
module.exports.Compensate = Compensate;
module.exports.enumMap = enumMap;
