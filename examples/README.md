
# :triangular_ruler: Examples

## :flashlight: Repl
Provides a command line interaction to the sensor / api.  Allowing for testing different chip bus and addressing configurations.
Also provides are more raw view without directly debuging.

## :satellite: Client
A light wieght MQTT client that can manage and stream results from several devices (of any type supported by the lib).
It exercises most of the features and functionality of each chip, and provides a good base for app interaction use case.

## :loudspeaker: Fifo (dump)
For supported chips (bmp3xx) dumps the contents of the fifo buffer.  Usefull to drain buffer to clear onfull condition when testing with repl.

## :headphones: Fifo Observe
For supported chips (bmp3xx) and including the interrupt pin gpio (via onoff dep) will monitor the interrupt conditons (which can be set via the profile) and read the fifo buffer on demand.

## :electric_plug: Gas Test
A hardcoded one off test that mimics the self-test example from bosch.
It can be used a a simple validation of the sensor.
