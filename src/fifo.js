/**
 * Instance Helper for Interacting with static chips via the Sensor.
 * Wrap calls into the chips static fifo methods and is accessible
 *   via the sensors fifo property (creating a name space for higher level
 *   API).
 **/
export class BoschFifo {
  constructor(sensor) {
    this.sensor = sensor;
  }

  async flush() { return this.sensor.chip.fifo.flush(this.sensor._bus); }

  async read() { return this.sensor.chip.fifo.read(this.sensor._bus, this.sensor._calibration); }
}
