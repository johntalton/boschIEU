
# :triangular_ruler: Examples


## :flashlight: Repl
Provides a command line interaction to the sensor / api.  Allowing for testing different chip bus and addressing configurations.
Also provides are more raw view without directly debuging.

## :satellite: Client
A light wieght MQTT client that can manage and stream results from several devices (of any type supported by the lib).
It exercises most of the features and functionality of each chip, and provides a good base for app interaction use case.

## :loudspeaker: Fifo
For supported fifo chips (bmp3xx) a dump of the fifo buffer. can be used to test onFifoFull interrupt (by using it to draing the buffer once full).
Supports `sensor` commands (measrument / time / empty) as well as error and configuration changes (which can be usefull to see change when using the, above, repl command to set the profile).

## :electric_plug: Gas Test
A hardcoded one off test that mimics the self-test example from bosch.
It can be used a a simple validation of the sensor.
