"use strict";

const boschLib = require('../src/boschIEU.js');
//const bosch = boschLib.BoschIEU;
//const Converter = boschLib.Converter;
const Profiles = boschLib.Profiles;

const Util = require('./client-util.js');
const Store = require('./client-store.js');
const Device = require('./client-device.js');

function defaultConfig() {
  // console.log('default config');
  return Promise.resolve({
    machine: Util.machine(),
    profiles: '../src/profiles.json',
    devices: [
      {
        bus: 'spi',
        id: 1,
        profile: 'MAX_STANDBY',
        pollIntervalMS: 1 * 1000,
        retryIntervalMS: 29 * 1000
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
        pollIntervalMS: 1 * 1000,
        retryIntervalMS: 31 * 1000
      }
    ],
    mqtt: {
      url: process.env.mqtturl,
      reconnectMSecs: 30 * 1000
    }
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
 * when polling the device(s) this is how ye be doing it
 * callback and inline console log
 */
function poll(application, device){
  device.sensor.measurement()
    .then(result => { insertResults(application, device, result, new Date()); return result; })
    .then(result => Util.log)
    .catch(e => {
      console.log('error measuring', e);
      clearInterval(device.timer);
    });
}

//
// kick off
//
defaultConfig()
  .then(loadProfiles)
  .then(Store.setupStore)
  .then(Device.setupDevices)
  .then(runconfig => { console.log('Client UP.'); })
  .catch(e => { console.log('error', e); });
