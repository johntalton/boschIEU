/** biome-ignore-all lint/style/noExcessiveLinesPerFile: it does it all */
import { BitSmush } from '@johntalton/bitsmush'
//

import { NameValueUtil } from '../util/nvutil.js'
import { BusUtil } from '../util/util.js'
//

import { Bits } from '../util/bits.js'
//

import { Util } from '../util/range.js'
import { Setpoint } from '../util/setpoint.js'
import {
	REGISTERS as BME6XX_REGISTERS,
	bme6xx,
	DEFAULT_AMBIENT_TEMPERATURE_C,
	SKIP_VALUE_20_BIT,
} from './bme6xx.js'
import { Compensate } from './compensate.js'
import { GENERIC_FILTER_EXT, GENERIC_OVERSAMPLES, GENERIC_SPI_MODE } from './generic.js'

/** @import { I2CAddressedBus } from '@johntalton/and-other-delights' */
/** @import { Profile6xx, ProfileModes, ModeProfile } from '../types/profile.js' */
/** @import { Calibration } from '../types/calibration.js' */
/** @import { Measurement6xx } from '../types/measurement.js' */
/** @import { Features } from '../types/features.js' */
/** @import { NVMap } from '../util/nvutil.js' */

/** @type {NVMap<Extract<ProfileModes, 'SLEEP'|'FORCED'>>} */
export const MODES = [
	{ name: 'SLEEP',  value: 0 },
	{ name: 'FORCED', value: 1 }
]

export const REGISTERS = {
	STATUS: 0x73,
	RESET: 0xE0,
	ID: 0xD0,

	CONFIG: 0x75,
	CTRL_MEAS: 0x74,
	//
	CTRL_HUM: 0x72,
	CTRL_GAS_1: 0x71,
	CTRL_GAS_0: 0x70,

	//
	GAS_WAIT_0: 0x64,
	RES_HEAT_0: 0x5A,
	IDAC_HEAT_0: 0x50,

	GAS_R_MSB: 0x2A,
	HUM_MSB: 0x25,
	TEMP_MSB: 0x22,
	PRES_MSB: 0x1F,
	//
	MEASUREMENT_STATUS_0: 0x1D
}

export const CTRL_MEAS_MODE_MASK = 0b0000_0011

/** @type {Array<[ number, number ]>} */
export const SET_POINTS_BLOCK = [ [ BME6XX_REGISTERS.IDAC_HEAT_0, 30 ] ]

/** @type {Array<[ number, number ]>} */
export const MEASUREMENT_BLOCK = [ [ REGISTERS.MEASUREMENT_STATUS_0, 15 ] ]

export class bme680 extends bme6xx {
	/**
	 * @override
	 */
	static get name() { return 'bme680' }

	/**
	 * @override
	 * @returns {Features}
	 */
	static get features() {
		return {
			pressure: true,
			temperature: true,
			humidity: true,
			gas: true,
			normalMode: false,
			interrupt: false,
			fifo: false,
			time: false,
			modes: [ 'SLEEP', 'FORCED' ]
		}
	}

	/**
	 * @override
	 * @param {I2CAddressedBus} bus
	 * @param {Calibration} calibration
	 * @returns {Promise<Profile6xx>}
	 */
	static async profile(bus, calibration) {
		const {
			ctrl_gas_1,
			mode,
			nb_conv,
			heat_off,

			oversampling_p,
			oversampling_t,
			oversampling_h,
			filter_coefficient,

			spi
		} = await bme6xx.rawProfile(bus)

		const ambientTemperatureC = calibration.G?.ambientTemperatureC ?? DEFAULT_AMBIENT_TEMPERATURE_C

		const buffer = await BusUtil.readI2cBlocks(bus, SET_POINTS_BLOCK)
		const dv = ArrayBuffer.isView(buffer) ?
			new DataView(buffer.buffer, buffer.byteOffset) :
			new DataView(buffer)

		const idac_heat = Util.range(0, 9).map(idx => dv.getUint8(idx))
		const res_heat = Util.range(10, 19).map(idx => dv.getUint8(idx))
		const gas_wait = Util.range(20, 29).map(idx => dv.getUint8(idx))

		// address unique to 680
		const run_gas = BitSmush.extractBits(ctrl_gas_1, 4, 1) === 1

		const setpoints = bme6xx.parseSetpoint(idac_heat, res_heat, gas_wait, nb_conv, calibration.G, ambientTemperatureC)

		return {
			mode: NameValueUtil.toName(mode, MODES),
			oversampling_p,
			oversampling_t,
			oversampling_h,
			filter_coefficient,

			gas: {
				heaterEnabled: !heat_off,
				conversionEnabled: run_gas,
				setpoints
			},
			spi
		}
	}

