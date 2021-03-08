import { bmp3xx } from './bmp3xx.js'

/**
 *
 **/
export class bmp388 extends bmp3xx {
  static get name() { return 'bmp388' }
  static get chipId() { return 0x50 }

  static extmode_en_middle(bus) {
    return bus.writeI2cBlock(0x7E, Uint8Array.from([ 0x34 ]))
  }
}
