"use strict";

const boschLib = require('../src/boschIEU.js');
const Profiles = boschLib.Profiles;

const Util = require('./client-util.js');
const Store = require('./client-store.js');
const Device = require('./client-device.js');
const Config = require('./client-config.js');

const State = Util.State;

/**
 * loads the recommended configuration profiles aliass json file
 * as recommended in spec
 */
function loadProfiles(application) {
  let first = application.profiles[0];
  let rest = application.profiles.slice(1);

  const base = Profiles.load(first).then(() => application);
  return rest.reduce((accum, path) => accum.catch(() => Profiles.load(path).then(() => application)), base);
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
Config.config('./client.json')
  //.then(config => { console.log(config); return config; })
  .then(setupStateHandlers)
  .then(loadProfiles)
  .then(Store.setupStore)
  .then(Device.setupDevices)
  .then(runconfig => { console.log('Client UP.'); })
  .catch(e => { console.log('error', e); });
