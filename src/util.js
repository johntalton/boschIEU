

/** @import { I2CAddressedBus, I2CBufferSource } from '@johntalton/and-other-delights' */
/** biome-ignore-all lint/performance/noAwaitInLoops: <explanation> */

export class BusUtil {

	/**
	 * @param {I2CAddressedBus} bus
	 * @param {Array<[ number, number]>} definition
	 * @returns {Promise<I2CBufferSource>}
	 *
	 */
  static async readI2cBlocks(bus, definition) {

		const length = definition.reduce((acc, def) => {
			const [ _, len ] = def
			return acc + len
		}, 0)

		const target = new Uint8Array(length)

		let offset = 0
		for(const def of definition) {
			const [ addr, len ] = def

			const result = await bus.readI2cBlock(addr, len)
			const result8 = ArrayBuffer.isView(result) ?
				new Uint8Array(result.buffer, result.byteOffset) :
				new Uint8Array(result)

			target.set(result8, offset)

			offset += len
		}

		return target
  }
}
