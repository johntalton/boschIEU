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

export {}
