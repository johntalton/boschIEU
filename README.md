# BMP280 (via spi & pi-spi)
High level API for Bosch BMP280 tempature / pressure over SPI.

- full set of lightly abstracted low level method
- sleep / reset / fine grained profile control
- Push / Pull interaction modes

[Adafruit BMP280](https://www.adafruit.com/product/2651)

## REPL interface 
  ```
  > node temp
  bmp280@spi0.1> 
  ```
command listing:
 - ```id``` reads and prints static chipdId (validates agains code value)
 - ```version``` reads and prints version 
 - ```reset``` **soft-reset device**. returns to inital profile (mode Sleep) 
 - ```status``` reads and prints values (optional ```!``` sufix causes muliple executions)
 - ```control``` reads and prints control (prefer ```profile```)
 - ```config``` reads and prints config (prefer ```profile```)
 - ```calibration``` reads the static calibration data on chip and caches for usig in temp/press and friends
 
 - ```sleep``` alias to set profile to "sleep" (mode Sleep, oversampling Off/Off coeff. Off, standby Max)
 - ```normal``` alias to set profile to "normal" (profile MAX_STANDBY, good for use in ```poll``` command and general test)
 - ```forced``` alias to set profile to "forced" (mode Forced, oversampling Off/Off, standby Off) 
 
 - ```temp``` reads and prints value onchip (does *not* trigger converstion)
 - ```press``` reads and prints value onchip (does *not* trigger convesion)
 - ```altitude``` reads temp/press values onchip and prints aprox altitude
 
 - ```profile``` prints current onchip profile (config / control)
 - ```poll``` sets console to interval poll and print (press Enter to end)
 - ```exit``` 



## General

### Mode
The Bosch bmp280 chip uses standard dual register interface to control asyncronous read/write via the digital interface (given the Adafruit chip this is the only accessable inteface.  As well as limiting only a single power line).  

The chip Normal mode can be enabled (**push**).
When enabled, the chip will refresh the value available to read (on intervale value 'standby').  Thus, calls to ```temp``` will return the 'latest' value.  Performance / timing profile can be configured. 
 
When disabled the chip is in sleep mode (**pull**).
While in sleep mode (though transitioning from nomral mode is valid and results in puting chip to sleep) the chip can be instrcuted to perform a single register swap (conversion).  Which can then be read at the leaser of the caller. (as noted above, a call to read temp/press does not trigger a conversion, and thus in sleep/forced mode multiple reads without a call to ```force``` will result in identical values)

### Calibration

Each bmp280 chip has a unique fingerprint (im tracking all of you) and thus callibration is needed.  this is a passive method by which the chip provides the 'trimming values'.  Usage of the press/temp methods require those values to do post processing (compensation).  Inital app cache is undefined, calling ```calibration``` will populate those caches.   

### Profiles

Bosch spec for bmp280 is organized (and thus validated) based on a narrow range of profiles.  Further, paricular values are colocated in chip registers and require syncronized writing.  Profiles as and API solves this by making it a concern of the consumer.

Normal profile notes: for this demo, we disable most features and put in the common (4s) delay.  This is well suted for running the poll method (at interval of 1s) to be abvle to visaul the update process. 

Sleep profile notes: this profile also disables register swaping and thus results are similar to a ```reset``` (profile sets standby to max where reset sets to min).

The ```profile``` comand will read the current registers and create a valid profile from the working system.  Its also an easy we to get a running snapshot as it runs both ```control``` and ```config```.

### Altitude

Standard calculation included as a conviniance.  Assumes normal sea level - which is wrong.

### Diabling Press / Temp

Aditional performace / power can be managed by disabling the Press / Temp "measurment cycle".  

### Status

Status updates give you insight into the bmp280 update process.
 - measuring is true when a conversion is in process
 - update is true when NVM is being copied to registers

Empirically running status in burst mode (!) you can see "update" occurse at the begining of each measuing cycle. Run here on a standby with 4s, thus needed to be run multiple times.
```
bmp280@spi0.1> status!
Measuring:  false  Updating:  false
bmp280@spi0.1> status!
Measuring:  false  Updating:  false
Measuring:  true  Updating:  true
Measuring:  true  Updating:  false
Measuring:  false  Updating:  false
```

## SPI dependency

currently hardcoded driver path "/dev/spidev0.1".
bmp280 3-wire SPI not supported.

both the ```pi-spi``` and the ```spi``` node modules are used in an abstration SPI layer.  User provided abstractions can be added via the ```.spi``` member varaible as seen in ```setupDevice()``` (client.js).

# API 
## General

This API uses an abstracted SPI driver that needs to be initialized and set on the bmp280 object prior to its use.

currently the ```pi-spi`` and ```spi``` node modules provide SPI abstraction.   A wrapper for both of these can be found in ```spi.js```.  User provided implementation are welcome etc.

using these example wrappers:

```
const SPI = require('./spi.js');
SPI.init(device).then(spi => {
  bmp280.spi = spi;
  
  bmp280.read( ... .then( ...
  
});
```

(note: this api is not desirable and lacks flexibility as we move to new chips and multi-chip enviroments etc)

### id()

```
bmp280.id()
   .then(id => id === bmp280.CHIP_ID ? 'valid' : 'invlaid')
   .then(console.log);
```

### version()

```
bmp280.version().then(console.log);
```

---

### calibration()

```
bmp280.calibration().then(calibration_data => {
  // ...
  // and then, later on at the bat cave ...
  bmp280.measurement(...caliberation_data).then(() => {}); // ... etc
});
```

---

### status()

### getProfile() control() config()

---

### setProfile() setSleepMode() profiles()

### force()

```
bmp280.force().then( ... )
```

Write the force mode profile to the chip.  Resulting in mdoe sleep state.  

### reset()

```
bmp280.reset().then( ... )
```

Write a soft-reset to the chip.  Returning it to power-on state.

---

### measurement(...) _burstMeasurement()

```
bmp280.measurement(...caliberation_data).then(([P, T]) => {
  //
});
```

Measurment is a Compensated wrapper for _bustMeasurment.  That is:

These methods read both the pressure and tempature register in a single pass.  This provide syncronization of data and beter performance / power managment.

Measurment applies the proper compenstation formula based on the calibration data unique to each chip.  

The unconpensated values can be obtained directy via the _burstMeasument() call.  Supplied compensation method (see _compensateP/T) can be used, or augment via user supplied code.

---

### temp()

```
const [t1, t2, t3, ...rest] = calibration_data;
bmp280.temp(t1, t2, t3).then(T => {});
```

A more optimized call to explicity fetch the tempature over ```measurment()```.  Best used when ```OVERSAMPLE_OFF``` is applied.  And is genraly a good shorthand.

Unlike ```measurment()``` calls to ```temp()``` require only the first tempature related caliberation parameters.

### press()

```
bmp280.press(...(calibration_data.slice(3))).then(P => {
  //
});
```

A more optimized call over ```measurment``` when only interested in presure data.  Best used when ```OVERSAMPLE_OFF``` is set.
Note, like ```temp()``` this require only the pressure slice of the calibration_data

---

### altitudeFromPressure()

```
const alt = bmp280.altitudeFromPressure(seaLevelPa, P);
```

Simple conversion.

---

### _compensateP() _compensateT()

```
const P = bmp280._compensateP(adcP, T, ...calibrtion_data.slice(3))
```

These compensation functions take in the raw adc P/T values and perform the spec defined conversion using the calibration data provided.

---

### _ctrlMeasFromSamplingMode() _configFromTimingFilter()

```
const config_register = bmp280._configFromTimingFilter(bmp280.OVERSAMPLE_X2, bmp280.OVERSAMPLE_X16, bmp280.MODE_NORMAL);
const control_register = bmp280._ctrlMeasFromSamplingMode(bmp280.STANDBY_4000, bmp280.COEFFICIENT_8);
```

Internal register packing bit twiddly stuff.  see spec for more info :)
