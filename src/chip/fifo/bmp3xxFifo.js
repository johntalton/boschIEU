const { genericFifo } = require('../generic.js');
const { Compensate } = require('../compensate.js');
const { bmp3xxFifoParser } = require('./');

const FIFO_SIZE = 512;

// use generic reconstruction
function reconstruct9bit(msb, lsb) {
  return msb << 8 | lsb;
}

/**
 *
 **/
class bmp3xxFifo extends genericFifo {

  static flush(bus) {
    return bus.write(0x7E, Buffer.from([0xB0]));
  }

  static read(bus, calibration) {
    return bus.read(0x12, 2)
      .then(buffer => {
        // console.log('fifo counter buffer', buffer);
        const fifo_byte_counter_7_0 = buffer.readUInt8(0);
        const fifo_byte_counter_8 = buffer.readUInt8(1);
        return reconstruct9bit(fifo_byte_counter_8, fifo_byte_counter_7_0);
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
      .then(frameset => bmp3xxFifoParser.parseFrameSet(frameset))
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

}

module.exports = { bmp3xxFifo };
