/** biome-ignore-all lint/style/noExcessiveLinesPerFile: full compensation */
/** biome-ignore-all lint/style/noNestedTernary: it is just nicer */
/** biome-ignore-all lint/style/useShorthandAssign: less clear */
/** biome-ignore-all lint/style/useDestructuring: less clear */
/** biome-ignore-all lint/style/useNumericSeparators: TODO */

/** @import { Calibration } from '../types/calibration.js' */
/** @import { MeasurementRaw, MeasurementRaw6xx } from '../types/measurement.js' */

/**
 * @typedef {Object} CompensateTemperature
 * @property {false} skip
 * @property {number} adc
 * @property {number} C
 *
 * @property {number} [Tfine]
 */

/**
 * @typedef {Object} CompensatePressure
 * @property {false} skip
 * @property {number} adc
 * @property {number} Pa
 *
 * @property {number} [Tfine]
 */

/**
 * @typedef {Object} CompensateHumidity
 * @property {false} skip
 * @property {number} adc
 * @property {number} percent
 * @property {number} unclampedPercent
 */

/**
 * @typedef {Object} CompensateGas
 * @property {false} skip
 * @property {number} adc
 * @property {number} Ohm
 * @property {boolean} stable
 */

/**
 * @typedef {Object} CompensateSkip
 * @property {false} adc
 * @property {true} skip
 * @property {string} why
 */

/**
 * @typedef {Object} CompensateSensorTime
 * @property {number} ticks
 * @property {Temporal.Duration} duration
 */

/**
 * @typedef {Object} CompensateResult
 * @property {CompensateSensorTime|undefined} [sensorTime]
 *
 * @property {CompensateTemperature|CompensateSkip} [temperature]
 * @property {CompensatePressure|CompensateSkip} [pressure]
 * @property {CompensateHumidity|CompensateSkip} [humidity]
 * @property {CompensateGas|CompensateSkip} [gas]
 */

export class Compensate {
	/**
	 * @param {MeasurementRaw} measurement
	 * @param {Calibration} calibration
	 */
	static from(measurement, calibration) {
		const { type } = measurement

		if (type === '2xx') { return Compensate.from_2xx(measurement, calibration) }
		if (type === '3xx') { return Compensate.from_3xx(measurement, calibration) }
		if (type === '6xx') { return Compensate.from_6xx(measurement, calibration) }

		throw new Error(`unknown measurement type: ${type}`)
	}

	/**
	 * @param {MeasurementRaw} measurement
	 * @param {Calibration} calibration
	 * @returns {CompensateResult}
	 */
	static from_3xx(measurement, calibration) {
		const temperature = Compensate.temperature_3xx(measurement.adcT, calibration.T)

		return {
			sensorTime: Compensate.sensorTime(measurement.sensorTime),
			temperature,
			pressure: Compensate.pressure_3xx(measurement.adcP, temperature, calibration.P)
		}
	}

	/**
	 * @param {number|undefined} sensorTime
	 * @returns {CompensateSensorTime|undefined}
	 */
	static sensorTime(sensorTime) {
		if (sensorTime === undefined) { return undefined }

		const sensorTimeUnits = 39.0625 // 21.3333 // µs

		const sensorTimeMicroseconds = Math.trunc(sensorTime * sensorTimeUnits)
		const duration = Temporal.Duration.from({ microseconds: sensorTimeMicroseconds })

		return {
			ticks: sensorTime,
			duration
		}
	}

	/**
	 * @param {MeasurementRaw['adcT']} adcT
	 * @param {Calibration['T']} caliT
	 * @returns {CompensateTemperature | CompensateSkip}
	 */
	static temperature_3xx(adcT, caliT) {
		if(adcT === false) { return { adc: false, skip: true, why: 'adc false' }}
		const [T1, T2, T3] = caliT

		if(T1 === undefined) { return { adc: false, skip: true, why: 'T1 undefined' } }
		if(T2 === undefined) { return { adc: false, skip: true, why: 'T2 undefined' } }
		if(T3 === undefined) { return { adc: false, skip: true, why: 'T3 undefined' } }

		const data1 = adcT - T1
		const data2 = data1 * T2
		const C = data2 + (data1 * data1) * T3

		return { adc: adcT, C, skip: false }
	}

