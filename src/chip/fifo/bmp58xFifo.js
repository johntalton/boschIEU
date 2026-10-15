import { genericFifo } from '../generic.js'

/** @import { I2CAddressedBus } from '@johntalton/and-other-delights' */
/** @import { Calibration } from '../../types/calibration.js' */

export const FIFO_EMPTY = 0x7F

export class bmp58xFifo extends genericFifo {


	/**
	 * @override
	 * @param {I2CAddressedBus} bus
	 */
	static flush(bus) {
		await bmp58x.sendCommand(bus, CMD_FIFO_FLUSH)
	}

	/**
	 * @override
	 * @param {I2CAddressedBus} bus
	 * @param {Calibration} calibration
	 */
	static async read(bus, calibration, overRead = false) {

	}

}
