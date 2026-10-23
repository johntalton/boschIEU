import { BitSmush } from '@johntalton/bitsmush'
//

import { Bits } from '../util/bits.js'
import { NameValueUtil } from '../util/nvutil.js'
import { BusUtil } from '../util/util.js'
//

import { Compensate } from './compensate.js'
import { GENERIC_FILTER, GENERIC_OVERSAMPLES, GENERIC_SPI_MODE, GenericChip } from './generic.js'

/** @import { I2CAddressedBus } from '@johntalton/and-other-delights' */
/** @import { Profile2xx, ProfileModes, ModeProfile } from '../types/profile.js' */
/** @import { Measurement2xx } from '../types/measurement.js' */
/** @import { Calibration } from '../types/calibration.js' */
/** @import { Features } from '../types/features.js' */
/** @import { ChipKind } from './chip.js'  */
/** @import { NVMap } from '../util/nvutil.js' */

/** @type {NVMap<Extract<ProfileModes, 'SLEEP'|'FORCED'|'NORMAL'>>} */
export const MODES = [
	{ name: 'SLEEP',  value: 0 },
	{ name: 'FORCED', value: 1 },
	{ name: 'NORMAL', value: 3 }
]

/** @type {NVMap<number>} */
export const STANDBY_TIME = [ // bmp280
    { name:  0.5, value: 0 }, //    0.5 ms
    { name: 62.5, value: 1 }, //   62.5
    { name:  125, value: 2 }, //  125
    { name:  250, value: 3 }, //  250
    { name:  500, value: 4 }, //  500
    { name: 1000, value: 5 }, // 1000
    { name: 2000, value: 6 }, // 2000
    { name: 4000, value: 7 }, // 4000
  ]

export const REGISTERS = {
	CALIBRATION_00: 0x88,

	ID: 0xD0,
	RESET: 0xE0,

	STATUS: 0xF3,
	CTRL_MEAS: 0xF4,
	CONFIG: 0xF5,

	PRESS_MSB: 0xF7,
	TEMP_MSB: 0xFA
}

export const CTRL_MEAS_MODE_MASK = 0b0000_0011

export const RESET_MAGIC = 0xB6
export const SKIP_VALUE_20_BIT = 0x08_00_00

/** @type {Array<[ number, number ]>} */
export const CALIBRATION_BLOCK = [ [ REGISTERS.CALIBRATION_00, 26 ] ]

/** @type {Array<[ number, number ]>} */
export const PROFILE_BLOCK = [ [ REGISTERS.STATUS, 3 ] ]

/** @type {Array<[ number, number ]>} */
export const MEASUREMENT_BLOCK = [ [ REGISTERS.PRESS_MSB, 6 ] ]


export class bmp280 extends GenericChip {
	/**
	 * @override
	 */
	static get name() { return 'bmp280' }

	/**
	 * @override
	 * @returns {ChipKind}
	 */
	static get kind() { return '2xx' }


	/**
	 * @override
	 * @returns {Features}
	 */
	static get features() {
		return {
			pressure: true,
			temperature: true,
			humidity: false,
			gas: false,
			normalMode: true,
			interrupt: false,
			fifo: false,
			time: false,
			modes: [ 'SLEEP', 'FORCED', 'NORMAL' ]
		}
	}

  /**
	 * @override
	 * @param {I2CAddressedBus} bus
	 * @returns {Promise<void>}
	 */
  static async reset(bus) {
    await bus.writeI2cBlock(REGISTERS.RESET, Uint8Array.from([ RESET_MAGIC ]))
  }

	/**
	 * @override
	 * @param {I2CAddressedBus} bus
	 * @returns {Promise<Calibration>}
	 */
	static async calibration(bus) {
		const aBuffer = await BusUtil.readI2cBlocks(bus, CALIBRATION_BLOCK)
		const dv = ArrayBuffer.isView(aBuffer) ?
			new DataView(aBuffer.buffer, aBuffer.byteOffset) :
			new DataView(aBuffer)

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

		const T = [ dig_T1, dig_T2, dig_T3 ]
		const P = [
			dig_P1, dig_P2, dig_P3,
			dig_P4, dig_P5, dig_P6,
			dig_P7, dig_P8, dig_P9
		]

		return {
			T, P,
			H: []
		}
	}

	/**
	 * @override
	 * @param {I2CAddressedBus} bus
	 * @returns {Promise<Profile2xx>}
	 */
	static async profile(bus) {
		const aBuffer = await BusUtil.readI2cBlocks(bus, PROFILE_BLOCK)
		const dv = ArrayBuffer.isView(aBuffer) ?
			new DataView(aBuffer.buffer, aBuffer.byteOffset) :
			new DataView(aBuffer)

		const status = dv.getUint8(0)
		const ctrl_meas = dv.getUint8(1)
		const config = dv.getUint8(2)

		const measuring = BitSmush.extractBits(status, 3, 1) === 1
		const updating = BitSmush.extractBits(status, 0, 1) === 1

		const osrs_t = BitSmush.extractBits(ctrl_meas, 7, 3)
		const osrs_p = BitSmush.extractBits(ctrl_meas, 4, 3)
		const mode = BitSmush.extractBits(ctrl_meas, 1, 2)

		const t_sb = BitSmush.extractBits(config, 7, 3)
		const filter = BitSmush.extractBits(config, 4, 3)
		const spi_3w_en = BitSmush.extractBits(config, 0, 1)

		return {
			mode: NameValueUtil.toName(mode, MODES),
			oversampling_p: NameValueUtil.toName(osrs_p, GENERIC_OVERSAMPLES),
			oversampling_t: NameValueUtil.toName(osrs_t, GENERIC_OVERSAMPLES),
			filter_coefficient: NameValueUtil.toName(filter, GENERIC_FILTER),
			standby_time: NameValueUtil.toName(t_sb, STANDBY_TIME),
			spi: {
				page: 0,
				mode: NameValueUtil.toName(spi_3w_en, GENERIC_SPI_MODE),
			},
			ready: {
				measuring,
				updating
			}
		}
	}

