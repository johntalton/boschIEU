import { BitSmush } from "@johntalton/bitsmush"
import { NameValueUtil } from "./nvutil.js"

/** @import { Calibration } from '../types/calibration.js' */
/** @import { NVMap } from './nvutil.js' */

/** @type {NVMap<number>} */
export const GAS_WAIT_MULTIPLIER = [
	{ name: 1, value: 0 },
	{ name: 4, value: 1 },
	{ name: 16, value: 2 },
	{ name: 64, value: 3 }
]

export const GAS_WAIT_MULTIPLIER_NAMES = GAS_WAIT_MULTIPLIER.map(gwm => gwm.name)
export const GAS_WAIT_MAX_INT_PART = Math.pow(2, 6) - 1
export const GAS_WAIT_MAX_MULTIPLIER = 64

/**
 * @param {number} waitMs
 */
export function _toGasWait(waitMs) {
	const candidateMultiplier = GAS_WAIT_MULTIPLIER_NAMES.find(m => waitMs < (GAS_WAIT_MAX_INT_PART * m) + (m / 2))
	const multiplier = candidateMultiplier === undefined ? GAS_WAIT_MAX_MULTIPLIER : candidateMultiplier
  const valueUnclamped = Math.round(waitMs / multiplier)
  const value = Math.max(0, Math.min(valueUnclamped, GAS_WAIT_MAX_INT_PART))
  const err = Math.abs(waitMs - (multiplier * value))

  return {
    multiplier,
    value,
    err
  }
}


export class Setpoint {
	/**
	 * @param {number} waitMs
	 * @returns {number}
	 */
	static toGasWait(waitMs) {
		const { multiplier, value } = _toGasWait(waitMs)
		const multiplierValue = NameValueUtil.toValue(multiplier, GAS_WAIT_MULTIPLIER)
		return BitSmush.smushBits([ [ 7, 2 ], [ 5, 6 ] ], [ multiplierValue, value ])
	}

	/**
	 * @param {number|undefined} register
	 * @returns {number|undefined}
	 */
	static fromGasWait(register) {
		if(register === undefined) { return undefined }
		const multiplier = NameValueUtil.toName(BitSmush.extractBits(register, 7, 2), GAS_WAIT_MULTIPLIER)
		const baseMs = BitSmush.extractBits(register, 5, 6)
		return baseMs * multiplier
	}

	/**
	 * @param {number} targetTemperatureC
	 * @param {Calibration['G']} calibrationG
   * @param {number} ambientTemperatureC
	 * @returns {number}
	 */
	static toRestHeat(targetTemperatureC, calibrationG, ambientTemperatureC) {
		if(calibrationG === undefined) { throw new Error('calibration undefined') }

		if(targetTemperatureC === 0) { return 0 }

		const [ G1, G2, G3 ] = calibrationG.G

		if(G1 === undefined) { throw new Error('calibration G undefined') }
		if(G2 === undefined) { throw new Error('calibration G undefined') }
		if(G3 === undefined) { throw new Error('calibration G undefined') }

		const var1 = (G1 / 16.0) + 49.0
		const var2 = ((G2 / 32_768.0) * 0.0005) + 0.002_35
		const var3 = G3 / 1024.0
		const var4 = var1 * (1.0 + (var2 * targetTemperatureC))
		const var5 = var4 + (var3 * ambientTemperatureC)
		const res_heat = 3.4 * ((var5
															* (4 / (4 + calibrationG.res_heat_range))
															* (1 / (1 + (calibrationG.res_heat_val * 0.002)))
														) - 25)

		const value = Math.max(0, Math.min(Math.round(res_heat), 255))
		return value
	}

	/**
	 * @param {number|undefined} register
	 * @param {Calibration['G']} calibrationG
	 * @param {number} ambientTemperatureC
	 * @returns {number|undefined}
	 */
	static fromResHeat(register, calibrationG, ambientTemperatureC) {
		if(register === undefined) { return undefined }
		if(calibrationG === undefined) { throw new Error('calibration undefined') }

		if(register === 0) { return 0 }

		const [ G1, G2, G3 ] = calibrationG.G

		if(G1 === undefined) { throw new Error('calibration G undefined') }
		if(G2 === undefined) { throw new Error('calibration G undefined') }
		if(G3 === undefined) { throw new Error('calibration G undefined') }

		const var1 = (G1 / 16.0) + 49.0
		const var2 = ((G2 / 32_768.0) * 0.0005) + 0.002_35
		const var3 = G3 / 1024.0

		const unclampedC = (((((((register / 3.4) + 25) / (1 / (1 + (calibrationG.res_heat_val * 0.002)))) / (4 / (4 + calibrationG.res_heat_range)))  -  (var3 * ambientTemperatureC)) / var1) - 1.0) / var2

		return Math.max(0, Math.round(unclampedC))
	}

	/**
	 * @param {number} mA
	 * @returns {number}
	 */
	static toIDACHeat(mA) {
		if(mA === 0) { return 0 }
		const bits = Math.max(0, Math.round((mA * 8) - 1))
		return BitSmush.smushBits([[ 7, 7 ]], [ bits ])
	}

	/**
	 * @param {number|undefined} register
	 * @returns {number|undefined}
	 */
	static fromIDACHeat(register) {
		if(register === undefined) { return undefined }
		if(register === 0) { return 0 }

		const idac_heat = BitSmush.extractBits(register, 7, 7)
		return Math.round((idac_heat + 1) / 8)
	}
}
