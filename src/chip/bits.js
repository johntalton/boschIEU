import { BitSmush } from '@johntalton/bitsmush'

const BIT_SIZE = 8
const NEGATIVE_ONE = -1
const ZERO = 0
const ONE = 1

const TEN = 10
const TWELVE = 12
const TWENTY = 20

export class Bits {
  static decodeTwos(twos, length) {
    const smask = ONE << (length - ONE)
    if((twos & smask) !== smask) { return twos }
    // this is a subtle way to coerce truncated twos
    // into sign extends js integer (without parseInt)
    return NEGATIVE_ONE << length - ONE | twos
  }

  static reconstructNBit(nbit, parts) {
    // 20-bit does not follow the pattern of the above
    // shift up and use the low bit of the part as the remaining
    // bits.  Instead it uses the parts high order bits as the
    // remaining bits that need to be shifted down.  however, this
    // comes from a single implementation caller that may have its
    // byte read incorrect, or may have been calculated inaccurately
    if(nbit === 20) {
      const [msb, lsb, xlsb] = parts
      return ((msb << 8 | lsb) << 8 | xlsb) >> 4
    }

    // generic algorithm for N-Bit reconstruction
    return parts.map((part, index) => {
      const shift = nbit - (BIT_SIZE * (index + ONE))
      if(shift < 0) {
        const size = BIT_SIZE + shift // not addition is negative subtraction
        const mask = BitSmush.mask(size)
        // console.log('last part #', index, shift, size, mask, part)
        return part & mask
      }

      const mask = BitSmush.mask(BIT_SIZE)
      // console.log('part #', index, shift, mask, part)
      return (part & mask) << shift
    })
      .reduce((acc, part) => acc | part, ZERO)
  }

  static reconstruct10bit(msb, lsb_2bit) { return Bits.reconstructNBit(TEN, [msb, lsb_2bit]) }
  static reconstruct12bit(msb, lsb_4bit) { return Bits.reconstructNBit(TWELVE, [msb, lsb_4bit]) }
  static reconstruct20bit(msb, lsb, xlsb) { return Bits.reconstructNBit(TWENTY, [msb, lsb, xlsb]) }
}
