const i2c = require('i2c-bus');

const { I2CAddressedBus, I2CMockBus } = require('@johntalton/and-other-delights');

const { BoschIEU, Chip } = require('../');

const { deviceDef_bmp388 } = require('./deviceDefs.js');

async function dumpFifo(mock, options) {
  const provider = mock ? I2CMockBus : i2c

  // install a mock device
  if(mock) { I2CMockBus.addDevice(options.busNumber, options.busAddress, deviceDef_bmp388); }

  // setup steps needed to access the bus
  const i2c1 = await provider.openPromisified(options.busNumber);
  const addressedI2C1 = new I2CAddressedBus(i2c1, options.busAddress);
  const sensor = await BoschIEU.sensor(addressedI2C1, Chip.BMP388_ID);

  // we could use the following code await sensor.detectChip();
  // but it might be more interesting to show the use of
  // manual chip selection.
  // sensor.setChip(Chip.BMP388_ID);
  // however, we allow the factory above to set it

  await sensor.calibration(); // needed, do not forget

  console.log(sensor.chip.name, 'fifo dump');

  // single shot read
  const fifoData = await sensor.fifo.read();
  console.log(fifoData);
}

if(!module.parent) {
  const mock = process.argv.includes('--mock');

  const busNumber = 1;
  const busAddress = 0x77;
  dumpFifo(mock, { busNumber, busAddress });
}
