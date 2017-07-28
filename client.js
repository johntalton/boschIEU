const boschLib = require('./src/boschIEU.js')
const bosch = boschLib.BoschIEU;
const Converter = boschLib.Converter;
const Profiles = boschLib.Profiles;

const rasbus = require('rasbus');

function defaultConfig() {
  // console.log('default config');
  return Promise.resolve({
    profiles: './src/profiles.json',
    devices: [
      { bus: 'spi', id: 1, profile: 'MAX_STANDBY' },
      { bus: 'i2c-bus', address: 0x77, id: 1, profile: {
        mode: 'NORMAL',
        oversampling_p: 2,
        oversampling_t: 2,
        oversampling_h: 2,
        filter_coefficient: false,
        standby_time: 500
      } }
    ]
  });
}

function loadProfiles(application) {
  return Profiles.load(application.profiles).then(() => application);
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
        timer: null,
        profile: undefined
      };

      if(typeof devconfig.profile === 'string') {
        console.log(devconfig.profile);
        device.profile = Profiles.profile(devconfig.profile);
        if(device.profile === undefined) { throw new Error('unknown profile: ' + devconfig.profile); }
      } else {
        device.profile = devconfig.profile;
      }

      return bosch.sensor(bus)
        .then(sensor => { device.sensor = sensor; })
        .then(() => device.sensor.id())
        .then(() => {
          if(!device.sensor.valid()){ throw new Error('invalid device on', device.bus.name); }
          console.log('chip ', device.sensor.chip.name, ' found on ', device.bus.name);
        })
        .then(() => device.sensor.calibration())
        .then(() => device.sensor.setProfile(Profiles.chipProfile(device.profile, device.sensor.chip)))
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
  device.sensor.measurement().then(result => {
    // console.log(P, T, H);
    const P = result.pressure;
    const T = result.tempature;
    const H = result.humidity;

    console.log(device.sensor.chip.name + ' (' + device.bus.name + '):');
    if(device.sensor.chip.supportsPressure){
      if(P === undefined || P.skip === true) {
        console.log('\tPressure: ', 'Skipped');
      } else if(P.undef !== undefined) {
        console.log('\tPressue:', 'uncalibrated');
      } else {
        const altitudeFt = Converter.altitudeFromPressure(Converter.seaLevelPa, P.P);

        console.log('\tPressure (Pa):', Converter.trim(P.P), '(inHg):', Converter.trim(Converter.pressurePaToInHg(P.P)));
        console.log('\tAltitude',
          '(ft):', Converter.trim(altitudeFt),
          '(m): ', Converter.trim(Converter.ftToMeter(altitudeFt)) );
      }
    }
    if(device.sensor.chip.supportsTempature){
      if(T === undefined || T.skip === true) {
        console.log('\tTempature:', 'Skipped');
      } else if(T.undef !== undefined) {
        console.log('\tTempature:', 'uncalibrated');
      } else {
        console.log('\tTempature: (c)', Converter.trim(T.T), '(F)', Converter.trim(Converter.ctof(T.T)));
      }
    }
    if(device.sensor.chip.supportsHumidity){
      if(H === undefined || H.skip === true) {
        console.log('\tHumidity: ', 'Skipped');
      } else if(T.undef !== undefined) {
        console.log('\tHumidity: ', 'uncalibrated');
      } else {
        console.log('\tHumidity:', Converter.trim(H.H));
      }
    }
    console.log();
  }).catch(e => {
    console.log('error measuring', e);
    clearInterval(device.timer);
  })
}

defaultConfig()
  .then(loadProfiles)
  .then(setupDevice)
  .then(runconfig => { console.log('All Devices Setup'); })
  .catch(e => { console.log('error', e); });
