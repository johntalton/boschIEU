/** @import { CompensateResult } from '../chip/compensate.js' */
/** @import { ReadyStatus3xx, ReadyStatus6xx } from './ready.js' */

/**
 * @typedef {Object} MeasurementGas
 * @property {number} resistance
 * @property {number} range
 * @property {boolean} stable
 */

/**
 * @typedef {Object} MeasurementRaw
 * @property {'2xy'|'3xy'|'6xy'} type
 * @property {number|false} adcT
 * @property {number|false} adcP
 * @property {number|false} adcH
 * @property {MeasurementGas|false} adcG
 *
 * @property {number} [sensorTime]
 */

/** @typedef {CompensateResult} Measurement2xx */


/**
 * @typedef {{ ready: ReadyStatus3xx } & CompensateResult} Measurement3xx
 */


/**
 * @typedef {Object} Measurement5xx
 */


/** @typedef {{ ready: ReadyStatus6xx } & CompensateResult} Measurement6xx */

/** @typedef {{ measurements: Array<Measurement6xx> } & Measurement6xx} Measurement688 */

export {}