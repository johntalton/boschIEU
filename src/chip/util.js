"use strict";

/*

  static configFromTimingFilter(timing, filter) {
    const spi3wire = 0; // TODO
    return (timing << 5) | (filter << 2) | spi3wire;
  }

  static ctrlMeasFromSamplingMode(osrs_p, osrs_t, mode){
    return (osrs_t << 5) | (osrs_p << 2) | mode;
  }

  static ctrlHumiFromSampling(osrs_h, spi_3w_int_en) {
    if(spi_3w_int_en === undefined) { spi_3w_int_en = false; }
    return (osrs_h & 0b111) | (spi_3w_int_en ? (0x01 << 6) : 0x00);
  }



*/


/**
 * Magic util to simplify interface based on address/length read
 * this is also the place the <bus>s read gets called
 **/
class Util {
  static range(from, to) { return [...Array(to - from + 1).keys()].map(i => i + from); }

  static reconstruct20bit(msb, lsb, xlsb) {
    // return  msb << 12 | lsb << 4 | xlsb >> 4;
    return ((msb << 8 | lsb) << 8 | xlsb) >> 4;
  }

  static mapbits(bits, position, length) {
    const shift = position - length + 1;
    const mask = Math.pow(2, length) - 1;
    return (bits >> shift) & mask;
  }

  static packbits(packmap, ...params) {
    return packmap.reduce((accum, [position, length], idx) => {
      const mask = Math.pow(2, length) - 1;
      const value = params[idx] & mask;
      const shift = position + 1 - length;
      return accum | (value << shift);
    }, 0);
  }

  static enumify(value, map) {
    const item = map.find(item => item.value === value);
    if(item === undefined) { console.log(map); throw Error('enum mapping failed for ' + value); }
    return item.name;
  }

  // magic read method that take in an array of address/lengh pairs
  // (with shorthand for just address if length 1)
  // returns promise resolving to common chip api
  static readblock(bus, block, ...params) {
    // normalize block from shorthand
    const blk = block.map(item => {
      if(Array.isArray(item)) {
        if(item.length !== 2) { console.log('sloppy format', item); return [item[0], 1]; }
        return item;
      }
      return [item, 1];
    })
    // make it all inty
    .map(([reg, len]) => [parseInt(reg), parseInt(len)]);

    // and the total...
    const totalLength = blk.reduce((out, [reg, len]) => out += len, 0);

    // now lets make all those bus calls
    return Promise.all(blk.map(([reg, len]) => {
      return bus.read(reg, len);
    }))
    .then(all => {
      return Buffer.concat(all, totalLength);
    });
  }
}

module.exports.Util = Util;

