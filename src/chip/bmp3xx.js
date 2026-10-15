/** biome-ignore-all lint/style/noExcessiveLinesPerFile: <explanation> */
import { BitSmush } from '@johntalton/bitsmush'
//

import { NameValueUtil } from '../nvutil.js'
import { BusUtil } from '../util.js'
import { reconstruct9bit, reconstruct24bit } from './bits.js'
//

import { Compensate } from './compensate.js'
import { enumMap, GENERIC_FILTER_EXT, GenericChip } from './generic.js'
//

import { bmp3xxFifo } from './fifo/index.js'

/** @import { I2CAddressedBus } from '@johntalton/and-other-delights' */
/** @import { Profile3xx, ProfileReady } from '../types/profile.js' */
/** @import { CompensateResult } from './compensate.js' */
/** @import { Calibration } from '../types/calibration.js' */
/** @import { Features } from '../types/features.js' */
/** @import { ChipKind } from './chip.js'  */

export const OVERSAMPLES_3XX = [
	{ name: 1, value: 0x0 },
	{ name: 2, value: 0x1 },
	{ name: 4, value: 0x2 },
	{ name: 8, value: 0x3 },
	{ name: 16, value: 0x4 },
	{ name: 32, value: 0x5 },

	// to support the use of `false` as a indicator
	//   for disabled the measurement, as was used
	//   in the generic chips.
	// returning 0 (no oversampling) when setting
	//   disabled (this can be used as a signature / fingerprint
	//   of our profile code - randomize)
	{ name: false, value: 0 }
]

const watchdogtimes = [
	{ name: 'SHORT', value: 0 },
	{ name: 'LONG', value: 1 },

	{ name: false, value: 0 } // just pick one (that is, zero)
]

export const ODR_PRESCALER = [
	{ name: 1, value: 0x00 },
	{ name: 2, value: 0x01 },
	{ name: 4, value: 0x02 },
	{ name: 8, value: 0x03 },
	{ name: 16, value: 0x04 },
	{ name: 32, value: 0x05 },
	{ name: 64, value: 0x06 },
	{ name: 127, value: 0x07 },
	{ name: 256, value: 0x08 },
	{ name: 512, value: 0x09 },
	{ name: 1024, value: 0x0A },
	{ name: 2048, value: 0x0B },
	{ name: 4096, value: 0x0C },
	{ name: 8192, value: 0x0D },
	{ name: 16_384, value: 0x0E },
	{ name: 32_768, value: 0x0F },
	{ name: 65_536, value: 0x10 },
	{ name: 131_072, value: 0x11 }
]

const dataselects = [
	{ name: 'unfiltered', value: 0x00 },
	{ name: 'filtered', value: 0x01 }
]


const TEMP_ENABLED = 1
const TEMP_DISABLED = 0
const PRESS_ENABLED = 1
const PRESS_DISABLED = 0
const WATCHDOG_ENABLED = 1
const WATCHDOG_DISABLED = 0
const SPI3 = 1
// const SPI4 = 0

// const INTERRUPT = {
const ONREADY_ENABLED = 1
const ONREADY_DISABLED = 0
const ONFULL_ENABLED = 1
const ONFULL_DISABLED = 0
const ONWATER_ENABLED = 1
const ONWATER_DISABLED = 0
const LATCHED = 1
const NON_LATCHED = 0
const INT_OPEN_DRAIN = 1
const INT_PUSH_PULL = 0
const INT_ACTIVE_HIGH = 1
const INT_ACTIVE_LOW = 0
// }

const FIFO = {
	TEMP_ENABLED: 1,
	TEMP_DISABLED: 0,
	PRESS_ENABLED: 1,
	PRESS_DISABLED: 0,
	TIME_ENABLED: 1,
	TIME_DISABLED: 0,
	FULL_STOP_ENABLED: 1,
	FULL_STOP_DISABLED: 0,
	ENABLED: 1,
	DISABLED: 0
}

