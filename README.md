# BMP280 using SPI (pi-spi) interface
## REPL interface 
  ```
  > node temp
  bmp280@spi0.1> 
  ```
command listing:
 - ```id``` reads and prints static chipdId (validates agains code value)
 - ```version``` reads and prints version 
 - ```reset``` **soft-reset device**. returns to inital profile (mode Sleep) 
 - ```status```[!] reads and prints values
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
The bmp280 chip uses standard register swapping to control asyncronous read/write via the digital interface (given the Adafruit chip this is the only accessable inteface.  As well as limiting only a single power line).
 
This dual register swapping (mode) can be enabled/disabled.  
 
(**push**)
When enabled, the chip will refresh the value available to read (on intervale value 'standby').  Thus, calls to ```temp``` will return the 'latest' value.  Performance / timing profile can be configured. 
 
When disabled the chip is in sleep mode.  

(**pull**)
While in sleep mode (though transitioning from nomral mode is valid and results in puting chip to sleep) the chip can be instrcuted to perform a single register swap (conversion).  Which can then be read at the leaser of the caller. (as noted above, a call to read temp/press does not trigger a conversion, and thus in sleep/forced mode multiple reads without a call to ```force``` will result in identical values)