	/**
	 * @param {MeasurementRaw['adcP']} adcP
	 * @param {CompensateResult['temperature']} temperature
	 * @param {Calibration['P']} caliP
	 * @returns {CompensatePressure | CompensateSkip}
	 */
	static pressure_3xx(adcP, temperature, caliP) {
		if(adcP === false) { return { skip: true, adc: false, why: 'adc false' } }
		if(temperature === undefined) { return { skip: true, adc: false, why: 'undefined temperature' }}
		if(temperature.skip === true) { return { skip: true, adc: false, why: 'skipped temperature' }}

		const { C } = temperature
		const [P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, P11] = caliP

		if(P1 === undefined) { return { adc: false, skip: true, why: 'P1 undefined' } }
		if(P2 === undefined) { return { adc: false, skip: true, why: 'P2 undefined' } }
		if(P3 === undefined) { return { adc: false, skip: true, why: 'P3 undefined' } }
		if(P4 === undefined) { return { adc: false, skip: true, why: 'P4 undefined' } }
		if(P5 === undefined) { return { adc: false, skip: true, why: 'P5 undefined' } }
		if(P6 === undefined) { return { adc: false, skip: true, why: 'P6 undefined' } }
		if(P7 === undefined) { return { adc: false, skip: true, why: 'P7 undefined' } }
		if(P8 === undefined) { return { adc: false, skip: true, why: 'P8 undefined' } }
		if(P9 === undefined) { return { adc: false, skip: true, why: 'P9 undefined' } }
		if(P10 === undefined) { return { adc: false, skip: true, why: 'P10 undefined' } }
		if(P11 === undefined) { return { adc: false, skip: true, why: 'P11 undefined' } }

		const C_C = C * C
		const C_C_C = C_C * C
		const adcP_P = adcP * adcP
		const adcP_P_P = adcP_P * adcP

		const data1 = P6 * C
		const data2 = P7 * (C_C)
		const data3 = P8 * (C_C_C)
		const out1 = P5 + data1 + data2 + data3

		const data4 = P2 * C
		const data5 = P3 * (C_C)
		const data6 = P4 * (C_C_C)
		const out2 = adcP * (P1 + data4 + data5 + data6)

		const data7 = adcP_P
		const data8 = P9 + P10 * C
		const data9 = data7 * data8
		const data10 = data9 + (adcP_P_P) * P11

		const press = out1 + out2 + data10

		return { adc: adcP, Pa: press, skip: false }
	}

	/**
	 * @param {MeasurementRaw6xx} measurement
	 * @param {Calibration} calibration
	 * @returns {CompensateResult}
	 */
	static from_6xx(measurement, calibration) {
		const temperature = Compensate.temperature_6xx(measurement.adcT, calibration.T)
		return {
			temperature,
			pressure: Compensate.pressure_6xx(measurement.adcP, temperature, calibration.P),
			humidity: Compensate.humidity_6xx(measurement.adcH, temperature, calibration.H),
			gas: Compensate.gas_6xx(measurement.subtype, measurement.adcG, calibration.G)
		}
	}

	/**
	 * @param {MeasurementRaw['adcT']} adcT
	 * @param {Calibration['T']} caliT
	 * @returns {CompensateTemperature | CompensateSkip}
	 */
	static temperature_6xx(adcT, caliT) {
		if (adcT === false) { return { adc: false, skip: true, why: 'adc false' } }

		if (caliT.length !== 3) { return { adc: false, skip: true, why: 'calibration length' } }
		const [ T1, T2, T3 ] = caliT

		if(T1 === undefined) { return { adc: false, skip: true, why: 'T1 undefined' } }
		if(T2 === undefined) { return { adc: false, skip: true, why: 'T2 undefined' } }
		if(T3 === undefined) { return { adc: false, skip: true, why: 'T3 undefined' } }

		const var1f = ((adcT / 16384.0) - (T1 / 1024.0)) * T2
		const var2f = ((adcT / 131072.0) - (T1 / 8192.0)) * ((adcT / 131072.0) - (T1 / 8192.0)) * (T3 * 16.0)
		const Tfinef = var1f + var2f
		const cf = Tfinef / 5120.0

		return { adc: adcT, C: cf, Tfine: Tfinef, skip: false }
	}

