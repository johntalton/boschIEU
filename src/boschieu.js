const { BoschSensor } = require('./sensor.js');
const { Converter } = require('./converter.js');
const { Chip } = require('./chip/chip.js');

/**
 * Bosch Integrated Environmental Unit.
 *  Supports (bmp280 / bme280 / bme680 / bpm388) chips.
 */
class BoschIEU {
  static sensor(bus) {
    return Promise.resolve(new BoschSensor(bus));
  }
}

module.exports = { BoschIEU, BoschSensor, Converter, Chip };
