/** biome-ignore-all lint/style/noExcessiveLinesPerFile: <explanation> */
/** biome-ignore-all lint/style/useNumericSeparators: <explanation> */
import { BitSmush } from '@johntalton/bitsmush'
//

import { NameValueUtil } from '../nvutil.js'
import { BusUtil } from '../util.js'
//

import { Bits } from './bits.js'
//

import {
	REGISTERS as BME6XX_REGISTERS,
	bme6xx
} from './bme6xx.js'
import { Compensate } from './compensate.js'
import { enumMap, GENERIC_FILTER_EXT, GENERIC_OVERSAMPLES } from './generic.js'
import { Util } from './util.js'

/** @import { I2CAddressedBus } from '@johntalton/and-other-delights' */
/** @import { Profile6xx, ProfileReady, ProfileModes } from '../types/profile.js' */
/** @import { Calibration } from '../types/calibration.js' */
/** @import { CompensateResult } from './compensate.js' */
/** @import { Features } from '../types/features.js' */

/** @type {Array<{ name: Extract<ProfileModes, 'SLEEP'|'FORCED'>, value: number }>} */
export const MODES = [
	{ name: 'SLEEP',  value: 0 },
	{ name: 'FORCED', value: 1 }
]

export const REGISTERS = {

}

/** @type {Array<[ number, number ]>} */
export const SET_POINTS_BLOCK = [ [ BME6XX_REGISTERS.GAS_WAIT_0, 30 ] ]

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
	 * @returns {Promise<Profile6xx>}
	 */
	static async profile(bus) {
		const {
			ctrl_gas_1,
			filter,
			spi_3w_en,
			mode,
			osrs_t,
			osrs_p,
			osrs_h,
			spi_3w_int_en,
			spi_mem_page,
			nb_conv,
			heat_off
		} = await bme6xx.rawProfile(bus)

		const buffer = await BusUtil.readI2cBlocks(bus, SET_POINTS_BLOCK)
		const dv = ArrayBuffer.isView(buffer) ?
			new DataView(buffer.buffer, buffer.byteOffset) :
			new DataView(buffer)

		const idac_heat = Util.range(0, 9).map(idx => dv.getUint8(idx))
		const res_heat = Util.range(10, 19).map(idx => dv.getUint8(idx))
		const gas_wait = Util.range(20, 29).map(idx => dv.getUint8(idx))

		//
		const run_gas = BitSmush.extractBits(ctrl_gas_1, 4, 1) === 1

		const setpoints = bme6xx.parseSetpoint(idac_heat, res_heat, gas_wait, nb_conv)

		return {
			mode: NameValueUtil.toName(mode, MODES),
			oversampling_p: NameValueUtil.toName(osrs_p, GENERIC_OVERSAMPLES),
			oversampling_t: NameValueUtil.toName(osrs_t, GENERIC_OVERSAMPLES),
			oversampling_h: NameValueUtil.toName(osrs_h, GENERIC_OVERSAMPLES),
			filter_coefficient: NameValueUtil.toName(filter, GENERIC_FILTER_EXT),

			gas: {
				headerEnabled: !heat_off,
				conversionEnabled: run_gas,
				setpoints
			},
			spi: {
				page: spi_mem_page === 0 ? 0 : 1,
				enable3w: spi_3w_en,
				interrupt: spi_3w_int_en
			}
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

		/**
		 * @param {number} durationMs
		 */
		function durationToGasWait(durationMs) {
			if (durationMs < 30) { console.log('low wait duration not recommended', durationMs) }

			/**
			 * @param {number} ms
			 * @param {number} multiplier
			 */
			function foo(ms, multiplier) {
				const intMs = Math.trunc(ms / multiplier)
				const actual = intMs * multiplier
				const err = actual - ms
				if (err !== 0) { console.log('approximating gas wait', actual, 'delta', err) }
				return {
					base: intMs,
					multiplier,
					error: err
				}
			}

			// 6bit with 2bit multiplier in 4x step (1, 4, 16, 64)
			const base = Math.pow(2, 6) - 1
			// 0 - 63 @ 1ms
			if (durationMs <= base) { return foo(durationMs, 1) }
			// 0 - 252 @ 4ms
			if (durationMs <= (base * 4)) { return foo(durationMs, 4) }
			// 0 - 1008 @ 16ms
			if (durationMs <= (base * 16)) { return foo(durationMs, 16) }
			// 0 - 4032 @ 64ms
			if (durationMs <= (base * 64)) { return foo(durationMs, 64) }

			throw new Error(`max duration exceeded: ${durationMs}`)
		}

		/**
		 * @param {number|undefined} temperatureC
		 * @param {number} ambientTemperatureC
		 * @param {Calibration['G']} caliG
		 */
		// 320 25 -> 0x74
		function temperatureToHeaterRes(temperatureC, ambientTemperatureC, caliG) {
			if(temperatureC === undefined) { throw new Error('undefined temperature') }
			if (temperatureC > 400) { throw new Error('max temperature 400 C') }
			if(caliG === undefined) { throw new Error('calibration undefined') }
			if (caliG.G.length !== 3) { throw new Error('calibration mismatch') }
			const [gh1, gh2, gh3] = caliG.G

			if(gh1 === undefined) { throw new Error('gh1 undefined') }
			if(gh2 === undefined) { throw new Error('gh2 undefined') }
			if(gh3 === undefined) { throw new Error('gh3 undefined') }

			if(caliG.res_heat_range === undefined) { throw new Error('res_heat_range undefined') }

			const var1 = (gh1 / 16.0) + 49.0
			const var2 = ((gh2 / 32768.0) * 0.0005) + 0.00235
			const var3 = gh3 / 1024.0
			const var4 = var1 * (1.0 + (var2 * temperatureC))
			const var5 = var4 + (var3 * ambientTemperatureC)
			const res_heat = Math.trunc(3.4 * ((var5 * (4 / (4 + caliG.res_heat_range)) * (1 / (1 + (caliG.res_heat_val * 0.002)))) - 25))

			// console.log(var1, var2, var3, var4, var5, res_heat)
			// console.log('temp2heat', temperatureC, ambientTemperatureC, var5, res_heat)

			return res_heat
		}

		// console.log(' bme680 set profile', profile)
		const en3wint = false // todo profile.spi.interrupt
		// const spi_mem_page = 0 // todo profile.spi.mempage

		if (calibration === undefined) { throw new Error('calibration required for gas temp calculation') }
		if (profile.gas === undefined) { throw new Error('missing gas in profile') }
		if (profile.gas.setpoints === undefined) { throw new Error('missing set-point') }
		if (profile.gas.setpoints.length > 10) { throw new Error('set-point limit of 10') }

		const active = profile.gas.setpoints
			.map((sp, idx) => ({ active: sp.active, index: idx }))
			.find(sp => sp.active)

		const heat_off = profile.gas.enabled ? 0 : 1
		const run_gas = active === undefined ? false : active.active
		const nb_conv = active === undefined ? 15 : active.index// todo why 0b1111

		const mode = NameValueUtil.toValue(profile.mode, MODES)
		const os_p = NameValueUtil.toValue(profile.oversampling_p, GENERIC_OVERSAMPLES)
		const os_t = NameValueUtil.toValue(profile.oversampling_t, GENERIC_OVERSAMPLES)
		const os_h = NameValueUtil.toValue(profile.oversampling_h, GENERIC_OVERSAMPLES)

		const filter = NameValueUtil.toValue(profile.filter_coefficient, GENERIC_FILTER_EXT)
		const en3w = profile.spi?.enable3w ?? false

		const ctrl_gas0 = BitSmush.smushBits([[3, 1]], [heat_off])
		const ctrl_gas1 = BitSmush.smushBits([[4, 1], [3, 4]], [run_gas, nb_conv])
		const ctrl_hum = BitSmush.smushBits([[6, 1], [2, 3]], [en3wint, os_h])
		const ctrl_meas = BitSmush.smushBits([[7, 3], [4, 3], [1, 2]], [os_t, os_p, mode])
		const config = BitSmush.smushBits([[4, 3], [0, 1]], [filter, en3w])

		// const status = 0 // todo, we need to redactor all this page stuff Util.packBits([[4, 1]], [spi_mem_page])

		const idac_heat = [
			false, false, false, false, false,
			false, false, false, false, false
		] // todo fix, don't touch values  for now

		const [res_heat, gas_wait] = profile.gas.setpoints.reduce((out, sp, idx) => {
			if (sp.skip === true) { return [[...out[0], false], [...out[1], false]] }

			const gw = durationToGasWait(sp.durationMs)
			const multi = NameValueUtil.toValue(gw.multiplier, gwMultipliers)
			const gas_wait_x = BitSmush.smushBits([[7, 2], [5, 6]], [multi, gw.base])

			const pat = profile.ambientTemperatureC === undefined ? 25 : profile.ambientTemperatureC // or 25C
			const ambientTemperatureC = sp.ambientTemperatureC === undefined ? pat : sp.ambientTemperatureC

			const res_heat_x = temperatureToHeaterRes(sp.temperatureC, ambientTemperatureC, calibration.G)

			return [[...out[0], res_heat_x], [...out[1], gas_wait_x]]
		}, [[], []])

		// we no longer bulk write,
		await bus.writeI2cBlock(0x74, Uint8Array.from([ctrl_meas & ~0b11])) // sleep
		await Promise.all([
			bus.writeI2cBlock(0x72, Uint8Array.from([ctrl_hum])),
			bus.writeI2cBlock(0x75, Uint8Array.from([config])),
			bus.writeI2cBlock(0x71, Uint8Array.from([ctrl_gas1])),
			bus.writeI2cBlock(0x70, Uint8Array.from([ctrl_gas0])),

			...idac_heat.filter(x => x !== false).map((x, idx) => bus.writeI2cBlock(0x50 + idx, Uint8Array.from([x]))),
			...res_heat.filter(x => x !== false).map((x, idx) => bus.writeI2cBlock(0x5A + idx, Uint8Array.from([x]))),
			...gas_wait.filter(x => x !== false).map((x, idx) => bus.writeI2cBlock(0x64 + idx, Uint8Array.from([x])))
		])

		// now set valid mode
		await bus.writeI2cBlock(0x74, Uint8Array.from([ctrl_meas]))
	}

	/**
	 * @override
	 * @param {I2CAddressedBus} bus
	 * @param {Calibration} calibration
	 * @returns {Promise<CompensateResult>}
	 */
	static async measurement(bus, calibration) {
		const aBuffer = await BusUtil.readI2cBlocks(bus, [[0x1D, 15]])
		const dv = ArrayBuffer.isView(aBuffer) ?
			new DataView(aBuffer.buffer, aBuffer.byteOffset) :
			new DataView(aBuffer)

		const meas_status = dv.getUint8(0)
		const meas_index = dv.getUint8(1)
		console.log('\tmeas_index?', meas_index)

		const newdata = BitSmush.extractBits(meas_status, 7, 1) === 1
		const measuringGas = BitSmush.extractBits(meas_status, 6, 1) === 1
		const measuring = BitSmush.extractBits(meas_status, 5, 1) === 1
		const active_profile_idx = BitSmush.extractBits(meas_status, 3, 4)
		const ready = {
			ready: newdata,
			measuringGas, // active gas measurement
			measuring, // active TPH measurement
			active_profile_idx
		}

		// console.log(ready)
		if (!ready.ready) { return {} }

		const pres_msb = dv.getUint8(2)
		const pres_lsb = dv.getUint8(3)
		const pres_xlsb = dv.getUint8(4)
		const adcP = Bits.reconstruct20bit(pres_msb, pres_lsb, pres_xlsb)

		const temp_msb = dv.getUint8(5)
		const temp_lsb = dv.getUint8(6)
		const temp_xlsb = dv.getUint8(7)
		const adcT = Bits.reconstruct20bit(temp_msb, temp_lsb, temp_xlsb)

		const adcH = dv.getUint16(8, false)

		const skip0 = dv.getUint8(10)
		const skip1 = dv.getUint8(11)
		const skip2 = dv.getUint8(12)
		if (skip0 !== 0 || skip1 !== 0 || skip2 !== 0) {
			console.log('skip 012 non-zero')
		}

		const gas_r_msb = dv.getUint8(13)
		const gas_r_ext = dv.getUint8(14)

		const gas_r_lsb = BitSmush.extractBits(gas_r_ext, 7, 2)
		const gas_valid_r = BitSmush.extractBits(gas_r_ext, 5, 1) === 1
		const heat_stab_r = BitSmush.extractBits(gas_r_ext, 4, 1) === 1
		const gas_range_r = BitSmush.extractBits(gas_r_ext, 3, 4)

		const gas_r = Bits.reconstruct10bit(gas_r_msb, gas_r_lsb)

		const P = bme680.skip_value === adcP ? false : adcP
		const T = bme680.skip_value === adcT ? false : adcT
		const H = bme680.skip_value === adcH ? false : adcH

		const G = gas_valid_r ? { resistance: gas_r, range: gas_range_r, stable: heat_stab_r } : false

		console.log('\tgas valid?', gas_valid_r)
		console.log('\theater stable?', heat_stab_r)

		// console.log(calibration)
		// console.log(P, T, H)
		// console.log(G)
		// console.log(ready, meas_index, gas_valid_r, heat_stab_r, gas_r, gas_range_r)

		return Compensate.from({
				adcP: P,
				adcT: T,
				adcH: H,
				adcG: G,
				type: '6xy'
			}, calibration)
	}

	/**
	 * @override
	 * @param {I2CAddressedBus} bus
	 * @returns {Promise<ProfileReady>}
	 */
	static async ready(bus) {
		const aBuffer = await BusUtil.readI2cBlocks(bus, [[0x1D, 1]])
		const dv = ArrayBuffer.isView(aBuffer) ?
			new DataView(aBuffer.buffer, aBuffer.byteOffset) :
			new DataView(aBuffer)

		const meas_status = dv.getUint8(0)

		return {
			ready: BitSmush.extractBits(meas_status, 7, 1) === 1,
			measuringGas: BitSmush.extractBits(meas_status, 6, 1) === 1,
			measuring: BitSmush.extractBits(meas_status, 5, 1) === 1,
			active_profile_idx: BitSmush.extractBits(meas_status, 3, 4)
		}
	}

	/**
	 * @param {Profile} profile
	 *
	 */
	static estimateMeasurementWait(profile) {
		// converts enumeration oversampling from profile into
		// a known cycles - currently uses the side effect
		// of the enumeration layout to map to known cycles (aka 1:1).
		/**
		 * @param {number|false} os
		 * @returns {number}
		 */
		function oversampleToCycles(os) {
			if (os === false) { return 0 }
			const cycles = [0, 1, 2, 4, 8, 16]
			if (!cycles.includes(os)) { throw new Error('unknown oversampling enumeration') }
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
		if (profile.gas?.enabled === true) {
			const active = profile.gas.setpoints.find(sp => sp.active)
			if (active) { gasWaitMs = active.durationMs ?? 0 }
		}

		const totalMs = ((tph_durUs + 500) / 1000) + gasWaitMs

		return {
			totalWaitMs: totalMs,
			tphDurationUs: tph_durUs,
			gasDurationMs: gasWaitMs
		}
	}
}
