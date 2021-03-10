import mocha from 'mocha'
const { describe, it } = mocha
//import { describe, it } from 'mocha'
import { expect } from 'chai'

import { I2CAddressedBus, I2CScriptBus, EOS_SCRIPT } from '@johntalton/and-other-delights'
import { BoschIEU, Chip } from '@johntalton/boschieu'

const SCRIPT_DETECT_BME680 = [
  { method: 'readI2cBlock', result: { bytesRead: 1, buffer: Uint8Array.from([ 0x60 ]).buffer } },
  ...EOS_SCRIPT
]

describe('usage', () => {
  describe('chip id', () => {
    it('allow chip id inspection of generic', async () => {
      const sbus = await I2CScriptBus.openPromisified(EOS_SCRIPT)
      const abus = new I2CAddressedBus(sbus, 0x00)

      const sensor = await BoschIEU.sensor(abus)

      expect(sensor.chip).to.equal(Chip.generic())
      expect(sensor.chip.chipId).to.equal(Chip.generic().chipId)
      expect(sensor.chip.chipId).to.be.undefined
    })

    it('allow chip id inspection of selected', async () => {
      const sbus = await I2CScriptBus.openPromisified(EOS_SCRIPT)
      const abus = new I2CAddressedBus(sbus, 0x00)

      const sensor = await BoschIEU.sensor(abus, { chipId: Chip.BME680_ID, legacy: true })

      expect(sensor.chip).to.equal(Chip.fromId(Chip.BME680_ID, true))
      expect(sensor.chip.chipId).to.equal(Chip.BME680_ID)
      expect(sensor.chip.chipId).to.equal(97)
    })

    it('allow chip id inspection of detected', async () => {
      const sbus = await I2CScriptBus.openPromisified(SCRIPT_DETECT_BME680)
      const abus = new I2CAddressedBus(sbus, 0x00)

      const sensor = await BoschIEU.detect(abus)

      expect(sensor.chip).to.equal(Chip.fromId(Chip.BME280_ID, true))
      expect(sensor.chip.chipId).to.equal(Chip.BME280_ID)
      expect(sensor.chip.chipId).to.equal(96)
    })
  })
})