	/**
	 * @override
	 * @param {I2CAddressedBus} bus
	 * @param {Profile2xx} profile
	 * @returns {Promise<void>}
	 */
	static async setProfile(bus, profile) {
		const mode = NameValueUtil.toValue(profile.mode, MODES)
		const os_p = NameValueUtil.toValue(profile.oversampling_p, GENERIC_OVERSAMPLES)
		const os_t = NameValueUtil.toValue(profile.oversampling_t, GENERIC_OVERSAMPLES)
		const sb_t = NameValueUtil.toValue(profile.standby_time, STANDBY_TIME)
		const filter = NameValueUtil.toValue(profile.filter_coefficient, GENERIC_FILTER)
		const spi_3w_en = NameValueUtil.toValue(profile.spi.mode, GENERIC_SPI_MODE)

		const ctrl_meas = BitSmush.smushBits([[7, 3], [4, 3], [1, 2]], [os_t, os_p, mode])
		const config = BitSmush.smushBits([[7, 3], [4, 3], [0, 1]], [sb_t, filter, spi_3w_en])

		await bus.writeI2cBlock(REGISTERS.CTRL_MEAS, Uint8Array.from([
			ctrl_meas & ~CTRL_MEAS_MODE_MASK,

			REGISTERS.CONFIG, config,
			REGISTERS.CTRL_MEAS, ctrl_meas
		]))
	}

	/**
	 * @override
	 * @param {I2CAddressedBus} bus
	 * @param {ModeProfile} profile
	 * @returns {Promise<void>}
	 */
	static async setMode(bus, profile) {
		const mode = NameValueUtil.toValue(profile.mode, MODES)
		const os_p = NameValueUtil.toValue(profile.oversampling_p, GENERIC_OVERSAMPLES)
		const os_t = NameValueUtil.toValue(profile.oversampling_t, GENERIC_OVERSAMPLES)

		const ctrl_meas = BitSmush.smushBits([[7, 3], [4, 3], [1, 2]], [os_t, os_p, mode])

		await bus.writeI2cBlock(REGISTERS.CTRL_MEAS, Uint8Array.from([
			ctrl_meas
		]))
	}

	/**
	 * @override
	 * @param {I2CAddressedBus} bus
	 * @param {Calibration} calibration
	 * @returns {Promise<Measurement2xx>}
	 */
	static async measurement(bus, calibration) {
		const aBuffer = await BusUtil.readI2cBlocks(bus, [[0xF7, 6]])
		const dv = ArrayBuffer.isView(aBuffer) ?
			new DataView(aBuffer.buffer, aBuffer.byteOffset) :
			new DataView(aBuffer)

		const pres_msb = dv.getUint8(0)
		const pres_lsb = dv.getUint8(1)
		const pres_xlsb_ext = dv.getUint8(2)
		const pres_xlsb = BitSmush.extractBits(pres_xlsb_ext, 7, 4)
		const adcP = Bits.reconstruct20bit(pres_msb, pres_lsb, pres_xlsb)

		const temp_msb = dv.getUint8(3)
		const temp_lsb = dv.getUint8(4)
		const temp_xlsb_ext = dv.getUint8(5)
		const temp_xlsb = BitSmush.extractBits(temp_xlsb_ext, 7, 4)
		const adcT = Bits.reconstruct20bit(temp_msb, temp_lsb, temp_xlsb)

		const P = SKIP_VALUE_20_BIT === adcP ? false : adcP
		const T = SKIP_VALUE_20_BIT === adcT ? false : adcT

		return Compensate.from({
				adcP: P,
				adcT: T,
				adcH: false,
				adcG: false,
				type: '2xx'
			}, calibration)
	}

	// /**
	//  * @override
	//  * @param {I2CAddressedBus} bus
	//  * @returns {Promise<ProfileReady>}
	//  */
	// static async ready(bus) {
	// 	const aBuffer = await BusUtil.readI2cBlocks(bus, [[0xF3, 1]])
	// 	const dv = ArrayBuffer.isView(aBuffer) ?
	// 		new DataView(aBuffer.buffer, aBuffer.byteOffset) :
	// 		new DataView(aBuffer)

	// 	const status = dv.getUint8(0)
	// 	const measuring = BitSmush.extractBits(status, 3, 1) === 1
	// 	const updating = BitSmush.extractBits(status, 0, 1) === 1

	// 	return {
	// 		ready: !measuring,
	// 		measuring,
	// 		updating
	// 	}
	// }

	// /**
	//  * @param {Profile} profile
	//  */
	// static estimateMeasurementWait(profile) {
	// 	// TODO
	// 	return { totalWaitMs: 0 }
	// }
}
