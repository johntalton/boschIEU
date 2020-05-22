
const { genericChip } = require('./generic.js');
const { bmp280 } = require('./bmp280.js');
const { bme280 } = require('./bme280.js');
const { bme680 } = require('./bme680.js');
const { bmp388 } = require('./bmp388.js');

/**
 * Factory for discovering chips
 */
class Chip {
  static generic() { return genericChip; }

  static fromId(id){
    const chip = Chip._chips.find(c => c.chipId === id);
    if(chip === undefined) { throw Error('unknown chip id: ' + id.toString()); }
    return chip;
  }

  static chips() {
    return Chip._chips.filter(chip => genericChip.name !== chip.name)
      .map(chip => ({ name: chip.name, chip_id: chip.chipId }));
  }
}

Chip._chips = [
  genericChip,
  bmp280,
  bme280,
  bme680,
  bmp388
];

module.exports.Chip = Chip;

