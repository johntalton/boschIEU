"use strict";

/**
 * Chip/Chips
 */
class Chip {
  static unknown() { return UnknownChip; }

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

const oversamples = [
    { name: false, value: 0 },
    { name: 1,     value: 1 },
    { name: 2,     value: 2 },
    { name: 4,     value: 3 },
    { name: 8,     value: 4 },
    { name: 16,    value: 5 }
  ];

const filters = [
    { name: false, value: 0 },
    { name: 2,     value: 1 },
    { name: 4,     value: 2 },
    { name: 8,     value: 3 },
    { name: 16,    value: 4 }
  ];


function mapbits(bits, position, length) {
  const shift = 8 - position - 1 + length;
  const mask = Math.pow(2, length) - 1;
  return (bits >> shift) & mask;
}

function enumify(value, map) {
  const item = map.find(item => item.value === value);
  if(item === undefined) { throw Error('enum mapping failed for ' + value); }
  return item.name;
}


const UnknownChip = {
  name: 'Unknown',
  id: { block: [ 0xD0 ], parser:  buffer => buffer.readInt8(0) },
  reset: [0xE0, 0xB6],
  skip_value: 0x80000
};

const bme680Chip = {
  //
  name: 'bme680',
  chip_id: 0x61,
  // api
  id: UnknownChip.id,
  reset: UnknownChip.reset,
  skip_value: UnknownChip.skip_value,
  calibration: { block: [[0x89, 25], [0x1E, 16], 0x00, 0x02, 0x04], parser: buffer => {} },
  profile: { block: [[0x50, 30], [0x70, 6]], parser: buffer => {
    // const = buffer.read
  } },
  measurment: { block: [0x1D, [0x1F, 8], [0x2A, 2]], parser: buffer => {} },
  ready: { block: [0x1D], parser: buffer => {
    const meas_status = buf.readUInt8(0);
    return {
      ready: mapbits(meas_status, 7, 1),
      measuringGas: mapbits(meas_status, 6, 1),
      measuring: mapbits(meas_status, 5, 1),
      gasIndex: mapbits(meas_status, 3, 4)
    };
  } },

  // features
  supportsPreassure: true,
  supportsTempature: true,
  supportsHumidity: true,
  supportsGas: true,
  supportsNormalMode: false,

  // enums
  modes: [
    { name: 'sleep',  value: 0 },
    { name: 'forced', value: 1 }
  ],

  oversamples: oversamples,

  filters: [
    { name: false, value: 0 },
    { name: 1,     value: 1 },
    { name: 3,     value: 2 },
    { name: 7,     value: 3 },
    { name: 15,    value: 4 },
    { name: 31,    value: 5 },
    { name: 63,    value: 6 },
    { name: 127,   value: 7 }
  ]
};

const bme280Chip = {
  //
  name: 'bme280',
  chip_id: 0x60,
  // api
  id: UnknownChip.id,
  reset: UnknownChip.reset,
  skip_value: UnknownChip.skip_value,
  calibration: { block: [[0x88, 25], [0xE1, 7]], parser: buffer => {} },
  profile: { block: [[0xF2, 4]], parser: buffer => {
    const ctrl_hum = buffer.readUInt8(0);
    const status = buffer.readUInt8(1);
    const ctrl_meas = buffer.readUInt8(2);
    const config = buffer.readUInt8(3);

    const osrs_h = mapbits(ctr_hum, 2, 3);

    const measuring = mapbits(status, 3, 1);
    const updating = mapbits(status, 0, 1);

    const osrs_t = mapbits(ctrl_meas, 7, 3);
    const osrs_p = mapbits(ctrl_meas, 4, 3);
    const mode = mapbits(ctrl_meas, 1, 2);

    const t_sb = mapbits(config, 7, 3);
    const filter = mapbits(config, 4, 3);
    const spi3wen = mapbits(config, 0, 1);

    return {
      mode: enumify(mode, bme280Chip.modes),
      oversampling_p: enumify(osrs_p, bme280Chip.oversamples),
      oversampling_t: enumify(osrs_t, bme280Chip.oversamples),
      oversampling_h: enumify(osrs_h, bme280Chip.oversamples),
      filter_coefficient: enumify(filter, bme280Chip.filters),
      standby_time: enumify(t_sb, bme280Chip.standbys)
    };
  } },
  measurment: { block: [[0xF7, 8]], parser: buffer => {} },
  ready: { block: [0xF3], parser: buffer => {
    const status = buffer.readUInt8(0);
    const measuring = mapbits(status, 3, 1);
    const updating = mapbits(status, 0, 1);
    return {
      //ready: 
    }
  } },

  // features
  supportsPressure: true,
  supportsTempature: true,
  supportsHumidity: true,
  supportsGas: false,
  supportsNormalMode: true,

  // enums
  modes: modes,

  oversamples: oversamples,

  filters: filters,

  standbys: [
    { name:    5, value: 0 }, //     0.5 ms
    { name:   10, value: 6 }, //    10
    { name:   20, value: 7 }, //    20
    { name:   62, value: 1 }, //    62.5
    { name:  125, value: 2 }, //   125
    { name:  250, value: 3 }, //   250
    { name:  500, value: 4 }, //   500
    { name: 1000, value: 5 }  //  1000
  ]
};

const bmp280Chip = {
  //
  name: 'bmp280',
  chip_id: 0x58, // todo [56, 57, 58]
  // api
  id: UnknownChip.id,
  reset: UnknownChip.reset,
  skip_value: UnknownChip.skip_value,
  calibration: { block: [0x88, 25], parser: buffer => {} },
  profile: { block: [[0xF3, 3]], parser: buffer => {
    const status = buffer.readUInt8(0);
    const ctrl_meas = buffer.readUInt8(1);
    const config = buffer.readUInt8(2);

    const measuring = mapbits(status, 3, 1);
    const updating = mapbits(status, 0, 1);

    const osrs_t = mapbits(ctrl_meas, 7, 3);
    const osrs_p = mapbits(ctrl_meas, 4, 3);
    const mode = mapbits(ctrl_meas, 1, 2);

    const t_sb = mapbits(config, 7, 3);
    const filter = mapbits(config, 4, 3);
    const spi3wen = mapbits(config, 0, 1);

    return {
      mode: enumify(mode, bmp280Chip.modes),
      oversampling_p: enumify(osrs_p, bmp280Chip.oversamples),
      oversampling_t: enumify(osrs_t, bmp280Chip.oversamples),
      filter_coefficient: enumify(filter, bmp280Chip.filters),
      standby_time: enumify(t_sb, bmp280Chip.standbys)
    };
  } },
  measurment: { block: [[0xF7, 6]], parser: buffer => {} },
  ready: { block: [0xF3], parser: buffer => {} },

  // features
  supportsPressure: true,
  supportsTempature: true,
  supportsHumidity: false,
  supportsGas: false,
  supportsNormalMode: true,

  // enums
  modes: [
    { name: 'sleep',  value: 0 },
    { name: 'forced', value: 1 },
    { name: 'normal', value: 3 }
  ],

  oversamples: oversamples,

  filters, filters,

  standbys: [
    { name: 5,    value: 0 }, //    0.5 ms
    { name: 62,   value: 1 }, //   62.5
    { name: 125,  value: 2 }, //  125
    { name: 250,  value: 3 }, //  250
    { name: 500,  value: 4 }, //  500
    { name: 1000, value: 5 }, // 1000
    { name: 2000, value: 6 }, // 2000
    { name: 4000, value: 7 }  // 4000
  ]
};

Chip._chips = [
  UnknownChip,
  bmp280Chip,
  bme280Chip,
  bme680Chip
];

module.exports = Chip;

