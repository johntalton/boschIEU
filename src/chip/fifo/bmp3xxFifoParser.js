
/** @import { I2CBufferSource } from '@johntalton/and-other-delights' */

import { reconstruct24bit } from '../../util/bits.js'


export const FRAME_TYPE_TIME = 'sensor.time'
export const FRAME_TYPE_CONTROL_ERROR = 'control.error'
export const FRAME_TYPE_CONTROL_CONFIG = 'control.config'
export const FRAME_TYPE_EMPTY = 'sensor.empty'
export const FRAME_TYPE_MEASUREMENT = 'sensor'


/**
 * @typedef {Object} FifoFrameSensorTime
 * @property {FRAME_TYPE_TIME} type
 * @property {number} time
 */

/**
 * @typedef {Object} FifoFrameControlError
 * @property {FRAME_TYPE_CONTROL_ERROR} type
 * @property {number} opcode
 */

/**
 * @typedef {Object} FifoFrameControlConfig
 * @property {FRAME_TYPE_CONTROL_CONFIG} type
 * @property {number} opcode
 */

/**
 * @typedef {Object} FifoFrameEmpty
 * @property {FRAME_TYPE_EMPTY} type
 */

/**
 * @typedef {Object} FifoFrameMeasurement
 * @property {FRAME_TYPE_MEASUREMENT} type
 * @property {number} temp
 * @property {number} press
 */

/** @typedef {FifoFrameSensorTime | FifoFrameControlError | FifoFrameControlConfig | FifoFrameEmpty | FifoFrameMeasurement } FifoFrame */

export class bmp3xxFifoParser {

	/**
	 * @param {I2CBufferSource} sourceBuffer data to be read
	 * @returns {Array<FifoFrame>} valid frames
	 */
	static parseFrames(sourceBuffer) {
		return bmp3xxFifoParser.parseFramesRecursive(sourceBuffer, {
			size: 0, total: sourceBuffer.byteLength
		})
	}

	/**
	 * @param {I2CBufferSource} sourceBuffer data to be read
	 * @returns {Array<FifoFrame>} valid frames
	 */
	static parseFramesRecursive(sourceBuffer, cursor = { size: 0, total: 0 }) {
		// console.log(frames, cursor)
		if (sourceBuffer.byteLength <= 0) { return [] }
		const [size, frame] = bmp3xxFifoParser.parseFrame(sourceBuffer)
		if(size === undefined) {
			console.warn('frame under read', size, frame)
			return []
		}
		if (size < 0) {
			console.warn('frame under read', size, frame)
			return []
		}

		if(frame === undefined) {
			console.warn('frame undefined')
			return []
		}

		const subSourceBuffer = ArrayBuffer.isView(sourceBuffer) ?
			new DataView(sourceBuffer.buffer, sourceBuffer.byteOffset + size, sourceBuffer.byteLength - size) :
			new DataView(sourceBuffer, size)

		const updatedCursor = { size: cursor.size + size, total: cursor.total }
		return [frame, ...bmp3xxFifoParser.parseFramesRecursive(subSourceBuffer, updatedCursor)]
	}

	/**
	 * @param {I2CBufferSource} sourceBuffer
	 * @returns {[ number, FifoFrame? ]}
	 */
	static parseFrame(sourceBuffer) {
		if (sourceBuffer.byteLength === 0) { return [-1] }

		const dv = ArrayBuffer.isView(sourceBuffer) ?
			new DataView(sourceBuffer.buffer, sourceBuffer.byteOffset, sourceBuffer.byteLength) :
			new DataView(sourceBuffer)

		const header = dv.getUint8(0)

		const mode = (header >> 6) & 0b11
		const param = (header >> 2) & 0b1111
		const reservedBits = header & 0b11
		if (reservedBits !== 0) { console.warn('reserve frame bits not zero') }

		// todo note that because we are splitting the execution path here
		// the effort of adding +1 to both returned [size, frameObj] results
		// wold be over-burdensome as written.  Thus, each method is expected to
		// return the additional byte read as part of its total read size.
		// console.log({ header, mode })
		if (mode === 0b10) {
			return bmp3xxFifoParser.parseSensorFrame(sourceBuffer, param)
		}

		if (mode === 0b01) {
			return bmp3xxFifoParser.parseControlFrame(sourceBuffer, param)
		}

		// console.log(header, mode, param, frame)
		throw new Error('unknown frame type')
	}

	/**
	 * @param {I2CBufferSource} sourceBuffer
	 * @param {number} param
	 * @returns {[ number, FifoFrame? ]}
	 */
	static parseControlFrame(sourceBuffer, param) {
		if (param === 0b0001) { return bmp3xxFifoParser.parseControlErrorFrame(sourceBuffer) }
		if (param === 0b0010) { return bmp3xxFifoParser.parseControlConfigFrame(sourceBuffer) }
		// console.log('unknown control frame type', param)
		throw new Error('unknown control frame type')
	}

