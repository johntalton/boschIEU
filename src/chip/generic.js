
/** @import { I2CAddressedBus } from '@johntalton/and-other-delights' */
/** @import { Profile, ModeProfile } from '../types/profile.js' */
/** @import { Calibration } from '../types/calibration.js' */
/** @import { CompensateResult } from './compensate.js' */
/** @import { Features } from '../types/features.js' */
/** @import { ChipKind } from './chip.js' */
/** @import { NVMap } from '../nvutil.js' */

/** @type {NVMap<false|number>} */
export const GENERIC_OVERSAMPLES = [
	{ name: false, value: 0 },
	{ name: 1, value: 1 },
	{ name: 2, value: 2 },
	{ name: 4, value: 3 },
	{ name: 8, value: 4 },
	{ name: 16, value: 5 }
]

/** @type {NVMap<false|number>} */
export const GENERIC_FILTER = [ // bmp280 / bme280
	{ name: false, value: 0 },
	{ name: 2, value: 1 },
	{ name: 4, value: 2 },
	{ name: 8, value: 3 },
	{ name: 16, value: 4 }
]

/** @type {NVMap<false|number>} */
export const GENERIC_FILTER_EXT = [ // bme680 / bmp388
	{ name: 1, value: 1 },
	{ name: 3, value: 2 },
	{ name: 7, value: 3 },
	{ name: 15, value: 4 },
	{ name: 31, value: 5 },
	{ name: 63, value: 6 },
	{ name: 127, value: 7 },

	{ name: false, value: 0 }
]

/** @type {NVMap<'4-wire'|'3-wire'>} */
export const GENERIC_SPI_MODE = [
	{ name: '4-wire', value: 0 },
	{ name: '3-wire', value: 1 }
]

//
export class genericFifo {
	/**
	 * @param {I2CAddressedBus} _bus
	 */
	static flush(_bus) { throw new Error('fifo flush not supported by generic chip') }

	/**
	 * @param {I2CAddressedBus} _bus
	 * @param {Array<any>} _options
	 */
	static read(_bus, ..._options) { throw new Error('fifo read not supported by generic chip') }
}

//
export class GenericChip {
	/**
	 * @returns {Features}
	 */
	static get features() {
		return {
			pressure: false,
			temperature: false,
			humidity: false,
			gas: false,
			normalMode: false,
			interrupt: false,
			fifo: false,
			time: false,
			modes: []
		}
	}

	static get name() { return 'generic' }

	/**
	 * @returns {ChipKind}
	 */
	static get kind() { throw new Error('generic is not a kind') }

	/**
	 * @param {I2CAddressedBus} _bus
	 * @returns {Promise<number>}
	 */
	static async id(_bus) { throw new Error('generic read for legacy, use Chip specific id implementation') }

	/**
	 * @param {I2CAddressedBus} _bus
	 * @returns {Promise<void>}
	 */
	static async reset(_bus) { throw new Error('reset undefined for generic chip') }

	static get fifo() { return genericFifo }

	/**
	 * @param {I2CAddressedBus} _bus
	 * @returns {Promise<number|undefined>}
	 */
	static async sensorTime(_bus) {
		// throw new Error('sensorTime not defined for generic chip')
		return undefined
	}

	/**
	 * @param {I2CAddressedBus} _bus
	 * @param {Calibration} _calibration
	 * @returns {Promise<CompensateResult>}
	 */
	static async measurement(_bus, _calibration) { throw new Error('measurement not defined for generic chip') }

	/**
	 * @param {I2CAddressedBus} _bus
	 * @param {Profile} _profile
	 * @param {Calibration|undefined} [_calibration]
	 * @returns {Promise<void>}
	 */
	static async setProfile(_bus, _profile, _calibration) { throw new Error('setProfile not defined for generic chip') }

	/**
	 * @param {I2CAddressedBus} _bus
	 * @param {ModeProfile} _profile
	 * @returns {Promise<void>}
	 */
	static async setMode(_bus, _profile) { throw new Error('set mode not defined for generic') }

	/**
	 * @param {I2CAddressedBus} _bus
	 * @param {Calibration|undefined} [_calibration]
	 * @returns {Promise<Profile>}
	 */
	static async profile(_bus, _calibration) { throw new Error('profile not defined for generic chip') }

	/**
	 * @param {I2CAddressedBus} _bus
	 * @returns {Promise<Calibration>}
	 */
	static async calibration(_bus) { throw new Error('calibration not defined for generic chip') }
}
