
const { State } = require('./client-util.js');
const Store = require('./client-store.js');
const Device = require('./client-device.js');
const Config = require('./client-config.js');

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
  .then(Store.setupStore)
  .then(Device.setupDevices)
  .then(() => { console.log('Client up...'); })
  .catch(e => { console.log('top-level error', e); });
