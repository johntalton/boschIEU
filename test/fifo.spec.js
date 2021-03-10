import mocha from 'mocha'
const { describe, it } = mocha
//import { describe, it } from 'mocha'

import { expect } from 'chai'

import { I2CAddressedBus, I2CScriptBus, EOS_SCRIPT } from '@johntalton/and-other-delights'
import { BoschIEU, Chip } from '../src/boschieu.js'


const FIFO_DATA_ACTIVE_FALSE = Uint8Array.from([ 0x80, 0x00, 0x80, 0x00, 0x80, 0x00 ]).buffer
const FIFO_DATA_ACTIVE_TIME = Uint8Array.from([ 0xa0, 0x6a, 0x30, 0x73, 0x80, 0x00 ]).buffer


const SCRIPT_FIFO_FLUSH = [
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  ...EOS_SCRIPT
]

const SCRIPT_FIFO_READ_ZEROS = [
  { method: 'readI2cBlock', result: { bytesRead: 2, buffer: new ArrayBuffer(2)  } },
  { method: 'sendByte', result: { bytesWritten: 1  } },
  { method: 'i2cRead', result: { bytesRead: 6, buffer: FIFO_DATA_ACTIVE_FALSE  } },
  ...EOS_SCRIPT
]

const SCRIPT_FIFO_READ_DATA = [
  { method: 'readI2cBlock', result: { bytesRead: 2, buffer: Uint8Array.from([ 0x01, 0x00 ]).buffer } },
  { method: 'sendByte', result: { bytesWritten: 1  } },
  { method: 'i2cRead', result: { bytesRead: 7, buffer: FIFO_DATA_ACTIVE_TIME } },
  ...EOS_SCRIPT
]

describe('BoschFifo', () => {
  describe('constructor', () => {
    it('should construct from a sensor', async () => {
      const sbus = await I2CScriptBus.openPromisified(EOS_SCRIPT)
      const abus = new I2CAddressedBus(sbus, 0x00)

      const sensor = await BoschIEU.sensor(abus)
      const fifo = sensor.fifo

      expect(fifo).not.to.be.undefined
    })
  })

  describe('flush', () => {
    it('should flush', async () => {
      const sbus = await I2CScriptBus.openPromisified(SCRIPT_FIFO_FLUSH)
      const abus = new I2CAddressedBus(sbus, 0x00)

      const sensor = await BoschIEU.sensor(abus, { chipId: Chip.BMP388_ID, legacy: false })

      await sensor.fifo.flush()
    })
  })

  describe('read', () => {
    it('should read from empty fifo', async () => {
      const sbus = await I2CScriptBus.openPromisified(SCRIPT_FIFO_READ_ZEROS)
      const abus = I2CAddressedBus.from(sbus, 0x00)

      const sensor = await BoschIEU.sensor(abus, { chipId: Chip.BMP388_ID, legacy: false })

      const messages = await sensor.fifo.read(true)

      expect(messages).to.be.an('Array')
      expect(messages).to.be.of.length(3)

      expect(messages[0].type).to.equal('sensor.empty')
      expect(messages[1].type).to.equal('sensor.empty')
      expect(messages[2].type).to.equal('sensor.empty')

    })

    it('should read and parse data', async () => {
      const sbus = await I2CScriptBus.openPromisified(SCRIPT_FIFO_READ_DATA)
      const abus = I2CAddressedBus.from(sbus, 0x00)

      const sensor = await BoschIEU.sensor(abus, { chipId: Chip.BMP388_ID, legacy: false })

      const messages = await sensor.fifo.read(true)

      expect(messages).to.be.an('Array')
      expect(messages).to.be.of.length(2)
      expect(messages[0].type).to.equal('sensor.time')
      expect(messages[0].sensortime).to.be.a('Number')
      expect(messages[1].type).to.equal('sensor.empty')
    })
  })
})
