"use strict";

const { genericChip, enumMap, Compensate } = require('./generic.js');
const { Util } = require('./util.js');

// todo move to common enums in generic? but its not
const gwMultipliers = [
  { name: 1,  value: 0 },
  { name: 4,  value: 1 },
  { name: 16, value: 2 },
  { name: 64, value: 3 },
];

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

      const h2_msb = buffer.readUInt8(25);
      const h1_2_lsb = buffer.readUInt8(26);
      const h1_msb = buffer.readUInt8(27);

      const h1_lsb = Util.mapbits(h1_2_lsb, 3, 4);
      const h2_lsb = Util.mapbits(h1_2_lsb, 7, 4);

      const h1 = Util.reconstruct12bit(h1_msb, h1_lsb);
      const h2 = Util.reconstruct12bit(h2_msb, h2_lsb);
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
        T: T, P: P, H: H,
        G: {
          G: G,
          res_heat_val: res_heat_val,
          res_heat_range: res_heat_range,
          range_switching_error: range_switching_error
        }
      };
    });
  }

  static profile(bus) {
    function gasWaitToDuration(gaswait){
      const multiplyer = Util.enumify(Util.mapbits(gaswait, 7, 2), gwMultipliers);
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

      //console.log(heat_off, run_gas, nb_conv);
      //console.log(res_heat, gas_wait);

      const setpoints = res_heat.map((v, i) => ({
        index: i,
        active: i === nb_conv,
        ohms: v,
        durationMs: gasWaitToDuration(gas_wait[i]),
        lastIdac: idac_heat[i]
      }))
        .filter(v => (v.ohms !== 0) || (v.durationMs !== 0));


      return {
        mode: Util.enumify(mode, enumMap.modes_sans_normal),
        oversampling_p: Util.enumify(osrs_p, enumMap.oversamples),
        oversampling_t: Util.enumify(osrs_t, enumMap.oversamples),
        oversampling_h: Util.enumify(osrs_h, enumMap.oversamples),
        filter_coefficient: Util.enumify(filter, enumMap.filters_more),

        gas: {
          enabled: run_gas && !heat_off,
          setpoints: setpoints
        },
        spi: {
          // mempage: spi_mem_page,
          enable3w: spi_3w_en,
          interrupt: spi_3w_int_en
        }
      };
    });
  }

  static setProfile(bus, profile, calibration) {
    function durationToGasWait(durationMs) {
      if(durationMs < 30) { console.log('low wait duration not recomended', durationMs); }

      function foo(ms, mult) {
        const intMs = Math.trunc(ms / mult);
        const actual = intMs * mult;
        const err = actual - ms;
        if(err !== 0) { console.log('aproximating gas wait', actual, 'delta', err); }
        return {
          base: intMs,
          multiplyer: mult,
          error: err
        };
      }

      // 6bit with 2bit multiplyer in 4x step (1, 4, 16, 64)
      const base = Math.pow(2, 6) - 1;
      // 0 - 63 @ 1ms
      if(durationMs <= base) { return foo(durationMs, 1); }
      // 0 - 252 @ 4ms
      if(durationMs <= (base * 4)) { return foo(durationMs, 4); }
      // 0 - 1008 @ 16ms
      if(durationMs <= (base * 16)) { return foo(durationMs, 16); }
      // 0 - 4032 @ 64ms
      if(durationMs <= (base * 64)) { return foo(durationMs, 64); }

      throw Error('max duration exceded: ' + durationMs);
    }

    // 320 25 -> 0x74
    function tempatureToHeaterRes(tempatureC, ambientTempatureC, caliG) {
      if(tempatureC > 400) { throw Error('max tempature 400 C'); }
      if(caliG.G.length !== 3){ throw Error('calibration mismatch'); }
      const [gh1, gh2, gh3] = caliG.G;

      const var1 = (gh1 / 16.0) + 49.0;
      const var2 = ((gh2 / 32768.0) * 0.0005) + 0.00235;
      const var3 = gh3 / 1024.0;
      const var4 = var1 * (1.0 + (var2 * tempatureC));
      const var5 = var4 + (var3 * ambientTempatureC);
      const res_heat = Math.trunc(3.4 * ((var5 * (4 / (4 + caliG.res_heat_range)) * (1 / (1 + (caliG.res_heat_val * 0.002)))) - 25));

      //console.log(var1, var2, var3, var4, var5, res_heat);
      //console.log('temp2heat', tempatureC, ambientTempatureC, var5, res_heat);

      return res_heat;
    }

    // console.log('bme680 set profile', profile);
    const en3wint = false; // todo profile.spi.interrupt;
    const spi_mem_page = 0; // todo profile.spi.mempage;

    if(profile.gas.setpoints === undefined) { }
    if(profile.gas.setpoints.length > 10) { }

    const active = profile.gas.setpoints
      .map((sp, idx) => ({ active: sp.active, index: idx}))
      .find(sp => sp.active);

    const heat_off = profile.gas.enabled ? 0 : 1;
    const run_gas = active !== undefined ? active.active : false;
    const nb_conv = active !== undefined ? active.index : 15; // todo why 0b1111

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

    //console.log('ctrl gas', ctrl_gas0, ctrl_gas1, profile.gas.enabled);

    const idac_heat = [
      false, false, false, false, false,
      false, false, false, false, false
    ]; // todo fix, don't touch values  for now

    //console.log('setting setpoint', heat_off ,nb_conv, profile.gas.setpoints);

    const [res_heat, gas_wait] = profile.gas.setpoints.reduce((out, sp, idx) => {
      if(sp.skip === true) { return [[...out[0], false], [...out[1], false]]; }

      const gw = durationToGasWait(sp.durationMs);
      const multi = Util.deenumify(gw.multiplyer, gwMultipliers);
      const gas_wait_x = Util.packbits([[7, 2], [5, 6]], multi, gw.base);

      const pat = profile.ambientTempatureC !== undefined ? profile.ambientTempatureC : 25; // or 25C
      const ambientTempatureC = sp.ambientTempatureC !== undefined ? sp.ambientTempature : pat;

      const res_heat_x = tempatureToHeaterRes(sp.tempatureC, ambientTempatureC, calibration.G);

      return [[...out[0], res_heat_x], [...out[1], gas_wait_x]];
    }, [[], []]);

    //console.log(res_heat, gas_wait);

    // we nolonger bulk write,
    return bus.write(0x74, ctrl_meas & ~0b11) // sleeep
      .then(() => Promise.all([
        bus.write(0x72, ctrl_hum),
        bus.write(0x75, config),
        bus.write(0x71, ctrl_gas1),
        bus.write(0x70, ctrl_gas0),

        ...idac_heat.map((x, idx) => x !== false ? bus.write(0x50 + idx, x) : undefined),
        ...res_heat.map((x, idx) => x !== false ? bus.write(0x5A + idx, x) : undefined),
        ...gas_wait.map((x, idx) => x !== false ? bus.write(0x64 + idx, x) : undefined)
      ]))
      .then(() => bus.write(0x74, ctrl_meas));
  }

  static measurment(bus, calibration) {
    return Util.readblock(bus, [[0x1D, 15]]).then(buffer => {
      const meas_status = buffer.readUInt8(0);
      const meas_index = buffer.readUInt8(1);
      console.log('\tmeas_index?', meas_index);

      const newdata = Util.mapbits(meas_status, 7, 1) === 1;
      const measuringGas = Util.mapbits(meas_status, 6, 1) === 1;
      const measuring = Util.mapbits(meas_status, 5, 1) === 1;
      const active_profile_idx = Util.mapbits(meas_status, 3, 4);
      const ready = {
        ready: newdata,
        measuringGas: measuringGas, // active gas measurment
        mesuring: measuring,        // active TPH measurment
        active_profile_idx: active_profile_idx
      };

      //console.log(ready);
      if(!ready.ready) { return { skip: true, ready: false }; }

      const pres_msb = buffer.readUInt8(2);
      const pres_lsb = buffer.readUInt8(3);
      const pres_xlsb = buffer.readUInt8(4);
      const adcP = Util.reconstruct20bit(pres_msb, pres_lsb, pres_xlsb);

      const temp_msb = buffer.readUInt8(5);
      const temp_lsb = buffer.readUInt8(6);
      const temp_xlsb = buffer.readUInt8(7);
      const adcT = Util.reconstruct20bit(temp_msb, temp_lsb, temp_xlsb);

      const adcH = buffer.readUInt16BE(8);

      const skip0 = buffer.readUInt8(10);
      const skip1 = buffer.readUInt8(11);
      const skip2 = buffer.readUInt8(12);

      const gas_r_msb = buffer.readUInt8(13);
      const gas_r_ext = buffer.readUInt8(14);

      const gas_r_lsb = Util.mapbits(gas_r_ext, 7, 2);
      const gas_valid_r = Util.mapbits(gas_r_ext, 5, 1) === 1;
      const heat_stab_r = Util.mapbits(gas_r_ext, 4, 1) === 1;
      const gas_range_r = Util.mapbits(gas_r_ext, 3, 4);

      const gas_r = Util.reconstruct10bit(gas_r_msb, gas_r_lsb);

      const P = (bme680.skip_value === adcP) ? false : adcP;
      const T = (bme680.skip_value === adcT) ? false : adcT;
      const H = (bme680.skip_value === adcH) ? false : adcH;

      const G = gas_valid_r ? { resistance: gas_r, range: gas_range_r, stable: heat_stab_r } : false;

      console.log('\tgas valid?', gas_valid_r);
      console.log('\theater stable?', heat_stab_r);

      //console.log(calibration);
      //console.log(P, T, H);
      // console.log(G);
      //console.log(ready, meas_index, gas_valid_r, heat_stab_r, gas_r, gas_range_r);

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

  static estimateMeasurementWait(profile) {
    // converts enum oversample from profile into
    // a known cycles - currently uses the side effect
    // of the enum layout to map to known cycles (aka 1:1).
    function oversampleToCycles(os) {
      if(os === false) { return 0; }
      const cycles = [0, 1, 2, 4, 8, 16];
      if(!cycles.includes(os)) { throw Error('unknown oversample enum'); }
      return os;
    }

    const BASE_PER_CYCLES_US = 1963;

    const cycles = oversampleToCycles(profile.oversampling_t) +
      oversampleToCycles(profile.oversampling_p) +
      oversampleToCycles(profile.oversampling_h);

    const tph_durUs = (BASE_PER_CYCLES_US * cycles) +
      1000 +      // Wake up duration of 1ms
      (477 * 4) + // TPH switching duration
      (477 * 5);  // Gas measurement duration (todo gas enabled?)

    // it takes a while
    let gasWaitMs = 0;
    if(profile.gas.enabled) {
      const active = profile.gas.setpoints.find(sp => sp.active);
      if(active) { gasWaitMs = active.durationMs; }
    }

    const totalMs = ((tph_durUs + 500) / 1000) + gasWaitMs;

    return {
      totalWaitMs: totalMs,
      tphDurationUs: tph_durUs,
      gasDurationMs: gasWaitMs
    };
  }
}

module.exports.bme680 = bme680;