const DEFAULT_MODE = 'SLEEP'
const DEFAULT_FILTER_COEFFICIENT = false
const DEFAULT_PRESCALER = 1
const DEFAULT_OVERSAMPLING_PRESS = 1 // todo data sheet disagrees
const DEFAULT_OVERSAMPLING_TEMP = 1
const DEFAULT_WATCHDOG = false
const DEFAULT_INT_MODE = 'active-high'
const DEFAULT_LATCHED = false
const DEFAULT_ON_FIFO_WM = false
const DEFAULT_ON_FIFO_FULL = false
const DEFAULT_ON_READY = false
const DEFAULT_FIFO_ACTIVE = false
const DEFAULT_FIFO_HIGH_WATERMARK = 1
const DEFAULT_FIFO_DATA = 'unfiltered'
const DEFAULT_FIFO_SUBSAMPLING = 0 // todo the data sheet states 2
const DEFAULT_FIFO_STOP_ON_FULL = true
const DEFAULT_FIFO_TEMP = false
const DEFAULT_FIFO_PRESS = false
const DEFAULT_FIFO_TIME = false

/** @type {Profile} */
const DEFAULT_PROFILE = {
	filter_coefficient: DEFAULT_FILTER_COEFFICIENT,
	standby_prescaler: DEFAULT_PRESCALER,
	oversampling_p: DEFAULT_OVERSAMPLING_PRESS,
	oversampling_t: DEFAULT_OVERSAMPLING_TEMP,
	mode: DEFAULT_MODE,
	watchdog: DEFAULT_WATCHDOG,

	interrupt: {
		mode: DEFAULT_INT_MODE,
		latched: DEFAULT_LATCHED,
		onFifoWatermark: DEFAULT_ON_FIFO_WM,
		onFifoFull: DEFAULT_ON_FIFO_FULL,
		onReady: DEFAULT_ON_READY
	},

	fifo: {
		active: DEFAULT_FIFO_ACTIVE,
		highWatermark: DEFAULT_FIFO_HIGH_WATERMARK,
		data: DEFAULT_FIFO_DATA,
		subsampling: DEFAULT_FIFO_SUBSAMPLING,
		stopOnFull: DEFAULT_FIFO_STOP_ON_FULL,
		temp: DEFAULT_FIFO_TEMP,
		press: DEFAULT_FIFO_PRESS,
		time: DEFAULT_FIFO_TIME
	}
}


// const MAX_BLOCK_SIZE = 32
// const BLOCK_LIMIT = MAX_BLOCK_SIZE * Infinity


export const REGISTERS = {
	CHIP_ID: 0x00,
	REV_ID: 0x01,
	ERR_REG: 0x02,
	STATUS: 0x03,
	DATA_0: 0x04,
	DATA_1: 0x05,
	DATA_2: 0x06,
	DATA_3: 0x07,
	DATA_4: 0x08,
	DATA_5: 0x09,
	// RESERVED: 0x0A,
	// RESERVED: 0x0B,
	SENSOR_TIME_0: 0x0C,
	SENSOR_TIME_1: 0x0D,
	SENSOR_TIME_2: 0x0E,
	// RESERVED: 0x0F,
	EVENT: 0x10,
	INT_STATUS: 0x11,
	FIFO_LENGTH_0: 0x12,
	FIFO_LENGTH_1: 0x13,
	FIFO_DATA: 0x14,
	FIFO_WTM_0: 0x15,
	FIFO_WTM_1: 0x16,
	FIFO_CONFIG_1: 0x17,
	FIFO_CONFIG_2: 0x18,
	INT_CTRL: 0x19,
	IF_CONF: 0x1A,
	PWR_CTRL: 0x1B,
	OSR: 0x1C,
	ODR: 0x1D,
	// RESERVED: 0x1E,
	CONFIG: 0x1F,
	// RESERVED: 0x20,

	CMD: 0x7E

}

export const RESET_MAGIC = 0xB6

/** @type {Array<[ number, number ]>} */
export const PROFILE_BLOCK = [ [ REGISTERS.FIFO_WTM_0, 11 ] ]




/**
 * @param {string|undefined} mode
 */