	/**
	 * @param {MeasurementRaw['adcP']} adcP
	 * @param {CompensateResult['temperature']} temperature
	 * @param {Calibration['P']} caliP
	 * @returns {CompensatePressure | CompensateSkip}
	 */
	static pressure_6xx(adcP, temperature, caliP) {
		if (adcP === false) { return { adc: false, skip: true, why: 'adc false' } }
		if (temperature === undefined) { return { adc: false, skip: true, why: 'temperature undefined' } }
		if (temperature.skip === true) { return { adc: false, skip: true, why: 'temperature skip' } }

		const { Tfine } = temperature

		if(Tfine === undefined) { return { adc: false, skip: true, why: 'Tfine undefined' }}

		if (caliP.length !== 10) { return { skip: true, adc: false, why: 'calibration length' } }
		const [P1, P2, P3, P4, P5, P6, P7, P8, P9, P10] = caliP

		if(P1 === undefined) { return { adc: false, skip: true, why: 'P1 undefined' } }
		if(P2 === undefined) { return { adc: false, skip: true, why: 'P2 undefined' } }
		if(P3 === undefined) { return { adc: false, skip: true, why: 'P3 undefined' } }
		if(P4 === undefined) { return { adc: false, skip: true, why: 'P4 undefined' } }
		if(P5 === undefined) { return { adc: false, skip: true, why: 'P5 undefined' } }
		if(P6 === undefined) { return { adc: false, skip: true, why: 'P6 undefined' } }
		if(P7 === undefined) { return { adc: false, skip: true, why: 'P7 undefined' } }
		if(P8 === undefined) { return { adc: false, skip: true, why: 'P8 undefined' } }
		if(P9 === undefined) { return { adc: false, skip: true, why: 'P9 undefined' } }
		if(P10 === undefined) { return { adc: false, skip: true, why: 'P10 undefined' } }

		let var1 = (Tfine / 2.0) - 64000.0
		let var2 = var1 * var1 * (P6 / 131072.0)
		var2 = var2 + (var1 * P5 * 2.0)
		var2 = (var2 / 4.0) + (P4 * 65536.0)
		var1 = (((P3 * var1 * var1) / 16384.0) + (P2 * var1)) / 524288.0
		var1 = (1.0 + (var1 / 32768.0)) * P1

		let pressure_Pa = 0

		if (var1 !== 0) {
			let p = 1048576.0 - adcP
			p = ((p - (var2 / 4096.0)) * 6250.0) / var1
			var1 = (P9 * p * p) / 2147483648.0
			var2 = p * (P8 / 32768.0)
			const var3 = (p / 256.0) * (p / 256.0) * (p / 256.0) * (P10 / 131072.0)
			p = p + (var1 + var2 + var3 + (P7 * 128.0)) / 16
			pressure_Pa = p
		}

		return { adc: adcP, Pa: pressure_Pa, Tfine, skip: false }
	}

