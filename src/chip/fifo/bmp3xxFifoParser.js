/* eslint-disable fp/no-throw */
/* eslint-disable no-magic-numbers */
/* eslint-disable fp/no-nil */
function reconstruct24bit(msb, lsb, xlsb) {
  return (msb << 16) | (lsb << 8) | xlsb
}

export class bmp3xxFifoParser {

  /**
   * @param {ArrayBuffer|SharedArrayBuffer|DataView} sourceBuffer data to be read
   * @returns {[{}]} valid frames
   */
  static parseFrames(sourceBuffer) {
    return bmp3xxFifoParser.parseFramesRecursive(sourceBuffer, {
      size: 0, total: sourceBuffer.byteLength
    })
  }

  /**
   * @param {ArrayBuffer|SharedArrayBuffer|DataView} sourceBuffer data to be read
   * @returns {[{}]} valid frames
   */
  static parseFramesRecursive(sourceBuffer, cursor = { size: 0, total: 0 }) {
    // console.log(frames, cursor)
    if(sourceBuffer.byteLength <= 0) { return [] }
    const [size, frame] = bmp3xxFifoParser.parseFrame(sourceBuffer)
    if(size < 0) {
      console.log('frame under read', size, frame)
      return []
    }

    const subSourceBuffer = ArrayBuffer.isView(sourceBuffer) ?
      // eslint-disable-next-line max-len
      new DataView(sourceBuffer.buffer, sourceBuffer.byteOffset + size, sourceBuffer.byteLength - size) :
      new DataView(sourceBuffer, size)

    const updatedCursor = { size: cursor.size + size, total: cursor.total }
    return [frame, ...bmp3xxFifoParser.parseFramesRecursive(subSourceBuffer, updatedCursor)]
  }

  static parseFrame(sourceBuffer) {
    if(sourceBuffer.byteLength < 1) { return [-1] }

    const dv = ArrayBuffer.isView(sourceBuffer) ?
      new DataView(sourceBuffer.buffer, sourceBuffer.byteOffset, sourceBuffer.byteLength) :
      new DataView(sourceBuffer)

    const header = dv.getUint8(0)

    const mode = (header >> 6) & 0b11
    const param = (header >> 2) & 0b1111
    const reserv = header & 0b11
    if(reserv !== 0) { console.warn('reserve frame bits not zero') }

    // todo note that because we are splitting the execution path here
    // the effort of adding +1 to both returned [size, frameObj] results
    // wold be over-burdensome as written.  Thus, each method is expected to
    // return the additional byte read as part of its total read size.
    // console.log({ header, mode })
    if(mode === 0b10) {
      return bmp3xxFifoParser.parseSensorFrame(sourceBuffer, param)
    }

    if(mode === 0b01) {
      return bmp3xxFifoParser.parseControlFrame(sourceBuffer, param)
    }

    // console.log(header, mode, param, frame);
    throw new Error('unknown frame type')
  }

  static parseControlFrame(sourceBuffer, param) {
    if(param === 0b0001) { return bmp3xxFifoParser.parseControlErrorFrame(sourceBuffer) }
    if(param === 0b0010) { return bmp3xxFifoParser.parseControlConfigFrame(sourceBuffer) }
    // console.log('unknown control frame type', param);
    throw new Error('unknown control frame type')
  }

  static parseControlErrorFrame(sourceBuffer) {
    if(sourceBuffer.byteLength < 2) { return [-2] }

    const dv = ArrayBuffer.isView(sourceBuffer) ?
      new DataView(sourceBuffer.buffer, sourceBuffer.byteOffset, sourceBuffer.byteLength) :
      new DataView(sourceBuffer)

    const opcode = dv.getUint8(1)
    // opcode === 1
    return [ 1 + 1, { type: 'control.error', opcode: opcode }]
  }

  static parseControlConfigFrame(sourceBuffer) {
    if(sourceBuffer.byteLength < 2) { return [-2] }

    const dv = ArrayBuffer.isView(sourceBuffer) ?
      new DataView(sourceBuffer.buffer, sourceBuffer.byteOffset, sourceBuffer.byteLength) :
      new DataView(sourceBuffer)

    const opcode = dv.getUint8(1)

    // opcode === 1
    return [ 1 + 1, { type: 'control.config', opcode: opcode }]
  }

  static parseSensorFrame(sourceBuffer, param) {
    const s = ((param >> 3) & 0x1) === 1
    const p = (param & 0x1) === 1
    const t = ((param >> 2) & 0x1) === 1

    if(s && (t || p)) { throw new Error('time vs temp/press exclusive frame') }

    const empty = !s && !t && !p
    if(empty) {
      // parse empty
      // todo this ignores range check on buffers last byte
      return [ 1 + 1, { type: 'sensor.empty' }] // todo confirm empty data
    }

    if(s) {
      return bmp3xxFifoParser.parseSensorTimeFrame(sourceBuffer)
    }

    return bmp3xxFifoParser.parseSensorMeasurementFrame(sourceBuffer, p, t)
  }

  static parseSensorTimeFrame(sourceBuffer) {
    if(sourceBuffer.byteLength < 4) { console.log('unexpected time frame'); return [-4] }

    const dv = ArrayBuffer.isView(sourceBuffer) ?
      new DataView(sourceBuffer.buffer, sourceBuffer.byteOffset, sourceBuffer.byteLength) :
      new DataView(sourceBuffer)

    const xlsb = dv.getUint8(1)
    const lsb = dv.getUint8(2)
    const msb = dv.getUint8(3)

    const time = reconstruct24bit(msb, lsb, xlsb)

    return [ 1 + 3, { type: 'sensor.time', time: time }]
  }

  static parseSensorMeasurementFrame(sourceBuffer, p, t) {
    const dv = ArrayBuffer.isView(sourceBuffer) ?
      new DataView(sourceBuffer.buffer, sourceBuffer.byteOffset, sourceBuffer.byteLength) :
      new DataView(sourceBuffer)

    const frameObj = { type: 'sensor', temp: NaN, press: NaN }

    function read24(dv24, offset24 = 0) {
      const xlsb = dv24.getUint8(1 + offset24)
      const lsb = dv24.getUint8(2 + offset24)
      const msb = dv24.getUint8(3 + offset24)
      return reconstruct24bit(msb, lsb, xlsb)
    }

    if(t) {
      if(dv.byteLength < 4) { console.log('unexpected measurement frame'); return [-4] }
      frameObj.temp = read24(dv)
    }

    if(p) {
      if(t && dv.byteLength < 7) { console.log('unexpected pressure '); return [-7] }
      if(!t && dv.byteLength < 4) { console.log('unexpected pressure '); return [-4] }
      frameObj.press = read24(dv, t ? 3 : 0)
    }

    //
    // const bytesRead = 1 + (t ? (p ? 6 : 3) : (p ? 3 : 0));
    const bytesRead = 1 + (t ? 3 : 0) + (p ? 3 : 0)
    return [ bytesRead, frameObj ]
  }
}
