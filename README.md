# Bosch Integrated Environmental Unit
Sensor level API for Bosch IEU (bmp280 bme280 bme680 bmp388).

Simplified interface for common interaction, but includes full support for some overlooked features (bme680 multi heater profiles).

Providing a unified API for all four modules, allowing for better reuse and encapsulation.

Tested with these products:

[Adafruit BMP280](https://www.adafruit.com/product/2651)

[Adafruit BME280](https://www.adafruit.com/product/2652)

[Adafruit BME680](https://www.adafruit.com/product/3660)

[Adafruit BMP388](https://www.adafruit.com/product/3966)

(note: Adafruit nologer sells the [bmp085](https://www.adafruit.com/product/391) or [bmp180](https://www.adafruit.com/product/1603), donation of legacy chips are welcome to aid in greater product support)

# :wrench: API

The API is exposed via a `Sensor` class and a factory `BoschIEU`. Additional utilitiy class `Converter` is exposed for more complex use cases. The `Fifo` class is exposed on the `Sensor.fifo` getter.

Simple init case:
```js
bus.init(1, 0x77).then(bus => {
  return BoschIEU.sensor(bus).then(sensor => {
     return sensor.detectChip();
  })
});
```

## :blue_book: BoschIEU
### :page_facing_up: sensor

Static factory class for returning a new sensor then ... (thats up to you)

```js
const { BoeschIEU } = requre('./boschIEU.js');
BoscIEU.sensor(bus).then( ... )
``` 

## :blue_book: BoschIEU Sensor
### :page_facing_up: detectChip()

After constructing a sensor object, the `detectChip` method is recomended as it will attemtp to (get this) detect which version of the chip to use for further register interactions. 

```js
sensor.detectChip()
   .then(() => { if(sensor.valid()) ... })

```

### :page_facing_up: id()

Returns the chips id as defined by the vendor. This is only valid after a chip has been detected (`valid()` returns true)
(note that legacy `id()` call will internal run `detectChip()` for now...)

```js
sensor.id()
   .then(id => console.log('sensors Id', id);
```

### :page_facing_up: calibration()

Fetches the calibration constats from the chip.  These values are unique for each chip and needed to perform compensation of the raw data values into tempature and pressure readings.

Note that this must be called before the `measurment` call will return valid results. 

The method itself caches results in the class and is not needed externaly (though returned for user inspection)

### :page_facing_up: fifo()

The `fifo` getter method returns a static `Fifo` class implementation. This provides a namesapce for fifo functionality.
```js
sensor.fifo.flush( ... ).then(...)
```

### :page_facing_up: profile()

Returns current chip profile from the device.

### :page_facing_up: setProfile()

Sets the profile for the chip.


### :page_facing_up: reset()

```js
sensor.reset().then( ... )
```

Write a soft-reset to the chip.  Returning it to power-on state.


### :page_facing_up: measurement(...)

```js
sensor.measurement().then(results => {
  // process results
});
```

Read pressure, tempature and hunidity register in a single pass.


## :blue_book: Fifo

### :page_facing_up: flush(...)
Flushes the fifo buffer using command register.

### :page_facing_up: read(...)
Read byte count and read bytes parsing into frames.


## :blue_book: Converter

Converter class of common helps are included (ft to meters, alttitude from Pa, etc)
