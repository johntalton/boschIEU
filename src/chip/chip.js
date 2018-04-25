"use strict";

const { genericChip } = require('./generic.js');
const { bmp280 } = require('./bmp280.js');
const { bme280 } = require('./bme280.js');
const { bme680 } = require('./bme680.js');

/**
 * Factory for discovering chips
 */
class Chip {
  static generic() { return genericChip; }

  static fromId(id){
    const chip = Chip._chips.find(chip => chip.chip_id === id);
    if(chip === undefined) { throw Error('unknown chip id'); }
    return chip;
  }

  static chips() {
    return Chips._chips.filter(chip => gernericChip.name !== chip.name)
      .map(chip => ({ name: chip.name, chip_id: chip.chip_id }));
  }
}

Chip._chips = [
  genericChip,
  bmp280,
  bme280,
  bme680
];

module.exports.Chip = Chip;