	/**
	 * @param {MeasurementRaw['adcH']} adcH
	 * @param {CompensateResult['temperature']} temperature
	 * @param {Calibration['H']} caliH
	 * @returns {CompensateHumidity | CompensateSkip}
	 */
	static humidity_6xx(adcH, temperature, caliH) {
		if (adcH === false) { return { adc: false, skip: true , why: 'adc false'} }
		if(temperature === undefined) { return { skip: true, adc: false, why: 'temperature undefined' } }
		if(temperature.skip === true) { return { skip: true, adc: false, why: 'temperature skipped' } }

		const { Tfine } = temperature
		if(Tfine === undefined) { return { skip: true, adc: false, why: 'Tfine undefined' } }

		if (caliH.length !== 7) { return { skip: true, adc: false, why: 'calibration length' } }
		const [H1, H2, H3, H4, H5, H6, H7] = caliH

		if(H1 === undefined) { return { adc: false, skip: true, why: 'H1 undefined' } }
		if(H2 === undefined) { return { adc: false, skip: true, why: 'H2 undefined' } }
		if(H3 === undefined) { return { adc: false, skip: true, why: 'H3 undefined' } }
		if(H4 === undefined) { return { adc: false, skip: true, why: 'H4 undefined' } }
		if(H5 === undefined) { return { adc: false, skip: true, why: 'H5 undefined' } }
		if(H6 === undefined) { return { adc: false, skip: true, why: 'H6 undefined' } }
		if(H7 === undefined) { return { adc: false, skip: true, why: 'H7 undefined' } }

		const temp_comp = Tfine / 5120.0
		const var1 = adcH - ((H1 * 16.0) + ((H3 / 2.0) * temp_comp))
		const var2 = var1 * (
			(
				(H2 / 262144.0) *
				(1.0 +
					((H4 / 16384.0) * temp_comp) +
					((H5 / 1048576.0) * temp_comp * temp_comp)
				)
			)
		)
		const var3 = H6 / 16384.0
		const var4 = H7 / 2097152.0
		const unclamped = var2 + ((var3 + (var4 * temp_comp)) * var2 * var2)
		const hum = Math.min(Math.max(unclamped, 0), 100) // clamp(0, 100)

		return { adc: adcH, percent: hum, unclampedPercent: unclamped, skip: false }
	}

	/**
	 * @param {MeasurementRaw6xx['subtype']} subtype
	 * @param {MeasurementRaw['adcG']} adcG
	 * @param {Calibration['G']} caliG
	 * @returns {CompensateGas | CompensateSkip}
	 */
	static gas_6xx(subtype, adcG, caliG) {
		if(subtype === '680') {
			return Compensate.gas_6xx_680(adcG, caliG)
		}

		if(subtype === '688') {
			return Compensate.gas_6xx_688(adcG, caliG)
		}

		console.warn('unknown measurement subtype for gas', subtype)
		return { adc: false, skip: true, why: 'unknown subtype' }
	}

	/**
	 * @param {MeasurementRaw['adcG']} adcG
	 * @param {Calibration['G']} caliG
	 * @returns {CompensateGas | CompensateSkip}
	 */
	static gas_6xx_680(adcG, caliG) {
		if (adcG === false) { return { adc: false, skip: true, why: 'adc false' } }
		if(caliG === undefined) { return { adc: false, skip: true, why: 'undefined calibration' } }

		const Gg = caliG.G
		if (Gg.length !== 3) { return { adc: false, skip: true, why: 'calibration length' } }
		// const [ g1, g2, g3 ] = Gg

		const lookup1 = [
			0.0, 0.0, 0.0, 0.0, 0.0, -1.0, 0.0, -0.8, 0.0, 0.0, -0.2, -0.5, 0.0, -1.0, 0.0, 0.0
		]

		const lookup2 = [
			0.0, 0.0, 0.0, 0.0, 0.1, 0.7, 0.0, -0.8, -0.1, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
		]

		const range1 = lookup1[adcG.range]
		const range2 = lookup2[adcG.range]

		if(range1 === undefined) { return { adc: false, skip: true, why: 'lookup 1' } }
		if(range2 === undefined) { return { adc: false, skip: true, why: 'lookup 2' } }

		const var1 = (1340.0 + (5.0 * caliG.range_switching_error))
		const var2 = var1 * (1.0 + (range1 / 100.0))
		const var3 = 1.0 + (range2 / 100.0)
		const gas_res = 1.0 / (var3 * (0.000000125) * (1 << adcG.range) * ((((adcG.resistance) - 512.0) / var2) + 1.0))

		// const var1 = (1340.0 + (5 * caliG.range_switching_error)) * (1.0 + range1 / 100.0)
		// const gas_res = var1 * range2 / (adcG.resistance - 512.0 + var1)


		return { adc: adcG.range, Ohm: gas_res, skip: false, stable: adcG.stable }
	}

