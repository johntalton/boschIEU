import { BitSmush } from '@johntalton/bitsmush'

import { NameValueUtil } from '../nvutil.js'
import { BusUtil } from '../util.js'
import { Bits } from './bits.js'
import { GenericChip } from './generic.js'
import { Util } from './util.js'


/** @import { I2CAddressedBus } from '@johntalton/and-other-delights' */
/** @import { Calibration } from '../types/calibration.js' */
/** @import { ChipKind } from './chip.js'  */
/** @import { GasSetpoint } from '../types/profile.js' */

/**
 * @typedef {Object} IntermediateProfile6xx
 * @property {number} ctrl_gas_0
 * @property {number} ctrl_gas_1
 * @property {number} ctrl_hum
 * @property {number} status
 * @property {number} ctrl_meas
 * @property {number} config
 *
 * @property {number} filter
 * @property {boolean} spi_3w_en
 * @property {number} mode
 * @property {number} osrs_t
 * @property {number} osrs_p
 * @property {number} osrs_h
 * @property {boolean} spi_3w_int_en
 * @property {number} spi_mem_page
 * @property {number} nb_conv
 * @property {boolean} heat_off
 */

export const REGISTERS = {
	VARIANT: 0xF0, // 688 (reserved on 680)
	RESET: 0xE0,
	CHIP_ID: 0xD0,

	CONFIG: 0x75,
	CTRL_MEAS: 0x74,
	STATUS: 0x73,
	CTRL_HUM: 0x72,
	CTRL_GAS_1: 0x71,
	CTRL_GAS_0: 0x70,


	IDAC_HEAD_0: 0x50,
	RES_HEAD_0: 0x5A,
	GAS_WAIT_0: 0x64
}

/** @type {Array<[ number, number ]>} */
export const PROFILE_BLOCK = [ [ REGISTERS.CTRL_GAS_0, 6 ] ]


export const RESET_MAGIC = 0xB6


// todo move to common enumerations in generic? but its not
export const gwMultipliers = [
	{ name: 1, value: 0 },
	{ name: 4, value: 1 },
	{ name: 16, value: 2 },
	{ name: 64, value: 3 }
]


/** @param {number|undefined} gasWait  */
export function gasWaitToDuration(gasWait) {
	if(gasWait === undefined) { return undefined }
	const multiplier = NameValueUtil.toName(BitSmush.extractBits(gasWait, 7, 2), gwMultipliers)
	const baseMs = BitSmush.extractBits(gasWait, 5, 6)
	return baseMs * multiplier
}

/**
 * @param {number|undefined} resHeat
 */
export function resHeatToTemperature(resHeat) {
	return resHeat
}

/**
 * @param {number|undefined} idacHeat
 */
export function idacHeatToMa(idacHeat) {
	return idacHeat
}


export class bme6xx extends GenericChip {
	/**
	 * @override
	 * @returns {ChipKind}
	 */
	static get kind() { return '6xx' }


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
		const aBuffer = await BusUtil.readI2cBlocks(bus, [[0x89, 25], [0xE1, 16], [0x00, 1], [0x02, 1], [0x04, 1]])
		const dv = ArrayBuffer.isView(aBuffer) ?
			new DataView(aBuffer.buffer, aBuffer.byteOffset) :
			new DataView(aBuffer)

		// console.log(buffer)
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

		const h1_lsb = BitSmush.extractBits(h1_2_lsb, 3, 4)
		const h2_lsb = BitSmush.extractBits(h1_2_lsb, 7, 4)

		const h1 = Bits.reconstruct12bit(h1_msb, h1_lsb)
		const h2 = Bits.reconstruct12bit(h2_msb, h2_lsb)
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

		// console.log('\tcalibration', T, P, H, G)

		const res_heat_val = dv.getInt8(41)
		const reg02 = dv.getUint8(42)
		const reg04 = dv.getInt8(43)

		const res_heat_range = BitSmush.extractBits(reg02, 5, 2)
		const range_switching_error = Bits.decodeTwos(BitSmush.extractBits(reg04, 7, 4), 4)

		return {
			T, P, H,
			G: {
				G,
				res_heat_val,
				res_heat_range,
				range_switching_error // does not apply to the bme688
			}
		}
	}

	/**
	 * @param {Array<number>} idac_heat
	 * @param {Array<number>} res_heat
	 * @param {Array<number>} gas_wait
	 * @param {number} nb_conv
	 * @returns {Array<GasSetpoint>}
	 */
 	static parseSetpoint(idac_heat, res_heat, gas_wait, nb_conv) {
		const setpoints = Util.range(0, 9).map(i => {
			const durationMs = gasWaitToDuration(gas_wait[i]) ?? 0
			const temperatureC = resHeatToTemperature(res_heat[i]) ?? 0
			const initialMa = idacHeatToMa(idac_heat[i]) ?? 0

			return {
				index: i,
				selected: i === nb_conv,

				durationMs,
				temperatureC,
				initialMa
			}
		})


		return setpoints
	}

	/**
	 * @param {I2CAddressedBus} bus
	 * @returns {Promise<IntermediateProfile6xx>}
	 */
	static async rawProfile(bus) {
		const buffer = await BusUtil.readI2cBlocks(bus, PROFILE_BLOCK)
		const dv = ArrayBuffer.isView(buffer) ?
			new DataView(buffer.buffer, buffer.byteOffset) :
			new DataView(buffer)

		const ctrl_gas_0 = dv.getUint8(0)
		const ctrl_gas_1 = dv.getUint8(1)
		const ctrl_hum = dv.getUint8(2)
		const status = dv.getUint8(3)
		const ctrl_meas = dv.getUint8(4)
		const config = dv.getUint8(5)


		const filter = BitSmush.extractBits(config, 4, 3)
		const spi_3w_en = BitSmush.extractBits(config, 0, 1) === 1

		const mode = BitSmush.extractBits(ctrl_meas, 1, 2)

		const osrs_t = BitSmush.extractBits(ctrl_meas, 7, 3)
		const osrs_p = BitSmush.extractBits(ctrl_meas, 4, 3)
		const osrs_h = BitSmush.extractBits(ctrl_hum, 2, 3)

		const spi_3w_int_en = BitSmush.extractBits(ctrl_hum, 6, 1) === 1
		const spi_mem_page = BitSmush.extractBits(status, 4, 1)

		const nb_conv = BitSmush.extractBits(ctrl_gas_1, 3, 4)
		const heat_off = BitSmush.extractBits(ctrl_gas_0, 3, 1) === 1

		return {
			ctrl_gas_0,
			ctrl_gas_1,
			ctrl_hum,
			status,
			ctrl_meas,
			config,

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
		}

	}
}
