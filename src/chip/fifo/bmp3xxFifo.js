const { genericFifo } = require('../generic.js');
const { Compensate } = require('../compensate.js');
const { bmp3xxFifoParser } = require('./bmp3xxFifoParser.js');

const FIFO_SIZE = 512;

const CMD_REGISTER = 0x7E;
const CMD_FIFO_FLUSH = 0xB0;

const FIFO_LENGTH_REGISTER = 0x12;
const FIFO_DATA_REGISTER = 0x14;

// use generic reconstruction
function reconstruct9bit(msb, lsb) {
  return msb << 8 | lsb;
}

/**
 *
 **/
class bmp3xxFifo extends genericFifo {

  static flush(bus) {
    return bus.write(CMD_REGISTER, Buffer.from([ CMD_FIFO_FLUSH ]));
  }

  static read(bus, calibration) {
    return bus.read(FIFO_LENGTH_REGISTER, 2)
      .then(buffer => {
        const fifo_byte_counter_7_0 = buffer.readUInt8(0);
        const fifo_byte_counter_8 = buffer.readUInt8(1);

        // TODO this is no longer correct for bmp390, it uses all 16bits
        return reconstruct9bit(fifo_byte_counter_8, fifo_byte_counter_7_0);
      })
      .then(fifo_byte_counter => {
        if(fifo_byte_counter < 0 || fifo_byte_counter > FIFO_SIZE) { throw new Error('fifo counter error'); }
        const readSize = fifo_byte_counter + 4 + 2;
        // eslint-disable-next-line promise/no-nesting
        return bus.write(FIFO_DATA_REGISTER).then(() => bus.readBuffer(readSize)).then(b => [b]);
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
}

module.exports = { bmp3xxFifo };
