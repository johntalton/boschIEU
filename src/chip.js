"use strict";

/**
 * Factory for discovering chips
 */
class Chip {
  static generic() { return genericChip; }

  static fromId(id){
    const chip = Chip._chips.find(chip => chip.chip_id === id);
    if(chip === undefined) { return UnknownChip; }
    return chip;
  }

  static chips() {
    return Chips._chips.filter(chip => UnknownChip.name !== chip.name)
      .map(chip => ({ name: chip.name, chip_id: chip.chip_id }));
  }
}

/**
 * Magic util to simplify interface based on address/length read
 * this is also the place the <bus>s read gets called
 **/
class Util {
  static mapbits(bits, position, length) {
    const shift = 8 - position - 1 + length;
    const mask = Math.pow(2, length) - 1;
    return (bits >> shift) & mask;
  }

  static enumify(value, map) {
    const item = map.find(item => item.value === value);
    if(item === undefined) { throw Error('enum mapping failed for ' + value); }
    return item.name;
  }

  // magic read method that take in an array of address/lengh pairs
  // (with shorthand for just address if length 1)
  // returns promise resolving to common chip api
  static _readblock(bus, block, ...params) {
    // normalize block from shorthand
    const blk = block.map(item => {
      if(Array.isArray(item)) {
        if(item.length !== 2) { console.log('sloppy format', item); return [item[0], 1]; }
        return item;
      }
      return [item, 1];
    })
    // make it all inty
    .map(([reg, len]) => [parseInt(reg), parseInt(len)]);

    // and the total...
    const totalLength = blk.reduce((out, [reg, len]) => out += len, 0);

    // now lets make all those bus calls
    return Promise.all(blk.map(([reg, len]) => {
      return bus.read(reg, len);
    }))
    .then(all => {
      return Buffer.concat(all, totalLength);
    });
  }
}