export function interruptMode(mode) {
	const INT_DEFAULT_MODE = { od: INT_PUSH_PULL, level: INT_ACTIVE_HIGH }

	if (mode === undefined || mode === '') { return INT_DEFAULT_MODE }
	const od = mode.toLowerCase() === 'open-drain' ? INT_OPEN_DRAIN : INT_PUSH_PULL
	const level = mode.toLowerCase() === 'active-high' ? INT_ACTIVE_HIGH : INT_ACTIVE_LOW
	return { od, level }
}

/**
 * @param {number} opendrain
 * @param {number} level
 */
export function modeFrom(opendrain, level) {
	if (opendrain === INT_OPEN_DRAIN) { return 'open-drain' }
	if (level === INT_ACTIVE_HIGH) { return 'active-high' }
	if (level === INT_ACTIVE_LOW) { return 'active-low' }
	throw new Error('unknown mode')
}


/**
 *
 */
export class bmp3xx extends GenericChip {
	/**
	 * @override
	 */
	static get name() { return 'bmp3xx' }

	/**
	 * @override
	 * @returns {ChipKind}
	 */
	static get kind() { return '3xx' }


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
			interrupt: true,
			fifo: true,
			time: true,
			modes: [ 'SLEEP', 'FORCED', 'NORMAL' ]
		}
	}

	/**
	 * @param {I2CAddressedBus} bus
	 * @param {number} command
	 * @returns {Promise<void>}
	 */
	static async sendCommand(bus, command) {
		await bus.writeI2cBlock(REGISTERS.CMD, Uint8Array.from([ command ]))
	}

	/**
	 * @override
	 * @param {I2CAddressedBus} bus
	 * @returns {Promise<void>}
	 */
	static async reset(bus) {
		await bmp3xx.sendCommand(bus, RESET_MAGIC)
	}

	/**
	 * @override
	 */
	static get fifo() { return bmp3xxFifo }

	/**
	 * @override
	 * @param {I2CAddressedBus} bus
	 */
	static async sensorTime(bus) {
		// todo  bmp384 has 32-bit sensor time
		//  bmp388 / bmp390 has 24-bit sensor time
		const aBuffer = await BusUtil.readI2cBlocks(bus, [[0xC0, 3]])
		const u8 = ArrayBuffer.isView(aBuffer) ?
			new Uint8Array(aBuffer.buffer, aBuffer.byteOffset) :
			new Uint8Array(aBuffer)

		const [ time_0_7, time_15_8, time_23_16 ] = u8

		if(time_0_7 === undefined) { throw new Error('time undefined') }
		if(time_15_8 === undefined) { throw new Error('time undefined') }
		if(time_23_16 === undefined) { throw new Error('time undefined') }

		return reconstruct24bit(time_23_16, time_15_8, time_0_7)
	}

	/**
	 * @override
	 * @param {I2CAddressedBus} bus
	 * @returns {Promise<Calibration>}
	 */
	static async calibration(bus) {
		// console.log('bmp3xx calibration')
		const aBuffer = await BusUtil.readI2cBlocks(bus, [[0x31, 21]])
		const dv = ArrayBuffer.isView(aBuffer) ?
			new DataView(aBuffer.buffer, aBuffer.byteOffset) :
			new DataView(aBuffer)

		const nvm_par_T1 = dv.getUint16(0, true)
		const nvm_par_T2 = dv.getUint16(2, true)
		const nvm_par_T3 = dv.getInt8(4)

		const nvm_par_P1 = dv.getInt16(5, true)
		const nvm_par_P2 = dv.getInt16(7, true)
		const nvm_par_P3 = dv.getInt8(9)
		const nvm_par_P4 = dv.getInt8(10)
		const nvm_par_P5 = dv.getUint16(11, true)
		const nvm_par_P6 = dv.getUint16(13, true)
		const nvm_par_P7 = dv.getInt8(15)
		const nvm_par_P8 = dv.getInt8(16)
		const nvm_par_P9 = dv.getInt16(17, true)
		const nvm_par_P10 = dv.getInt8(19)
		const nvm_par_P11 = dv.getInt8(20)

		const par_T1 = nvm_par_T1 / Math.pow(2, -8)
		const par_T2 = nvm_par_T2 / Math.pow(2, 30)
		const par_T3 = nvm_par_T3 / Math.pow(2, 48)

		const par_P1 = (nvm_par_P1 - Math.pow(2, 14)) / Math.pow(2, 20)
		const par_P2 = (nvm_par_P2 - Math.pow(2, 14)) / Math.pow(2, 29)
		const par_P3 = nvm_par_P3 / Math.pow(2, 32)
		const par_P4 = nvm_par_P4 / Math.pow(2, 37)
		const par_P5 = nvm_par_P5 / Math.pow(2, -3)
		const par_P6 = nvm_par_P6 / Math.pow(2, 6)
		const par_P7 = nvm_par_P7 / Math.pow(2, 8)
		const par_P8 = nvm_par_P8 / Math.pow(2, 15)
		const par_P9 = nvm_par_P9 / Math.pow(2, 48)
		const par_P10 = nvm_par_P10 / Math.pow(2, 48)
		const par_P11 = nvm_par_P11 / Math.pow(2, 65)

		const T = [par_T1, par_T2, par_T3]
		const P = [
			par_P1, par_P2, par_P3,
			par_P4, par_P5, par_P6,
			par_P7, par_P8, par_P9,
			par_P10, par_P11
		]

		return {
			T, P,
			H: [], G: []
		}
	}

	/**
	 * @param {I2CAddressedBus} bus
	 * @returns {Promise<never>}
	 */
	static async _rawProfile(bus) {
		const aBuffer = await BusUtil.readI2cBlocks(bus, PROFILE_BLOCK)
		const dv = ArrayBuffer.isView(aBuffer) ?
			new DataView(aBuffer.buffer, aBuffer.byteOffset) :
			new DataView(aBuffer)

		const config = dv.getUint8(10)
		// reserved 9
		const odr = dv.getUint8(8)
		const osr = dv.getUint8(7)
		const pwr_ctrl = dv.getUint8(6)
		const if_conf = dv.getUint8(5)
		const int_ctrl = dv.getUint8(4)
		const fifo_config_2 = dv.getUint8(3)
		const fifo_config_1 = dv.getUint8(2)
		const fifo_wtm_1 = dv.getUint8(1)
		const fifo_wtm_0 = dv.getUint8(0)

		return {
			config,
			odr,
			osr,
			pwr_ctrl,
			if_conf,
			int_ctrl,
			fifo_config_2,
			fifo_config_1,
			fifo_wtm_1,
			fifo_wtm_0
		}
	}

	/**
	 * @override
	 * @param {I2CAddressedBus} bus
	 * @param {Profile3xx} p
	 */
	static async setProfile(bus, p) {
		const defaultProfile = structuredClone(DEFAULT_PROFILE)
		const profile = { ...defaultProfile, ...p }

		//
		const intMode = interruptMode(profile.interrupt?.mode)

		if (profile.fifo === undefined || profile.fifo.highWatermark >= Math.pow(2, 9) || profile.fifo.highWatermark < 0) {
			throw new Error('invalid high watermark')
		}

		const fifoWatermark = {
			high: (profile.fifo.highWatermark >> 8) & 0x1,
			low: profile.fifo.highWatermark & 0xFF
		}

		if (profile.fifo.subsampling < 0 || profile.fifo.subsampling >= Math.pow(2, 3)) {
			throw new Error('invalid sub-sampling range')
		}

		// console.log('sub-sampling', profile.fifo.subSampling)

		//
		const iff_filter = NameValueUtil.toValue(profile.filter_coefficient, GENERIC_FILTER_EXT)
		const odr_sel = NameValueUtil.toValue(profile.standby_prescaler, ODR_PRESCALER)
		const osr_p = NameValueUtil.toValue(profile.oversampling_p, OVERSAMPLES_3XX)
		const osr_t = NameValueUtil.toValue(profile.oversampling_t, OVERSAMPLES_3XX)
		const mode = NameValueUtil.toValue(profile.mode.toUpperCase(), enumMap.modes)
		const temp_en = profile.oversampling_t === false ? TEMP_DISABLED : TEMP_ENABLED
		const press_en = profile.oversampling_p === false ? PRESS_DISABLED : PRESS_ENABLED

		const i2c_wdt_sel = NameValueUtil.toValue(profile.watchdog, watchdogtimes)
		const i2c_wdt_en = profile.watchdog === false ? WATCHDOG_DISABLED : WATCHDOG_ENABLED

		const spi3 = SPI3 // todo add support

		const drdy_en = profile.interrupt?.onReady === true ? ONREADY_ENABLED : ONREADY_DISABLED
		const ffull_en = profile.interrupt?.onFifoFull === true ? ONFULL_ENABLED : ONFULL_DISABLED
		const fwtm_en = profile.interrupt?.onFifoWatermark === true ? ONWATER_ENABLED : ONWATER_DISABLED
		const int_latch = profile.interrupt?.latched === true ? LATCHED : NON_LATCHED
		const int_level = intMode.level
		const int_od = intMode.od

		const data_select = NameValueUtil.toValue(profile.fifo.data, dataselects)
		const fifo_subsampling = profile.fifo.subsampling
		const fifo_temp_en = profile.fifo.active && profile.fifo.temp ? FIFO.TEMP_ENABLED : FIFO.TEMP_DISABLED
		const fifo_press_en = profile.fifo.active && profile.fifo.press ? FIFO.PRESS_ENABLED : FIFO.PRESS_DISABLED
		const fifo_time_en = profile.fifo.active && profile.fifo.time ? FIFO.TIME_ENABLED : FIFO.TIME_DISABLED
		const fifo_stop_on_full = profile.fifo.active && profile.fifo.stopOnFull ? FIFO.FULL_STOP_ENABLED : FIFO.FULL_STOP_DISABLED
		const fifo_mode = profile.fifo.active ? FIFO.ENABLED : FIFO.DISABLED
		const fifo_water_mark_8 = fifoWatermark.high
		const fifo_water_mark_7_0 = fifoWatermark.low

		//
		const config = BitSmush.smushBits([[3, 3]], [iff_filter])
		const odr = BitSmush.smushBits([[4, 5]], [odr_sel])
		const osr = BitSmush.smushBits([[5, 3], [2, 3]], [osr_t, osr_p])
		const pwr_ctrl = BitSmush.smushBits([[5, 2], [1, 1], [0, 1]], [mode, temp_en, press_en])
		const if_conf = BitSmush.smushBits([[2, 1], [1, 1], [0, 1]], [i2c_wdt_sel, i2c_wdt_en, spi3])
		const int_ctrl = BitSmush.smushBits([[6, 1], [4, 1], [3, 1], [2, 1], [1, 1], [0, 1]], [drdy_en, ffull_en, fwtm_en, int_latch, int_level, int_od])
		const fifo_config_2 = BitSmush.smushBits([[4, 2], [2, 3]], [data_select, fifo_subsampling])
		const fifo_config_1 = BitSmush.smushBits([[4, 1], [3, 1], [2, 1], [1, 1], [0, 1]], [fifo_temp_en, fifo_press_en, fifo_time_en, fifo_stop_on_full, fifo_mode])
		const fifo_wtm_1 = BitSmush.smushBits([[0, 1]], [fifo_water_mark_8])
		const fifo_wtm_0 = BitSmush.smushBits([[7, 8]], [fifo_water_mark_7_0])

		// todo consider using block write
		await bus.writeI2cBlock(0x1B, Uint8Array.from([0]))

		await bus.writeI2cBlock(0x15, Uint8Array.from([fifo_wtm_0]))
		await bus.writeI2cBlock(0x16, Uint8Array.from([fifo_wtm_1]))
		await bus.writeI2cBlock(0x17, Uint8Array.from([fifo_config_1]))
		await bus.writeI2cBlock(0x18, Uint8Array.from([fifo_config_2]))
		await bus.writeI2cBlock(0x19, Uint8Array.from([int_ctrl]))
		await bus.writeI2cBlock(0x1A, Uint8Array.from([if_conf]))
		// skip power control register here
		await bus.writeI2cBlock(0x1C, Uint8Array.from([osr]))
		await bus.writeI2cBlock(0x1D, Uint8Array.from([odr]))
		// 0, // reserved
		await bus.writeI2cBlock(0x1F, Uint8Array.from([config]))

		await bus.writeI2cBlock(0x1B, Uint8Array.from([pwr_ctrl]))
	}

	/**
	 * @override
	 * @param {I2CAddressedBus} bus
	 * @param {Calibration} calibration
	 * @returns {Promise<CompensateResult>}
	 */
	static async measurement(bus, calibration) {
		const aBuffer = await BusUtil.readI2cBlocks(bus, [[0x04, 12]])
		const dv = ArrayBuffer.isView(aBuffer) ?
			new DataView(aBuffer.buffer, aBuffer.byteOffset) :
			new DataView(aBuffer)

		const pres_xlsb = dv.getUint8(0)
		const pres_lsb = dv.getUint8(1)
		const pres_msb = dv.getUint8(2)
		const adcP = reconstruct24bit(pres_msb, pres_lsb, pres_xlsb)

		const temp_xlsb = dv.getUint8(3)
		const temp_lsb = dv.getUint8(4)
		const temp_msb = dv.getUint8(5)
		const adcT = reconstruct24bit(temp_msb, temp_lsb, temp_xlsb)

		// const time_7_0 = buffer.readUInt8(8)
		// const time_15_8 = buffer.readUInt8(9)
		// const time_23_16 = buffer.readUInt8(10)
		// const time_31_24 = buffer.readUInt8(11)

		// register 0x0f marked as reserved for bmp390
		// TODO the following int32 read assumes that the
		//   now reserved byte will return 0x00 which is not always true
		const time = dv.getUint32(8, true)
		// const time2 = (time_31_24 << 24) | (time_23_16 << 16) | (time_15_8 << 8) | time_7_0
		// console.log('times', time, time2, buffer.readUInt32LE(8))

		const P = bmp3xx.skip_value === adcP ? false : adcP
		const T = bmp3xx.skip_value === adcT ? false : adcT

		return Compensate.from({
				sensortime: time,
				adcP: P,
				adcT: T,
				adcH: false,
				adcG: false,
				type: '3xy'
			}, calibration)
	}

	/**
	 * @override
	 * @param {I2CAddressedBus} bus
	 * @returns {Promise<ProfileReady>}
	 */
	static async ready(bus) {
		const aBuffer = await BusUtil.readI2cBlocks(bus, [[0x02, 2], [0x10, 2]])
		const dv = ArrayBuffer.isView(aBuffer) ?
			new DataView(aBuffer.buffer, aBuffer.byteOffset) :
			new DataView(aBuffer)

		const err_reg = dv.getUint8(0)
		const status = dv.getUint8(1)
		const event = dv.getUint8(2)
		const int_status = dv.getUint8(3)

		const BIT_SET = 1

		const conf_err = BitSmush.extractBits(err_reg, 2, 1) === BIT_SET
		const cmd_err = BitSmush.extractBits(err_reg, 1, 1) === BIT_SET
		const fatal_err = BitSmush.extractBits(err_reg, 0, 1) === BIT_SET

		const drdy_temp = BitSmush.extractBits(status, 6, 1) === BIT_SET
		const drdy_press = BitSmush.extractBits(status, 5, 1) === BIT_SET
		const cmd_rdy = BitSmush.extractBits(status, 4, 1) === BIT_SET

		// const itf_act_pt = BitSmush.extractBits(event, 1, 1) === BIT_SET // only for bmp390
		const por_detected = BitSmush.extractBits(event, 0, 1) === BIT_SET

		const drdy = BitSmush.extractBits(int_status, 3, 1) === BIT_SET
		const ffull_int = BitSmush.extractBits(int_status, 1, 1) === BIT_SET
		const fwm_int = BitSmush.extractBits(int_status, 0, 1) === BIT_SET

		return {
			error: { config: conf_err, command: cmd_err, fatal: fatal_err }, // all false is good
			status: { temperature: drdy_temp, pressure: drdy_press, command: cmd_rdy }, // all true is good
			event: { por_detected }, // false is good,
			interrupt: { data_ready: drdy, fifo_full: ffull_int, fifo_watermark: fwm_int }
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
