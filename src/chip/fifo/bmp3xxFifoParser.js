/* eslint-disable fp/no-nil */
function reconstruct24bit(msb, lsb, xlsb) {
  return (msb << 16) | (lsb << 8) | xlsb
}

export class bmp3xxFifoParser {

  static parseFrames(frames) {
    return bmp3xxFifoParser._parseFrames(frames, { size: 0, total: frames.length })
  }

  static _parseFrames(frames, cursor) {
    return bmp3xxFifoParser.parseFramesRecursive(frames, cursor)
  }

  static parseFramesRecursive(frames, cursor = { size: 0, total: 0 }) {
    // console.log(frames, cursor);
    if(frames.length <= 0) { return [] }
    const [size, frame] = bmp3xxFifoParser.parseFrame(frames);
    if(size < 0) {
      console.log('frame under read', size, frame);
      return []
    }

    const updatedCursor = { size: cursor.size + size, total: cursor.total }
    return [frame, ...bmp3xxFifoParser.parseFramesRecursive(frames.slice(size), updatedCursor)]
  }

  static parseFrame(frame) {
    if(frame.length < 1) { return [-1]; }
    const header = frame.readUInt8(0);
    const mode = (header >> 6) & 0b11;
    const param = (header >> 2) & 0b1111;
    const reserv = header & 0b11;
    if(reserv !== 0) { console.log('reserve frame bits not zero'); }

    // todo note that because we are splitting the execution path here
    // the effort of adding +1 to both returned [size, frameObj] results
    // wold be over-burdensome as written.  Thus, each method is expected to
    // return the additional byte read as part of its total read size.
    console.log({ header, mode })
    if(mode === 0b10) {
      return bmp3xxFifoParser.parseSensorFrame(frame, param);
    } else if(mode === 0b01) {
      return bmp3xxFifoParser.parseControlFrame(frame, param);
    }

    // console.log(header, mode, param, frame);
    throw new Error('unknown frame type');
  }

  static parseControlFrame(frame, param) {
    if(param === 0b0001) { return bmp3xxFifoParser.parseControlErrorFrame(frame); }
    if(param === 0b0010) { return bmp3xxFifoParser.parseControlConfigFrame(frame); }
    // console.log('unknown control frame type', param);
    throw new Error('unknown control frame type');
  }

  static parseControlErrorFrame(frame) {
    if(frame.length < 2) { return [-2]; }
    const opcode = frame.readUInt8(1);
    // opcode === 1
    return [ 1 + 1, { type: 'control.error', opcode: opcode }];
  }

  static parseControlConfigFrame(frame) {
    if(frame.length < 2) { return [-2]; }
    const opcode = frame.readUInt8(1);
    // opcode === 1
    return [ 1 + 1, { type: 'control.config', opcode: opcode }];
  }

  static parseSensorFrame(frame, param) {
    const s = ((param >> 3) & 0x1) === 1;
    const p = (param & 0x1) === 1;
    const t = ((param >> 2) & 0x1) === 1;

    if(s && (t || p)) { throw new Error('time vs temp/press exclusive frame'); }

    const empty = !s && !t && !p;
    if(empty) {
      // parse empty
      // todo this ignores range check on buffers last byte
      return [ 1 + 1, { type: 'sensor.empty' }]; // todo confirm empty data
    }

    if(s) {
      return bmp3xxFifoParser.parseSensorTimeFrame(frame);
    }

    return bmp3xxFifoParser.parseSensorMeasurementFrame(frame, p, t);
  }

  static parseSensorTimeFrame(frame) {
    if(frame.length < 4) { console.log('unexpected time frame'); return [-4]; }

    const xlsb = frame.readUInt8(1);
    const lsb = frame.readUInt8(2);
    const msb = frame.readUInt8(3);
    const time = reconstruct24bit(msb, lsb, xlsb);

    return [ 1 + 3, { type: 'sensor.time', time: time }];
  }

  static parseSensorMeasurementFrame(frame, p, t) {
    const frameObj = { type: 'sensor', temp: NaN, press: NaN };

    function read24(frame24, offset24 = 0) {
      const xlsb = frame24.readUInt8(1 + offset24);
      const lsb = frame24.readUInt8(2 + offset24);
      const msb = frame24.readUInt8(3 + offset24);
      return reconstruct24bit(msb, lsb, xlsb);
    }

    if(t) {
      if(frame.length < 4) { console.log('unexpected measurement frame'); return [-4]; }
      frameObj.temp = read24(frame);
    }

    if(p) {
      if(t && frame.length < 7) { console.log('unexpected pressure '); return [-7]; }
      if(!t && frame.length < 4) { console.log('unexpected pressure '); return [-4]; }
      frameObj.press = read24(frame, t ? 3 : 0);
    }

    //
    // const bytesRead = 1 + (t ? (p ? 6 : 3) : (p ? 3 : 0));
    const bytesRead = 1 + (t ? 3 : 0) + (p ? 3 : 0);
    return [ bytesRead, frameObj ];
  }
}
