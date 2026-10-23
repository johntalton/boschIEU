import { GenericChip } from './generic.js'

/** @import { I2CAddressedBus } from '@johntalton/and-other-delights' */
/** @import { Features } from '../types/features.js' */
/** @import { Profile5xx, ModeProfile } from '../types/profile.js' */
/** @import { ChipKind } from './chip.js'  */

export class bmp58x extends GenericChip {
	/**
	 * @override
	 */
	static get name() { return 'bmp58x' } // 580 581

	/**
	 * @override
	 * @returns {ChipKind}
	 */
	static get kind() { return '5xx' }


	/**
	 * @override
	 * @returns {Features}
	 */
	static get features() {
		return {
			pressure: true,
			temperature: true,
			humidity: false,
			gas: false,
			normalMode: true,
			interrupt: false,
			fifo: true,
			time: false,
			modes: [ 'STANDBY', 'NORMAL', 'FORCED', 'NON-STOP' ]
		}
	}

	/**
	 * @param {I2CAddressedBus} bus
	 * @returns {Promise<number>}
	 */
	static async revId(bus) {
		// todo
	}

	/**
	 * @param {I2CAddressedBus} bus
	 * @param {number} command
	 * @returns {Promise<void>}
	 */
	static async sendCommand(bus, command) {
		await bus.writeI2cBlock(0x7E, Uint8Array.from([command]))
	}

	/**
	 * @override
	 * @param {I2CAddressedBus} bus
	 * @returns {Promise<void>}
	 */
	static async reset(bus) {
		await bmp58x.sendCommand(bus, 0xB6)
	}

	/**
	 * @override
	 * @param {I2CAddressedBus} bus
	 * @returns {Promise<Profile5xx>}
	 */
	static async profile(bus) {
		//
	}

	/**
	 * @override
	 * @param {I2CAddressedBus} bus
	 * @param {ModeProfile} profile
	 * @returns {Promise<void>}
	 */
	static async setMode(bus, profile) {
		throw new Error('not implemented')
	}
}
