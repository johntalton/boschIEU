import i2c from 'i2c-bus'

export class FivdiBusProvider {
  static async openPromisified(busNumber) {
    return Promise.resolve(new FivdiBus(await i2c.openPromisified(busNumber)))
  }
}

export class FivdiBus {
  constructor(i2cBus) {
    this.bus = i2cBus
  }

  sendByte(address, byteValue) {
    return this.bus.sendByte(address, byteValue)
  }

  async readI2cBlock(address, cmd, length, bufferSource) {
    const buffer = Buffer.from(bufferSource)
    // console.log('FivdiBus::readI2cBlock', { address, cmd, length, bufferSource, buffer })
    const result = await this.bus.readI2cBlock(address, cmd, length, buffer)
    // console.log('-----------------', { result })
    return result
  }

  async writeI2cBlock(address, cmd, length, bufferSource) {
    const buffer = Buffer.from(bufferSource)
    // console.log('FivdiBus::writeI2cBlock', { address, cmd, length, bufferSource, buffer })
    const result = await this.bus.writeI2cBlock(address, cmd, length, buffer)
    // console.log('=======', { result })
    return result
  }

  i2cRead(address, length, bufferSource) {
    const buffer = Buffer.from(bufferSource)
    return this.bus.i2cRead(address,length, buffer)
  }

  i2cWrite(address, length, bufferSource) {
    const buffer = Buffer.from(bufferSource)
    return this.bus.i2cWrtie(address, length, buffer)
  }

}

