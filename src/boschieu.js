/* eslint-disable import/extensions */
import { BoschSensor } from './sensor.js'

// export these internal items ... for now
export { Converter } from './converter.js'
export { Chip } from './chip/chip.js'

/**
 * Driver for Bosch Integrated Environmental Unit.
 *  Supports (bmp280 / bme280 / bme680 / bpm388) chips.
 */
export class BoschIEU {
  static sensor(bus, options) {
    return Promise.resolve(new BoschSensor(bus, options));
  }

  // eslint-disable-next-line require-await
  static async detect(bus) {
    return BoschSensor.detect(bus)
  }

}
