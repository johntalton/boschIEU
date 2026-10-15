import { BitSmush } from '@johntalton/bitsmush'
import { NameValueUtil } from '../nvutil.js'
import { BusUtil } from '../util.js'

import {
	REGISTERS as BME6XX_REGISTERS,
	bme6xx
} from './bme6xx.js'
import { enumMap, GENERIC_FILTER_EXT, GENERIC_OVERSAMPLES } from './generic.js'
import { Util } from './util.js'

/** @import { I2CAddressedBus } from '@johntalton/and-other-delights' */
/** @import { Features } from '../types/features.js' */
/** @import { Profile6xx, ProfileReady, ProfileModes } from '../types/profile.js' */
/** @import { Calibration } from '../types/calibration.js' */
/** @import { NVMap } from '../nvutil.js' */

/** @type {NVMap<Extract<ProfileModes, 'SLEEP'|'FORCED'|'PARALLEL'>}>} */
export const MODES = [
	{ name: 'SLEEP',  value: 0 },
	{ name: 'FORCED', value: 1 },
	{ name: 'PARALLEL', value: 3 }
]

export const REGISTERS = {
	GAS_WAIT_SHARED: 0x6E
}

/** @type {Array<[ number, number ]>} */
export const SET_POINTS_BLOCK = [ [ BME6XX_REGISTERS.GAS_WAIT_0, 31 ] ]

export class bme688 extends bme6xx {
	/**
	 * @override
	 */
	static get name() { return 'bme688' }

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
			modes: [ 'SLEEP', 'FORCED', 'PARALLEL' ]
		}
	}

	/**
	 * @param {I2CAddressedBus} bus
	 * @returns {Promise<number>}
	 */
	static async revId(bus) {
		// todo
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

		const gas_wait_shared = dv.getUint8(30)

		const idac_heat = Util.range(0, 9).map(idx => dv.getUint8(idx))
		const res_heat = Util.range(10, 19).map(idx => dv.getUint8(idx))
		const gas_wait = Util.range(20, 29).map(idx => dv.getUint8(idx))

		const setpoints = bme6xx.parseSetpoint(idac_heat, res_heat, gas_wait, nb_conv)

		//
		const run_gas = BitSmush.extractBits(ctrl_gas_1, 5, 1) === 1

		return {
			mode: NameValueUtil.toName(mode, MODES),
			oversampling_p: NameValueUtil.toName(osrs_p, GENERIC_OVERSAMPLES),
			oversampling_t: NameValueUtil.toName(osrs_t, GENERIC_OVERSAMPLES),
			oversampling_h: NameValueUtil.toName(osrs_h, GENERIC_OVERSAMPLES),
			filter_coefficient: NameValueUtil.toName(filter, GENERIC_FILTER_EXT),

			gas: {
				headerEnabled: !heat_off,
				conversionEnabled: run_gas,
				setpoints,
				gas_wait_shared
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
	 * @param {Profile6xx} p
	 */
	static async setProfile(bus, p) {

	}

	/**
	 * @override
	 * @param {I2CAddressedBus} bus
	 * @param {Calibration} calibration
	 * @returns {Promise<CompensateResult>}
	 */
	static async measurement(bus, calibration) {

	}

	/**
	 * @override
	 * @returns {Promise<ProfileReady>}
	 */
	static async ready() {

	}
}
