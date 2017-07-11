# BMP280 using SPI (pi-spi) interface

---
## REPL interface 

  ```
  > node temp
  bmp280@spi0.1> 
  ```
  
command listing:
 - ```id``` reads and prints static chipdId (validates agains code value)
 - ```version``` reads and prints version 
 - ```reset``` **soft-reset device**. returns to inital profile (mode Sleep) 
 - ```status```[!]
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
 
 
