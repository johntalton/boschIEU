import { Chip } from './chip/chip.js'
import { BoschFifo } from './fifo.js'

/** @import { I2CAddressedBus } from '@johntalton/and-other-delights' */
/** @import { Profile } from './types/profile.js' */
/** @import { Calibration } from './types/calibration.js' */

/**
 * @typedef {Object} BoschUIEOptions
 * @property {number|undefined} [chipId]
 * @property {boolean|undefined} [legacy]
 */

/**
 * Acts as a cache around the Chip implementation.
 */
export class BoschSensor {
	/** @type {Calibration|undefined} */
	_calibration

	/**
	 * @param {I2CAddressedBus} bus
	 */
	static async detect(bus) {
		/**
		 * @param {number} reg
		 */
		async function readId(reg) {
			const aBuffer = await bus.readI2cBlock(reg, 1)
			const u8 = ArrayBuffer.isView(aBuffer) ?
			new Uint8Array(aBuffer.buffer, aBuffer.byteOffset) :
			new Uint8Array(aBuffer)

			return u8[0]
		}

		// console.log('detect: attempt legacy register')
		const legacyReadId = await readId(0xD0)
		if (legacyReadId !== 0) {
			// console.log('detect: via legacy register read', legacyReadId)
			return new BoschSensor(bus, { chipId: legacyReadId, legacy: true })
		}

		// console.log('detect: attempt standard register')
		const atZeroReadId = await readId(0x00) // bmp388/bmp390 register
		if (atZeroReadId === 0) {
			// console.log('detect: zero reg return zero')
			throw new Error('id scan resulted in zeros')
		}

		return new BoschSensor(bus, { chipId: atZeroReadId, legacy: false })
	}

	/**
	 * @param {I2CAddressedBus} bus
	 * @param {BoschUIEOptions} [options={}]
	 */
	constructor(bus, options = {}) {
		this._bus = bus
		this._options = options

		this._chip = options.chipId === undefined ?
			Chip.generic() :
			Chip.fromId(options.chipId, options.legacy === undefined ? true : options.legacy)

		this._calibration = undefined

		this._fifo = new BoschFifo(this)
	}

	// exposed to allow for chip specific calls (390 `refId` etc)
	//  and to provide comparison of `.chip.chipId`
	get chip() { return this._chip }

	get fifo() { return this._fifo }

	get calibrated() { return this._calibration !== undefined }

	get isGeneric() { return this._chip.chipId === Chip.generic().chipId }

	async sensorTime() { return this._chip.sensorTime(this._bus) }

	async readId() {
		return this._chip.id(this._bus)
	}

	async reset() { return this._chip.reset(this._bus) }

	/**
	 * @returns {Promise<Calibration|undefined>}
	 */
	async calibration() {
		this._calibration = await this._chip.calibration(this._bus)
		return this._calibration
	}

	/**
	 * @returns {Promise<Profile>}
	 */
	async profile() { return this._chip.profile(this._bus) }

	/**
	 * @param {Partial<Profile>} profile
	 */
	async setProfile(profile) {
		// calibration passed unchecked as only applies to bme680
		await this._chip.setProfile(this._bus, profile, this._calibration)
	}

	async ready() { return this._chip.ready(this._bus) }

	async measurement() {
		if (!this.calibrated) { throw new Error('calibration undefined') }
		return this._chip.measurement(this._bus, this._calibration)
	}
}
