import { FivdiBusProvider } from './fivdi-bus.js'

import { I2CAddressedBus, I2CMockBus } from '@johntalton/and-other-delights'

import { BoschIEU, Chip } from '@johntalton/boschieu'

const delayMs = ms => new Promise(resolve => setTimeout(resolve, ms))

const options = {
  busNumber: 1,
  busAddress: 0x76
}

const i2c1 = await FivdiBusProvider.openPromisified(options.busNumber)
const addressedI2C1 = new I2CAddressedBus(i2c1, options.busAddress)
const sensor = await BoschIEU.sensor(addressedI2C1, { chipId: Chip.BMP390_ID, legacy: false })
await sensor.calibration()

await sensor.fifo.flush()


await sensor.setProfile({
  mode: 'NORMAL',
  oversampling_t: 1,
  oversampling_p: 1,
  standby_prescaler: 1,

  filter_coefficient: false,

  watchdog: 'LONG',

  interrupt: {
    mode: 'open-drain',
    latched: false,

    onFifoWatermark: false,
    onFifoFull: false,
    onReady: true
  },
  fifo: {
    active: true,
    highWatermark: 10,
    data: "unfiltered",
    subsampling: 1,
    stopOnFull: false,
    temp: true,
    press: true,
    time: true
  }
})

await delayMs(550)

const profile = await sensor.profile()
console.log(profile)

// process.exit(0)

let run = true

process.on('SIGINT', () => {
  console.log('goodbye')
  run = false
})

while(run) {
  const fifoData = await sensor.fifo.read()
  await delayMs(500)
  console.log(fifoData.map(item => item.type === 'sensor' ? 
    JSON.stringify({ temperature: item.temperature.C, pressure: (!Number.isNaN(item.pressure.Pa) ? item.pressure.Pa : item.pressure.adc)  }) : 
    JSON.stringify(item))
    .reduce((acc, item) => acc + '\n' + item, ''))
}

