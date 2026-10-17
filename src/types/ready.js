
/**
 * @typedef {Object} ReadyStatus2xx
 * @property {boolean} updating
 * @property {boolean} measuring
 */

/**
 * @typedef {Object} ReadyStatus3xx
 * @property {boolean} temperature
 * @property {boolean} pressure
 * @property {boolean} command
 *
 * @property {boolean} errorConfiguration
 * @property {boolean} errorCommand
 * @property {boolean} errorFatal
 */

/**
 * @typedef {Object} ReadyStatus6xx
 * @property {boolean} newData
 * @property {boolean} measuring
 * @property {boolean} measuringGas
 * @property {number} active_profile_idx
 * @property {number} [sub_measuring_index]
 * @property {boolean} gasValid
 * @property {boolean} heaterStable
 */


export {}