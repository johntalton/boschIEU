/* eslint-disable no-magic-numbers */
import { BusUtil, BitUtil } from '@johntalton/and-other-delights'

import { NameValueUtil } from '../nvutil.js'

import { genericChip, enumMap } from './generic.js'
import { Compensate } from './compensate.js'

// Chip ID
const CHIP_ID = 0x60

// Registers
const PRESS_MSB = 0xF7
const CONFIG = 0xF5
const CTRL_MEAS = 0xF4
const STATUS = 0xF3
const CTRL_HUM = 0xF2
const CALIB26 = 0xE1
// const CHIIP_ID = 0xE0
// const RESET = 0xD0
const CALIB00 = 0x88

// Registers
const REGISTER = {
  PRESS_MSB,
  CONFIG,
  CTRL_MEAS,
  STATUS,
  CTRL_HUM,
  CALIB26,
  CALIB00
};

// Calibration
const CALIBRATION_TP_START_ADDRESS = REGISTER.CALIB00
const CALIBRATION_H_START_ADDRESS = REGISTER.CALIB26
const CALIBRATION_TP_LENGTH = 25
const CALIBRATION_H_LENGTH = 7
const CALIBRATION_BLOCK = [
  [CALIBRATION_TP_START_ADDRESS, CALIBRATION_TP_LENGTH],
  [CALIBRATION_H_START_ADDRESS, CALIBRATION_H_LENGTH]
];

// Profile
const PROFILE_START_ADDRESS = REGISTER.CTRL_HUM
const PROFILE_LENGTH = 4
const PROFILE_BLOCK = [[PROFILE_START_ADDRESS, PROFILE_LENGTH]]

// Measurement
const MEASUREMENT_START_ADDRESS = REGISTER.PRESS_MSB
const MEASUREMENT_LENGTH = 8
const MEASUREMENT_BLOCK = [[MEASUREMENT_START_ADDRESS, MEASUREMENT_LENGTH]]

// Status
const STATUS_START_ADDRESS = REGISTER.STATUS
const STATUS_LENGTH = 1
const STATUS_BLOCK = [[STATUS_START_ADDRESS, STATUS_LENGTH]]

//
export class bme280 extends genericChip {
  static get name() { return 'bme280' }
  static get chipId() { return CHIP_ID }

  static get features() {
    return {
      pressure: true,
      temperature: true,
      humidity: true,
      gas: false,
      normalMode: true,
      interrupt: false,
      fifo: false,
      time: false
    };
  }

  static async calibration(bus) {
    const abuffer = await BusUtil.readI2cBlocks(bus, CALIBRATION_BLOCK)
    const dv = new DataView(abuffer)

    const dig_T1 = dv.getUint16(0, true)
    const dig_T2 = dv.getInt16(2, true)
    const dig_T3 = dv.getInt16(4, true)

    const dig_P1 = dv.getInt16(6, true)
    const dig_P2 = dv.getInt16(8, true)
    const dig_P3 = dv.getInt16(10, true)
    const dig_P4 = dv.getInt16(12, true)
    const dig_P5 = dv.getInt16(14, true)
    const dig_P6 = dv.getInt16(16, true)
    const dig_P7 = dv.getInt16(18, true)
    const dig_P8 = dv.getInt16(20, true)
    const dig_P9 = dv.getInt16(22, true)

    const T = [dig_T1, dig_T2, dig_T3];
    const P = [
      dig_P1, dig_P2, dig_P3,
      dig_P4, dig_P5, dig_P6,
      dig_P7, dig_P8, dig_P9
    ]

    const dig_H1 = dv.getUint8(24)
    // boundary packed
    const dig_H2 = dv.getInt16(25, true)
    const dig_H3 = dv.getUint8(27)
    const e4 = dv.getUint8(28)
    const e5 = dv.getUint8(29)
    const e6 = dv.getUint8(30)
    const dig_H6 = dv.getInt8(31)

    const dig_H4 = (e4 << 4) | (e5 & 0b1111)
    const dig_H5 = (e6 << 4) | (e5 >> 4)

    const H = [dig_H1, dig_H2, dig_H3, dig_H4, dig_H5, dig_H6]

    return { T, P, H, G: [] }
  }

