import mocha from 'mocha'
const { describe, it } = mocha
//import { describe, it } from 'mocha'
import { expect } from 'chai'

import { I2CAddressedBus, I2CScriptBus, EOS_SCRIPT } from '@johntalton/and-other-delights'
import { BoschIEU, Chip } from '../src/boschieu.js'

const BMP3XX_CALIBRATION_SNIP = [
  { method: 'readI2cBlock', result: { bytesRead: 21, buffer: new ArrayBuffer(21) } }
]

const BMP280_CALIBRATION_SNIP = [
  { method: 'readI2cBlock', result: { bytesRead: 25, buffer: new ArrayBuffer(25) } }
]

const BME280_CALIBRATION_SNIP = [
  { method: 'readI2cBlock', result: { bytesRead: 25, buffer: new ArrayBuffer(25) } },
  { method: 'readI2cBlock', result: { bytesRead: 7, buffer: new ArrayBuffer(7) } }
]

const BME680_CALIBRATION_SNIP = [
  { method: 'readI2cBlock', result: { bytesRead: 25, buffer: new ArrayBuffer(25) } },
  { method: 'readI2cBlock', result: { bytesRead: 16, buffer: new ArrayBuffer(16) } },
  { method: 'readI2cBlock', result: { bytesRead: 1, buffer: new ArrayBuffer(1) } },
  { method: 'readI2cBlock', result: { bytesRead: 1, buffer: new ArrayBuffer(1) } },
  { method: 'readI2cBlock', result: { bytesRead: 1, buffer: new ArrayBuffer(1) } }
]



const SCRIPT_RESET = [
  { method: 'writeI2cBlock', result: { bytesWritten: 1, buffer: new ArrayBuffer(1) } },
  ...EOS_SCRIPT
]

//

const SCRIPT_DETECT_LEGACY_EMPTY = [
  { method: 'readI2cBlock', result: { bytesRead: 1, buffer: new ArrayBuffer(1) } },
  { method: 'readI2cBlock', result: { bytesRead: 1, buffer: new ArrayBuffer(1) } },
  ...EOS_SCRIPT
]

const SCRIPT_DETECT_LEGACY_BME680 = [
  { method: 'readI2cBlock', result: { bytesRead: 1, buffer: Uint8Array.from([ 0x61 ]).buffer } },
  ...EOS_SCRIPT
]

const SCRIPT_DETECT_BME390 = [
  { method: 'readI2cBlock', result: { bytesRead: 1, buffer: new ArrayBuffer(1)}},
  { method: 'readI2cBlock', result: { bytesRead: 1, buffer: Uint8Array.from([ 0x60 ]).buffer } },
  ...EOS_SCRIPT
]

//

const SCRIPT_CALIBRATION_BMP280 = [
  ...BMP280_CALIBRATION_SNIP,
  ...EOS_SCRIPT
]

const SCRIPT_CALIBRATION_388 = [
  ...BMP3XX_CALIBRATION_SNIP,
  ...EOS_SCRIPT
]

const SCRIPT_CALIBRATION_390 = [
  ...BMP3XX_CALIBRATION_SNIP,
  ...EOS_SCRIPT
]

const SCRIPT_CALIBRATION_BME280 = [
  ...BME280_CALIBRATION_SNIP,
  ...EOS_SCRIPT
]

const SCRIPT_CALIBRATION_BME680 = [
  ...BME680_CALIBRATION_SNIP,
  ...EOS_SCRIPT
]

//

const SCRIPT_BMP390_PROFILE = [
  { method: 'readI2cBlock', result: { bytesRead: 11, buffer: new ArrayBuffer(11) } },
  ...EOS_SCRIPT
]

const SCRIPT_BMP280_PROFILE = [
  { method: 'readI2cBlock', result: { bytesRead: 3, buffer: new ArrayBuffer(3) } },
  ...EOS_SCRIPT
]

//

const SCRIPT_BMP280_SET_PROFILE = [
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  ...EOS_SCRIPT
]

const SCRIPT_BMP390_SET_PROFILE = [
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  ...EOS_SCRIPT
]

const SCRIPT_BMP388_SET_PROFILE = [
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  ...EOS_SCRIPT
]

const SCRIPT_BME280_SET_PROFILE = [
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  ...EOS_SCRIPT
]

