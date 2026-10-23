export const PA_PER_KPA = 1000

// record low of 870 mBar (87 kPa, 26 inHg).
// record highs close to 1085 mBar (108.5 kPa, 32.0 inHg
export const MIN_SEA_LEVEL_PA = 87 * PA_PER_KPA
export const MAX_SEA_LEVEL_PA = 1085 * PA_PER_KPA

// a normal guess for sea level
export const NORMAL_SEA_LEVEL_PA = 101.325 * PA_PER_KPA

/**
 *
 */
export class Converter {
	/**
	 * @param {number} seaLevelPa
	 * @param {number|undefined} P
	 * @returns {number|undefined}
	 */
	static altitudeFromPressure(seaLevelPa, P) {
		if (P === undefined) { return undefined }
		// if((searLevelPa / Pa) >= (101325 / 5474.89) { throw new Error('max altitude') }
		// return (1.0 - Math.pow(pressure_hPa / seaLevelPressure_hPa, (1 / 5.2553))) * 145366.45

		const exp = 1 / 5.2553 // 0.1903
		const foo = (1.0 - Math.pow((P / 100.0) / (seaLevelPa / 100.0), exp)) * 145_366.45

		// console.log(seaLevelPa, P, exp, foo)
		return foo
	}

	/**
	 * @param {number} Pa
	 * @returns {number}
	 */
	static pressurePaToInHg(Pa) {
		return Pa * (1 / 3386.389)
	}

	/**
	 * @param {number} ft
	 * @returns {number}
	 */
	static ftToMeter(ft) {
		return ft / 3.2808
	}

	/**
	 * @param {number} T
	 * @param {number} H
	 * @returns {number}
	 */
	static dewPoint(T, H) {
		return T - ((100 - H) / 5)
	}

	/**
	 * @param {number|undefined} c
	 * @returns {number|undefined}
	 */
	static ctof(c) {
		if (c === undefined) { return undefined }
		return c * (9 / 5.0) + 32
	}

	/**
	 * @param {number|undefined} f
	 * @returns {number|undefined}
	 */
	static ftoc(f) {
		if (f === undefined) { return undefined }
		return (f - 32) * (5 / 9.0)
	}

	/**
	 * @param {number|undefined} f
	 * @returns {number|undefined}
	 */
	static trim(f) {
		if (f === undefined) { return undefined }
		return Math.round(f * 10_000) / 10_000
	}
}