  static async profile(bus) {
    const abuffer = await BusUtil.readI2cBlocks(bus, PROFILE_BLOCK)
    const dv = new DataView(abuffer)

    const ctrl_hum = dv.getUint8(0)
    const status = dv.getUint8(1)
    const ctrl_meas = dv.getUint8(2)
    const config = dv.getUint8(3)

    const osrs_h = BitUtil.mapBits(ctrl_hum, 2, 3)

    const measuring = BitUtil.mapBits(status, 3, 1) === 1
    const updating = BitUtil.mapBits(status, 0, 1) === 1

    const osrs_t = BitUtil.mapBits(ctrl_meas, 7, 3)
    const osrs_p = BitUtil.mapBits(ctrl_meas, 4, 3)
    const mode = BitUtil.mapBits(ctrl_meas, 1, 2)

    const t_sb = BitUtil.mapBits(config, 7, 3)
    const filter = BitUtil.mapBits(config, 4, 3)
    const spi_3w_en = BitUtil.mapBits(config, 0, 1) === 1

    return {
      mode: NameValueUtil.toName(mode, enumMap.modes),
      oversampling_p: NameValueUtil.toName(osrs_p, enumMap.oversamples),
      oversampling_t: NameValueUtil.toName(osrs_t, enumMap.oversamples),
      oversampling_h: NameValueUtil.toName(osrs_h, enumMap.oversamples),
      filter_coefficient: NameValueUtil.toName(filter, enumMap.filters),
      standby_time: NameValueUtil.toName(t_sb, enumMap.standbys_hires),

      spi: {
        enable3w: spi_3w_en
      },
      ready: {
        ready: !measuring,
        measuring: measuring,
        updating: updating
      }
    };
  }

  static async setProfile(bus, profile) {
    const mode = NameValueUtil.toValue(profile.mode, enumMap.modes);

    const os_p = NameValueUtil.toValue(profile.oversampling_p, enumMap.oversamples)
    const os_t = NameValueUtil.toValue(profile.oversampling_t, enumMap.oversamples)
    const os_h = NameValueUtil.toValue(profile.oversampling_h, enumMap.oversamples)
    const sb_t = NameValueUtil.toValue(profile.standby_time, enumMap.standbys_hires)
    const filter = NameValueUtil.toValue(profile.filter_coefficient, enumMap.filters)
    const en3w = profile.spi !== undefined ? profile.spi.enable3w : false

    const ctrl_hum = BitUtil.packBits([[2, 3]], [os_h])
    const ctrl_meas = BitUtil.packBits([[7, 3], [4, 3], [1, 2]], [os_t, os_p, mode])
    const config = BitUtil.packBits([[7, 3], [4, 3], [0, 1]], [sb_t, filter, en3w])

    // TODO this should call serial promises, `all` does not guarantee order
    return Promise.all([
      bus.writeI2cBlock(REGISTER.CTRL_HUM, Uint8Array.from([ ctrl_hum ])),
      bus.writeI2cBlock(REGISTER.CTRL_MEAS, Uint8Array.from([ ctrl_meas ])),
      bus.writeI2cBlock(REGISTER.CONFIG, Uint8Array.from([ config ]))
    ]);
  }

  static patchProfile(bus, patch) {
    throw new Error('patch profile unavailable');
  }

  static async measurement(bus, calibration) {
    const abuffer = await BusUtil.readI2cBlocks(bus, MEASUREMENT_BLOCK)
    const dv = new DataView(abuffer)

    const pres_msb = dv.getUint8(0)
    const pres_lsb = dv.getUint8(1)
    const pres_xlsb = dv.getUint8(2)
    const adcP = BitUtil.reconstruct20bit(pres_msb, pres_lsb, pres_xlsb)

    const temp_msb = dv.getUint8(3)
    const temp_lsb = dv.getUint8(4)
    const temp_xlsb = dv.getUint8(5)
    const adcT = BitUtil.reconstruct20bit(temp_msb, temp_lsb, temp_xlsb)

    const adcH = dv.getUint16(6, false)

    const P = bme280.skip_value === adcP ? false : adcP
    const T = bme280.skip_value === adcT ? false : adcT
    const H = bme280.skip_value === adcH ? false : adcH

    const base = { adcP: P, adcT: T, adcH: H, type: '2xy' }

    return Compensate.from(base, calibration)
  }

  static async ready(bus) {
    const abuffer = await BusUtil.readI2cBlocks(bus, STATUS_BLOCK)
    const dv = new DataView(abuffer)

    const status = dv.getUint8(0)

    const measuring = BitUtil.mapBits(status, 3, 1) === 1
    const updating = BitUtil.mapBits(status, 0, 1) === 1

    return {
      ready: !measuring,
      measuring,
      updating
    };
  }

  static estimateMeasurementWait(profile) {
    // TODO
    return { totalWaitMs: 0 }
  }
}
