import { bmp3xx } from './bmp3xx.js'

/** @import { I2CAddressedBus } from '@johntalton/and-other-delights' */
/** @import { Profile3xx } from '../types/profile.js' */

/**
 *
 */
export class bmp390 extends bmp3xx {
	/**
	 * @override
	 */
	static get name() { return 'bmp390' }

	/**
	 * @param {I2CAddressedBus} bus
	 * @returns {Promise<{ revId: number, major: number, minor: number} | undefined>}
	 */
	static async revId(bus) {
		const buffer = await bus.readI2cBlock(0x01, 1)
		const u8 = ArrayBuffer.isView(buffer) ?
			new Uint8Array(buffer.buffer, buffer.byteOffset) :
			new Uint8Array(buffer)

		const [ revId ] = u8
		if(revId === undefined) { return undefined}

		// split between major and minor
		const major = revId >> 4
		const minor = revId & 0xF0
		return { revId, major, minor }
	}

	/**
	 * @override
	 * @param {I2CAddressedBus} bus
	 * @returns {Promise<Profile3xx>}
	 */
	static async profile(bus) {
		const {
			config,
			odr,
			osr,
			pwr_ctrl,
			if_conf,
			int_ctrl,
			fifo_config_2,
			fifo_config_1,
			fifo_wtm_1,
			fifo_wtm_0
		} = await bmp3xx._rawProfile(bus)



		return {}
	}
}