	/**
	 * @param {I2CBufferSource} sourceBuffer
	 * @returns {[ number, FifoFrame? ]}
	 */
	static parseControlErrorFrame(sourceBuffer) {
		if (sourceBuffer.byteLength < 2) { return [-2] }

		const dv = ArrayBuffer.isView(sourceBuffer) ?
			new DataView(sourceBuffer.buffer, sourceBuffer.byteOffset, sourceBuffer.byteLength) :
			new DataView(sourceBuffer)

		const opcode = dv.getUint8(1)
		// opcode === 1
		return [1 + 1, { type: FRAME_TYPE_CONTROL_ERROR, opcode }]
	}

	/**
	 * @param {I2CBufferSource} sourceBuffer
	 * @returns {[ number, FifoFrame? ]}
	 */
	static parseControlConfigFrame(sourceBuffer) {
		if (sourceBuffer.byteLength < 2) { return [-2] }

		const dv = ArrayBuffer.isView(sourceBuffer) ?
			new DataView(sourceBuffer.buffer, sourceBuffer.byteOffset, sourceBuffer.byteLength) :
			new DataView(sourceBuffer)

		const opcode = dv.getUint8(1)

		// opcode === 1
		return [1 + 1, { type: FRAME_TYPE_CONTROL_CONFIG, opcode }]
	}

	/**
	 * @param {I2CBufferSource} sourceBuffer
	 * @param {number} param
	 * @returns {[ number, FifoFrame? ]}
	 */
	static parseSensorFrame(sourceBuffer, param) {
		const s = ((param >> 3) & 0x1) === 1
		const p = (param & 0x1) === 1
		const t = ((param >> 2) & 0x1) === 1

		if (s && (t || p)) { throw new Error('time vs temp/press exclusive frame') }

		const empty = !((s || t ) || p)
		if (empty) {
			// parse empty
			// todo this ignores range check on buffers last byte
			return [1 + 1, { type: FRAME_TYPE_EMPTY }] // todo confirm empty data
		}

		if (s) {
			return bmp3xxFifoParser.parseSensorTimeFrame(sourceBuffer)
		}

		return bmp3xxFifoParser.parseSensorMeasurementFrame(sourceBuffer, p, t)
	}

	/**
	 * @param {I2CBufferSource} sourceBuffer
	 * @returns {[ number, FifoFrame? ]}
	 */
	static parseSensorTimeFrame(sourceBuffer) {
		if (sourceBuffer.byteLength < 4) {
			console.warn('unexpected time frame')
			 return [-4]
		}

		const dv = ArrayBuffer.isView(sourceBuffer) ?
			new DataView(sourceBuffer.buffer, sourceBuffer.byteOffset, sourceBuffer.byteLength) :
			new DataView(sourceBuffer)

		const xlsb = dv.getUint8(1)
		const lsb = dv.getUint8(2)
		const msb = dv.getUint8(3)

		const time = reconstruct24bit(msb, lsb, xlsb)

		return [1 + 3, { type: FRAME_TYPE_TIME, time }]
	}

	/**
	 * @param {I2CBufferSource} sourceBuffer
	 * @param {boolean} p
	 * @param {boolean} t
	 * @returns {[ number, FifoFrame? ]}
	 */
	static parseSensorMeasurementFrame(sourceBuffer, p, t) {
		const dv = ArrayBuffer.isView(sourceBuffer) ?
			new DataView(sourceBuffer.buffer, sourceBuffer.byteOffset, sourceBuffer.byteLength) :
			new DataView(sourceBuffer)

		/** @type {FifoFrameMeasurement} */
		const frameObj = { type: FRAME_TYPE_MEASUREMENT, temp: Number.NaN, press: Number.NaN }

		/** @param {DataView} dv24  */
		function read24(dv24, offset24 = 0) {
			const xlsb = dv24.getUint8(1 + offset24)
			const lsb = dv24.getUint8(2 + offset24)
			const msb = dv24.getUint8(3 + offset24)
			return reconstruct24bit(msb, lsb, xlsb)
		}

		if (t) {
			if (dv.byteLength < 4) {
				console.warn('unexpected measurement frame')
				return [-4]
			}

			frameObj.temp = read24(dv)
		}

		if (p) {
			if (t && dv.byteLength < 7) {
				console.warn('unexpected pressure ')
				return [-7]
			}

			if (!t && dv.byteLength < 4) {
				console.warn('unexpected pressure ')
				return [-4]
			}

			frameObj.press = read24(dv, t ? 3 : 0)
		}

		//
		// const bytesRead = 1 + (t ? (p ? 6 : 3) : (p ? 3 : 0))
		const bytesRead = 1 + (t ? 3 : 0) + (p ? 3 : 0)
		return [bytesRead, frameObj]
	}
}
