# Bosch Integrated Environmental Unit

Common Unified Sensor API for supported IEU chips.

Provides full feature access to all supported chips (bmp280 bme280 bme680 bme688 bmp388 bmp390) while still providing rich chip specific features (multiple heater profiles and fifo access).

[![npm Version](http://img.shields.io/npm/v/@johntalton/boschieu.svg)](https://www.npmjs.com/package/@johntalton/boschieu)
![GitHub package.json version](https://img.shields.io/github/package-json/v/johntalton/boschieu)
[![CI](https://github.com/johntalton/boschIEU/actions/workflows/ci.yml/badge.svg)](https://github.com/johntalton/boschieu/actions/workflows/ci.yml)
![GitHub](https://img.shields.io/github/license/johntalton/boschieu)
[![Downloads Per Month](http://img.shields.io/npm/dm/@johntalton/boschieu.svg)](https://www.npmjs.com/package/@johntalton/boschieu)
![GitHub last commit](https://img.shields.io/github/last-commit/johntalton/boschieu)


Products:
 - [Adafruit BMP280](https://www.adafruit.com/product/2651)
 - [Adafruit BME280](https://www.adafruit.com/product/2652) / [Sparkfun BME280](https://www.sparkfun.com/sparkfun-atmospheric-sensor-breakout-bme280-qwiic.html)

 - [Sparkfun BMP384](https://www.sparkfun.com/sparkfun-pressure-sensor-bmp384-qwiic.html)
 - [Adafruit BMP388](https://www.adafruit.com/product/3966)
 - [Adafruit BMP390](https://www.adafruit.com/product/4816)

 - [Adafruit BMP580](https://www.adafruit.com/product/6411)
 - [Adafruit BMP581](https://www.adafruit.com/product/6407) / [Sparkfun BMP581](https://www.sparkfun.com/sparkfun-pressure-sensor-bmp581-qwiic.html)
 - [Adafruit BMP585](https://www.adafruit.com/product/6413)

 - [Adafruit BME680](https://www.adafruit.com/product/3660) / [Sparkfun BME680](https://www.sparkfun.com/sparkfun-environmental-sensor-breakout-bme680-qwiic.html)
 - [Adafruit BME688](https://www.adafruit.com/product/5046) / [Sparkfun BME688](https://www.sparkfun.com/sparkfun-environmental-sensor-bme688-qwiic.html)

(note: Adafruit no-longer sells the [bmp085](https://www.adafruit.com/product/391) or [bmp180](https://www.adafruit.com/product/1603), donation of legacy chips are welcome to aid in greater product support)

## :triangular_ruler: [Example Usage](examples/README.md)

# :wrench: API

The API is organized around simple sensor class `BoschSensor` which provides an object interface for manipulating the sensor.


Example using `detect` method to discover `chip` type.

```js
import { BoschIEU } from '@johntalton/boschieu'
import { I2CAddressedBus } from '@johntalton/and-other-delights'

const DEFAULT_BOSCH_ADDRESS = 0x77
const i2cBus = /* from I2CBus interface */
const addressedBus = new I2CAddressedBus(i2cBus, DEFAULT_BOSCH_ADDRESS)

// use `detect` method to identify sensor type
const sensor = await BoschIEU.detect(addressedBus)

// load the calibration data in sensor cache
//  only needed once on chip initialization
await sensor.calibration()

// setting profile values
//  different chips have addition profile properties and modes
await sensor.setProfile({ /* ... */ })

// perform a reading of the chips data values
await sensor.measurement()

```


Alternatively, if you wish to set the chip during initialization that is also possible (replacing the above `detect` with a call to `sensor` with the specified chip)
```js
// ...
import { bmp390 } from '@johntalton/boschieu/chip'

// ...
const sensor = BoschIEU.sensor(addressedBus, { chip: bmp390 })

// use bmp390 specific interaction (etc)

```
#### :page_facing_up: sensor.chip

The chips identification can be inspected via the `sensor.chip` property.

```js
// ...

const features = sensor.chip.features
const hasFifo = features.fifo

const name = sensor.chip.name
const kind = sensor.chip.kind


console.log('chip:', kind, name, hasFifo)
// chip: 3xx bmp390 true

```

#### :page_facing_up: calibration()

Calibration method fetches required parameters from the chip and caches them in the sensor class.  It also returns a copy for inspection.

This is required prior to any `measurement` call to properly calculate results.

#### :page_facing_up: profile()

Returns the chips full profile object.

#### :page_facing_up: setProfile(profile)

Sets the profile for the chip in full.

Using the bmp390 profile as an example, a full profile set would look similar to the following.

```js
// ...

await sensor.setProfile({
   mode: 'NORMAL',

   standby_prescaler: 1,
   oversampling_p: 1,
   oversampling_t: 1,
   filter_coefficient: false,

   watchdog: 'LONG',

   spi: {
      mode: '4-wire',
      page: 0 // no paging for 3xx
   },

   fifo: {
      active: true,
      stopOnFull: false,
      temp: true,
      press: true,
      time: true,
      data: 'unfiltered',
      subSampling: 0,
      highWatermark: 1
   },

   interrupt: {
      mode: 'open-drain',
      level: 'active-low',
      driveStrength: 'low',
      latched: true,
      onFifoWatermark: false,
      onFifoFull: false,
      onReady: true
   }
})


```

#### :page_facing_up: setMode(profile)

Setting the Mode is a short form of setting the profile.  It allows for updating part of the profile that controls the mode.  This is useful for chips that can be used in single-shot measurement modes.

Note, the mode register contains the temperature and pressure oversampling values, thus the must be specified as part of this limited profile setting.
