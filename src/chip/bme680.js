"use strict";

const { genericChip, enumMap, Compensate } = require('./generic.js');
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
    return Util.readblock(bus, [[0x89, 25], [0xE1, 16], 0x00, 0x02, 0x04]).then(buffer => {
      // console.log(buffer);
      const t1 = buffer.readUInt16LE(33);
      const t2 = buffer.readInt16LE(1);
      const t3 = buffer.readInt8(3);

      const T = [t1, t2, t3];

      const p1 = buffer.readUInt16LE(5);
      const p2 = buffer.readInt16LE(7);
      const p3 = buffer.readInt8(9);
      const p4 = buffer.readInt16LE(11);
      const p5 = buffer.readInt16LE(13);
      const p6 = buffer.readInt8(16);
      const p7 = buffer.readInt8(15);
      const p8 = buffer.readInt16LE(19);
      const p9 = buffer.readInt16LE(21);
      const p10 = buffer.readInt8(23);

      const P = [p1, p2, p3, p4, p5, p6, p7, p8, p9, p10];

      const h1 = buffer.readUInt16LE(26); // TODO !
      const h2 = buffer.readUInt16BE(25); // TODO !
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

      // console.log('\tcalibration', T, P, H, G);

      const anon0 = buffer.readUInt8(42); // what else is in here?
      const anon1 = buffer.readInt8(43); // what else is in here?

      const res_heat_val = buffer.readInt8(41);
      const res_heat_range = Util.mapbits(anon0, 5, 2);
      const range_switching_error = Util.decodeTwos(Util.mapbits(anon1, 7, 4), 4);

      // console.log('res heat val', res_heat_val);
      // console.log('res heat range', res_heat_range);
      // console.log('range switching error', range_switching_error);


      return {
        T: T, P: P, H: H, G: G,
        res_heat_val: res_heat_val,
        res_heat_range: res_heat_range,
        range_switching_error: range_switching_error
      };
    });
  }

  static profile(bus) {
    function waitToMs(gaswait){
      const multiplyer = Util.mapbits(gaswait, 7, 2);
      const baseMs = Util.mapbits(gaswait, 5, 6);
      return baseMs * multiplyer;
    }

    return Util.readblock(bus, [[0x50, 30], [0x70, 6]]).then(buffer => {
      // console.log(buffer);
      const idac_heat = Util.range(0, 9).map(idx => buffer.readUInt8(idx));
      const res_heat = Util.range(10, 19).map(idx => buffer.readUInt8(idx));
      const gas_wait = Util.range(20, 29).map(idx => buffer.readUInt8(idx));
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

      const setpoints = res_heat.map((v, i) => ({ index: i, tempatureC: v, durationMs: gas_wait[i], lastCurrentC: idac_heat[i] }))
        .filter(v => v.tempatureC !== 0 && v.durationMS !== 0);

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
          setpoints: setpoints
        },
        spi: {
          mempage: spi_mem_page,
          enable3w: spi_3w_en,
          interrupt: spi_3w_int_en
        }
      };
    });
  }

  static setProfile(bus, profile, calibration) {
    // todo move to common enums in generic? but its not
    const gwMultipliers = [
      { name: 1,  value: 0 },
      { name: 4,  value: 1 },
      { name: 16, value: 2 },
      { name: 64, value: 3 },
    ];

    function durationToGasWait(durationMs) {
      if(durationMs < 30) { console.log('low wait duration not recomended'); }

      // 5bit with 2bit multiplyer in 4x step (1, 4, 16, 64)
      // 0 - 63 @ 1ms
      if(durationMs <= 63) { return { base: durationMs / 1, multiplyer: 1, }; }
      // 0 - 252 @ 4ms
      if(durationMs <= 252) { return { base: durationMs / 4, multiplyer: 4, }; }
      // 0 - 1008 @ 16ms
      if(durationMs <= 1008) { return { base: durationMs / 16, multiplyer: 16, }; }
      // 0 - 4032 @ 64ms
      if(durationMs <= 4032) { return { base: durationMs / 64, multiplyer: 64, }; }

      throw Error('max duration exceded: ' + durationMs);
    }

    // console.log('bme680 set profile', profile);
    const en3wint = false; // todo profile.spi.interrupt;
    const spi_mem_page = 0; // todo profile.spi.mempage;

    const heat_off = profile.enabled;
    const run_gas = profile.active !== undefined;
    const nb_conv = profile.active;

    const mode = Util.deenumify(profile.mode, enumMap.modes);
    const os_p = Util.deenumify(profile.oversampling_p, enumMap.oversamples);
    const os_t = Util.deenumify(profile.oversampling_t, enumMap.oversamples);
    const os_h = Util.deenumify(profile.oversampling_h, enumMap.oversamples);

    const filter = Util.deenumify(profile.filter_coefficient, enumMap.filters_more);
    const en3w = profile.spi.enable3w;

    const ctrl_gas0 = Util.packbits([[3, 1]], heat_off);
    const ctrl_gas1 = Util.packbits([[4, 1], [3, 4]], run_gas, nb_conv);
    const ctrl_hum = Util.packbits([[6, 1], [2, 3]], en3wint, os_h);
    const ctrl_meas = Util.packbits([[7, 3], [4, 3], [1, 2]], os_t, os_p, mode);
    const config = Util.packbits([[4, 3], [0 ,1]], filter, en3w);

    const status = 0; // todo, we need to refactor all this page stuff Util.packbits([[4, 1]], spi_mem_page);

    const idac_heat = [
      false, false, false, false, false,
      false, false, false, false, false
    ]; // todo fix, don't touch values  for now

    const [res_heat, gas_wait] = profile.gas.setpoints.reduce((out, sp, idx) => {
      if(sp.active === false) { return [[...out[0], false], [...out[1], false]]; }

      const gw = durationToGasWait(sp.durationMs);
      const multi = Util.deenumify(gw.multiplyer, gwMultipliers);
      const gas_wait_x = Util.packbits([[7, 2], [5, 6]], multi, gw.base);

      //profile.tempatureC

      const res_heat_x = 0; // todo convert from C using claibration

      return [[...out[0], res_heat_x], [...out[1], gas_wait_x]];
    }, [[], []]);

    console.log(res_heat, gas_wait);

    // we nolonger bulk write
    return Promise.all([
      bus.write(0x75, config),
      bus.write(0x74, ctrl_meas & ~0b11), // sleeep
      bus.write(0x72, ctrl_hum),
      bus.write(0x71, ctrl_gas1),
      bus.write(0x70, ctrl_gas0),

      //bus.write(0x50, buf0),
      //bus.write(0x70, buf1),

      idac_heat.map((x, idx) => x !== false ? bus.write(0x50 + idx, x) : undefined),
      res_heat.map((x, idx) => x !== false ? bus.write(0x5A + idx, x) : undefined),
      gas_wait.map((x, idx) => x !== false ? bus.write(0x64 + idx, x) : undefined)
    ])
    .then(() => bus.write(0x74, ctrl_meas));
  }

  static measurment(bus, calibration) {
    return Util.readblock(bus, [[0x1D, 10], [0x2A, 2]]).then(buffer => {
      const meas_status = buffer.readUInt8(0);
      const meas_index = buffer.readUInt8(1);

      const newdata = Util.mapbits(meas_status, 7, 1) === 1;
      const measuringGas = Util.mapbits(meas_status, 6, 1) === 1;
      const measuring = Util.mapbits(meas_status, 5, 1) === 1;
      const active_profile_idx = Util.mapbits(meas_status, 3, 4);
      const ready = {
        ready: newdata,
        measuringGas: measuringGas,
        mesuring: measuring,
        active_profile_idx: active_profile_idx
      };

      const pres_msb = buffer.readUInt8(2);
      const pres_lsb = buffer.readUInt8(3);
      const pres_xlsb = buffer.readUInt8(4);
      const adcP = Util.reconstruct20bit(pres_msb, pres_lsb, pres_xlsb);

      const temp_msb = buffer.readUInt8(5);
      const temp_lsb = buffer.readUInt8(6);
      const temp_xlsb = buffer.readUInt8(7);
      const adcT = Util.reconstruct20bit(temp_msb, temp_lsb, temp_xlsb);

      const adcH = buffer.readUInt16BE(8);

      const gas_r_msb = buffer.readUInt8(10);
      const gas_r_ext = buffer.readUInt8(11);

      const gas_r_lsb = Util.mapbits(gas_r_ext, 7, 2);
      const gas_valid_r = Util.mapbits(gas_r_ext, 5, 1) === 1;
      const heat_stab_r = Util.mapbits(gas_r_ext, 4, 1) === 1;
      const gas_range_r = Util.mapbits(gas_r_ext, 3, 4);

      const gas_r = Util.reconstruct10bit(gas_r_msb, gas_r_lsb);


      const P = (bme680.skip_value === adcP) ? false : adcP;
      const T = (bme680.skip_value === adcT) ? false : adcT;
      const H = (bme680.skip_value === adcH) ? false : adcH;

      const G = { resistance: gas_r, range: gas_range_r};

      console.log(ready, meas_index, gas_valid_r, heat_stab_r, gas_r, gas_range_r);

      return Compensate.from({ adcP: P, adcT: T, adcH: H, adcG: G, type: '6xy' }, calibration);
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

