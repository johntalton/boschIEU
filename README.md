# Bosch Integrated Environmental Unit

Common Unified Sensor API for supported IEU chips.

[![npm Version](http://img.shields.io/npm/v/@johntalton/boschieu.svg)](https://www.npmjs.com/package/@johntalton/boschieu)
![GitHub package.json version](https://img.shields.io/github/package-json/v/johntalton/boschieu)
![CI](https://github.com/johntalton/boschIEU/workflows/CI/badge.svg?branch=master&event=push)
![CodeQL](https://github.com/johntalton/boschIEU/workflows/CodeQL/badge.svg)
![GitHub](https://img.shields.io/github/license/johntalton/boschieu)
[![Downloads Per Month](http://img.shields.io/npm/dm/@johntalton/boschieu.svg)](https://www.npmjs.com/package/@johntalton/boschieu)
![GitHub last commit](https://img.shields.io/github/last-commit/johntalton/boschieu)
[![Package Quality](https://npm.packagequality.com/shield/%40johntalton%2Fboschieu.svg)](https://packagequality.com/#?package=@johntalton/boschieu)

Provides full feature access to all supported chips (bmp280 bme280 bme680 bmp388 bmp390) while still providing rich chip specific features (multiple heater profiles and fifo access).

Tested with these products:
 - [Adafruit BMP280](https://www.adafruit.com/product/2651)
 - [Adafruit BME280](https://www.adafruit.com/product/2652)
 - [Adafruit BME680](https://www.adafruit.com/product/3660)
 - [Adafruit BMP388](https://www.adafruit.com/product/3966)
 - [Adafruit BMP390](https://www.adafruit.com/product/4816)

(note: Adafruit no-longer sells the [bmp085](https://www.adafruit.com/product/391) or [bmp180](https://www.adafruit.com/product/1603), donation of legacy chips are welcome to aid in greater product support)

## :triangular_ruler: [Example Usage](examples/README.md)

# :wrench: API

The API is organized around simple sensor class `BoschSensor` which provides an object interface for manipulating the sensor.  All method return a Promise.

A simple demo usage follows.
```js
const i2c1 = await i2c.openPromisified(1);
const addressedI2C1 = new I2CAddressedBus(i2c1, 0x77);
const sensor = await BoschIEU.sensor(addressedI2C1);
await sensor.detectChip();
await sensor.calibration();
const result = await sensor.measurement();

```

## :blue_book: BoschIEU
#### :page_facing_up: sensor(addressedBus)
A static factory method to provide access to the `BoschSensor` class.


## :blue_book: BoschIEU Sensor
#### :page_facing_up: detectChip()
After constructing a sensor object, the `detectChip` method is recommended as it will attempt to (get this) detect which version of the chip to use for further register interactions.
```js
sensor.detectChip()
   .then(() => { if(sensor.valid()) ... })

```
Alternatively, if you are you wish to set the chip during initialization that is also possible
```js
   // sensor.chipId = Chip.bmp388
```
#### :page_facing_up: id()
Returns the chips id as defined by the vendor. This is only valid after a chip has been detected (`valid()` returns true)
(note that legacy `id()` call will internal run `detectChip()` for now...)
```js
sensor.id()
   .then(id => console.log('sensors Id', id);
```
#### :page_facing_up: calibration()
Fetches the calibration constants from the chip.  These values are unique for each chip and needed to perform compensation of the raw data values into temperature and pressure readings.

Note: This must be called before the `measurement` call will return valid results.

Note: The method itself caches results in the class and is not needed externally (though returned for user inspection)
#### :page_facing_up: fifo()
The `fifo` getter method returns a static `Fifo` class implementation. This provides a namespace for fifo functionality.
```js
sensor.fifo.flush( ... ).then(...)
```
#### :page_facing_up: profile()
Returns current chip profile from the device.
#### :page_facing_up: setProfile(profile)
Sets the profile for the chip.

Note: This will set the entire profile, if fields are not included in `profile` they will be set to the defaults for the `Chip`.
#### :page_facing_up: reset()
Write a soft-reset to the chip.  Returning it to power-on state.
```js
sensor.reset().then( ... )
```
#### :page_facing_up: measurement(...)
Reads and calculates related measurement data from the `Chip`.
```js
sensor.measurement().then(results => {
  // process results
});
```


## :blue_book: Fifo
#### :page_facing_up: flush()
Flushes the fifo buffer using command register.
#### :page_facing_up: read()
Reads the current fifo buffer in full (as specified by size) and parses and compensates frame data.
## :blue_book: Converter
Converter class of common helps are included (ft to meters, altitude from Pa, etc)
