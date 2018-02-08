const boschLib = require('./src/boschIEU.js')
const bosch = boschLib.BoschIEU;
const Converter = boschLib.Converter;
const Profiles = boschLib.Profiles;

const rasbus = require('rasbus');

function defaultConfig() {
  // console.log('default config');
  return Promise.resolve({
    connection: process.env.storeurl,
    profiles: './src/profiles.json',
    devices: [
      {
        bus: 'spi',
        id: 1,
        profile: 'MAX_STANDBY',
        pollIntervalMS: 1 * 1000
      },
      {
        bus: 'i2c-bus',
        address: 0x77,
        id: 1,
        profile: {
          mode: 'NORMAL',
          oversampling_p: 2,
          oversampling_t: 2,
          oversampling_h: 2,
          filter_coefficient: false,
          standby_time: 500
        },
        pollIntervalMS: 1 * 1000
      }
    ]
  });
}

/**
 * loads the recommended configuration profiles aliass json file
 * as recommended in spec
 */
function loadProfiles(application) {
  return Profiles.load(application.profiles).then(() => application);
}

/**
 * given config selects the appropriate rasbu lib to use
 */
function selectBus(bus) {
  if(bus === 'i2c'){ return rasbus.i2c; }
  else if(bus === 'i2c-bus') { return rasbus.i2cbus; }

  else if(bus === 'spi'){ return rasbus.spi; }
  else if(bus === 'pi-spi') { return rasbus.pispi; }
  else if(bus === 'spi-device') { return rasbus.spidevice; }

  throw new Error('unknown bus: ' + bus);
}

/**
 * insert callback for application state tracking / logging / etc
 */
function insertClientUp(application) {
  return application;
}

/**
 * device up callback for application state tracking / etc
 */
function insertDeviceUp(application, device) {

  console.log(device.sensor.chip.name);
  console.log(device.bus.name);

  /*return application.store.insert({
    type: 'device'
    chipName: device.sensor.chip.name,
    busName: device.bus.name,
  });*/
}

/*
 * results callback / etc
 */
function insertResults(application, device, results, polltime) {
  let P;
  let C;
  let H;

  if(device.sensor.chip.supportsPressure) {
    if(results.pressure.skip) {}
    else if(results.pressure.undef) {}
    else {
      P = results.pressure.P;
    }
  }

  if(device.sensor.chip.supportsTempature) {
    if(results.tempature.skip) {}
    else if(results.tempature.undef) {}
    else {
      C = results.tempature.T;
    }
  }

  if(device.sensor.chip.supportsHumidity) {
    if(results.humidity.skip) {}
    else if(results.humidity.undef) {}
    else {
      H = results.humidity.H;
    }
  }

//  return application.store.insert({
  return ({
    type: 'result',
    properties: {
      bus: device.bus.name,
      chip: device.sensor.chip.name,
      time: polltime.toISOString(),
      pressurePa: P,
      tempatureC: C,
      humidity: H
    }
  });
}

/**
 * keep all this stuff, ya, put it here
 */
function setupStore(application) {
  return JsonStore.openStore(application.connection, 'tempature').then(store => {
    console.log('store up.');
    application.store = store;
    return application;
  });
  //.then(insertClientUp);
}

/**
 * given configruation result in running application state
 */
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
        .then(() => insertDeviceUp(application, device))
        .then(() => {
          device.timer = setInterval(poll, devconfig.pollIntervalMS, application, device);
        })
        .then(() => { console.log('device poll up: ', device.sensor.chip.name, '@', device.bus.name); return device; });
    });
  });
  return Promise.all(application.devices);
}

/**
 * when polling the device(s) this is how ye be doing it
 * callback and inline console log
 */
function poll(application, device){
  device.sensor.measurement()
    .then(result => { insertResults(application, device, result, new Date()); return result; })
    .then(result => {
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

//
// kick off
//
defaultConfig()
  .then(loadProfiles)
  //.then(setupStore)
  .then(setupDevice)
  .then(runconfig => { console.log('Client UP.'); })
  .catch(e => { console.log('error', e); });
