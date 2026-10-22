/** @import { CompensateResult } from '../chip/compensate.js' */
/** @import { ReadyStatus3xx, ReadyStatus6xx } from './ready.js' */

/**
 * @typedef {Object} MeasurementGas
 * @property {number} resistance
 * @property {number} range
 * @property {boolean} stable
 */

/**
 * @typedef {Object} MeasurementRawBase
 * @property {'2xx'|'3xx'|'6xx'} type
 * @property {number|false} adcT
 * @property {number|false} adcP
 * @property {number|false} adcH
 * @property {MeasurementGas|false} adcG
 *
 * @property {number} [sensorTime]
 */


/**
 * @typedef {Object} MeasurementRaw2xxBase
 * @property {'2xx'} type
 */
/** @typedef {MeasurementRawBase & MeasurementRaw2xxBase} MeasurementRaw2xx */

/**
 * @typedef {Object} MeasurementRaw3xxBase
 * @property {'3xx'} type
 */
/** @typedef {MeasurementRawBase & MeasurementRaw3xxBase} MeasurementRaw3xx */

/**
 * @typedef {Object} MeasurementRaw5xxBase
 * @property {'5xx'} type
 */
/** @typedef {MeasurementRawBase & MeasurementRaw5xxBase} MeasurementRaw5xx */

/**
 * @typedef {Object} MeasurementRaw6xxBase
 * @property {'6xx'} type
 * @property {'680'|'688'} subtype
 */
/** @typedef {MeasurementRawBase & MeasurementRaw6xxBase} MeasurementRaw6xx */

/** @typedef {MeasurementRaw2xx | MeasurementRaw3xx | MeasurementRaw5xx | MeasurementRaw6xx } MeasurementRaw */


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