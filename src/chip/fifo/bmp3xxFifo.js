import { Compensate } from '../compensate.js'
import { genericFifo } from '../generic.js'
import { bmp3xxFifoParser } from './bmp3xxFifoParser.js'


const FIFO_SIZE = 512

const CMD_REGISTER = 0x7E
const CMD_FIFO_FLUSH = 0xB0

const FIFO_LENGTH_REGISTER = 0x12
const FIFO_DATA_REGISTER = 0x14

// use generic reconstruction
function reconstruct9bit(msb, lsb) {
  return msb << 8 | lsb
}

/**
 *
 **/
export class bmp3xxFifo extends genericFifo {

  static flush(bus) {
    return bus.writeI2cBlock(CMD_REGISTER, Uint8Array.from([ CMD_FIFO_FLUSH ]))
  }

  static async read(bus, calibration, overRead = false) {
    const abuffer = await bus.readI2cBlock(FIFO_LENGTH_REGISTER, 2)

    const dv = new DataView(abuffer)

    const fifo_byte_counter_7_0 = dv.getUint8(0)
    const fifo_byte_counter_8 = dv.getUint8(1)

    // TODO this is no longer correct for bmp390, it uses all 16bits
    const fifo_byte_counter = reconstruct9bit(fifo_byte_counter_8, fifo_byte_counter_7_0)

    if(fifo_byte_counter < 0 || fifo_byte_counter > FIFO_SIZE) {
      throw new Error('fifo counter error')
    }

    if(fifo_byte_counter === 0) {
      // console.warn('zero length fifo...')
      // TODO does this ever happen, if so, what is there to read
      // return []
    }

    // TODO we over read here in order to capture the case where
    //   the the sensor time is turned on and we may get sensor.empty
    //   frames, or we may get a configuration frame
    const readSize = fifo_byte_counter + (overRead ? 4 + 2 : 0)

    await bus.sendByte(FIFO_DATA_REGISTER)
    const framesABuffer = await bus.i2cRead(readSize)
    const frames = framesABuffer

    const messages = bmp3xxFifoParser.parseFrames(frames)

    return messages.map(msg => {
      if(msg.type === 'sensor') {
        return {
          // we do not explode message here as it may not be clean
          type: msg.type,
          ...Compensate.from({ adcP: msg.press, adcT: msg.temp, type: '3xy' }, calibration)
        }
      }

      if(msg.type === 'sensor.time') {
        return {
          // we do not explode message here as it may not be clean
          type: msg.type,
          ...Compensate.sensortime(msg.time)
        }
      }

      return msg
    })
  }
}
