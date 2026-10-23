import { genericFifo } from '../generic.js'

/** @import { I2CAddressedBus } from '@johntalton/and-other-delights' */
/** @import { Calibration } from '../../types/calibration.js' */

export const FIFO_EMPTY = 0x7F


export class bmp58xFifo extends genericFifo {


	/**
	 * @override
	 * @param {I2CAddressedBus} _bus
	 * @return {Promise<void>}
	 */
	static flush(_bus) {
		// no-op
		return Promise.resolve()
	}

	/**
	 * @override
	 * @param {I2CAddressedBus} bus
	 * @param {Calibration} calibration
	 */
	static async read(bus, calibration, _overRead = false) {
		//
	}

}
