const fs = require('fs').promises;

const i2c = require('i2c-bus');

const { I2CAddressedBus, I2CMockBus } = require('@johntalton/and-other-delights');

const { BoschIEU } = require('..');

const { deviceDef_bmp388 } = require('./deviceDefs.js');

const BUS_NUMBER = 1;
const BUS_ADDRESS = 0x77;

const BAKED_IN_PROFILE = {
  mode: 'FORCED',
  oversampling_p: 2
};

async function getProfile(filePath) {
  if(filePath === false) { return BAKED_IN_PROFILE; }
  const f = await fs.readFile(filePath);
  return JSON.parse(f);
}

async function doit(mock, options) {
  const provider = mock ? I2CMockBus : i2c;

  if(mock) {
    // and install a new device
    I2CMockBus.addDevice(BUS_NUMBER, BUS_ADDRESS, deviceDef_bmp388);
  }

  const i2c1 = await provider.openPromisified(BUS_NUMBER);
  const addressedI2C1 = new I2CAddressedBus(i2c1, BUS_ADDRESS);
  const sensor = await BoschIEU.sensor(addressedI2C1);
  await sensor.detectChip();
  await sensor.calibration(); // not actaully needed
  if(options.setProfile) {
    console.log(' - setting profile');
    const profile = await getProfile(options.profilePath)
    await sensor.setProfile(profile);
  }
  const profile = await sensor.profile();

  console.log(profile);
}

// run main script
if(!module.parent) {
  const mock = process.argv.includes('--mock');
  const setProfile = process.argv.includes('--set');
  let profilePath = false;
  if(setProfile) {
    const setIndex = process.argv.indexOf('--set');
    const next = process.argv[setIndex + 1];
    if(next !== undefined) { profilePath = next; }
    console.log('profile from', profilePath);
  }
  doit(mock, { setProfile, profilePath });
  // if(mock) { I2CMockBus.dump(); }
}
