const boschLib = require('./src/boschIEU.js')
const bosch = boschLib.BoschIEU;
const Converter = boschLib.Converter;

function defaultConfig() {
  console.log('default config');
  return Promise.resolve({ devices: ['/dev/spidev0.0', '/dev/spidev0.1'] });
}

function setupDevice(application){
  const SPI = require('./src/spi.js');
  application.devices = application.devices.map(devicename => {
    console.log('setup device on ', devicename);
    return SPI.init(devicename).then(spi => {
      let device = {
        name: devicename,
        sensor: null,
        timer: null
      };

      return bosch.sensor(devicename, spi)
        .then(sensor => { device.sensor = sensor; })
        .then(() => device.sensor.id())
        .then(() => {
          if(!device.sensor.valid()){ throw new Error('invalid device on', device.name); }
          console.log('chip ', device.sensor.chip.name, ' found on ', device.name);
        })
        .then(() => device.sensor.calibration())
        .then(() => device.sensor.setProfile({
          mode: device.sensor.chip.MODE_NORMAL,
          oversampling_p: device.sensor.chip.OVERSAMPLE_X2,
          oversampling_t: device.sensor.chip.OVERSAMPLE_X4,
          oversampling_h: device.sensor.chip.OVERSAMPLE_X4,
          filter_coefficient: device.sensor.chip.COEFFICIENT_OFF,
          standby_time: device.sensor.chip.STANDBY_500
        }))
        .then(() => {
          return setInterval(poll, 1000, device);
        })
        .then(timer => { device.timer = timer; })
        .then(() => { console.log('device poll up: ', device.sensor.chip.name, '@', device.name); return device; });

    })
    //.catch(e => {
    //  console.log('error', e);
    //  device = { error: e };
    //});
  });
  return Promise.all(application.devices);
}

function poll(device){
  device.sensor.measurement().then(([P, T, H]) => {
    // console.log(P, T, H);

    console.log(device.sensor.chip.name, '@', device.name, ':');
    if(device.sensor.chip.supportsPressure){
      if(P === undefined || P.skip === true) {
        console.log('\tPressure: ', 'Skipped');
      } else if(P.undef !== undefined) {
        console.log('\tPressue:', 'uncalibrated');
      } else {
        console.log('\tPressure: ', Converter.trim(P));
      }
    }
    if(device.sensor.chip.supportsTempature){
      if(T === undefined || T.skip === true) {
        console.log('\tTempature:', 'Skipped');
      } else if(T.undef !== undefined) {
        console.log('\tTempature:', 'uncalibrated');
      } else {
        console.log('\tTempature:', Converter.trim(T.cf), Converter.trim(Converter.ctof(T.cf)));
      }
    }
    if(device.sensor.chip.supportsHumidity){
      if(H === undefined || H.skip === true) {
        console.log('\tHumidity: ', 'Skipped');
      } else if(T.undef !== undefined) {
        console.log('\tHumidity: ', 'uncalibrated');
      } else {
        console.log('\tHumidity:', H);
      }
    }
    console.log();
  }).catch(e => {
    console.log('error measuring', e);
    clearInterval(device.timer);
  })
}

defaultConfig()
  .then(setupDevice)
  .then(foo => { console.log('All Devices Setup'); })
  .catch(e => { console.log('error', e); });