	/**
	 * @param {MeasurementRaw['adcG']} adcG
	 * @param {Calibration['G']} caliG
	 * @returns {CompensateGas | CompensateSkip}
	 */
	static gas_6xx_688(adcG, caliG) {
		if (adcG === false) { return { adc: false, skip: true, why: 'adc false' } }
		if(caliG === undefined) { return { adc: false, skip: true, why: 'undefined calibration' } }

		const Gg = caliG.G
		if (Gg.length !== 3) { return { adc: false, skip: true, why: 'calibration length' } }


		const var1 = 262144 >> adcG.range
		const var2 = 4069 + ((adcG.resistance - 512) * 3)
		const gas_res = 1_000_000.0 * var1 / var2

		return { adc: adcG.range, Ohm: gas_res, skip: false, stable: adcG.stable }
	}

	/**
	 * @param {MeasurementRaw} measurement
	 * @param {Calibration} calibration
	 * @returns {CompensateResult}
	 */
	static from_2xx(measurement, calibration) {
		const temperature = Compensate.temperature(measurement.adcT, calibration.T)
		const pressure = Compensate.pressure(measurement.adcP, temperature, calibration.P)
		const humidity = Compensate.humidity(measurement.adcH, temperature, calibration.H)

		return {
			temperature,
			pressure,
			humidity
		}
	}

	/**
	 * @param {MeasurementRaw['adcT']} adcT
	 * @param {Calibration['T']} caliT
	 * @returns {CompensateTemperature | CompensateSkip}
	 */
	static temperature(adcT, caliT) {
		if (adcT === false) { return { adc: false, skip: true, why: 'adc false' } }

		if (caliT.length !== 3) { return { skip: true, adc: false, why: 'calibration length' } }
		const [ T1, T2, T3 ] = caliT

		// console.log(T, T1, T2, T3)
		if (T1 === undefined) { return { adc: false, skip: true, why: 'T1 undefined' } }
		if (T2 === undefined) { return { adc: false, skip: true, why: 'T2 undefined' } }
		if (T3 === undefined) { return { adc: false, skip: true, why: 'T3 undefined' } }

		const var1f = (adcT / 16384.0 - T1 / 1024.0) * T2
		const var2f = (adcT / 131072.0 - T1 / 8192.0) * (adcT / 131072.0 - T1 / 8192.0) * T3
		const Tfine = var1f + var2f
		const cf = Tfine / 5120.0

		return {
			adc: adcT,
			Tfine,
			C: cf,
			skip: false
		}
	}

