
/**
 * @typedef {Object} ProfileWatchdog
 */

/**
 * @typedef {Object} ProfileInterrupt
 * @property {boolean} [active]
 * @property {string} mode
 * @property {boolean} latched
 * @property {boolean} onFifoWatermark
 * @property {boolean} onFifoFull
 * @property {boolean} onReady
 */

/**
 * @typedef {Object} ProfileFIFO
 * @property {boolean} active
 * @property {number} highWatermark
 * @property {any} data
 * @property {number} subsampling
 * @property {boolean} stopOnFull
 * @property {boolean} temp
 * @property {boolean} press
 * @property {boolean} time
 */

/**
 * @typedef {Object} GasSetpoint
 * @property {number} index
 * @property {boolean} [skip]
 *
 * @property {number} [temperatureC]
 * @property {number|undefined} durationMs
 * @property {boolean} active
 * @property {number} ohms
 * @property {number|undefined} lastIdac
 *
 * @property {number} [ambientTemperatureC]
 */

/**
 * @typedef {Object} ProfileGas
 * @property {boolean} enabled
 * @property {Array<GasSetpoint>} setpoints
 */

/**
 * @typedef {Object} ProfileSPI
 * @property {boolean} enable3w
 * @property {boolean} [interrupt]
 */

/**
 * @typedef {Object} ProfileReady
 * @property {boolean} ready
 * @property {boolean} measuring
 * @property {boolean} [updating]
 * @property {boolean} [measuringGas]
 * @property {number} [active_profile_idx]
 */

/**
 * @typedef {Object} Profile
 * @property {string} mode
 * @property {number|false} oversampling_p
 * @property {number|false} oversampling_t
 * @property {number|false} [oversampling_h]
 * @property {boolean|number} filter_coefficient
 * @property {number} [standby_time]
 * @property {number} [standby_prescaler]
 * @property {ProfileSPI} [spi]
 * @property {ProfileWatchdog} [watchdog]
 * @property {ProfileInterrupt} [interrupt]
 * @property {ProfileFIFO} [fifo]
 * @property {ProfileGas} [gas]
 *
 * @property {number} [ambientTemperatureC]
 *
 * @property {ProfileReady} [ready]
 */

export {}