import { genericChip } from './generic.js'

import { bme280 } from './bme280.js'
import { bme680 } from './bme680.js'
import { bme688 } from './bme688.js'
import { bmp280 } from './bmp280.js'
import { bmp380 } from './bmp380.js'
import { bmp384 } from './bmp384.js'
import { bmp388 } from './bmp388.js'
import { bmp390 } from './bmp390.js'

// Package up our Chips into a nice array for later
// note: this is left outside the class to add
//  a layer of abstraction as Chip class will be
//  exported into user space.
const Ahoy = [
  genericChip,
  bme280,
  bme680,
  bme688,

  bmp280,
  bmp380,
  bmp384,
  bmp388,
  bmp390
];

/**
 * Factory for discovering Chips.
 */
export class Chip {
  /**
   * Provides direct access to the `genericChip` class.
   *
   * @returns The `genericChip` implementation.
   **/
  static generic() { return genericChip; }

  static get BMP280_ID() { return bmp280.chipId; }
  static get BME280_ID() { return bme280.chipId; }
  static get BME680_ID() { return bme680.chipId; }
  static get BME688_ID() { return bme688.chipId; }
  static get BMP384_ID() { return bmp384.chipId; }
  static get BMP388_ID() { return bmp388.chipId; }
  static get BMP390_ID() { return bmp390.chipId; }

  /**
   * Recovers a specific Chip implementation by its ID.
   *
   * @param id A valid Bosch chip id.
   * @returns An Object that extends `genericChip`.
   **/
  static fromId(id, legacy) {
    if(id === undefined) { return Chip.generic(); }

    const chip = Ahoy.find(c => c.chipId === id && c.isChipIdAtZero() !== legacy);
    if(chip === undefined) { throw new Error('unknown chip id: ' + id); }
    return chip;
  }

  /**
   * Access to the full list of known chips.
   *
   * @returns An array of objects with `name` and `chip_id` properties.
   **/
  static chips() {
    return Ahoy.filter(chip => genericChip.name !== chip.name)
      .map(chip => ({ name: chip.name, chip_id: chip.chipId }));
  }
}