const SCRIPT_BME680_SET_PROFILE = [
  ...BME680_CALIBRATION_SNIP,
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  ...EOS_SCRIPT
]

const SCRIPT_BME680_GAS_SET_PROFILE = [
  ...BME680_CALIBRATION_SNIP,
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  { method: 'writeI2cBlock', result: { bytesWritten: 1 } },
  ...EOS_SCRIPT
]

//

const SCRIPT_BME680_READY = [
  { method: 'readI2cBlock', result: { bytesRead: 1, buffer: new ArrayBuffer(1) } },
  ...EOS_SCRIPT
]

const SCRIPT_BMP280_READY = [
  { method: 'readI2cBlock', result: { bytesRead: 1, buffer: new ArrayBuffer(1) } },
  ...EOS_SCRIPT
]

const SCRIPT_BMP390_READY = [
  { method: 'readI2cBlock', result: { bytesRead: 2, buffer: new ArrayBuffer(2) } },
  { method: 'readI2cBlock', result: { bytesRead: 2, buffer: new ArrayBuffer(2) } },
  ...EOS_SCRIPT
]

//

const SCRIPT_BME680_MEASUREMENT = [
  ...BME680_CALIBRATION_SNIP,
  { method: 'readI2cBlock', result: { bytesRead: 15, buffer: new ArrayBuffer(15) } },
  ...EOS_SCRIPT
]

const SCRIPT_BME680_MEASUREMENT_READY = [
  ...BME680_CALIBRATION_SNIP,
  { method: 'readI2cBlock', result: { bytesRead: 15, buffer: Uint8Array.from([
    0b10000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
  ]).buffer } },
  ...EOS_SCRIPT
]


const SCRIPT_BME280_MEASUREMENT = [
  ...BME280_CALIBRATION_SNIP,
  { method: 'readI2cBlock', result: { bytesRead: 8, buffer: new ArrayBuffer(8) } },
  ...EOS_SCRIPT
]

const SCRIPT_BMP280_MEASUREMENT = [
  ...BMP280_CALIBRATION_SNIP,
  { method: 'readI2cBlock', result: { bytesRead: 6, buffer: new ArrayBuffer(6) } },
  ...EOS_SCRIPT
]

const SCRIPT_BMP388_MEASUREMENT = [
  ...BMP3XX_CALIBRATION_SNIP,
  { method: 'readI2cBlock', result: { bytesRead: 12, buffer: new ArrayBuffer(12) } },
  ...EOS_SCRIPT
]


describe('BoschIEU', () => {
  describe('sensor', () => {
    it('should create new sensor', async () => {
      const sbus = await I2CScriptBus.openPromisified(EOS_SCRIPT)
      const abus = new I2CAddressedBus(sbus, 0x00)

      const futureIeu = BoschIEU.sensor(abus)
      const ieu = await futureIeu
      expect(ieu).to.not.be.undefined
    })
  })
})

