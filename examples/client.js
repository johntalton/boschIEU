"use strict";

const boschLib = require('../src/boschIEU.js');
//const bosch = boschLib.BoschIEU;
//const Converter = boschLib.Converter;
const Profiles = boschLib.Profiles;

const Util = require('./client-util.js');
const Store = require('./client-store.js');
const Device = require('./client-device.js');

const State = Util.State;

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

function setupStateHandlers(application) {
  State.on(application.machine, 'stream', () => {
    // scans and start any valid client streams
    Device.startStreams(application);
  });

  State.on(application.machine, 'restream', () => {
    // scans and start any valid client streams
    Device.startStreams(application);
  });

  State.on(application.machine, 'stopstream', () => {
    // stops all active streams
    Device.stopStreams(application);
  });

  State.on(application.machine, 'restopstream', () => {
    // device is self cleaning on down 
  });

  return application;
}

//
// kick off
//
defaultConfig()
  .then(setupStateHandlers)
  .then(loadProfiles)
  .then(Store.setupStore)
  .then(Device.setupDevices)
  .then(runconfig => { console.log('Client UP.'); })
  .catch(e => { console.log('error', e); });
