import { Chip } from './chip/chip.js'
import { BoschFifo } from './fifo.js'

/** @import { I2CAddressedBus } from '@johntalton/and-other-delights' */
/** @import { Profile, ModeProfile } from './types/profile.js' */
/** @import { Calibration } from './types/calibration.js' */
/** @import { CompensateResult } from './types/compensate.js' */
/** @import { GenericChip } from './chip/generic.js'  */

/**
 * @template {typeof GenericChip} C
 * @typedef {Object} BoschUIEOptions
 * @property {C} chip
 */

export class BoschIEU {
	/**
	 * @param {I2CAddressedBus} bus
	 * @param {BoschUIEOptions<typeof GenericChip>} options
	 * @returns {BoschSensor<typeof GenericChip>}
	 */
	static sensor(bus, options) {
		return new BoschSensor(bus, options)
	}

	/**
	 * @param {I2CAddressedBus} bus
	 * @returns {Promise<BoschSensor<typeof GenericChip>>}
	 */
	static async detect(bus) {
		return BoschSensor.detect(bus)
	}
}

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
	 * @returns {Promise<number|undefined>}
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
	async profile() {
		// calibration passed unchecked as only applies to bme680
		return this.#chip.profile(this.#bus, this.#calibration)
	}

	/**
	 * @param {Profile} profile
	 */
	async setProfile(profile) {
		// calibration passed unchecked as only applies to bme680
		await this.#chip.setProfile(this.#bus, profile, this.#calibration)
	}

	/**
	 * @param {ModeProfile} profile
	 */
	async setMode(profile) { await this.#chip.setMode(this.#bus, profile) }

	/**
	 * @returns {Promise<CompensateResult>}
	 */
	async measurement() {
		//if (!this.calibrated) { throw new Error('calibration undefined') }
		if(this.#calibration === undefined) { throw new Error('calibration undefined') }
		return this.#chip.measurement(this.#bus, this.#calibration)
	}
}
