const i2c = require('i2c-bus');

const { I2CAddressedBus } = require('@johntalton/and-other-delights');

const { BoschIEU } = require('../');

async function dump() {
  const i2c1 = await i2c.openPromisified(1);
  const addressedI2C1 = new I2CAddressedBus(i2c1, 0x77);
  const sensor = await BoschIEU.sensor(addressedI2C1);
  await sensor.detectChip();
  await sensor.calibration();

  console.log(sensor.chip.name, 'fifo dump');

  const fifoData = await sensor.fifo.read();
  console.log(' => ', fifoData);
}

dump();
