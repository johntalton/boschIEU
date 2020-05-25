
# :triangular_ruler: Bosch IEU Examples

These example try to capture the wide feature set of the supported chips. And to act as an illistration of intended usage.

## :satellite: Client
A light wieght MQTT publisher client that can manage and stream results from several sensors (of any type supported by the lib).

Configured via JSON (default `config.json`).

Supports polling style interaction for each chip, in both `NORMAL` and `FORCED` modes.

## :loudspeaker: Fifo (dump)
For supported chips (bmp3xx) dumps the contents of the fifo buffer in full.  Usefull to drain buffer to clear onfull condition when testing.

## :headphones: Fifo Observe
For supported chips (bmp3xx) and that have interrupts installed and configured, moniotor the interrupt and dump the contents of the decoded fifo.

Uses `Observable` pattern as example interaction.

## :cloud: Gas Test
A hardcoded one off test that mimics the self-test example from bosch.
It can be used a a simple validation of the sensor.

## :mag: Profile
Used to read or set the chip profile.

## :wrench: Worker
A tight looped background poller written using `Worker` pattern.

## :electric_plug: Repl
A simple repl interface to interact with the chip.
Legacy: replaced by other more task specific scripts