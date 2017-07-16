const bosch = require('./src/boschIEU.js');

function defaultConfig() {
  return Promise.resolve({ devices: ['/dev/spidev0.0', '/dev/spidev0.1'] });
}

function setupDevice(application){
  const SPI = require('./spi.js');
  application.devices = application.devices.map(devicename => {
    return SPI.init(devicename).then(spi => {
      let device = {
        name: devicename,
        sensor: null,
        timer: null
      };

      return bosch.sensor(devicename, spi)
        .then(sensor => { device.sensor = sensor; })
        .then(() => device.sensor.id())
        .then(() => { if(!device.sensor.valid()){ throw new Error('invalid'); } })
        .then(() => device.sensor.calibration())
        .then(() => device.sensor.setProfile({
          mode: device.sensor.chip.MODE_NORMAL,
          oversampling_p: device.sensor.chip.OVERSAMPLE_X1,
          oversampling_t: device.sensor.chip.OVERSAMPLE_X2,
          filter_coefficient: device.sensor.chip.COEFFICIENT_OFF,
          standby_time: device.sensor.chip.STANDBY_500
        }))
        .then(() => {
          return setInterval(poll, 1000, device);
        })
        .then(timer => { device.timer = timer; })
        .then(() => { console.log('device up: ', device.name); return device; });

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
    console.log(device.name, device.sensor.chip.name, P, T, H);
  }).catch(e => {
    console.log('error measuring', e);
  })
}

defaultConfig()
  .then(setupDevice)
  .then(foo => { console.log('All Devices Setup'); })
  .catch(e => { console.log('error', e); });
