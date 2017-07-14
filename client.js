const bmp280 = require('./bmp280-spi.js');

function defaultConfig() {
  return Promise.resolve('/dev/spidev0.1');
}

function setupDevice(device){
   const SPI = require('./spi.js');
   return SPI.init(device).then(spi => {
      bmp280.spi = spi;
   });
}

function validateID(){
  return bmp280.id().then(id => {
    if(id === bmp280.CHIP_ID) { return true; }
    throw new Error('Invalid chip ID');
  });
}

function initMode(){
  return bmp280.setProfile({
    mode: bmp280.MODE_NORMAL,
    oversampling_p: bmp280.OVERSAMPLE_X1,
    oversampling_t: bmp280.OVERSAMPLE_X2,
    filter_coefficient: bmp280.COEFFICIENT_OFF,
    standby_time: bmp280.STANDBY_500
  });
}

function fetchCalibration(){
  return bmp280.calibration();
}

function poll(calibration_data){
  bmp280.measurement(...calibration_data).then(([P, T]) => {
    console.log(P, T);
  });
}

defaultConfig()
  .then(setupDevice)
  .then(validateID)
  .then(initMode)
  .then(fetchCalibration)
  .then(calibration_data => {
    return setInterval(poll, 1000, calibration_data);
  })
  .catch(e => { console.log('error', e); });
