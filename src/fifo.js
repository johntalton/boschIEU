/** @import { I2CAddressedBus } from '@johntalton/and-other-delights' */
/** @import { BoschSensor } from './sensor.js' */
/** @import { GenericChip } from './chip/generic.js'  */

/**
 * @template {typeof GenericChip} C
 */
export class BoschFifo {
	/** @type {I2CAddressedBus} */
	#bus

	/** @type {BoschSensor<C>} */
	#sensor

	/**
	 * @param {I2CAddressedBus} bus
	 * @param {BoschSensor<C>} sensor
	 */
	constructor(bus, sensor) {
		this.#bus = bus
		this.#sensor = sensor
	}

	async flush() {
		if(!this.#sensor.chip.features.fifo) { return }
		return this.#sensor.chip.fifo.flush(this.#bus)
	}

	/**
	 * @param {boolean} overRead
	 */
	async read(overRead) {
		if(!this.#sensor.chip.features.fifo) { return }
		return this.#sensor.chip.fifo.read(this.#bus, this.#sensor.calibration, overRead)
	}
}