const enumMap = {
  oversamples = [ //
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
    { name: 5,    value: 0 }, //    0.5 ms
    { name: 62,   value: 1 }, //   62.5
    { name: 125,  value: 2 }, //  125
    { name: 250,  value: 3 }, //  250
    { name: 500,  value: 4 }, //  500
    { name: 1000, value: 5 }, // 1000
    { name: 2000, value: 6 }, // 2000
    { name: 4000, value: 7 }  // 4000
  ],
  standbys_hires: [ // bme280
    { name:    5, value: 0 }, //     0.5 ms
    { name:   10, value: 6 }, //    10
    { name:   20, value: 7 }, //    20
    { name:   62, value: 1 }, //    62.5
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
  static get chip_id() { throw Error('generic has no id'); }
  static get skip_value() { return 0x80000; }
  static id(bus) { return Util.readblock(bus, [0xD0]).then(buffer => buffer.readInt8(0)); }
  static reset(bus) { return bus.write(0xE0, 0xB6); }

  // calibrate
  // profile
  // measure
  // ready
}

//
class bme680 extends genericChip {
  static get name() { return 'bme680'; }
  static get chip_id() { return 0x61; }

  // features
  static get features() {
    return {
      pressure: true,
      tempature: true,
      humidity: true,
      gas: true,
      normalMode: false
    }
  }

  static calibration(bus) {
    return Util.readblock(bus, [[0x89, 25], [0x1E, 16], 0x00, 0x02, 0x04]).then(buffer => {
      const t1 = buffer.readUInt16LE(33);
      const t2 = buffer.readInt16LE(1);
      const t3 = buffer.readInt8(3);

      const T = [t1, t2, t3];

      const p1 = buffer.readUInt16LE(5);
      const p2 = buffer.readInt16LE(7);
      const p3 = buffer.readInt8(9);
      const p4 = buffer.readUInt16LE(11);
      const p5 = buffer.readUInt16LE(13);
      const p6 = buffer.readInt8(16);
      const p7 = buffer.readInt8(15);
      const p8 = buffer.readInt16LE(19);
      const p9 = buffer.readInt16LE(21);
      const p10 = buffer.readInt8(23);

      const P = [p1, p2, p3, p4, p5, p6, p7, p8, p9, p10];

      const h1 = buffer.readUInt16LE(26); // TODO
      const h2 = buffer.readUInt16BE(25); // TODO
      const h3 = buffer.readInt8(28);
      const h4 = buffer.readInt8(29);
      const h5 = buffer.readInt8(30);
      const h6 = buffer.readUInt8(31);
      const h7 = buffer.readInt8(32);

      const H = [h1, h2, h3, h4, h5, h6, h7];

      const g1 = buffer.readInt8(37);
      const g2 = buffer.readInt16LE(35);
      const g3 = buffer.readInt8(38);

      const G = [g1, g2, g3];

      return { T: T, P: P, H: H, G: G };
    });
  }

  static profile(bus) {
    return Util.readblock(bus, [[0x50, 30], [0x70, 6]]).then(buffer => {
      return {};
    });
  }

  static measurment() {
    return Util.readblock(bus, [0x1D, [0x1F, 8], [0x2A, 2]]).then(buffer => {
      return {};
    });
  }

  static ready() {
    return Util.readblock(bus, [0x1D]).then(buffer => {
      const meas_status = buf.readUInt8(0);
      return {
        ready: Util.mapbits(meas_status, 7, 1),
        measuringGas: Util.mapbits(meas_status, 6, 1),
        measuring: Util.mapbits(meas_status, 5, 1),
        gasIndex: Util.mapbits(meas_status, 3, 4)
      };
    });
  }
}

//
class bme280 extends genericChip {
  static get name() { return 'bme280'; }
  static get chip_id() { return 0x60; }

  static get features() {
    return {
      pressure: true,
      tempature: true,
      humidity: true,
      gas: false,
      normalMode: true
    }
  }

  static calibration(bus) {
    return Util.readblock(bus, [[0x88, 25], [0xE1, 7]]).then(buffer => {
      const dig_T1 = buffer.readUInt16LE(0);
      const dig_T2 = buffer.readInt16LE(2);
      const dig_T3 = buffer.readInt16LE(4);

      const dig_P1 = buffer.readUInt16LE(6);
      const dig_P2 = buffer.readInt16LE(8);
      const dig_P3 = buffer.readInt16LE(10);
      const dig_P4 = buffer.readInt16LE(12);
      const dig_P5 = buffer.readInt16LE(14);
      const dig_P6 = buffer.readInt16LE(16);
      const dig_P7 = buffer.readInt16LE(18);
      const dig_P8 = buffer.readInt16LE(20);
      const dig_P9 = buffer.readInt16LE(22);

      const T = [dig_T1, dig_T2, dig_T3];
      const P = [dig_P1, dig_P2, dig_P3, dig_P4, dig_P5, dig_P6, dig_P7, dig_P8, dig_P9];

      const dig_H1 = buffer.readUInt8(25);
      // boundry packed
      const dig_H2 = buffer.readInt16LE(26);
      const dig_H3 = buffer.readUInt8(28);
      const e4 = buffer.readUInt8(29);
      const e5 = buffer.readUInt8(30);
      const e6 = buffer.readUInt8(31);
      const dig_H6 = buffer.readInt8(32);

      const dig_H4 = (e4 << 4) | (e5 & 0b1111);
      const dig_H5 = (e6 << 4)| (e5 >> 4);

      const H = [dig_H1, dig_H2, dig_H3, dig_H4, dig_H5, dig_H6];

      return { T: T, P: P, H: H, G: [] };
    });
  }

  static profile(bus) {
    return Util.readblock(bus, [[0xF2, 4]]).then(buffer => {
      const ctrl_hum =  buffer.readUInt8(0);
      const status =    buffer.readUInt8(1);
      const ctrl_meas = buffer.readUInt8(2);
      const config =    buffer.readUInt8(3);

      const osrs_h = Util.mapbits(ctr_hum, 2, 3);

      const measuring = Util.mapbits(status, 3, 1);
      const updating = Util.mapbits(status, 0, 1);

      const osrs_t = Util.mapbits(ctrl_meas, 7, 3);
      const osrs_p = Util.mapbits(ctrl_meas, 4, 3);
      const mode = Util.mapbits(ctrl_meas, 1, 2);

      const t_sb = Util.mapbits(config, 7, 3);
      const filter = Util.mapbits(config, 4, 3);
      const spi3wen = Util.mapbits(config, 0, 1) === 1;

      return {
        mode: Util.enumify(mode, enumMap.modes),
        oversampling_p: Util.enumify(osrs_p, enumMap.oversamples),
        oversampling_t: Util.enumify(osrs_t, enumMap.oversamples),
        oversampling_h: Util.enumify(osrs_h, enumMap.oversamples),
        filter_coefficient: Util.enumify(filter, enumMap.filters),
        standby_time: Util.enumify(t_sb, enumMap.standbys),
        spi3wen: spi3wen
      };
    });
  }

  static measurment() {
    return Util.readblock(bus, [[0xF7, 8]]).then(buffer => {
      return {};
    });
  }

  static ready() {
    return Util.readblock(bus, [0xF3]).then(buffer => {
      const status = buffer.readUInt8(0);
      const measuring = Util.mapbits(status, 3, 1);
      const updating = Util.mapbits(status, 0, 1);
      return {
        //ready: 
      };
    });
  }
}


class bmp280 extends genericChip {
  static get name() { return 'bmp280'; }
  static get chip_id() { return  0x58; } // todo [56, 57, 58]

  static get features() {
    return {
      pressure: true,
      tempature: true,
      humidity: false,
      gas: false,
      normalMode: true
    }
  }

  static calibration(bus) {
    return Util.readblock(bus, [[0x88, 25]]).then(buffer => {
      const dig_T1 = buffer.readUInt16LE(0);
      const dig_T2 = buffer.readInt16LE(2);
      const dig_T3 = buffer.readInt16LE(4);

      const dig_P1 = buffer.readUInt16LE(6);
      const dig_P2 = buffer.readInt16LE(8);
      const dig_P3 = buffer.readInt16LE(10);
      const dig_P4 = buffer.readInt16LE(12);
      const dig_P5 = buffer.readInt16LE(14);
      const dig_P6 = buffer.readInt16LE(16);
      const dig_P7 = buffer.readInt16LE(18);
      const dig_P8 = buffer.readInt16LE(20);
      const dig_P9 = buffer.readInt16LE(22);

      const T = [dig_T1, dig_T2, dig_T3];
      const P = [dig_P1, dig_P2, dig_P3, dig_P4, dig_P5, dig_P6, dig_P7, dig_P8, dig_P9];

      return {
        T: T, P: P,
        H: [], G: []
      };
    });
  }

  static profile(bus) {
    return Util.readblock(bus, [[0xF3, 3]]).then(buffer => {
      const status =    buffer.readUInt8(0);
      const ctrl_meas = buffer.readUInt8(1);
      const config =    buffer.readUInt8(2);

      const measuring = Util.mapbits(status, 3, 1);
      const updating = Util.mapbits(status, 0, 1);

      const osrs_t = Util.mapbits(ctrl_meas, 7, 3);
      const osrs_p = Util.mapbits(ctrl_meas, 4, 3);
      const mode = Util.mapbits(ctrl_meas, 1, 2);

      const t_sb = Util.mapbits(config, 7, 3);
      const filter = Util.mapbits(config, 4, 3);
      const spi3wen = Util.mapbits(config, 0, 1);

      return {
        mode: Util.enumify(mode, enumMap.modes),
        oversampling_p: Util.enumify(osrs_p, enumMap.oversamples),
        oversampling_t: Util.enumify(osrs_t, enumMap.oversamples),
        filter_coefficient: Util.enumify(filter, enumMap.filters),
        standby_time: Util.enumify(t_sb, enumMap.standbys)
      };
    });
  }

  static measurment() {
    return Util.readblock(bus, [[0xF7, 6]]).then(buffer => {
      return {};
    });
  }

  static ready() {
    return Util.readblock(bus, [0xF3]).then(buffer => {
      const status = buffer.readUInt8(0);
      const measuring = Util.mapbits(status, 3, 1);
      const updating = Util.mapbits(status, 0, 1);
      return {
        //ready: 
      };
    });
  }
}

Chip._chips = [
  genericChip,
  bmp280,
  bme280,
  bme680
];

module.exports = Chip;

