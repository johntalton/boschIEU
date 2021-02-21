const { FivdiBusProvider } = require('./fivdi-bus.js')

const { I2CAddressedBus, I2CMockBus } = require('@johntalton/and-other-delights');

const { BoschIEU, Chip } = require('../');

const { deviceDef_bmp388 } = require('./deviceDefs.js'); // eslint-disable-line spellcheck/spell-checker

async function dumpFifo(mock, options) {
  const provider = mock ? I2CMockBus : FivdiBusProvider;

  // install a mock device
  if(mock) {
    console.log('Adding Mock device');
    I2CMockBus.addDevice(options.busNumber, options.busAddress, deviceDef_bmp388);
  }

  // setup steps needed to access the bus
  const i2c1 = await provider.openPromisified(options.busNumber);
  const addressedI2C1 = new I2CAddressedBus(i2c1, options.busAddress);
  const sensor = await BoschIEU.sensor(addressedI2C1, { chipId: Chip.BMP388_ID });


  // we could use the following code await sensor.detectChip();
  // but it might be more interesting to show the use of
  // manual chip selection.
  // sensor.setChip(Chip.BMP388_ID);
  // however, we allow the factory above to set it

  await sensor.calibration(); // needed, do not forget

  //await sensor.setProfile({ mode: 'NORMAL', fifo: {
  //  active: true,
  //  temp: true,
  //  press: true,
  //  time: true
  //}});

  console.log(await sensor.profile());
  console.log(sensor.chip.name, 'fifo dump');

  // single shot read
  const fifoData = await sensor.fifo.read();
  console.log(fifoData);
}

async function tryDumpFifo(mock, options) {
  try {
    await dumpFifo(mock, options);
  } catch (e) {
    console.log('Error in dumpFifo', e);
  }
}

if(!module.parent) {
  const mock = process.argv.includes('--mock');

  const busNumber = 1;
  const busAddress = 0x77;
  tryDumpFifo(mock, { busNumber, busAddress });
}
