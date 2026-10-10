import { BoschSensor } from './sensor.js'

/** @import { I2CAddressedBus } from '@johntalton/and-other-delights' */
/** @import { BoschUIEOptions } from './sensor.js' */

/**
 * Driver for Bosch Integrated Environmental Unit.
 *  Supports (bmp280 / bme280 / bme680 / bpm388) chips.
 */
export class BoschIEU {
	/**
	 * @param {I2CAddressedBus} bus
	 * @param {BoschUIEOptions|undefined} [options]
	 * @returns {Promise<BoschSensor>}
	 */
	static sensor(bus, options) {
		return Promise.resolve(new BoschSensor(bus, options))
	}

	/**
	 * @param {I2CAddressedBus} bus
	 * @returns {Promise<BoschSensor>}
	 */
	static async detect(bus) {
		return BoschSensor.detect(bus)
	}
}
