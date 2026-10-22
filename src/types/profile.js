/** @import { ReadyStatus2xx } from './ready.js' */


/** @typedef {"PARALLEL"|"NON-STOP"|"NORMAL"|"FORCED"|"SLEEP"} ProfileModes */


/**
 * @typedef {'LONG'|'SHORT'|false} ProfileWatchdog
 */

/**
 * @typedef {Object} ProfileInterrupt
 * @property {'push-pull'|'open-drain'} mode
 * @property {'active-low'|'active-high'} level
 * @property {'high'|'low'} driveStrength
 * @property {boolean} latched
 * @property {boolean} onFifoWatermark
 * @property {boolean} onFifoFull
 * @property {boolean} onReady
 */

/**
 * @typedef {Object} ProfileFIFO
 * @property {boolean} active
 * @property {boolean} stopOnFull
 * @property {boolean} temp
 * @property {boolean} press
 * @property {boolean} time
 * @property {'filtered'|'unfiltered'} data
 * @property {number} subSampling
 * @property {number} highWatermark
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
 * @property {boolean} heaterEnabled
 * @property {boolean} conversionEnabled
 * @property {Array<GasSetpoint>} setpoints
 * @property {number} [gas_wait_shared]
 * @property {number|undefined} [ambientTemperatureC]
 */

/**
 * @typedef {Object} ProfileSPI
 * @property {0|1} page
 * @property {'3-wire'|'4-wire'} mode
 * @property {boolean} [interrupt]
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
 * @property {ReadyStatus2xx} ready
 */

/**
 * @typedef {Object} Profile3xx
 * @property {ProfileModes} mode
 * @property {number} standby_prescaler
 * @property {number|false} oversampling_p
 * @property {number|false} oversampling_t
 * @property {boolean|number} filter_coefficient
 *
 * @property {ProfileFIFO} fifo
 * @property {ProfileWatchdog} watchdog
 * @property {ProfileInterrupt} interrupt
 * @property {ProfileSPI} spi
 */

/**
 * @typedef {Object} Profile5xx
 * @property {ProfileModes} mode
 * @property {number|false} oversampling_p
 * @property {number|false} oversampling_t
 */

/**
 * @typedef {Object} Profile6xx
 * @property {Extract<ProfileModes, 'SLEEP'|'FORCED'|'PARALLEL'>} mode
 * @property {number|false} oversampling_p
 * @property {number|false} oversampling_t
 * @property {number|false} oversampling_h
 * @property {number|false} filter_coefficient
 *
 * @property {ProfileGas} gas
 * @property {ProfileSPI} spi
 */


/**
 * @property {number} [ambientTemperatureC]
 */


/** @typedef {Profile2xx | Profile3xx | Profile5xx | Profile6xx} Profile */


/** @typedef {Pick<Profile, 'mode'|'oversampling_t'|'oversampling_p'>} ModeProfile */

export {}