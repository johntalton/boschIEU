


export class FivdiBusProvider {
  static async openPromisified(busNumber) {
    const i2cMod = await import('i2c-bus')
    const i2c = i2cMod.default

    return new FivdiBus(await i2c.openPromisified(busNumber))
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
    const intoBuffer = Buffer.from(bufferSource)
    // console.log('FivdiBus::readI2cBlock', { address, cmd, length, bufferSource, buffer })
    const { bytesRead, buffer } = await this.bus.readI2cBlock(address, cmd, length, intoBuffer)
    return {
      bytesRead,
      buffer: buffer.buffer
    }
  }

  async writeI2cBlock(address, cmd, length, bufferSource) {
    const bufferToWrite = Buffer.from(bufferSource)
    // console.log('FivdiBus::writeI2cBlock', { address, cmd, length, bufferSource, buffer })
    const { bytesWritten, buffer } = await this.bus.writeI2cBlock(address, cmd, length, bufferToWrite)
    return {
      bytesWritten,
      buffer: buffer.buffer
    }
  }

  async i2cRead(address, length, bufferSource) {
    const intoBuffer = Buffer.from(bufferSource)
    const { bytesRead, buffer } = await this.bus.i2cRead(address,length, intoBuffer)
    return {
      bytesRead,
      buffer: buffer.buffer
    }
  }

  async i2cWrite(address, length, bufferSource) {
    const bufferToWrite = Buffer.from(bufferSource)
    const { bytesWritten, buffer } = await this.bus.i2cWrtie(address, length, bufferToWrite)
    return {
      bytesWritten,
      buffer: buffer.buffer
    }
  }
}
