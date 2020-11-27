const { genericFifo } = require('../generic.js');
const { Compensate } = require('../compensate.js');

const FIFO_SIZE = 512;

class Util {
  static reconstruct9bit(msb, lsb) {
    return msb << 8 | lsb;
  }
}

/**
 *
 **/
class Bmp3Fifo extends genericFifo {

  static flush(bus) {
    return bus.write(0x7E, Buffer.from([0xB0]));
  }

  static read(bus, calibration) {
    return bus.read(0x12, 2)
      .then(buffer => {
        // console.log('fifo counter buffer', buffer);
        const fifo_byte_counter_7_0 = buffer.readUInt8(0);
        const fifo_byte_counter_8 = buffer.readUInt8(1);
        return Util.reconstruct9bit(fifo_byte_counter_8, fifo_byte_counter_7_0);
      })
      .then(fifo_byte_counter => {
        // console.log('fifo buffer byte counter', fifo_byte_counter);
        if(fifo_byte_counter < 0 || fifo_byte_counter > FIFO_SIZE) { throw new Error('fifo counter error'); }

        // first-way:
        // single read using command/size call capped to i2c limit
        // ```
        //   return bus.read(0x14, Math.min(MAX_BLOCK_SIZE, fifo_byte_counter + 4 + 2)).then(returnBuffer => [returnBuffer]);
        // ```
        // second-way
        // using multiple block size reads to emulate continuous read
        // changing block limit to max_block_size * 1 will revert back to the above behavior
        // ```
        // eslint-disable-next-line spellcheck/spell-checker
        //   return Bmp3Fifo._blockRead(bus, Math.min(BLOCK_LIMIT, fifo_byte_counter + 4 + 2));
        // ```
        // third-way
        // by using the `writeSpecial` (write with on parameter is a proxy) and the
        // `readBuffer` no i2c limit is imposed by the underlying library (or driver? / device?)
        const readSize = fifo_byte_counter + 4 + 2;
        // eslint-disable-next-line promise/no-nesting
        return bus.write(0x14).then(() => bus.readBuffer(readSize)).then(b => [b]);
      })
      .then(frameset => Bmp3Fifo.parseFrameSet(frameset))
      .then(msgset => {
        return msgset.reduce((acu, msg) => acu.concat(msg), []);
      })
      .then(msgs => {
        return msgs.map(msg => {
          if(msg.type === 'sensor') {
            return {
              // we do not explode message here as it may not be clean
              type: msg.type,
              ...Compensate.from({ adcP: msg.press, adcT: msg.temp, type: '3xy' }, calibration)
            };
          } else if(msg.type === 'sensor.time') {
            return {
              // we do not explode message here as it may not be clean
              type: msg.type,
              ...Compensate.sensortime(msg.time)
            };
          }

          return msg;
        });
      });
  }

  /*
  static _blockRead(bus, count) {
    // console.log('foo count', count);
    const BLOCK_SIZE = MAX_BLOCK_SIZE;
    const blocks = Math.floor(count / BLOCK_SIZE);
    const remainder = count - (blocks * BLOCK_SIZE);
    //console.log('count => blocks / remainder', count, blocks, remainder);
    const blocksRange = (new Array(blocks)).fill(0);
    return Promise.all(blocksRange.map((b,i) => {
        //console.log('block size read', b, i);
        return bus.read(0x14, BLOCK_SIZE);
      }))
      .then(head => {
        //console.log('read remainder', remainder)
        return bus.read(0x14, remainder)
          .then(tail => head.concat(tail));
      });
  }
  */

  static parseFrameSet(frameset /* : Array<Buffer> */) {
    // console.log('parse frameset', frameset);
    // todo a bug here in returning array of arrays add a layer of reduce call in read method
    return frameset.map(frames => {
      return Bmp3Fifo.parseFrames(frames, { size: 0, total: frames.length });
    });
  }

  static parseFrames(frames, cursor) { return Bmp3Fifo.parseFramesRecursive(frames, cursor); }

  static parseFramesRecursive(frames, cursor = { size: 0, total: 0 }) {
    // console.log(frames, cursor);
    if(frames.length <= 0) { return []; }
    const [size, frame] = Bmp3Fifo.parseFrame(frames);
    if(size < 0) { console.log('frame under read', size, frame); return []; }

    const updatedCursor = { size: cursor.size + size, total: cursor.total };
    return [frame, ...Bmp3Fifo.parseFramesRecursive(frames.slice(size), updatedCursor)];
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
    if(mode === 0b10) {
      return Bmp3Fifo.parseSensorFrame(frame, param);
    } else if(mode === 0b01) {
      return Bmp3Fifo.parseControlFrame(frame, param);
    }

    console.log(header, mode, param, frame);
    throw new Error('unknown frame type');
  }

  static parseControlFrame(frame, param) {
    if(param === 0b0001) { return Bmp3Fifo.parseControlErrorFrame(frame); }
    if(param === 0b0010) { return Bmp3Fifo.parseControlConfigFrame(frame); }
    console.log('unknown control frame type', param);
    throw new Error('unknown control frame type');
  }

  static parseControlErrorFrame(frame) {
    if(frame.length < 2) { return [-2]; }
    const opcode = frame.readUInt8(1);
    return [ 1 + 1, { type: 'control.error', opcode: opcode }];
  }

  static parseControlConfigFrame(frame) {
    if(frame.length < 2) { return [-2]; }
    const opcode = frame.readUInt8(1);
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
      return Bmp3Fifo.parseSensorTimeFrame(frame);
    }

    return Bmp3Fifo.parseSensorMeasurementFrame(frame, p, t);
  }

  static parseSensorTimeFrame(frame) {
    if(frame.length < 4) { console.log('unexpected time frame'); return [-4]; }

    const xlsb = frame.readUInt8(1);
    const lsb = frame.readUInt8(2);
    const msb = frame.readUInt8(3);
    const time = Util.reconstruct24bit(msb, lsb, xlsb);

    return [ 1 + 3, { type: 'sensor.time', time: time }];
  }

  static parseSensorMeasurementFrame(frame, p, t) {
    const frameObj = { type: 'sensor', temp: NaN, press: NaN };

    function read24(frame24, offset24 = 0) {
      const xlsb = frame24.readUInt8(1 + offset24);
      const lsb = frame24.readUInt8(2 + offset24);
      const msb = frame24.readUInt8(3 + offset24);
      return Util.reconstruct24bit(msb, lsb, xlsb);
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

module.exports = { Bmp3Fifo };
