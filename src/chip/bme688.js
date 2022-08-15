import { genericChip } from './generic.js'

export class bme688 extends genericChip {
  static get name() { return 'bme688' }
  // static get chipId() { return 0x61 }

  // features
  static get features() {
    return {
      pressure: true,
      temperature: true,
      humidity: true,
      gas: true,
      normalMode: false,
      interrupt: false,
      fifo: false,
      time: false
    }
  }

}
