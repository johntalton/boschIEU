/** biome-ignore-all lint/style/noExcessiveLinesPerFile: implementation */
import { BitSmush } from '@johntalton/bitsmush'
//

import { reconstruct9bit, reconstruct24bit } from '../util/bits.js'
import { NameValueUtil } from '../util/nvutil.js'
import { BusUtil } from '../util/util.js'
//

import { Compensate } from './compensate.js'
import { GENERIC_FILTER_EXT, GENERIC_SPI_MODE, GenericChip } from './generic.js'
//

import { bmp3xxFifo } from './fifo/index.js'

/** @import { I2CAddressedBus } from '@johntalton/and-other-delights' */
/** @import { Profile3xx, ProfileModes, ModeProfile } from '../types/profile.js' */
/** @import { Measurement3xx } from '../types/measurement.js' */
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

/** @type {NVMap<number|false>} */
export const OVERSAMPLES_3XX = [
	{ name: 1, value: 0x0 },
	{ name: 2, value: 0x1 },
	{ name: 4, value: 0x2 },
	{ name: 8, value: 0x3 },
	{ name: 16, value: 0x4 },
	{ name: 32, value: 0x5 },

	{ name: false, value: 0x0 } // pick any value when disabled
]

/** @type {NVMap<'LONG'|'SHORT'|false>} */
export const I2C_WATCHDOG_TIMER = [
	{ name: 'SHORT', value: 0 }, // 1.25ms
	{ name: 'LONG', value: 1 }, // 40ms

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

/** @type {NVMap<'unfiltered'|'filtered'>} */
export const FIFO_DATA_SELECT = [
	{ name: 'unfiltered', value: 0x00 },
	{ name: 'filtered', value: 0x01 }
]

/** @type {NVMap<'push-pull'|'open-drain'>} */
export const INTERRUPT_MODE = [
	{ name: 'push-pull', value: 0x00 },
	{ name: 'open-drain', value: 0x01 }
]


/** @type {NVMap<'active-low'|'active-high'>} */
export const INTERRUPT_LEVEL = [
	{ name: 'active-low', value: 0x00 },
	{ name: 'active-high', value: 0x01 }
]

/** @type {NVMap<'low'|'high'>} */
export const INTERRUPT_DRIVE_STRENGTH = [
	{ name: 'low', value: 0 },
	{ name: 'high', value: 1 }
]

export const TEMP_ENABLED = 1
export const TEMP_DISABLED = 0
export const PRESS_ENABLED = 1
export const PRESS_DISABLED = 0
export const WATCHDOG_ENABLED = 1
export const WATCHDOG_DISABLED = 0
export const SPI3 = 1
// export const SPI4 = 0

// export const INTERRUPT = {
export const ON_READY_ENABLED = 1
export const ON_READY_DISABLED = 0
export const ON_FULL_ENABLED = 1
export const ON_FULL_DISABLED = 0
export const ON_WATER_ENABLED = 1
export const ON_WATER_DISABLED = 0
export const LATCHED = 1
export const NON_LATCHED = 0
export const INT_OPEN_DRAIN = 1
export const INT_PUSH_PULL = 0
export const INT_ACTIVE_HIGH = 1
export const INT_ACTIVE_LOW = 0
// }

export const FIFO = {
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

export const DEFAULT_MODE = 'SLEEP'
export const DEFAULT_FILTER_COEFFICIENT = false
export const DEFAULT_PRESCALER = 1
export const DEFAULT_OVERSAMPLING_PRESS = 1 // todo data sheet disagrees
export const DEFAULT_OVERSAMPLING_TEMP = 1
export const DEFAULT_WATCHDOG = false
export const DEFAULT_INT_MODE = 'push-pull'
export const DEFAULT_INT_LEVEL = 'active-high'
export const DEFAULT_LATCHED = false
export const DEFAULT_ON_FIFO_WM = false
export const DEFAULT_ON_FIFO_FULL = false
export const DEFAULT_ON_READY = false
export const DEFAULT_FIFO_ACTIVE = false
export const DEFAULT_FIFO_HIGH_WATERMARK = 1
export const DEFAULT_FIFO_DATA = 'unfiltered'
export const DEFAULT_FIFO_SUB_SAMPLING = 0 // todo the data sheet states 2
export const DEFAULT_FIFO_STOP_ON_FULL = true
export const DEFAULT_FIFO_TEMP = false
export const DEFAULT_FIFO_PRESS = false
export const DEFAULT_FIFO_TIME = false

/** @type {Profile3xx} */
export const DEFAULT_PROFILE = {
	filter_coefficient: DEFAULT_FILTER_COEFFICIENT,
	standby_prescaler: DEFAULT_PRESCALER,
	oversampling_p: DEFAULT_OVERSAMPLING_PRESS,
	oversampling_t: DEFAULT_OVERSAMPLING_TEMP,
	mode: DEFAULT_MODE,
	watchdog: DEFAULT_WATCHDOG,

	interrupt: {
		mode: DEFAULT_INT_MODE,
		level: DEFAULT_INT_LEVEL,
		driveStrength: 'low',
		latched: DEFAULT_LATCHED,
		onFifoWatermark: DEFAULT_ON_FIFO_WM,
		onFifoFull: DEFAULT_ON_FIFO_FULL,
		onReady: DEFAULT_ON_READY
	},

	fifo: {
		active: DEFAULT_FIFO_ACTIVE,
		highWatermark: DEFAULT_FIFO_HIGH_WATERMARK,
		data: DEFAULT_FIFO_DATA,
		subSampling: DEFAULT_FIFO_SUB_SAMPLING,
		stopOnFull: DEFAULT_FIFO_STOP_ON_FULL,
		temp: DEFAULT_FIFO_TEMP,
		press: DEFAULT_FIFO_PRESS,
		time: DEFAULT_FIFO_TIME
	},

	spi: {
		mode: '4-wire',
		page: 0,
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

	CMD: 0x7E,

	NVM_PAR_T1: 0x31,
	// ...
	NVM_PAR_P1: 0x36,
	// ...
	NVM_PAR_P11: 0x45
}

export const RESET_MAGIC = 0xB6

export const SKIP_VALUE_24_BIT = 0x80_00_00

export const PROFILE_BLOCK_START = REGISTERS.FIFO_WTM_0
export const CALIBRATION_BLOCK_START = REGISTERS.NVM_PAR_T1
export const MEASUREMENT_BLOCK_START = REGISTERS.ERR_REG

/** @type {Array<[ number, number ]>} */
export const PROFILE_BLOCK = [ [ PROFILE_BLOCK_START, 11 ] ]

/** @type {Array<[ number, number ]>} */
export const CALIBRATION_BLOCK = [ [ CALIBRATION_BLOCK_START, 21 ] ]

/** @type {Array<[ number, number ]>} */
export const MEASUREMENT_BLOCK = [ [ MEASUREMENT_BLOCK_START, 14 ] ]

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
	 * Note: reads reserved register on 3xx (only valid for 390)
	 * @param {I2CAddressedBus} bus
	 * @returns {Promise<{ revId: number, major: number, minor: number} | undefined>}
	 */
	static async revId(bus) {
		const buffer = await bus.readI2cBlock(REGISTERS.REV_ID, 1)
		const u8 = ArrayBuffer.isView(buffer) ?
			new Uint8Array(buffer.buffer, buffer.byteOffset) :
			new Uint8Array(buffer)

		const [ revId ] = u8
		if(revId === undefined) { return undefined}

		// split between major and minor
		const major = revId >> 4
		const minor = revId & 0xF0
		return { revId, major, minor }
	}

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
		const aBuffer = await BusUtil.readI2cBlocks(bus, CALIBRATION_BLOCK)
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
			H: []
		}
	}

	/**
	 * @override
	 * @param {I2CAddressedBus} bus
	 * @returns {Promise<Profile3xx>}
	 */
	static async profile(bus) {
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

		//
		const iff_filter = BitSmush.extractBits(config, 3, 3)

		const odr_sel = BitSmush.extractBits(odr, 4, 5)
		const osr_p = BitSmush.extractBits(osr, 2, 3)
		const osr_t = BitSmush.extractBits(osr, 5, 3)
		const mode = BitSmush.extractBits(pwr_ctrl, 5, 2)
		const temp_en = BitSmush.extractBits(pwr_ctrl, 1, 1)
		const press_en = BitSmush.extractBits(pwr_ctrl, 0, 1)
		const i2c_wdt_sel = BitSmush.extractBits(if_conf, 2, 1)
		const i2c_wdt_en = BitSmush.extractBits(if_conf, 1, 1)
		const spi3 = BitSmush.extractBits(if_conf, 0, 1)
		const drdy_en = BitSmush.extractBits(int_ctrl, 6, 1)
		const ffull_en = BitSmush.extractBits(int_ctrl, 4, 1)
		const fwtm_en = BitSmush.extractBits(int_ctrl, 3, 1)
		const int_latch = BitSmush.extractBits(int_ctrl, 2, 1)
		const int_level = BitSmush.extractBits(int_ctrl, 1, 1)
		const int_od = BitSmush.extractBits(int_ctrl, 0, 1)
		const data_select = BitSmush.extractBits(fifo_config_2, 4, 2)
		const fifo_subSampling = BitSmush.extractBits(fifo_config_2, 2, 3)
		const fifo_temp_en = BitSmush.extractBits(fifo_config_1, 4, 1)
		const fifo_press_en = BitSmush.extractBits(fifo_config_1, 3, 1)
		const fifo_time_en = BitSmush.extractBits(fifo_config_1, 2, 1)
		const fifo_stop_on_full = BitSmush.extractBits(fifo_config_1, 1, 1)
		const fifo_mode = BitSmush.extractBits(fifo_config_1, 0, 1)
		const fifo_water_mark_8 = BitSmush.extractBits(fifo_wtm_1, 0, 1)
		const fifo_water_mark_7_0 = fifo_wtm_0

		//
		const fifo_watermark = reconstruct9bit(fifo_water_mark_8, fifo_water_mark_7_0)

		const _short_in = BitSmush.extractBits(config, 0, 1) // bmp390 Test Mode
		const int_ds = BitSmush.extractBits(int_ctrl, 5, 1) // bmp390
		const driveStrength = NameValueUtil.toName(int_ds, INTERRUPT_DRIVE_STRENGTH)

		return {
			mode: NameValueUtil.toName(mode, MODES),
			standby_prescaler: NameValueUtil.toName(odr_sel, ODR_PRESCALER),
			oversampling_p: press_en === PRESS_ENABLED ? NameValueUtil.toName(osr_p, OVERSAMPLES_3XX) : false,
			oversampling_t: temp_en === TEMP_ENABLED ? NameValueUtil.toName(osr_t, OVERSAMPLES_3XX) : false,
			filter_coefficient: NameValueUtil.toName(iff_filter, GENERIC_FILTER_EXT),

			fifo: {
				active: fifo_mode === FIFO.ENABLED,
				stopOnFull: fifo_stop_on_full === FIFO.FULL_STOP_ENABLED,
				temp: fifo_temp_en === FIFO.TEMP_ENABLED,
				press: fifo_press_en === FIFO.PRESS_ENABLED,
				time: fifo_time_en === FIFO.TIME_ENABLED,

				data: NameValueUtil.toName(data_select, FIFO_DATA_SELECT),
				subSampling: fifo_subSampling,
				highWatermark: fifo_watermark
			},

			watchdog: i2c_wdt_en === WATCHDOG_ENABLED ? NameValueUtil.toName(i2c_wdt_sel, I2C_WATCHDOG_TIMER) : false,

			interrupt: {
				mode: NameValueUtil.toName(int_od, INTERRUPT_MODE),
				level: NameValueUtil.toName(int_level, INTERRUPT_LEVEL),
				driveStrength,
				latched: int_latch === LATCHED,
				onFifoWatermark: fwtm_en === ON_WATER_ENABLED,
				onFifoFull: ffull_en === ON_FULL_ENABLED,
				onReady: drdy_en === ON_READY_ENABLED
			},

			spi: {
				page: 0,
				mode: NameValueUtil.toName(spi3, GENERIC_SPI_MODE)
			}
		}
	}

	/**
	 * @override
	 * @param {I2CAddressedBus} bus
	 * @param {Profile3xx} profileOverlay
	 * @return {Promise<void>}
	 */
	static async setProfile(bus, profileOverlay) {
		// const defaultProfile = structuredClone(DEFAULT_PROFILE)
		// const profile = { ...defaultProfile, ...profileOverlay }

		const profile = profileOverlay
		console.log('setting profile', profile)

		if (profile.fifo === undefined || profile.fifo.highWatermark >= Math.pow(2, 9) || profile.fifo.highWatermark < 0) {
			throw new Error('invalid high watermark')
		}

		const fifoWatermark = {
			high: (profile.fifo.highWatermark >> 8) & 0x1,
			low: profile.fifo.highWatermark & 0xFF
		}

		if (profile.fifo.subSampling < 0 || profile.fifo.subSampling >= Math.pow(2, 3)) {
			throw new Error('invalid sub-sampling range')
		}

		//
		const iff_filter = NameValueUtil.toValue(profile.filter_coefficient, GENERIC_FILTER_EXT)
		const odr_sel = NameValueUtil.toValue(profile.standby_prescaler, ODR_PRESCALER)
		const osr_p = NameValueUtil.toValue(profile.oversampling_p, OVERSAMPLES_3XX)
		const osr_t = NameValueUtil.toValue(profile.oversampling_t, OVERSAMPLES_3XX)
		const mode = NameValueUtil.toValue(profile.mode.toUpperCase(), MODES)
		const temp_en = profile.oversampling_t === false ? TEMP_DISABLED : TEMP_ENABLED
		const press_en = profile.oversampling_p === false ? PRESS_DISABLED : PRESS_ENABLED

		const i2c_wdt_sel = NameValueUtil.toValue(profile.watchdog, I2C_WATCHDOG_TIMER)
		const i2c_wdt_en = profile.watchdog === false ? WATCHDOG_DISABLED : WATCHDOG_ENABLED

		const spi3 = NameValueUtil.toValue(profile.spi.mode, GENERIC_SPI_MODE)

		const drdy_en = profile.interrupt.onReady === true ? ON_READY_ENABLED : ON_READY_DISABLED
		const int_ds = NameValueUtil.toValue(profile.interrupt.driveStrength, INTERRUPT_DRIVE_STRENGTH)
		const ffull_en = profile.interrupt.onFifoFull === true ? ON_FULL_ENABLED : ON_FULL_DISABLED
		const fwtm_en = profile.interrupt.onFifoWatermark === true ? ON_WATER_ENABLED : ON_WATER_DISABLED
		const int_latch = profile.interrupt.latched === true ? LATCHED : NON_LATCHED
		const int_level = NameValueUtil.toValue(profile.interrupt.level, INTERRUPT_LEVEL)
		const int_od = NameValueUtil.toValue(profile.interrupt.mode, INTERRUPT_MODE)

		const data_select = NameValueUtil.toValue(profile.fifo.data, FIFO_DATA_SELECT)
		const fifo_subSampling = profile.fifo.subSampling
		const fifo_temp_en = profile.fifo.temp ? FIFO.TEMP_ENABLED : FIFO.TEMP_DISABLED
		const fifo_press_en = profile.fifo.press ? FIFO.PRESS_ENABLED : FIFO.PRESS_DISABLED
		const fifo_time_en = profile.fifo.time ? FIFO.TIME_ENABLED : FIFO.TIME_DISABLED
		const fifo_stop_on_full = profile.fifo.stopOnFull ? FIFO.FULL_STOP_ENABLED : FIFO.FULL_STOP_DISABLED
		const fifo_mode = profile.fifo.active ? FIFO.ENABLED : FIFO.DISABLED
		const fifo_water_mark_8 = fifoWatermark.high
		const fifo_water_mark_7_0 = fifoWatermark.low

		//
		const config = BitSmush.smushBits([[3, 3]], [iff_filter])
		const odr = BitSmush.smushBits([[4, 5]], [odr_sel])
		const osr = BitSmush.smushBits([[5, 3], [2, 3]], [osr_t, osr_p])

		const pwr_ctrl = BitSmush.smushBits([[5, 2], [1, 1], [0, 1]], [mode, temp_en, press_en])

		const if_conf = BitSmush.smushBits([[2, 1], [1, 1], [0, 1]], [i2c_wdt_sel, i2c_wdt_en, spi3])
		const int_ctrl = BitSmush.smushBits([[6, 1], [ 5, 1 ], [4, 1], [3, 1], [2, 1], [1, 1], [0, 1]], [drdy_en, int_ds, ffull_en, fwtm_en, int_latch, int_level, int_od])

		const fifo_config_2 = BitSmush.smushBits([[4, 2], [2, 3]], [data_select, fifo_subSampling])
		const fifo_config_1 = BitSmush.smushBits([[4, 1], [3, 1], [2, 1], [1, 1], [0, 1]], [fifo_temp_en, fifo_press_en, fifo_time_en, fifo_stop_on_full, fifo_mode])
		const fifo_wtm_1 = BitSmush.smushBits([[0, 1]], [fifo_water_mark_8])
		const fifo_wtm_0 = BitSmush.smushBits([[7, 8]], [fifo_water_mark_7_0])

		await bus.writeI2cBlock(REGISTERS.FIFO_WTM_0, Uint8Array.from([
			fifo_wtm_0,
			REGISTERS.FIFO_WTM_1, fifo_wtm_1,
			REGISTERS.FIFO_CONFIG_1, fifo_config_1,
			REGISTERS.FIFO_CONFIG_2, fifo_config_2,
			REGISTERS.INT_CTRL, int_ctrl,
			REGISTERS.IF_CONF, if_conf,
			REGISTERS.OSR, osr,
			REGISTERS.ODR, odr,
			REGISTERS.CONFIG, config,

			REGISTERS.PWR_CTRL, pwr_ctrl
		]))
	}

	/**
	 * @override
	 * @param {I2CAddressedBus} bus
	 * @param {ModeProfile} profile
	 * @returns {Promise<void>}
	 */
	static async setMode(bus, profile) {
		const mode = NameValueUtil.toValue(profile.mode.toUpperCase(), MODES)
		const temp_en = profile.oversampling_t === false ? TEMP_DISABLED : TEMP_ENABLED
		const press_en = profile.oversampling_p === false ? PRESS_DISABLED : PRESS_ENABLED

		const pwr_ctrl = BitSmush.smushBits([[5, 2], [1, 1], [0, 1]], [mode, temp_en, press_en])

		await bus.writeI2cBlock(REGISTERS.PWR_CTRL, Uint8Array.from([
			pwr_ctrl
		]))
	}

	/**
	 * @override
	 * @param {I2CAddressedBus} bus
	 * @param {Calibration} calibration
	 * @returns {Promise<Measurement3xx>}
	 */
	static async measurement(bus, calibration) {
		const aBuffer = await BusUtil.readI2cBlocks(bus, MEASUREMENT_BLOCK)
		const dv = ArrayBuffer.isView(aBuffer) ?
			new DataView(aBuffer.buffer, aBuffer.byteOffset) :
			new DataView(aBuffer)

		const err_reg = dv.getUint8(0)
		const status = dv.getUint8(1)

		const pres_xlsb = dv.getUint8(2)
		const pres_lsb = dv.getUint8(3)
		const pres_msb = dv.getUint8(4)
		const adcP = reconstruct24bit(pres_msb, pres_lsb, pres_xlsb)

		const temp_xlsb = dv.getUint8(5)
		const temp_lsb = dv.getUint8(6)
		const temp_msb = dv.getUint8(7)
		const adcT = reconstruct24bit(temp_msb, temp_lsb, temp_xlsb)

		// todo: note that this 32-bit on bmp384
		//  and its only 24-bit, with a reserved
		//  upper/msb (assuming returns zero)
		const time = dv.getUint32(10, true)

		//
		const drdy_temp = BitSmush.extractBits(status, 6, 1)
		const drdy_press = BitSmush.extractBits(status, 5, 1)
		const cmd_rdy = BitSmush.extractBits(status, 4, 1)

		const conf_err = BitSmush.extractBits(err_reg, 2, 1)
		const cmd_err = BitSmush.extractBits(err_reg, 1, 1)
		const fatal_err = BitSmush.extractBits(err_reg, 0, 1)

		const P = SKIP_VALUE_24_BIT === adcP ? false : adcP
		const T = SKIP_VALUE_24_BIT === adcT ? false : adcT

		return {
			ready: {
				temperature: drdy_temp === 1,
				pressure: drdy_press === 1,
				command: cmd_rdy === 1,
				errorConfiguration: conf_err === 1,
				errorCommand: cmd_err === 1,
				errorFatal: fatal_err === 1
			},
			...Compensate.from({
				sensorTime: time,
				adcP: P,
				adcT: T,
				adcH: false,
				adcG: false,
				type: '3xx'
			}, calibration)
		}
	}

	// /**
	//  * @override
	//  * @param {I2CAddressedBus} bus
	//  * @returns {Promise<ProfileReady>}
	//  */
	// static async ready(bus) {
	// 	const aBuffer = await BusUtil.readI2cBlocks(bus, [[0x02, 2], [0x10, 2]])
	// 	const dv = ArrayBuffer.isView(aBuffer) ?
	// 		new DataView(aBuffer.buffer, aBuffer.byteOffset) :
	// 		new DataView(aBuffer)

	// 	const err_reg = dv.getUint8(0)
	// 	const status = dv.getUint8(1)
	// 	const event = dv.getUint8(2)
	// 	const int_status = dv.getUint8(3)

	// 	const BIT_SET = 1

	// 	const conf_err = BitSmush.extractBits(err_reg, 2, 1) === BIT_SET
	// 	const cmd_err = BitSmush.extractBits(err_reg, 1, 1) === BIT_SET
	// 	const fatal_err = BitSmush.extractBits(err_reg, 0, 1) === BIT_SET

	// 	const drdy_temp = BitSmush.extractBits(status, 6, 1) === BIT_SET
	// 	const drdy_press = BitSmush.extractBits(status, 5, 1) === BIT_SET
	// 	const cmd_rdy = BitSmush.extractBits(status, 4, 1) === BIT_SET

	// 	// const itf_act_pt = BitSmush.extractBits(event, 1, 1) === BIT_SET // only for bmp390
	// 	const por_detected = BitSmush.extractBits(event, 0, 1) === BIT_SET

	// 	const drdy = BitSmush.extractBits(int_status, 3, 1) === BIT_SET
	// 	const ffull_int = BitSmush.extractBits(int_status, 1, 1) === BIT_SET
	// 	const fwm_int = BitSmush.extractBits(int_status, 0, 1) === BIT_SET

	// 	return {
	// 		error: { config: conf_err, command: cmd_err, fatal: fatal_err }, // all false is good
	// 		status: { temperature: drdy_temp, pressure: drdy_press, command: cmd_rdy }, // all true is good
	// 		event: { por_detected }, // false is good,
	// 		interrupt: { data_ready: drdy, fifo_full: ffull_int, fifo_watermark: fwm_int }
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
