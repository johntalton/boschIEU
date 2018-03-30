"use strict";

/**
 * Magic util to simplify interface based on address/length read
 * this is also the place the <bus>s read gets called
 **/
class Util {
  static range(from, to) { return [...Array(to - from + 1).keys()].map(i => i + from); }

  static decodeTwos(twos, length) {
    const smask = 1 << (length - 1);
    if((twos & smask) !== smask) { return twos; }
    // this is a subtle way to coerce trunceated twos
    // into sign extented js integer (without parseInt)
    return -1 << length - 1 | twos;
  }

  static reconstruct10bit(msb, lsb_2bit) {
    return (msb << 2) | lsb_2bit;
  }

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

  static deenumify(name, map) {
    const item = map.find(item => item.name === name);
    if(item === undefined) { console.log(map); throw Error('unknonw enum name: ' + name); }
    return item.value;
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

if(module.parent === null) {
  function foo (success) { if(!success) { throw Error('nope'); } }
  foo(Util.decodeTwos(0b1001, 4) === -7);

  foo(Util.decodeTwos(0b010, 3) === 2);
  foo(Util.decodeTwos(0b100, 3) === -4);
  foo(Util.decodeTwos(0b111, 3) === -1);

  foo(Util.decodeTwos(0b00000000, 8) === 0);
  foo(Util.decodeTwos(0b01111110, 8) === 126);
  foo(Util.decodeTwos(0b10000001, 8) === -127);
  foo(Util.decodeTwos(0b11111111, 8) === -1);

  console.log('util self-test looks good.');
}
