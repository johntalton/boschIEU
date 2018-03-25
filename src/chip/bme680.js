"use strict";

const { genericChip, enumMap } = require('./generic.js');
const { Util } = require('./util.js');

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
      const idac_heat = Util.range(0, 9).map(idx => buffer.readUInt8(idx));
      const res_heat = Util.range(10, 19).map(idx => buffer.readUInt8(idx));
      const res_wait = Util.range(20, 29).map(idx => buffer.readUInt8(idx));
      const ctrl_gas0 = buffer.readUInt8(30);
      const ctrl_gas1 = buffer.readUInt8(31);
      const ctrl_hum = buffer.readUInt8(32);
      const status = buffer.readUInt8(33);
      const ctrl_meas = buffer.readUInt8(34);
      const config = buffer.readUInt8(35);

      const heat_off = Util.mapbits(ctrl_gas0, 3, 1) === 1;
      const run_gas = Util.mapbits(ctrl_gas1, 4, 1) === 1;
      const nb_conv = Util.mapbits(ctrl_gas1, 3, 4);

      const spi_3w_int_en = Util.mapbits(ctrl_hum, 6, 1) === 1;

      const osrs_h = Util.mapbits(ctrl_hum, 2, 3);
      const osrs_t = Util.mapbits(ctrl_meas, 7, 3);
      const osrs_p = Util.mapbits(ctrl_meas, 4, 3);

      const mode = Util.mapbits(ctrl_meas, 1, 2);

      const filter = Util.mapbits(config, 4, 3);
      const spi_3w_en = Util.mapbits(config, 0, 1) === 1;
      const spi_mem_page = Util.mapbits(status, 4, 1);

      return {
        mode: Util.enumify(mode, enumMap.modes_sans_normal),
        oversampling_p: Util.enumify(osrs_p, enumMap.oversamples),
        oversampling_t: Util.enumify(osrs_t, enumMap.oversamples),
        oversampling_h: Util.enumify(osrs_h, enumMap.oversamples),
        filter_coefficient: Util.enumify(filter, enumMap.filters_more),

        gas: {
          heat_off: heat_off,
          enabled: run_gas,
          selected_profile_idx: nb_conv,
          profiles: [idac_heat, res_heat, res_wait] // todo regropu as triplets
        },
        spi: {
          mempage: spi_mem_page,
          enable3w: spi_3w_en,
          interrupt: spi_3w_int_en
        }
      };
    });
  }

  static measurment(bus, calibration) {
    return Util.readblock(bus, [0x1D, [0x1F, 8], [0x2A, 2]]).then(buffer => {
      return {};
    });
  }

  static ready(bus) {
    return Util.readblock(bus, [0x1D]).then(buffer => {
      const meas_status = buffer.readUInt8(0);
      return {
        ready: Util.mapbits(meas_status, 7, 1) === 1,
        measuringGas: Util.mapbits(meas_status, 6, 1) === 1,
        measuring: Util.mapbits(meas_status, 5, 1) === 1,
        active_profile_idx: Util.mapbits(meas_status, 3, 4)
      };
    });
  }
}

module.exports.bme680 = bme680;

