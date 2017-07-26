const boschLib = require('./src/boschIEU.js')
const bosch = boschLib.BoschIEU;
const Converter = boschLib.Converter;

const rasbus = require('rasbus');

function defaultConfig() {
  console.log('default config');
  return Promise.resolve({
    devices: [
      { bus: 'spi', id: 1 },
      { bus: 'i2c', address: 0x77, id: 1 }
    ]
  });
}

function selectBus(bus) {
  if(bus === 'i2c'){ return rasbus.i2c; }
  else if(bus === 'i2c-bus') { return rasbus.i2cbus; }

  else if(bus === 'spi'){ return rasbus.spi; }
  else if(bus === 'pi-spi') { return rasbus.pispi; }
  else if(bus === 'spi-device') { return rasbus.spidevice; }

  throw new Error('unknown bus: ' + bus);
}

function setupDevice(application) {
  application.devices = application.devices.map(devconfig => {
    // console.log('setup device on ', devconfig);
    return selectBus(devconfig.bus).init(devconfig.id, devconfig.address).then(bus => {
      let device = {
        bus: bus,
        sensor: null,
        timer: null
      };

      return bosch.sensor(bus)
        .then(sensor => { device.sensor = sensor; })
        .then(() => device.sensor.id())
        .then(() => {
          if(!device.sensor.valid()){ throw new Error('invalid device on', device.bus.name); }
          console.log('chip ', device.sensor.chip.name, ' found on ', device.bus.name);
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
        .then(() => { console.log('device poll up: ', device.sensor.chip.name, '@', device.bus.name); return device; });
    });
  });
  return Promise.all(application.devices);
}

function poll(device){
  device.sensor.measurement().then(([P, T, H]) => {
    // console.log(P, T, H);

    console.log(device.sensor.chip.name + ' (' + device.bus.name + '):');
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
  .then(runconfig => { console.log('All Devices Setup'); })
  .catch(e => { console.log('error', e); });
