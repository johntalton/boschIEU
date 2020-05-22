/**
 * Fifo abstraction class.
 * Wrap calls into the chips static fifo methods and is accessible
 *   via the sensors fifo property (creating a name space for higher level
 *   API).
 **/
class BoschFifo {
    constructor(sensor) {
      this.sensor = sensor;
    }
  
    flush() { return this.sensor.chip.fifo.flush(this.sensor._bus); }
  
    read() { return this.sensor.chip.fifo.read(this.sensor._bus, this.sensor._calibration); }
  }

  module.exports = { BoschFifo };