	/**
	 * @param {MeasurementRaw['adcP']} adcP
	 * @param {CompensateResult['temperature']} temperature
	 * @param {Calibration['P']} caliP
	 * @returns {CompensatePressure | CompensateSkip}
	 */
	static pressure(adcP, temperature, caliP) {
		if (adcP === false) { return { skip: true, adc: false, why: 'adc false' } }
		if(temperature === undefined) { return { skip: true, adc: false, why: 'temperature undefined' } }
		if(temperature.skip === true) { return { skip: true, adc: false, why: 'temperature skipped' } }

		const { Tfine } = temperature
		if(Tfine === undefined) { return { skip: true, adc: false, why: 'Tfine undefined' } }

		if (caliP.length !== 9) { return { skip: true, adc: false, why: 'calibration length' } }
		const [
			dig_P1, dig_P2, dig_P3, dig_P4,
			dig_P5, dig_P6, dig_P7, dig_P8, dig_P9
		] = caliP

		if(dig_P1 === undefined) { return { adc: false, skip: true, why: 'P1 undefined' } }
		if(dig_P2 === undefined) { return { adc: false, skip: true, why: 'P2 undefined' } }
		if(dig_P3 === undefined) { return { adc: false, skip: true, why: 'P3 undefined' } }
		if(dig_P4 === undefined) { return { adc: false, skip: true, why: 'P4 undefined' } }
		if(dig_P5 === undefined) { return { adc: false, skip: true, why: 'P5 undefined' } }
		if(dig_P6 === undefined) { return { adc: false, skip: true, why: 'P6 undefined' } }
		if(dig_P7 === undefined) { return { adc: false, skip: true, why: 'P7 undefined' } }
		if(dig_P8 === undefined) { return { adc: false, skip: true, why: 'P8 undefined' } }
		if(dig_P9 === undefined) { return { adc: false, skip: true, why: 'P9 undefined' } }

		let pvar1 = Tfine / 2 - 64000
		let pvar2 = pvar1 * pvar1 * dig_P6 / 32768
		pvar2 = pvar2 + pvar1 * dig_P5 * 2
		pvar2 = pvar2 / 4 + dig_P4 * 65536
		pvar1 = (dig_P3 * pvar1 * pvar1 / 524288 + dig_P2 * pvar1) / 524288
		pvar1 = (1 + pvar1 / 32768) * dig_P1

		let pressure_hPa = 0

		if (pvar1 !== 0) {
			let p = 1048576 - adcP
			p = ((p - pvar2 / 4096) * 6250) / pvar1
			pvar1 = dig_P9 * p * p / 2147483648
			pvar2 = p * dig_P8 / 32768
			p = p + (pvar1 + pvar2 + dig_P7) / 16
			pressure_hPa = p / 100
		}
		return { adc: adcP, Pa: pressure_hPa * 100, skip: false }
	}

	/**
	 * @param {MeasurementRaw['adcH']} adcH
	 * @param {CompensateResult['temperature']} temperature
	 * @param {Calibration['H']} caliH
	 * @returns {CompensateHumidity | CompensateSkip}
	 */
	static humidity(adcH, temperature, caliH) {
		if (adcH === false) { return { skip: true, adc: false, why: 'adc false' } }
		if(temperature === undefined) { return { skip: true, adc: false, why: 'temperature undefined' } }
		if(temperature.skip === true) { return { skip: true, adc: false, why: 'temperature skipped' } }

		const { Tfine } = temperature
		if(Tfine === undefined) { return { skip: true, adc: false, why: 'Tfine undefined' } }


		if (caliH.length !== 6) { return { adc: false, skip: true, why: 'calibration length' } }
		const [dig_H1, dig_H2, dig_H3, dig_H4, dig_H5, dig_H6] = caliH

		if (Tfine === undefined) { return { adc: false, skip: true, why: 'undefined Tfine' } }
		if (dig_H1 === undefined) { return { adc: false, skip: true, why: 'undefined h1' } }
		if (dig_H2 === undefined) { return { adc: false, skip: true, why: 'undefined h2' } }
		if (dig_H3 === undefined) { return { adc: false, skip: true, why: 'undefined h3' } }
		if (dig_H4 === undefined) { return { adc: false, skip: true, why: 'undefined h4' } }
		if (dig_H5 === undefined) { return { adc: false, skip: true, why: 'undefined h5' } }
		if (dig_H6 === undefined) { return { adc: false, skip: true, why: 'undefined h6' } }

		const var1 = Tfine - 76800.0

		const var2 = (adcH - (dig_H4 * 64.0 + dig_H5 / 16384.0 * var1)) * (dig_H2 / 65536.0 * (1.0 + dig_H6 / 67108864.0 * var1 * (1.0 + dig_H3 / 67108864.0 * var1)))

		const var3 = var2 * (1.0 - dig_H1 * var2 / 524288.0)
		const h = Math.min(Math.max(var3, 0), 100) // clamp(0, 100)

		return {
			adc: adcH,
			unclampedPercent: var3,
			percent: h,
			skip: false
		}
	}
}

