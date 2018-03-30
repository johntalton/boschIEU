# Bosch Integrated Environmental Unit
Sensor level API for Bosch IEU (bmp280 bme280 bme680).

Simplified interface for common interaction, but includes full support for some overlooked features (bme680 multi heater profiles).

This also wraps all three modules, allowing for better reuse and api encapsulation.

Tested with these products:
[Adafruit BMP280](https://www.adafruit.com/product/2651)
[Adafruid BME280](https://www.adafruit.com/product/2652)
[Adafruid BME2680](https://www.adafruit.com/product/3660)

# Examples

## Test

A hardcoded one off test that mimics the self-test example from bosch.
It can be used a a simple validation of the sensor.

## Repl

Provides a command line interaction to the sensor / api.  Allowing for testing different chip bus and addressing configurations.
Also provides are more raw view without directly debuging.

## Client

A light wieght MQTT client that can manage and stream results from several devices (of any type supported by the lib).

It exercises most of the features and functionality of each chip, and provides a good base for app interaction use case.


# API 
## General

Simple init case:
```
const busImpl = require('rasbus').byname('i2c-bus'); // use fivdi i2c impl
busImpl.init(1, 0x77).then(bus => {
  return BoschIEU.sensor(name, bus).then(sensor => {
     // ...
  })
});
```

## BoschIEU

### sensor

```
const { BoeschIEU } = requre('./boschIEU.js');
BoscIEU.sensor(name, bus).then( ... )
``` 
## BoschIEU Sensor

### id()

```
sensor.id()
   .then(id => console.log(sensor.chip.name));
```

---

### calibration()

```
sensor.calibration().then(calibration_data => {
  // ...
  // and then, later on at the bat cave ...
  sensor.measurement().then(() => {}); // not passing calibration data 
});
```

---


### profile()

Returns current chip profile from the device.

---

### setProfile()

Sets the profile for the chip.

### reset()

```
sensor.reset().then( ... )
```

Write a soft-reset to the chip.  Returning it to power-on state.

---

### measurement(...)

```
sensor.measurement().then(results => {
  // process results
});
```

Read pressure, tempature and hunidity register in a single pass.


## Converter

Converter class of common helps are included (ft to meters, alttitude from Pa, etc)
