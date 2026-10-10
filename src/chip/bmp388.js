import { bmp3xx } from './bmp3xx.js'

/** @import { I2CAddressedBus } from '@johntalton/and-other-delights' */

/**
 *
 */
export class bmp388 extends bmp3xx {
	/**
	 * @override
	 */
	static get name() { return 'bmp388' }
	/**
	 * @override
	 */
	static get chipId() { return 0x50 }

	/**
	 * @param {I2CAddressedBus} bus
	 */
	static extmode_en_middle(bus) {
		return bus.writeI2cBlock(0x7E, Uint8Array.from([0x34]))
	}
}
