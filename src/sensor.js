import { Chip } from './chip/chip.js'
import { BoschFifo } from './fifo.js'

/** @import { I2CAddressedBus } from '@johntalton/and-other-delights' */
/** @import { Profile, ProfileReady } from './types/profile.js' */
/** @import { Calibration } from './types/calibration.js' */
/** @import { CompensateResult } from './chip/compensate.js' */
/** @import { GenericChip } from './chip/generic.js'  */

/**
 * @template {typeof GenericChip} C
 * @typedef {Object} BoschUIEOptions
 * @property {C} chip
 */

/**
 * @template {typeof GenericChip} C
 */
export class BoschSensor {
	/** @type {I2CAddressedBus} */
	#bus

	/** @type {typeof GenericChip} */
	#chip

	/** @type {BoschFifo<C>} */
	#fifo

	/** @type {Calibration|undefined} */
	#calibration

	/**
	 * @param {I2CAddressedBus} bus
	 * @returns {Promise<BoschSensor<typeof GenericChip>>}
	 */
	static async detect(bus) {
		const chip = await Chip.detect(bus)
		if(chip === undefined) { throw new Error('unable to detect chip') }
		return new BoschSensor(bus, { chip })
	}

	/**
	 * @param {I2CAddressedBus} bus
	 * @param {BoschUIEOptions<C>} options
	 */
	constructor(bus, options) {
		this.#bus = bus

		this.#chip = options.chip
		this.#calibration = undefined

		this.#fifo = new BoschFifo(bus, this)
	}

	get chip() { return this.#chip }

	get fifo() { return this.#fifo }

	/**
	 * @returns {this is this & { #calibration: Calibration }}
	 */
	get calibrated() { return this.#calibration !== undefined }

	/**
	 * @returns {Promise<number>}
	 */
	async sensorTime() { return this.#chip.sensorTime(this.#bus) }

	/**
	 * @returns {Promise<void>}
	 */
	async reset() { return this.#chip.reset(this.#bus) }

	/**
	 * @returns {Promise<Calibration|undefined>}
	 */
	async calibration() {
		this.#calibration = await this.#chip.calibration(this.#bus)
		return this.#calibration
	}

	/**
	 * @returns {Promise<Profile>}
	 */
	async profile() { return this.#chip.profile(this.#bus) }

	/**
	 * @param {Partial<Profile>} profile
	 */
	async setProfile(profile) {
		// calibration passed unchecked as only applies to bme680
		await this.#chip.setProfile(this.#bus, profile, this.#calibration)
	}

	/**
	 * @returns {Promise<ProfileReady>}
	 */
	async ready() { return this.#chip.ready(this.#bus) }

	/**
	 * @returns {Promise<CompensateResult>}
	 */
	async measurement() {
		//if (!this.calibrated) { throw new Error('calibration undefined') }
		if(this.#calibration === undefined) { throw new Error('calibration undefined') }
		return this.#chip.measurement(this.#bus, this.#calibration)
	}
}
