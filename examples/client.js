const EVENT_NAME_STREAM = 'stream';
const EVENT_NAME_RE_STREAM = 'restream'; // eslint-disable-line spellcheck/spell-checker
const EVENT_NAME_STOP_STREAM = 'stopstream'; // eslint-disable-line spellcheck/spell-checker
const EVENT_NAME_RE_STOP_STREAM = 'restopstream'; // eslint-disable-line spellcheck/spell-checker

import { State } from './client-util.js'
import { Store } from './client-store.js'
import { Device } from './client-device.js'
import { Config } from './client-config.js'

// todo how to set up preferred sealeve

// Converter.seaLevelPa = 100700;

function setupStateHandlers(application) {
  State.on(application.machine, EVENT_NAME_STREAM, () => {
    // scans and start any valid client streams
    Device.startStreams(application);
  });

  State.on(application.machine, EVENT_NAME_RE_STREAM, () => {
    // scans and start any valid client streams
    Device.startStreams(application);
  });

  State.on(application.machine, EVENT_NAME_STOP_STREAM, () => {
    // stops all active streams
    Device.stopStreams(application);
  });

  State.on(application.machine, EVENT_NAME_RE_STOP_STREAM, () => {
    // device is self cleaning on down
  });

  return application;
}

//
// kick off
//
Config.config('./client.json')
  // .then(config => { console.log(config); return config; })
  .then(setupStateHandlers)
  .then(Store.setupStore)
  .then(Device.setupDevices)
  .then(() => {
    console.log('Client up...');
    process.on('SIGINT', () => {
      //
      process.exit(); // eslint-disable-line no-process-exit
    });
    return true;
  })
  .catch(e => { console.log('top-level error', e); });