/*
export class AltComp {
	static fivdiCompensate(raw, coefficients) {
		return AltComp.compensateRawData(raw, coefficients)
	}
	static compensateTemperature(adcT, coef) {
		const c = { t1: coef[0], t2: coef[1], t3: coef[2] }
		return ((adcT / 16384 - c.t1 / 1024) * c.t2) +
			((adcT / 131072 - c.t1 / 8192) * (adcT / 131072 - c.t1 / 8192) * c.t3)
	}

	static compensateHumidity(adcH, tFine, coef) {
		const c = {
			h1: coef[0],
			h2: coef[1],
			h3: coef[2],
			h4: coef[3],
			h5: coef[4],
			h6: coef[5]
		}

		let h = tFine - 76800
		h = (adcH - (c.h4 * 64 + c.h5 / 16384 * h)) *
			(c.h2 / 65536 * (1 + c.h6 / 67108864 * h * (1 + c.h3 / 67108864 * h)))
		h = h * (1 - c.h1 * h / 524288)

		if (h > 100) {
			h = 100
		} else if (h < 0) {
			h = 0
		}

		return h
	}

	static compensatePressure(adcP, tFine, coef) {
		const c = {
			p1: coef[0],
			p2: coef[1],
			p3: coef[2],
			p4: coef[3],
			p5: coef[4],
			p6: coef[5],
			p7: coef[6],
			p8: coef[7],
			p9: coef[8]
		}

		let var1 = tFine / 2 - 64000
		let var2 = var1 * var1 * c.p6 / 32768
		var2 = var2 + var1 * c.p5 * 2
		var2 = (var2 / 4) + (c.p4 * 65536)
		var1 = (c.p3 * var1 * var1 / 524288 + c.p2 * var1) / 524288
		var1 = (1 + var1 / 32768) * c.p1

		if (var1 === 0) {
			return 0 // avoid exception caused by division by zero
		}

		let p = 1048576 - adcP
		p = (p - (var2 / 4096)) * 6250 / var1
		var1 = c.p9 * p * p / 2147483648
		var2 = p * c.p8 / 32768
		p = p + (var1 + var2 + c.p7) / 16

		return p
	}

	static compensateRawData(rawData, coefficients) {
		const tFine = AltComp.compensateTemperature(rawData.adcT, coefficients.T)
		let pressure = AltComp.compensatePressure(rawData.adcP, tFine, coefficients.P)
		const humidity = AltComp.compensateHumidity(rawData.adcH, tFine, coefficients.H)

		const temperature = tFine / 5120
		pressure = pressure / 100

		return {
			adc: rawData,
			temperature, pressure, humidity
		}
	}

	static skyCompensate(raw, calib) {
		const adc_T = raw.adcT
		const adc_P = raw.adcP
		const adc_H = raw.adcH


		const dig_T1 = calib.T[0]
		const dig_T2 = calib.T[1]
		const dig_T3 = calib.T[2]

		const dig_P1 = calib.P[0]
		const dig_P2 = calib.P[1]
		const dig_P3 = calib.P[2]
		const dig_P4 = calib.P[3]
		const dig_P5 = calib.P[4]
		const dig_P6 = calib.P[5]
		const dig_P7 = calib.P[6]
		const dig_P8 = calib.P[7]
		const dig_P9 = calib.P[8]

		const dig_H1 = calib.H[0]
		const dig_H2 = calib.H[1]
		const dig_H3 = calib.H[2]
		const dig_H4 = calib.H[3]
		const dig_H5 = calib.H[4]
		const dig_H6 = calib.H[5]

		// Temperature (temperature first since we need t_fine for pressure and humidity)
		//
		const tvar1 = ((((adc_T >> 3) - (dig_T1 << 1))) * dig_T2) >> 11
		const tvar2 = (((((adc_T >> 4) - dig_T1) * ((adc_T >> 4) - dig_T1)) >> 12) * dig_T3) >> 14
		const t_fine = tvar1 + tvar2

		const temperature_C = ((t_fine * 5 + 128) >> 8) / 100

		// Pressure
		//
		let pvar1 = t_fine / 2 - 64000
		let pvar2 = pvar1 * pvar1 * dig_P6 / 32768
		pvar2 = pvar2 + pvar1 * dig_P5 * 2
		pvar2 = pvar2 / 4 + dig_P4 * 65536
		pvar1 = (dig_P3 * pvar1 * pvar1 / 524288 + dig_P2 * pvar1) / 524288
		pvar1 = (1 + pvar1 / 32768) * dig_P1

		let pressure_hPa = 0

		if (pvar1 !== 0) {
			let p = 1048576 - adc_P
			p = ((p - pvar2 / 4096) * 6250) / pvar1
			pvar1 = dig_P9 * p * p / 2147483648
			pvar2 = p * dig_P8 / 32768
			p = p + (pvar1 + pvar2 + dig_P7) / 16

			pressure_hPa = p / 100
		}

		// Humidity
		//
		let h = t_fine - 76800
		h = (adc_H - (dig_H4 * 64 + dig_H5 / 16384 * h)) *
			(dig_H2 / 65536 * (1 + dig_H6 / 67108864 * h * (1 + dig_H3 / 67108864 * h)))
		h = h * (1 - dig_H1 * h / 524288)

		const humidity = (h > 100) ? 100 : (h < 0 ? 0 : h)

		return {
			temperature_C, humidity, pressure_hPa
		}
	}

	static agsysCompensate(raw, calib) {
		const adc_T = raw.adcT
		const adc_P = raw.adcP
		const adc_H = raw.adcH

		const dig_T1 = calib.T[0]
		const dig_T2 = calib.T[1]
		const dig_T3 = calib.T[2]

		const dig_P1 = calib.P[0]
		const dig_P2 = calib.P[1]
		const dig_P3 = calib.P[2]
		const dig_P4 = calib.P[3]
		const dig_P5 = calib.P[4]
		const dig_P6 = calib.P[5]
		const dig_P7 = calib.P[6]
		const dig_P8 = calib.P[7]
		const dig_P9 = calib.P[8]

		const dig_H1 = calib.H[0]
		const dig_H2 = calib.H[1]
		const dig_H3 = calib.H[2]
		const dig_H4 = calib.H[3]
		const dig_H5 = calib.H[4]
		const dig_H6 = calib.H[5]

		// temperature
		let var1 = ((((adc_T >> 3) - (dig_T1 << 1))) * dig_T2) >> 11
		let var2 = (((((adc_T >> 4) - dig_T1) * ((adc_T >> 4) - dig_T1)) >> 12) * dig_T3) >> 14
		const t_fine = var1 + var2

		// humidity
		var1 = t_fine - 76800
		var1 = (adc_H - (dig_H4 * 64 + dig_H5 / 16384 * var1)) *
			(dig_H2 / 65536 * (1 + dig_H6 / 67108864 * var1 * (1 + dig_H3 / 67108864 * var1)))
		var1 = var1 * (1 - dig_H1 * var1 / 524288)

		let hum = (var1 > 100) ? 100 : (var1 < 0 ? 0 : var1)
		hum = Math.round(hum * 10) / 10

		// pressure
		var1 = t_fine / 2 - 64000
		var2 = var1 * var1 * dig_P6 / 32768
		var2 = var2 + var1 * dig_P5 * 2
		var2 = var2 / 4 + dig_P4 * 65536
		var1 = (dig_P3 * var1 * var1 / 524288 + dig_P2 * var1) / 524288
		var1 = (1 + var1 / 32768) * dig_P1

		// need to avoid division by zero
		let pressure_hPa = Number.NaN // uh oh, we must be in deep space

		if (var1 !== 0) {
			let p = 1048576 - adc_P
			p = ((p - var2 / 4096) * 6250) / var1
			var1 = dig_P9 * p * p / 2147483648
			var2 = p * dig_P8 / 32768
			p = (p + (var1 + var2 + dig_P7) / 16) / 100

			// if (this.device.elevation > 0) {
			//     p = this._seaLevelPressure(p)
			// }

			pressure_hPa = Math.round(p * 100) / 100
		}

		//
		return {
			humidity: hum,
			temperature_C: Math.round(((t_fine * 5 + 128) >> 8) / 10) / 10,
			tfine: t_fine,
			pressure_hPa
		}
	}
}
*/