	/**
	 * @override
	 * @param {I2CAddressedBus} bus
	 * @param {Profile6xx} profile
	 * @param {Calibration} calibration
	 * @returns {Promise<void>}
	 */
	static async setProfile(bus, profile, calibration) {
		// console.log(' bme680 set profile', profile)

		if (calibration === undefined) { throw new Error('calibration required for gas temp calculation') }
		if (profile.gas === undefined) { throw new Error('missing gas in profile') }
		if (profile.gas.setpoints === undefined) { throw new Error('missing set-point') }
		if (profile.gas.setpoints.length > 10) { throw new Error('set-point limit of 10') }

		const ambientTemperatureC = profile.gas.ambientTemperatureC ?? calibration.G?.ambientTemperatureC ?? DEFAULT_AMBIENT_TEMPERATURE_C

		const heat_off = profile.gas.heaterEnabled ? 0 : 1
		const run_gas = profile.gas.conversionEnabled ? 1 : 0
		const nb_conv = profile.gas.setpoints.find(sp => sp.selected)?.index ?? 0

		const mode = NameValueUtil.toValue(profile.mode, MODES)
		const os_p = NameValueUtil.toValue(profile.oversampling_p, GENERIC_OVERSAMPLES)
		const os_t = NameValueUtil.toValue(profile.oversampling_t, GENERIC_OVERSAMPLES)
		const os_h = NameValueUtil.toValue(profile.oversampling_h, GENERIC_OVERSAMPLES)

		const filter = NameValueUtil.toValue(profile.filter_coefficient, GENERIC_FILTER_EXT)

		const spi_3w_en = NameValueUtil.toValue(profile.spi.mode, GENERIC_SPI_MODE)
		const spi_mem_page = profile.spi.page
		const spi_3w_int_en = profile.spi.interrupt ?? false ? 1 : 0

		const ctrl_gas0 = BitSmush.smushBits([[3, 1]], [heat_off])
		const ctrl_gas1 = BitSmush.smushBits([[4, 1], [3, 4]], [run_gas, nb_conv])
		const ctrl_hum = BitSmush.smushBits([[6, 1], [2, 3]], [spi_3w_int_en, os_h])
		const ctrl_meas = BitSmush.smushBits([[7, 3], [4, 3], [1, 2]], [os_t, os_p, mode])
		const config = BitSmush.smushBits([[4, 3], [0, 1]], [filter, spi_3w_en])
		const status = BitSmush.smushBits([[4, 1]], [spi_mem_page])

		//
		const setpointRegisterValues = profile.gas.setpoints.flatMap(setpoint => {
			const { index, initialMa, temperatureC, durationMs } = setpoint

			const idac_heat = Setpoint.toIDACHeat(initialMa)
			const res_heat = Setpoint.toRestHeat(temperatureC, calibration.G, ambientTemperatureC)
			const gas_wait = Setpoint.toGasWait(durationMs)

			return [
				REGISTERS.IDAC_HEAT_0 + index, idac_heat,
				REGISTERS.RES_HEAT_0 + index, res_heat,
				REGISTERS.GAS_WAIT_0 + index, gas_wait
			]
		})

		await bus.writeI2cBlock(REGISTERS.CTRL_MEAS, Uint8Array.from([
			ctrl_meas & ~CTRL_MEAS_MODE_MASK, // sleep is zero

			REGISTERS.CTRL_GAS_0, ctrl_gas0,
			REGISTERS.CTRL_GAS_1, ctrl_gas1,
			REGISTERS.CTRL_HUM, ctrl_hum,
			REGISTERS.CONFIG, config,
			REGISTERS.STATUS, status,

			...setpointRegisterValues,

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
	 * @returns {Promise<Measurement6xx>}
	 */
	static async measurement(bus, calibration) {
		const buffer = await BusUtil.readI2cBlocks(bus, MEASUREMENT_BLOCK)
		const dv = ArrayBuffer.isView(buffer) ?
			new DataView(buffer.buffer, buffer.byteOffset) :
			new DataView(buffer)

		const meas_status = dv.getUint8(0)
		// const reserved = dv.getUint8(1) // sub measuring index

		const newData = BitSmush.extractBits(meas_status, 7, 1) === 1
		const measuringGas = BitSmush.extractBits(meas_status, 6, 1) === 1
		const measuring = BitSmush.extractBits(meas_status, 5, 1) === 1
		const active_profile_idx = BitSmush.extractBits(meas_status, 3, 4)

		const pres_msb = dv.getUint8(2)
		const pres_lsb = dv.getUint8(3)
		const pres_xlsb_ext = dv.getUint8(4)
		const pres_xlsb = BitSmush.extractBits(pres_xlsb_ext, 7, 4)
		const adcP = Bits.reconstruct20bit(pres_msb, pres_lsb, pres_xlsb)

		const temp_msb = dv.getUint8(5)
		const temp_lsb = dv.getUint8(6)
		const temp_xlsb_ext = dv.getUint8(7)
		const temp_xlsb = BitSmush.extractBits(temp_xlsb_ext, 7, 4)
		const adcT = Bits.reconstruct20bit(temp_msb, temp_lsb, temp_xlsb)
		// console.log('adcT', adcT, temp_msb, temp_lsb, temp_xlsb_ext)

		const adcH = dv.getUint16(8, false)

		const gas_r_msb = dv.getUint8(13)
		const gas_r_ext = dv.getUint8(14)

		const gas_r_lsb = BitSmush.extractBits(gas_r_ext, 7, 2)
		const gas_valid_r = BitSmush.extractBits(gas_r_ext, 5, 1) === 1
		const heat_stab_r = BitSmush.extractBits(gas_r_ext, 4, 1) === 1
		const gas_range_r = BitSmush.extractBits(gas_r_ext, 3, 4)

		const gas_r = Bits.reconstruct10bit(gas_r_msb, gas_r_lsb)

		const P = SKIP_VALUE_20_BIT === adcP ? false : adcP
		const T = SKIP_VALUE_20_BIT === adcT ? false : adcT
		const H = SKIP_VALUE_20_BIT === adcH ? false : adcH

		const G = gas_valid_r ? { resistance: gas_r, range: gas_range_r, stable: heat_stab_r } : false

		return {
			ready: {
				newData,
				measuringGas, // active gas measurement
				measuring, // active TPH measurement
				active_profile_idx,
				gasValid: gas_valid_r,
				heaterStable: heat_stab_r
			},
			...Compensate.from({
				adcP: P,
				adcT: T,
				adcH: H,
				adcG: G,
				type: '6xx', subtype: '680'
			}, calibration)
		}
	}

	// /**
	//  * @param {Profile} profile
	//  *
	//  */
	// static estimateMeasurementWait(profile) {
	// 	// converts enumeration oversampling from profile into
	// 	// a known cycles - currently uses the side effect
	// 	// of the enumeration layout to map to known cycles (aka 1:1).
	// 	/**
	// 	 * @param {number|false} os
	// 	 * @returns {number}
	// 	 */
	// 	function oversampleToCycles(os) {
	// 		if (os === false) { return 0 }
	// 		const cycles = [0, 1, 2, 4, 8, 16]
	// 		if (!cycles.includes(os)) { throw new Error('unknown oversampling enumeration') }
	// 		return os
	// 	}

	// 	const BASE_PER_CYCLES_US = 1963

	// 	const cycles = oversampleToCycles(profile.oversampling_t) +
	// 		oversampleToCycles(profile.oversampling_p) +
	// 		oversampleToCycles(profile.oversampling_h)

	// 	const tph_durUs = (BASE_PER_CYCLES_US * cycles) +
	// 		1000 + // Wake up duration of 1ms
	// 		(477 * 4) + // TPH switching duration
	// 		(477 * 5) // Gas measurement duration (todo gas enabled?)

	// 	// it takes a while
	// 	let gasWaitMs = 0
	// 	if (profile.gas?.enabled === true) {
	// 		const active = profile.gas.setpoints.find(sp => sp.active)
	// 		if (active) { gasWaitMs = active.durationMs ?? 0 }
	// 	}

	// 	const totalMs = ((tph_durUs + 500) / 1000) + gasWaitMs

	// 	return {
	// 		totalWaitMs: totalMs,
	// 		tphDurationUs: tph_durUs,
	// 		gasDurationMs: gasWaitMs
	// 	}
	// }
}
