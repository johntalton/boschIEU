import { bmp3xx } from './bmp3xx.js'

/**
 *
 **/
export class bmp384 extends bmp3xx {
  static get name() { return 'bmp384'; }
  static get chipId() { return 0x50 }

  static extmode_en_middle(bus) {
    return bus.write(0x7E, Buffer.from([0x34]));
  }
}
