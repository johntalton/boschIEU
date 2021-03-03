import { describe, it } from 'mocha'
import { expect } from 'chai'

import { I2CAddressedBus, I2CScriptBus, EOS_SCRIPT } from '@johntalton/and-other-delights'
import { BoschIEU, Chip } from '@johntalton/boschieu'

const SCRIPT_FIFO_FLUSH = [
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  ...EOS_SCRIPT
]

const SCRIPT_FIFO_READ_ZEROS = [
  { method: 'readI2cBlock', result: { bytesRead: 2, buffer: new ArrayBuffer(2)  } },
  { method: 'sendByte', result: { bytesWritten: 1  } },
  { method: 'i2cRead', result: { bytesRead: 6, buffer: new ArrayBuffer(6)  } },
  ...EOS_SCRIPT
]

const SCRIPT_FIFO_READ_DATA = [
  { method: 'readI2cBlock', result: { bytesRead: 2, buffer: Uint8Array.from([ 0x01, 0x00 ]) } },
  { method: 'sendByte', result: { bytesWritten: 1  } },
  { method: 'i2cRead', result: { bytesRead: 7, buffer: Uint8Array.from([
    0b10000000, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
  ]) } },
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
    // it('should read from empty fifo', async () => {
    //   const sbus = await I2CScriptBus.openPromisified(SCRIPT_FIFO_READ_ZEROS)
    //   const abus = new I2CAddressedBus(sbus, 0x00)

    //   const sensor = await BoschIEU.sensor(abus, { chipId: Chip.BMP388_ID, legacy: false })

    //   const messages = await sensor.fifo.read()

    //   expect(messages).to.deepEqual([])
    // })

    it('should read and parse data', async () => {
      const sbus = await I2CScriptBus.openPromisified(SCRIPT_FIFO_READ_DATA)
      const abus = new I2CAddressedBus(sbus, 0x00)

      const sensor = await BoschIEU.sensor(abus, { chipId: Chip.BMP388_ID, legacy: false })

      //const messages = await sensor.fifo.read()
    })
  })
})