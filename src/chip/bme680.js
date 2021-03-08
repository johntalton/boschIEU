/* eslint-disable no-undefined */
/* eslint-disable fp/no-throw */
/* eslint-disable fp/no-let */
/* eslint-disable fp/no-mutation */
/* eslint-disable fp/no-unused-expression */
/* eslint-disable no-magic-numbers */
/* eslint-disable fp/no-nil */
/* eslint-disable max-len */
import { BusUtil, BitUtil } from '@johntalton/and-other-delights'
import { NameValueUtil } from '../nvutil.js'

import { genericChip, enumMap } from './generic.js'
import { Compensate } from './compensate.js'
import { Util } from './util.js'

// todo move to common enumerations in generic? but its not
const gwMultipliers = [
  { name: 1, value: 0 },
  { name: 4, value: 1 },
  { name: 16, value: 2 },
  { name: 64, value: 3 }
]

export class bme680 extends genericChip {
  static get name() { return 'bme680' }
  static get chipId() { return 0x61 }

  // features
  static get features() {
    return {
      pressure: true,
      temperature: true,
      humidity: true,
      gas: true,
      normalMode: false,
      interrupt: false,
      fifo: false,
      time: false
    }
  }

  static async calibration(bus) {
    const abuffer = await BusUtil.readI2cBlocks(bus, [[0x89, 25], [0xE1, 16], [0x00, 1], [0x02, 1], [0x04, 1]])
    const dv = new DataView(abuffer)

    // console.log(buffer);
    const t1 = dv.getUint16(33, true)
    const t2 = dv.getInt16(1, true)
    const t3 = dv.getInt8(3)

    const T = [t1, t2, t3]

    const p1 = dv.getUint16(5, true)
    const p2 = dv.getInt16(7, true)
    const p3 = dv.getInt8(9)
    const p4 = dv.getInt16(11, true)
    const p5 = dv.getInt16(13, true)
    const p6 = dv.getInt8(16)
    const p7 = dv.getInt8(15)
    const p8 = dv.getInt16(19, true)
    const p9 = dv.getInt16(21, true)
    const p10 = dv.getInt8(23)

    const P = [p1, p2, p3, p4, p5, p6, p7, p8, p9, p10]

    const h2_msb = dv.getUint8(25)
    const h1_2_lsb = dv.getUint8(26)
    const h1_msb = dv.getUint8(27)

    const h1_lsb = BitUtil.mapBits(h1_2_lsb, 3, 4)
    const h2_lsb = BitUtil.mapBits(h1_2_lsb, 7, 4)

    const h1 = BitUtil.reconstruct12bit(h1_msb, h1_lsb)
    const h2 = BitUtil.reconstruct12bit(h2_msb, h2_lsb)
    const h3 = dv.getInt8(28)
    const h4 = dv.getInt8(29)
    const h5 = dv.getInt8(30)
    const h6 = dv.getUint8(31)
    const h7 = dv.getInt8(32)

    const H = [h1, h2, h3, h4, h5, h6, h7]

    const g1 = dv.getInt8(37)
    const g2 = dv.getInt16(35, true)
    const g3 = dv.getInt8(38)

    const G = [g1, g2, g3]

    // console.log('\tcalibration', T, P, H, G);

    const anon0 = dv.getUint8(42) // what else is in here?
    const anon1 = dv.getInt8(43) // what else is in here?

    const res_heat_val = dv.getInt8(41)
    const res_heat_range = BitUtil.mapBits(anon0, 5, 2)
    const range_switching_error = BitUtil.decodeTwos(BitUtil.mapBits(anon1, 7, 4), 4)

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
    }
  }

  static async profile(bus) {
    function gasWaitToDuration(gaswait) {
      const multiplyer = NameValueUtil.toName(BitUtil.mapBits(gaswait, 7, 2), gwMultipliers)
      const baseMs = BitUtil.mapBits(gaswait, 5, 6)
      return baseMs * multiplyer
    }

    const abuffer = await BusUtil.readI2cBlocks(bus, [[0x50, 30], [0x70, 6]])
    const dv = new DataView(abuffer)

    // console.log(buffer);
    const idac_heat = Util.range(0, 9).map(idx => dv.getUint8(idx))
    const res_heat = Util.range(10, 19).map(idx => dv.getUint8(idx))
    const gas_wait = Util.range(20, 29).map(idx => dv.getUint8(idx))
    const ctrl_gas0 = dv.getUint8(30)
    const ctrl_gas1 = dv.getUint8(31)
    const ctrl_hum = dv.getUint8(32)
    const status = dv.getUint8(33)
    const ctrl_meas = dv.getUint8(34)
    const config = dv.getUint8(35)

    const heat_off = BitUtil.mapBits(ctrl_gas0, 3, 1) === 1
    const run_gas = BitUtil.mapBits(ctrl_gas1, 4, 1) === 1
    const nb_conv = BitUtil.mapBits(ctrl_gas1, 3, 4)

    const spi_3w_int_en = BitUtil.mapBits(ctrl_hum, 6, 1) === 1

    const osrs_h = BitUtil.mapBits(ctrl_hum, 2, 3)
    const osrs_t = BitUtil.mapBits(ctrl_meas, 7, 3)
    const osrs_p = BitUtil.mapBits(ctrl_meas, 4, 3)

    const mode = BitUtil.mapBits(ctrl_meas, 1, 2)

    const filter = BitUtil.mapBits(config, 4, 3)
    const spi_3w_en = BitUtil.mapBits(config, 0, 1) === 1
    const spi_mem_page = BitUtil.mapBits(status, 4, 1) // eslint-disable-line no-unused-vars

    const setpoints = res_heat.map((v, i) => ({
      index: i,
      active: i === nb_conv,
      ohms: v,
      durationMs: gasWaitToDuration(gas_wait[i]),
      lastIdac: idac_heat[i]
    }))
    .filter(v => (v.ohms !== 0) || (v.durationMs !== 0))


    return {
      mode: NameValueUtil.toName(mode, enumMap.modes_sans_normal),
      oversampling_p: NameValueUtil.toName(osrs_p, enumMap.oversamples),
      oversampling_t: NameValueUtil.toName(osrs_t, enumMap.oversamples),
      oversampling_h: NameValueUtil.toName(osrs_h, enumMap.oversamples),
      filter_coefficient: NameValueUtil.toName(filter, enumMap.filters_more),

      gas: {
        enabled: run_gas && !heat_off,
        setpoints: setpoints
      },
      spi: {
        // mempage: spi_mem_page,
        enable3w: spi_3w_en,
        interrupt: spi_3w_int_en
      }
    }
  }

  static async setProfile(bus, profile, calibration) {

    function durationToGasWait(durationMs) {
      if(durationMs < 30) { console.log('low wait duration not recommended', durationMs) }

      function foo(ms, mult) {
        const intMs = Math.trunc(ms / mult)
        const actual = intMs * mult
        const err = actual - ms
        if(err !== 0) { console.log('approximating gas wait', actual, 'delta', err) }
        return {
          base: intMs,
          multiplyer: mult,
          error: err
        }
      }

      // 6bit with 2bit multiplier in 4x step (1, 4, 16, 64)
      const base = Math.pow(2, 6) - 1
      // 0 - 63 @ 1ms
      if(durationMs <= base) { return foo(durationMs, 1) }
      // 0 - 252 @ 4ms
      if(durationMs <= (base * 4)) { return foo(durationMs, 4) }
      // 0 - 1008 @ 16ms
      if(durationMs <= (base * 16)) { return foo(durationMs, 16) }
      // 0 - 4032 @ 64ms
      if(durationMs <= (base * 64)) { return foo(durationMs, 64) }

      throw new Error('max duration exceeded: ' + durationMs)
    }

    // 320 25 -> 0x74
    function temperatureToHeaterRes(temperatureC, ambientTemperatureC, caliG) {
      if(temperatureC > 400) { throw new Error('max temperature 400 C') }
      if(caliG.G.length !== 3) { throw new Error('calibration mismatch') }
      const [gh1, gh2, gh3] = caliG.G

      const var1 = (gh1 / 16.0) + 49.0
      const var2 = ((gh2 / 32768.0) * 0.0005) + 0.00235
      const var3 = gh3 / 1024.0
      const var4 = var1 * (1.0 + (var2 * temperatureC))
      const var5 = var4 + (var3 * ambientTemperatureC)
      const res_heat = Math.trunc(3.4 * ((var5 * (4 / (4 + caliG.res_heat_range)) * (1 / (1 + (caliG.res_heat_val * 0.002)))) - 25))

      // console.log(var1, var2, var3, var4, var5, res_heat);
      // console.log('temp2heat', temperatureC, ambientTemperatureC, var5, res_heat);

      return res_heat
    }

    // console.log(' bme680 set profile', profile);
    const en3wint = false // todo profile.spi.interrupt;
    // const spi_mem_page = 0 // todo profile.spi.mempage;

    if(calibration === undefined) { throw new Error('calibration required for gas temp calculation') }
    if(profile.gas === undefined) { throw new Error('missing gas in profile') }
    if(profile.gas.setpoints === undefined) { throw new Error('missing set-point') }
    if(profile.gas.setpoints.length > 10) { throw new Error('set-point limit of 10') }

    const active = profile.gas.setpoints
      .map((sp, idx) => ({ active: sp.active, index: idx }))
      .find(sp => sp.active)

    const heat_off = profile.gas.enabled ? 0 : 1
    const run_gas = active !== undefined ? active.active : false
    const nb_conv = active !== undefined ? active.index : 15 // todo why 0b1111

    const mode = NameValueUtil.toValue(profile.mode, enumMap.modes)
    const os_p = NameValueUtil.toValue(profile.oversampling_p, enumMap.oversamples)
    const os_t = NameValueUtil.toValue(profile.oversampling_t, enumMap.oversamples)
    const os_h = NameValueUtil.toValue(profile.oversampling_h, enumMap.oversamples)

    const filter = NameValueUtil.toValue(profile.filter_coefficient, enumMap.filters_more)
    const en3w = profile.spi.enable3w

    const ctrl_gas0 = BitUtil.packBits([[3, 1]], [heat_off])
    const ctrl_gas1 = BitUtil.packBits([[4, 1], [3, 4]], [run_gas, nb_conv])
    const ctrl_hum = BitUtil.packBits([[6, 1], [2, 3]], [en3wint, os_h])
    const ctrl_meas = BitUtil.packBits([[7, 3], [4, 3], [1, 2]], [os_t, os_p, mode])
    const config = BitUtil.packBits([[4, 3], [0, 1]], [filter, en3w])

    // const status = 0 // todo, we need to redactor all this page stuff Util.packBits([[4, 1]], [spi_mem_page]);

    const idac_heat = [
      false, false, false, false, false,
      false, false, false, false, false
    ] // todo fix, don't touch values  for now

    const [res_heat, gas_wait] = profile.gas.setpoints.reduce((out, sp, idx) => {
      if(sp.skip === true) { return [[...out[0], false], [...out[1], false]] }

      const gw = durationToGasWait(sp.durationMs)
      const multi = NameValueUtil.toValue(gw.multiplyer, gwMultipliers)
      const gas_wait_x = BitUtil.packBits([[7, 2], [5, 6]], [multi, gw.base])

      const pat = profile.ambientTemperatureC !== undefined ? profile.ambientTemperatureC : 25 // or 25C
      const ambientTemperatureC = sp.ambientTemperatureC !== undefined ? sp.ambientTemperatureC : pat

      const res_heat_x = temperatureToHeaterRes(sp.temperatureC, ambientTemperatureC, calibration.G)

      return [[...out[0], res_heat_x], [...out[1], gas_wait_x]]
    }, [[], []])

    // we no longer bulk write,
    await bus.writeI2cBlock(0x74, Uint8Array.from([ ctrl_meas & ~0b11 ])) // sleep
    await Promise.all([
      bus.writeI2cBlock(0x72, Uint8Array.from([ ctrl_hum ])),
      bus.writeI2cBlock(0x75, Uint8Array.from([ config ])),
      bus.writeI2cBlock(0x71, Uint8Array.from([ ctrl_gas1 ])),
      bus.writeI2cBlock(0x70, Uint8Array.from([ ctrl_gas0 ])),

      ...idac_heat.filter(x => x !== false).map((x, idx) => bus.writeI2cBlock(0x50 + idx, Uint8Array.from([ x ]))),
      ...res_heat.filter(x => x !== false).map((x, idx) => bus.writeI2cBlock(0x5A + idx, Uint8Array.from([ x ]))),
      ...gas_wait.filter(x => x !== false).map((x, idx) => bus.writeI2cBlock(0x64 + idx, Uint8Array.from([ x ])))
    ])

    // now set valid mode
    await bus.writeI2cBlock(0x74, Uint8Array.from([ ctrl_meas ]))
  }

  static patchProfile(bus, patch) {
    throw new Error('patch profile unavailable');
  }

  static async measurement(bus, calibration) {
    const abuffer = await BusUtil.readI2cBlocks(bus, [[0x1D, 15]])
    const dv = new DataView(abuffer)

    const meas_status = dv.getUint8(0)
    const meas_index = dv.getUint8(1)
    console.log('\tmeas_index?', meas_index)

    const newdata = BitUtil.mapBits(meas_status, 7, 1) === 1
    const measuringGas = BitUtil.mapBits(meas_status, 6, 1) === 1
    const measuring = BitUtil.mapBits(meas_status, 5, 1) === 1
    const active_profile_idx = BitUtil.mapBits(meas_status, 3, 4)
    const ready = {
      ready: newdata,
      measuringGas: measuringGas, // active gas measurement
      mesuring: measuring, // active TPH measurement
      active_profile_idx: active_profile_idx
    }

    // console.log(ready);
    if(!ready.ready) { return { skip: true, ready: false } }

    const pres_msb = dv.getUint8(2)
    const pres_lsb = dv.getUint8(3)
    const pres_xlsb = dv.getUint8(4)
    const adcP = BitUtil.reconstruct20bit(pres_msb, pres_lsb, pres_xlsb)

    const temp_msb = dv.getUint8(5)
    const temp_lsb = dv.getUint8(6)
    const temp_xlsb = dv.getUint8(7)
    const adcT = BitUtil.reconstruct20bit(temp_msb, temp_lsb, temp_xlsb)

    const adcH = dv.getUint16(8, false)

    const skip0 = dv.getUint8(10)
    const skip1 = dv.getUint8(11)
    const skip2 = dv.getUint8(12)
    if(skip0 !== 0 || skip1 !== 0 || skip2 !== 0) {
      console.log('skip 012 non-zero')
    }

    const gas_r_msb = dv.getUint8(13)
    const gas_r_ext = dv.getUint8(14)

    const gas_r_lsb = BitUtil.mapBits(gas_r_ext, 7, 2)
    const gas_valid_r = BitUtil.mapBits(gas_r_ext, 5, 1) === 1
    const heat_stab_r = BitUtil.mapBits(gas_r_ext, 4, 1) === 1
    const gas_range_r = BitUtil.mapBits(gas_r_ext, 3, 4)

    const gas_r = BitUtil.reconstruct10bit(gas_r_msb, gas_r_lsb)

    const P = bme680.skip_value === adcP ? false : adcP
    const T = bme680.skip_value === adcT ? false : adcT
    const H = bme680.skip_value === adcH ? false : adcH

    const G = gas_valid_r ? { resistance: gas_r, range: gas_range_r, stable: heat_stab_r } : false

    console.log('\tgas valid?', gas_valid_r)
    console.log('\theater stable?', heat_stab_r)

    // console.log(calibration);
    // console.log(P, T, H);
    // console.log(G);
    // console.log(ready, meas_index, gas_valid_r, heat_stab_r, gas_r, gas_range_r);

    return Compensate.from({ adcP: P, adcT: T, adcH: H, adcG: G, type: '6xy' }, calibration)
  }

  static async ready(bus) {
    const abuffer = await BusUtil.readI2cBlocks(bus, [[0x1D, 1]])
    const dv = new DataView(abuffer)

    const meas_status = dv.getUint8(0)

    return {
      ready: BitUtil.mapBits(meas_status, 7, 1) === 1,
      measuringGas: BitUtil.mapBits(meas_status, 6, 1) === 1,
      measuring: BitUtil.mapBits(meas_status, 5, 1) === 1,
      active_profile_idx: BitUtil.mapBits(meas_status, 3, 4)
    }
  }

  static estimateMeasurementWait(profile) {
    // converts enumeration oversampling from profile into
    // a known cycles - currently uses the side effect
    // of the enumeration layout to map to known cycles (aka 1:1).
    function oversampleToCycles(os) {
      if(os === false) { return 0; }
      const cycles = [0, 1, 2, 4, 8, 16];
      if(!cycles.includes(os)) { throw new Error('unknown oversampling enumeration'); }
      return os
    }

    const BASE_PER_CYCLES_US = 1963

    const cycles = oversampleToCycles(profile.oversampling_t) +
      oversampleToCycles(profile.oversampling_p) +
      oversampleToCycles(profile.oversampling_h)

    const tph_durUs = (BASE_PER_CYCLES_US * cycles) +
      1000 + // Wake up duration of 1ms
      (477 * 4) + // TPH switching duration
      (477 * 5) // Gas measurement duration (todo gas enabled?)

    // it takes a while
    let gasWaitMs = 0
    if(profile.gas.enabled) {
      const active = profile.gas.setpoints.find(sp => sp.active)
      if(active) { gasWaitMs = active.durationMs }
    }

    const totalMs = ((tph_durUs + 500) / 1000) + gasWaitMs

    return {
      totalWaitMs: totalMs,
      tphDurationUs: tph_durUs,
      gasDurationMs: gasWaitMs
    }
  }
}