describe('BoschSensor', () => {
  describe('chip', () => {
    it('should return genericChip on construction', async () => {
      const sbus = await I2CScriptBus.openPromisified(EOS_SCRIPT)
      const abus = new I2CAddressedBus(sbus, 0x00)
      const sensor = await BoschIEU.sensor(abus)

      expect(sensor.chip).to.equal(Chip.generic())
    })
  })

  describe('id', () => {

  })

  describe('detect', () => {
    it('should throw unknown id on empty bus', async () => {
      const sbus = await I2CScriptBus.openPromisified(SCRIPT_DETECT_LEGACY_EMPTY)
      const abus = new I2CAddressedBus(sbus, 0x00)

      try {
        const sensor = await BoschIEU.detect(abus)
        expect(sensor).to.be.undefined
      } catch(e) {
        expect(e).to.be.an('Error')
      }
    })

    it('should detect bme680 at legacy address', async () => {
      const sbus = await I2CScriptBus.openPromisified(SCRIPT_DETECT_LEGACY_BME680)
      const abus = new I2CAddressedBus(sbus, 0x00)
      const sensor = await BoschIEU.detect(abus)

      expect(sensor.chip).to.equal(Chip.fromId(Chip.BME680_ID, true))
    })

    it('should detect bmp390 at nonLegacy address', async () => {
      const sbus = await I2CScriptBus.openPromisified(SCRIPT_DETECT_BME390)
      const abus = new I2CAddressedBus(sbus, 0x00)
      const sensor = await BoschIEU.detect(abus)

      expect(sensor.chip).to.equal(Chip.fromId(Chip.BMP390_ID, false))
    })
  })

  describe('isGeneric', () => {
    it('should return ture on construction', async () => {
      const sbus = await I2CScriptBus.openPromisified(EOS_SCRIPT)
      const abus = new I2CAddressedBus(sbus, 0x00)
      const sensor = await BoschIEU.sensor(abus)

      expect(sensor.isGeneric).to.be.true
    })

    it('should return true if chip set', async () => {
      const sbus = await I2CScriptBus.openPromisified(EOS_SCRIPT)
      const abus = new I2CAddressedBus(sbus, 0x00)
      const sensor = await BoschIEU.sensor(abus, { chipId: Chip.BMP390_ID, legacy: false })

      expect(sensor.isGeneric).to.be.false
    })
  })

  describe('calibrated', () => {
    it('should return false on construction', async () => {
      const sbus = await I2CScriptBus.openPromisified(EOS_SCRIPT)
      const abus = new I2CAddressedBus(sbus, 0x00)
      const sensor = await BoschIEU.sensor(abus)

      expect(sensor.calibrated).to.be.false
    })

    it('should return true after calibration calls', async () => {
      const sbus = await I2CScriptBus.openPromisified(SCRIPT_CALIBRATION_390)
      const abus = new I2CAddressedBus(sbus, 0x00)
      const sensor = await BoschIEU.sensor(abus, { chipId: Chip.BMP390_ID, legacy: false } )

      await sensor.calibration()

      expect(sensor.calibrated).to.be.true
    })
  })

  describe('sensorTime', () => {
  })

  describe('reset', () => {
    it('should successfully calibrate bmp280', async () => {
      const sbus = await I2CScriptBus.openPromisified(SCRIPT_RESET)
      const abus = new I2CAddressedBus(sbus, 0x00)
      const sensor = await BoschIEU.sensor(abus, { chipId: Chip.BMP280_ID, legacy: true } )

      await sensor.reset()
    })
  })

  describe('calibration', () => {
    it('should successfully calibrate bmp280', async () => {
      const sbus = await I2CScriptBus.openPromisified(SCRIPT_CALIBRATION_BMP280)
      const abus = new I2CAddressedBus(sbus, 0x00)
      const sensor = await BoschIEU.sensor(abus, { chipId: Chip.BMP280_ID, legacy: true } )

      await sensor.calibration()

      expect(sensor.calibrated).to.be.true
    })
    it('should successfully calibrate bmp388', async () => {
      const sbus = await I2CScriptBus.openPromisified(SCRIPT_CALIBRATION_388)
      const abus = new I2CAddressedBus(sbus, 0x00)
      const sensor = await BoschIEU.sensor(abus, { chipId: Chip.BMP388_ID, legacy: false } )

      await sensor.calibration()

      expect(sensor.calibrated).to.be.true
    })

    it('should successfully calibrate bmp390', async () => {
      const sbus = await I2CScriptBus.openPromisified(SCRIPT_CALIBRATION_390)
      const abus = new I2CAddressedBus(sbus, 0x00)
      const sensor = await BoschIEU.sensor(abus, { chipId: Chip.BMP390_ID, legacy: false } )

      await sensor.calibration()

      expect(sensor.calibrated).to.be.true
    })

    it('should successfully calibrate bme280', async () => {
      const sbus = await I2CScriptBus.openPromisified(SCRIPT_CALIBRATION_BME280)
      const abus = new I2CAddressedBus(sbus, 0x00)
      const sensor = await BoschIEU.sensor(abus, { chipId: Chip.BME280_ID, legacy: true } )

      await sensor.calibration()

      expect(sensor.calibrated).to.be.true
    })

    it('should successfully calibrate bme680', async () => {
      const sbus = await I2CScriptBus.openPromisified(SCRIPT_CALIBRATION_BME680)
      const abus = new I2CAddressedBus(sbus, 0x00)
      const sensor = await BoschIEU.sensor(abus, { chipId: Chip.BME680_ID, legacy: true } )

      await sensor.calibration()

      expect(sensor.calibrated).to.be.true
    })
  })

  describe('profile', () => {
    it('should throw and exception for generic', async () => {
      const sbus = await I2CScriptBus.openPromisified(EOS_SCRIPT)
      const abus = new I2CAddressedBus(sbus, 0x00)
      const sensor = await BoschIEU.sensor(abus)

      let e
      try { await sensor.profile();  }
      catch(_e) { e = _e }

      expect(e).to.be.an('Error')
    })

    it('should return default profile for bmp390', async () => {
      const sbus = await I2CScriptBus.openPromisified(SCRIPT_BMP390_PROFILE)
      const abus = new I2CAddressedBus(sbus, 0x00)
      const sensor = await BoschIEU.sensor(abus, { chipId: Chip.BMP390_ID, legacy: false })

      const profile = await sensor.profile()
      expect(profile).to.be.an('Object')

      expect(profile.mode).to.equal('SLEEP')
      expect(profile.standby_prescaler).to.equal(1)
      expect(profile.oversampling_p).to.equal(false)
      expect(profile.oversampling_t).to.equal(false)
      expect(profile.filter_coefficient).to.equal(false)

      expect(profile.interrupt).to.be.an('Object')

      expect(profile.interrupt.mode).to.equal('active-low')
      expect(profile.interrupt.latched).to.equal(false)
      expect(profile.interrupt.onFifoWatermark).to.equal(false)
      expect(profile.interrupt.onFifoFull).to.equal(false)
      expect(profile.interrupt.onReady).to.equal(false)

      expect(profile.fifo).to.be.an('Object')

      expect(profile.fifo.active).to.equal(false)
      expect(profile.fifo.data).to.equal('unfiltered')
      expect(profile.fifo.subsampling).to.equal(0)
      expect(profile.fifo.stopOnFull).to.equal(false)
      expect(profile.fifo.temp).to.equal(false)
      expect(profile.fifo.press).to.equal(false)
      expect(profile.fifo.time).to.equal(false)
    })

    it('should return default profile for bmp280', async () => {
      const sbus = await I2CScriptBus.openPromisified(SCRIPT_BMP280_PROFILE)
      const abus = new I2CAddressedBus(sbus, 0x00)
      const sensor = await BoschIEU.sensor(abus, { chipId: Chip.BMP280_ID, legacy: true })

      const profile = await sensor.profile()
      expect(profile).to.be.an('Object')

      expect(profile.mode).to.equal('SLEEP')
      expect(profile.standby_prescaler).to.be.undefined
      expect(profile.standby_time).to.be.equal(0.5)
      expect(profile.oversampling_p).to.equal(false)
      expect(profile.oversampling_t).to.equal(false)
      expect(profile.filter_coefficient).to.equal(false)

      expect(profile.interrupt).to.be.undefined
      expect(profile.fifo).to.be.undefined
    })
  })

  describe('setProfile', () => {
    it('should set a profile for bmp280', async () => {
      const sbus = await I2CScriptBus.openPromisified(SCRIPT_BMP280_SET_PROFILE)
      const abus = new I2CAddressedBus(sbus, 0x00)
      const sensor = await BoschIEU.sensor(abus, { chipId: Chip.BMP280_ID, legacy: true })

      await sensor.setProfile({
        mode: 'SLEEP',
        oversampling_p: false,
        oversampling_t: false,
        standby_time: 0.5,
        filter_coefficient: false
      })
    })

    it('should set a profile for bmp390', async () => {
      const sbus = await I2CScriptBus.openPromisified(SCRIPT_BMP390_SET_PROFILE)
      const abus = new I2CAddressedBus(sbus, 0x00)
      const sensor = await BoschIEU.sensor(abus, { chipId: Chip.BMP390_ID, legacy: false })

      await sensor.setProfile({
        mode: 'SLEEP',
        oversampling_p: false,
        oversampling_t: false,
        standby_time: 0.5,
        filter_coefficient: false
      })
    })

    it('should set a profile for bmp388', async () => {
      const sbus = await I2CScriptBus.openPromisified(SCRIPT_BMP388_SET_PROFILE)
      const abus = new I2CAddressedBus(sbus, 0x00)
      const sensor = await BoschIEU.sensor(abus, { chipId: Chip.BMP388_ID, legacy: false })

      await sensor.setProfile({
        mode: 'SLEEP',
        oversampling_p: false,
        oversampling_t: false,
        standby_time: 0.5,
        filter_coefficient: false
      })
    })

    it('should set a profile for bme280', async () => {
      const sbus = await I2CScriptBus.openPromisified(SCRIPT_BME280_SET_PROFILE)
      const abus = new I2CAddressedBus(sbus, 0x00)
      const sensor = await BoschIEU.sensor(abus, { chipId: Chip.BME280_ID, legacy: true })

      await sensor.setProfile({
        mode: 'SLEEP',
        oversampling_p: false,
        oversampling_t: false,
        oversampling_h: false,
        standby_time: 0.5,
        filter_coefficient: false
      })
    })

    it('should set a profile for bme680', async () => {
      const sbus = await I2CScriptBus.openPromisified(SCRIPT_BME680_SET_PROFILE)
      const abus = new I2CAddressedBus(sbus, 0x00)
      const sensor = await BoschIEU.sensor(abus, { chipId: Chip.BME680_ID, legacy: true })

      await sensor.calibration()
      await sensor.setProfile({
        mode: 'SLEEP',
        oversampling_p: false,
        oversampling_t: false,
        oversampling_h: false,
        standby_time: 0.5,
        filter_coefficient: false,

        spi: {},

        gas: {
          setpoints: []
        }
      })
    })

    it('should set a profile for bme680 with gas set point', async () => {
      const sbus = await I2CScriptBus.openPromisified(SCRIPT_BME680_GAS_SET_PROFILE)
      const abus = new I2CAddressedBus(sbus, 0x00)
      const sensor = await BoschIEU.sensor(abus, { chipId: Chip.BME680_ID, legacy: true })

      await sensor.calibration()
      await sensor.setProfile({
        mode: 'SLEEP',
        oversampling_p: false,
        oversampling_t: false,
        oversampling_h: false,
        standby_time: 0.5,
        filter_coefficient: false,

        spi: {},

        gas: {
          setpoints: [
            { skip: true }
          ]
        }
      })
    })
  })

  describe('ready', () => {
    it('should throw for generic', async () => {
      const sbus = await I2CScriptBus.openPromisified(EOS_SCRIPT)
      const abus = new I2CAddressedBus(sbus, 0x00)
      const sensor = await BoschIEU.sensor(abus)

      let capturedE
      try {
        const result = await sensor.ready()
      }
      catch(e) { capturedE = e }

      expect(capturedE).to.be.an('Error')
    })

    it('should return for bme680', async () => {
      const sbus = await I2CScriptBus.openPromisified(SCRIPT_BME680_READY)
      const abus = new I2CAddressedBus(sbus, 0x00)
      const sensor = await BoschIEU.sensor(abus, { chipId: Chip.BME680_ID, legacy: true })

      const result = await sensor.ready()
      expect(result).to.deep.equal({
        active_profile_idx: 0,
        measuring: false,
        measuringGas: false,
        ready: false
      })
    })

    it('should return for bmp280', async () => {
      const sbus = await I2CScriptBus.openPromisified(SCRIPT_BMP280_READY)
      const abus = new I2CAddressedBus(sbus, 0x00)
      const sensor = await BoschIEU.sensor(abus, { chipId: Chip.BMP280_ID, legacy: true })

      const result = await sensor.ready()
      expect(result).to.deep.equal({
        measuring: false,
        ready: true,
        updating: false,
      })
    })

    it('should return for bmp390', async () => {
      const sbus = await I2CScriptBus.openPromisified(SCRIPT_BMP390_READY)
      const abus = new I2CAddressedBus(sbus, 0x00)
      const sensor = await BoschIEU.sensor(abus, { chipId: Chip.BMP390_ID, legacy: false })

      const result = await sensor.ready()
      expect(result).to.deep.equal({
        error: {
          command: false,
          config: false,
          fatal: false
        },
        event: {
          por_detected: false
        },
        interrupt: {
          data_ready: false,
          fifo_full: false,
          fifo_watermark: false
        },
        status: {
          command: false,
          pressure: false,
          temperature: false
        }
      })
    })
  })

  describe('measurement', () => {
    it('should throw for generic', async () => {
      const sbus = await I2CScriptBus.openPromisified(SCRIPT_BME680_MEASUREMENT)
      const abus = new I2CAddressedBus(sbus, 0x00)
      const sensor = await BoschIEU.sensor(abus)

      let caputuredE
      try {
        const result = await sensor.measurement()
        expect(result).to.be.undefined
      }
      catch(e) {
        caputuredE = e
      }
      expect(caputuredE).to.be.a('Error')

    })

    it('should return default for bme680', async () => {
      const sbus = await I2CScriptBus.openPromisified(SCRIPT_BME680_MEASUREMENT)
      const abus = new I2CAddressedBus(sbus, 0x00)
      const sensor = await BoschIEU.sensor(abus, { chipId: Chip.BME680_ID, legacy: true })

      await sensor.calibration()
      const result = await sensor.measurement()

      expect(result).to.deep.equal({
        ready: false,
        skip: true
      })
    })

    it('should return ready for bme680 ready', async () => {
      const sbus = await I2CScriptBus.openPromisified(SCRIPT_BME680_MEASUREMENT_READY)
      const abus = new I2CAddressedBus(sbus, 0x00)
      const sensor = await BoschIEU.sensor(abus, { chipId: Chip.BME680_ID, legacy: true })

      await sensor.calibration()
      const result = await sensor.measurement()

      expect(result.humidity).to.not.be.undefined
      expect(result.humidity.adc).to.not.be.undefined
      expect(result.humidity.percent).to.not.be.undefined
      expect(result.humidity.skip).to.be.false

      expect(result.temperature).to.not.be.undefined
      expect(result.temperature.adc).to.not.be.undefined
      expect(result.temperature.C).to.not.be.undefined

      expect(result.pressure).to.not.be.undefined
      expect(result.pressure.adc).to.not.be.undefined
      expect(result.pressure.Pa).to.not.be.undefined

      expect(result.gas).to.not.be.undefined
      expect(result.gas.adc).to.be.false
      expect(result.gas.skip).to.be.true
    })

    it('should return default for bme280', async () => {
      const sbus = await I2CScriptBus.openPromisified(SCRIPT_BME280_MEASUREMENT)
      const abus = new I2CAddressedBus(sbus, 0x00)
      const sensor = await BoschIEU.sensor(abus, { chipId: Chip.BME280_ID, legacy: true })

      await sensor.calibration()
      const result = await sensor.measurement()

      expect(result).to.be.an('Object')
      expect(result.humidity).to.not.be.undefined
      expect(result.humidity.adc).to.not.be.undefined
      expect(result.humidity.percent).to.not.be.undefined

      expect(result.temperature).to.not.be.undefined
      expect(result.temperature.adc).to.not.be.undefined
      expect(result.temperature.skip).to.be.false
      expect(result.temperature.C).to.not.be.undefined

      expect(result.pressure).to.not.be.undefined
      expect(result.pressure.adc).to.not.be.undefined
      expect(result.pressure.Pa).to.not.be.undefined
    })

    it('should return default for bmp280', async () => {
      const sbus = await I2CScriptBus.openPromisified(SCRIPT_BMP280_MEASUREMENT)
      const abus = new I2CAddressedBus(sbus, 0x00)
      const sensor = await BoschIEU.sensor(abus, { chipId: Chip.BMP280_ID, legacy: true })

      await sensor.calibration()
      const result = await sensor.measurement()

      expect(result.humidity).to.not.be.undefined
      expect(result.humidity.adc).to.not.be.undefined
      expect(result.humidity.skip).to.be.true

      expect(result.temperature).to.not.be.undefined
      expect(result.temperature.adc).to.not.be.undefined
      expect(result.temperature.skip).to.be.false
      expect(result.temperature.C).to.not.be.undefined

      expect(result.pressure).to.not.be.undefined
      expect(result.pressure.adc).to.not.be.undefined
      expect(result.pressure.Pa).to.not.be.undefined
    })

    it('should return default for bmp388', async () => {
      const sbus = await I2CScriptBus.openPromisified(SCRIPT_BMP388_MEASUREMENT)
      const abus = new I2CAddressedBus(sbus, 0x00)
      const sensor = await BoschIEU.sensor(abus, { chipId: Chip.BMP388_ID, legacy: false })

      await sensor.calibration()
      const result = await sensor.measurement()

      expect(result.humidity).to.be.undefined

      expect(result.temperature).to.not.be.undefined
      expect(result.temperature.adc).to.not.be.undefined
      expect(result.temperature.C).to.not.be.undefined

      expect(result.pressure).to.not.be.undefined
      expect(result.pressure.adc).to.not.be.undefined
      expect(result.pressure.Pa).to.not.be.undefined
    })

  })

  describe('estimateMeasurementWait', () => {

  })
})
