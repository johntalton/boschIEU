import { BitSmush } from '@johntalton/bitsmush'
//

import { NameValueUtil } from '../nvutil.js'
import { BusUtil } from '../util.js'
import { Bits } from './bits.js'
//

import { Compensate } from './compensate.js'
import { enumMap, GENERIC_OVERSAMPLES, GenericChip } from './generic.js'

/** @import { I2CAddressedBus } from '@johntalton/and-other-delights' */
/** @import { Profile2xx, ProfileReady } from '../types/profile.js' */
/** @import { CompensateResult } from './compensate.js' */
/** @import { Calibration } from '../types/calibration.js' */
/** @import { Features } from '../types/features.js' */
/** @import { ChipKind } from './chip.js'  */

export const REGISTERS = {
	CALIB_00: 0x88,

	ID: 0xD0,
	RESET: 0xE0,

	STATUS: 0xF3,
	CTRL_MEAS: 0xF4,
	CONFIG: 0xF5,

	PRESS_MSB: 0xF7,
	TEMP_MSB: 0xFA
}

export const RESET_MAGIC = 0xB6
export const SKIP_VALUE = 0x08_00_00

/** @type {Array<[ number, number ]>} */
export const CALIBRATION_BLOCK = [ [ REGISTERS.CALIB_00, 26 ] ]

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
			modes: [ 'sleep', 'forced', 'normal' ]
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
		const spi_3w_en = BitSmush.extractBits(config, 0, 1) === 1

		return {
			mode: NameValueUtil.toName(mode, enumMap.modes),
			oversampling_p: NameValueUtil.toName(osrs_p, GENERIC_OVERSAMPLES),
			oversampling_t: NameValueUtil.toName(osrs_t, GENERIC_OVERSAMPLES),
			filter_coefficient: NameValueUtil.toName(filter, enumMap.filters),
			standby_time: NameValueUtil.toName(t_sb, enumMap.standbys),
			spi: {
				enable3w: spi_3w_en
			},
			ready: {
				ready: !measuring,
				measuring,
				updating
			}
		}
	}

	/**
	 * @override
	 * @param {I2CAddressedBus} bus
	 * @param {Partial<Profile>} profile
	 * @returns {Promise<void>}
	 */
	static async setProfile(bus, profile) {
		const mode = NameValueUtil.toValue(profile.mode, enumMap.modes)
		const os_p = NameValueUtil.toValue(profile.oversampling_p, GENERIC_OVERSAMPLES)
		const os_t = NameValueUtil.toValue(profile.oversampling_t, GENERIC_OVERSAMPLES)
		const sb_t = NameValueUtil.toValue(profile.standby_time, enumMap.standbys)
		const filter = NameValueUtil.toValue(profile.filter_coefficient, enumMap.filters)
		const en3w = profile.spi === undefined ? 0 : profile.spi.enable3w

		const ctrl_meas = BitSmush.smushBits([[7, 3], [4, 3], [1, 2]], [os_t, os_p, mode])
		const config = BitSmush.smushBits([[7, 3], [4, 3], [0, 1]], [sb_t, filter, en3w])

		await Promise.all([
			bus.writeI2cBlock(0xF4, Uint8Array.from([ctrl_meas])),
			bus.writeI2cBlock(0xF5, Uint8Array.from([config]))
		])
	}

	/**
	 * @override
	 * @param {I2CAddressedBus} bus
	 * @param {Calibration} calibration
	 * @returns {Promise<CompensateResult>}
	 */
	static async measurement(bus, calibration) {
		const aBuffer = await BusUtil.readI2cBlocks(bus, [[0xF7, 6]])
		const dv = ArrayBuffer.isView(aBuffer) ?
			new DataView(aBuffer.buffer, aBuffer.byteOffset) :
			new DataView(aBuffer)

		const pres_msb = dv.getUint8(0)
		const pres_lsb = dv.getUint8(1)
		const pres_xlsb = dv.getUint8(2)
		const adcP = Bits.reconstruct20bit(pres_msb, pres_lsb, pres_xlsb)

		const temp_msb = dv.getUint8(3)
		const temp_lsb = dv.getUint8(4)
		const temp_xlsb = dv.getUint8(5)
		const adcT = Bits.reconstruct20bit(temp_msb, temp_lsb, temp_xlsb)

		const P = bmp280.skip_value === adcP ? false : adcP
		const T = bmp280.skip_value === adcT ? false : adcT

		return Compensate.from({
				adcP: P,
				adcT: T,
				adcH: false,
				adcG: false,
				type: '2xy'
			}, calibration)
	}

	/**
	 * @override
	 * @param {I2CAddressedBus} bus
	 * @returns {Promise<ProfileReady>}
	 */
	static async ready(bus) {
		const aBuffer = await BusUtil.readI2cBlocks(bus, [[0xF3, 1]])
		const dv = ArrayBuffer.isView(aBuffer) ?
			new DataView(aBuffer.buffer, aBuffer.byteOffset) :
			new DataView(aBuffer)

		const status = dv.getUint8(0)
		const measuring = BitSmush.extractBits(status, 3, 1) === 1
		const updating = BitSmush.extractBits(status, 0, 1) === 1

		return {
			ready: !measuring,
			measuring,
			updating
		}
	}

	/**
	 * @param {Profile} profile
	 */
	static estimateMeasurementWait(profile) {
		// TODO
		return { totalWaitMs: 0 }
	}
}
