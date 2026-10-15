
/** @typedef {"PARALLEL"|"NON-STOP"|"NORMAL"|"FORCED"|"SLEEP"} ProfileModes */


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
 * @property {boolean} selected
 *
 * @property {number} temperatureC
 * @property {number} durationMs
 * @property {number} initialMa
 */

/**
 * @typedef {Object} ProfileGas
 * @property {boolean} headerEnabled
 * @property {boolean} conversionEnabled
 * @property {Array<GasSetpoint>} setpoints
 * @property {number} [gas_wait_shared]
 */

/**
 * @typedef {Object} ProfileSPI
 * @property {0|1} page
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
 * @typedef {Object} Profile2xx
 * @property {ProfileModes} mode
 * @property {boolean|number} filter_coefficient
 * @property {number} [standby_time]
 * @property {number|false} oversampling_p
 * @property {number|false} oversampling_t
 * @property {number|false} [oversampling_h]
 *
 * @property {ProfileSPI} spi
 * @property {ProfileReady} ready
 */

/**
 * @typedef {Object} Profile3xx
 * @property {ProfileModes} mode
 * @property {number} standby_prescaler
 * @property {number|false} oversampling_p
 * @property {number|false} oversampling_t
 * @property {boolean|number} filter_coefficient
 *
 * @property {ProfileWatchdog} watchdog
 * @property {ProfileInterrupt} interrupt
 * @property {ProfileFIFO} fifo
 */

/**
 * @typedef {Object} Profile5xx
 * @property {ProfileModes} mode
 *
 */

/**
 * @typedef {Object} Profile6xx
 * @property {Extract<ProfileModes, 'SLEEP'|'FORCED'|'PARALLEL'>} mode
 * @property {number|false} oversampling_p
 * @property {number|false} oversampling_t
 * @property {number|false} oversampling_h
 * @property {boolean|number} filter_coefficient
 *
 * @property {ProfileGas} gas
 * @property {ProfileSPI} spi
 */


/**
 * @property {number} [ambientTemperatureC]
 */


/** @typedef {Profile2xx | Profile3xx | Profile5xx | Profile6xx} Profile */

export {}