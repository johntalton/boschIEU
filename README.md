# Bosch Integrated Environmental Unit
High level API for Bosch BMP280 BME280 tempature / pressure / humidity 

- Both SPI and I2C (multiple libs)
- full set of lightly abstracted low level method
- sleep / reset / fine grained profile control
- Push / Pull interaction modes

[Adafruit BMP280](https://www.adafruit.com/product/2651)
[Adafruid BME280](https://www.adafruit.com/product/2652)


## REPL interface 

  ```
  > node repl
  > init spi 1
  Unknown@spi:/dev/spidev0.1> id
  bmp280@spi:/dev/spidev0.1> 
  ...
  ```

command listing:
 - ```init <bus> <id>``` sets the spi bus device (id can be simple of full path)
 - ```id``` reads and prints chip id (validates agains code value and selecting sensor chip)
 - ```version``` reads and prints version 
 - ```reset``` **soft-reset device**. returns to inital profile (mode Sleep) 
 - ```status``` reads and prints values (optional ```!``` sufix causes muliple executions)
 - ```controlm``` reads and prints control (prefer ```profile```)
 - ```controlh``` reads and prints control (prefer ```profile```)
 - ```config``` reads and prints config (prefer ```profile```)
 - ```calibration``` reads the static calibration data for sensor chip
 
 - ```sleep``` alias to set profile to "sleep" (mode Sleep, oversampling Off/Off coeff. Off, standby Max)
 - ```normal``` alias to set profile to "normal" (profile MAX_STANDBY, good for use in ```poll``` command and general test)
 - ```forced``` alias to set profile to "forced" (mode Forced, oversampling Off/Off, standby Off) 
 
 - ```pressure``` reads and prints value onchip (does *not* trigger convesion)
 - ```tempature``` reads and prints value onchip (does *not* trigger converstion)
 - ```humidity``` reads and prints value ohchip (does *not* trigger converstion)
 - ```altitude``` reads temp/press values onchip and prints aprox altitude
 
 - ```profile``` prints current onchip profile (config / control)
 - ```poll``` sets console to interval poll and print (press Enter to end)
 - ```exit``` 



## General

### Mode
The Bosch Integrated Environmental Unit chips uses standard dual register interface to control asyncronous read/write via the digital interface (given the Adafruit chip this is the only accessable inteface.  As well as limiting only a single power line).  

The chip Normal mode can be enabled (**push**).
When enabled, the chip will refresh the value available to read (on intervale value 'standby').  Thus, calls to ```temp``` will return the 'latest' value.  Performance / timing profile can be configured. 
 
When disabled the chip is in sleep mode (**pull**).
While in sleep mode (though transitioning from nomral mode is valid and results in puting chip to sleep) the chip can be instrcuted to perform a single register swap (conversion).  Which can then be read at the leaser of the caller. (as noted above, a call to read temp/press does not trigger a conversion, and thus in sleep/forced mode multiple reads without a call to ```force``` will result in identical values)

### Calibration

Each  chip has a unique fingerprint (im tracking all of you) and thus callibration is needed.  this is a passive method by which the chip provides the 'trimming values'.  Usage of the press/temp methods require those values to do post processing (compensation).  Inital app cache is undefined, calling ```calibration``` will populate those caches.   

### Profiles

Bosch chip spec is organized (and thus validated) based on a narrow range of profiles.  Further, paricular values are colocated in chip registers and require syncronized writing.  Profiles as and API solves this by making it a concern of the consumer.

Normal profile notes: for this demo, we disable most features and put in the common (4s) delay.  This is well suted for running the poll method (at interval of 1s) to be abvle to visaul the update process. 

Sleep profile notes: this profile also disables register swaping and thus results are similar to a ```reset``` (profile sets standby to max where reset sets to min).

The ```profile``` comand will read the current registers and create a valid profile from the working system.  Its also an easy we to get a running snapshot as it runs both ```control``` and ```config```.

### Altitude

Standard calculation included as a conviniance.  Assumes normal sea level - which is wrong.

### Diabling Press / Temp

Aditional performace / power can be managed by disabling the Press / Temp "measurment cycle".  

### Status

Status updates give you insight into the chips update process.
 - measuring is true when a conversion is in process
 - update is true when NVM is being copied to registers

Empirically running status in burst mode (!) you can see "update" occurse at the begining of each measuing cycle. Run here on a standby with 4s, thus needed to be run multiple times.
```
bmp280@spi:/dev/spidev0.1> status!
Measuring:  false  Updating:  false
bmp280@/dev/spidev> status!
Measuring:  false  Updating:  false
Measuring:  true  Updating:  true
Measuring:  true  Updating:  false
Measuring:  false  Updating:  false
```

## Dependency

This sensor uniquely can be operated in both SPI and i2c configurations.  Further there are a multitude of javascript bus implementations.  Abstracting all of these behind a "rasbus" implementation, and resulting deps are peer to your project.

# API 
## General

Simple init case:
```
const busImpl = require('rasbus').spi;
busImpl.init(1).then(bus => {
  bosch.sensor(name, bus).then(sensor => {
     // ...
  })
});
```

## BoschIEU

### sensor

```
const boschieu = requre('./boschIEU.js');
boschieu.sensor(name, bus).then( ... )
``` 
## BoschIEU Sensor

### id()

```
sensor.id()
   .then(id => sensor.valid() ? 'valid' : 'invlaid')
   .then(console.log);
```

### version()

```
sensor.version().then(console.log);
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

### status()

### profile() control() config()

Returns the general configuration profile for the chip.  As noted in the Profile section, profiles are a mix of the ```control``` and ```config``` setting.  Using the low level methods is not recomended.   

```profile``` reads on the chip, thus returning the active profile.  

---

### setProfile() sleep()

Sets the profile for the chip.  This sets both the ```control``` and ```config``` values. 

```sleep``` is a alias to use the sleep profile (specificly mode: sleep)

### force()

```
sensor.force().then( ... )
```

Write the force mode profile to the chip.  Resulting in mdoe sleep state.  

### reset()

```
sensor.reset().then( ... )
```

Write a soft-reset to the chip.  Returning it to power-on state.

---

### measurement(...)

```
sensor.measurement().then(([P, T, H]) => {
  //
});
```


Read pressure, tempature and hunidity register in a single pass.  This provide syncronization of data and beter performance / power managment.

Measurment applies the proper compenstation formula based on the calibration data unique to each chip.  

---

### tempature()

```
sensor.tempature().then(T => {});
```

A more optimized call to explicity fetch the tempature over ```measurment()```.  Best used when ```OVERSAMPLE_OFF``` is applied.  And is genraly a good shorthand.

Unlike ```measurment()``` calls to ```tempature()``` require only the first tempature related caliberation parameters.

### pressure()

```
sensor.pressusre().then(P => {
  //
});
```

A more optimized call over ```measurment``` when only interested in presure data.  Best used when ```OVERSAMPLE_OFF``` is set.
Note, like ```tempature()``` this require only the pressure slice of the calibration_data

### humidity()

```
sensor.humidity().then(H => {
  //
});
```

Optimized call over ```measurment``` is supported by chip.

---

## Converter

### altitudeFromPressure()

```
const alt = Converter.altitudeFromPressure(seaLevelPa, P);
```

Simple conversion.

---

### compensateP() compensateT() compensateH()

```
const P = Converter.compensateP(adcP, T, ...calibrtion_data.slice(3))
```

These compensation functions take in the raw adc P/T values and perform the spec defined conversion using the calibration data provided.

