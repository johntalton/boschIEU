/* eslint-disable no-magic-numbers */
import { BusUtil, BitUtil } from '@johntalton/and-other-delights'

import { NameValueUtil } from '../nvutil.js'

import { genericChip, enumMap } from './generic.js'
import { Compensate } from './compensate.js'

export class bmp280 extends genericChip {
  static get name() { return 'bmp280' }
  static get chipId() { return 0x58 } // todo [56, 57, 58]

  static get features() {
    return {
      pressure: true,
      temperature: true,
      humidity: false,
      gas: false,
      normalMode: true,
      interrupt: false,
      fifo: false,
      time: false
    };
  }

  static async calibration(bus) {
    const abuffer = await BusUtil.readI2cBlocks(bus, [[0x88, 25]])
    const dv = new DataView(abuffer)

    const dig_T1 = dv.getUint16(0, true)
    const dig_T2 = dv.getInt16(2, true)
    const dig_T3 = dv.getInt16(4, true)

    const dig_P1 = dv.getUint16(6, true)
    const dig_P2 = dv.getInt16(8, true)
    const dig_P3 = dv.getInt16(10, true)
    const dig_P4 = dv.getInt16(12, true)
    const dig_P5 = dv.getInt16(14, true)
    const dig_P6 = dv.getInt16(16, true)
    const dig_P7 = dv.getInt16(18, true)
    const dig_P8 = dv.getInt16(20, true)
    const dig_P9 = dv.getInt16(22, true)

    const T = [dig_T1, dig_T2, dig_T3]
    const P = [dig_P1, dig_P2, dig_P3, dig_P4, dig_P5, dig_P6, dig_P7, dig_P8, dig_P9]

    return {
      T, P,
      H: [], G: []
    }
  }

  static async profile(bus) {
    const abuffer = await BusUtil.readI2cBlocks(bus, [[ 0xF3, 3 ]])
    const dv = new DataView(abuffer)

    const status = dv.getUint8(0)
    const ctrl_meas = dv.getUint8(1)
    const config = dv.getUint8(2)

    const measuring = BitUtil.mapBits(status, [3, 1]) === 1
    const updating = BitUtil.mapBits(status, [0, 1]) === 1

    const osrs_t = BitUtil.mapBits(ctrl_meas, [7, 3])
    const osrs_p = BitUtil.mapBits(ctrl_meas, [4, 3])
    const mode = BitUtil.mapBits(ctrl_meas, [1, 2])

    const t_sb = BitUtil.mapBits(config, [7, 3])
    const filter = BitUtil.mapBits(config, [4, 3])
    const spi_3w_en = BitUtil.mapBits(config, [0, 1]) === 1

    return {
      mode: NameValueUtil.toName(mode, enumMap.modes),
      oversampling_p: NameValueUtil.toName(osrs_p, enumMap.oversamples),
      oversampling_t: NameValueUtil.toName(osrs_t, enumMap.oversamples),
      filter_coefficient: NameValueUtil.toName(filter, enumMap.filters),
      standby_time: NameValueUtil.toName(t_sb, enumMap.standbys),
      spi: {
        enable3w: spi_3w_en
      },
      ready: {
        ready: !measuring,
        measuring: measuring,
        updating: updating
      }
    }
  }

  static setProfile(bus, profile) {
    const mode = NameValueUtil.toValue(profile.mode, enumMap.modes)
    const os_p = NameValueUtil.toValue(profile.oversampling_p, enumMap.oversamples)
    const os_t = NameValueUtil.toValue(profile.oversampling_t, enumMap.oversamples)
    const sb_t = NameValueUtil.toValue(profile.standby_time, enumMap.standbys)
    const filter = NameValueUtil.toValue(profile.filter_coefficient, enumMap.filters)
    const en3w = profile.spi !== undefined ? profile.spi.enable3w : 0

    const ctrl_meas = BitUtil.packBits([[7, 3], [4, 3], [1, 2]], [os_t, os_p, mode])
    const config = BitUtil.packBits([[7, 3], [4, 3], [0, 1]], [sb_t, filter, en3w])

    return Promise.all([
      bus.writeI2cBlock(0xF4, Uint8Array.from([ ctrl_meas ])),
      bus.writeI2cBlock(0xF5, Uint8Array.from([ config ]))
    ])
  }

  static patchProfile(bus, patch) {
    throw new Error('patch profile unavailable');
  }

  static async measurement(bus, calibration) {
    const abuffer = await BusUtil.readI2cBlocks(bus, [[0xF7, 6]])
    const dv = new DataView(abuffer)

    const pres_msb = dv.getUint8(0)
    const pres_lsb = dv.getUint8(1)
    const pres_xlsb = dv.getUint8(2)
    const adcP = BitUtil.reconstruct20bit(pres_msb, pres_lsb, pres_xlsb)

    const temp_msb = dv.getUint8(3)
    const temp_lsb = dv.getUint8(4)
    const temp_xlsb = dv.getUint8(5)
    const adcT = BitUtil.reconstruct20bit(temp_msb, temp_lsb, temp_xlsb)

    const P = bmp280.skip_value === adcP ? false : adcP
    const T = bmp280.skip_value === adcT ? false : adcT

    return Compensate.from({ adcP: P, adcT: T, adcH: false, type: '2xy' }, calibration)
  }

  static async ready(bus) {
    const abuffer = await BusUtil.readI2cBlocks(bus, [[0xF3, 1]])
    const dv = new DataView(abuffer)

    const status = dv.getUint8(0)
    const measuring = BitUtil.mapBits(status, [3, 1]) === 1
    const updating = BitUtil.mapBits(status, [0, 1]) === 1
    return {
      ready: !measuring,
      measuring: measuring,
      updating: updating
    }
  }

  static estimateMeasurementWait(profile) {
    // TODO
    return { totalWaitMs: 0 };
  }
}
