const { genericChip } = require('./generic.js');
const { bmp280 } = require('./bmp280.js');
const { bme280 } = require('./bme280.js');
const { bme680 } = require('./bme680.js');
const { bmp388 } = require('./bmp388.js');

// Package up our Chips into a nice array for later
// note: this is left outside the class to add
//  a layer of abstraction as Chip class will be
//  exported into user space.
const Ahoy = [
  genericChip,
  bmp280,
  bme280,
  bme680,
  bmp388
];

const ID_NAME_PREFIX = '';
const ID_NAME_SUFIX = '_ID';
const IDS = Ahoy.reduce((acc, item) => {
  acc[(ID_NAME_PREFIX + item.name + ID_NAME_SUFIX).toUpperCase()] = item.chipId;
  return acc;
}, {} );

/**
 * Factory for discovering Chips.
 */
class Chip {
  /**
   * Provides direct access to the `genericChip` class.
   * @returns The `genericeChip` implementation.
   **/
  static generic() { return genericChip; }

  /**
   * Reconvers a specific Chip implementation by its ID.,
   * @returns An Object that extends `genericChip`
   **/
  static fromId(id) {
    const chip = Ahoy.find(c => c.chipId === id);
    if(chip === undefined) { throw new Error('unknown chip id: ' + id.toString()); }
    return chip;
  }

  /**
   * Access to the full list of known chips.
   * @returns An array of objects with `name` and `chip_id` properties.
   **/
  static chips() {
    return Ahoy.filter(chip => genericChip.name !== chip.name)
      .map(chip => ({ name: chip.name, chip_id: chip.chipId }));
  }
}

module.exports = { Chip, ...IDS };
