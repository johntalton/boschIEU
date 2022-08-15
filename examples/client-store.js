import mqtt from 'mqtt'

import { State } from './client-util.js'

const IEU_TOPIC = 'boschieu/result'; // eslint-disable-line spellcheck/spell-checker

/**
 *
 **/
export class Store {
  /**
   * Setup state handlers for Mqtt connection and messaging.
   *
   * @param application Application state.
   */
  static setupStore(application) {
    // console.log('setup store ', application.mqtt.url);
    if(application.mqtt.url === undefined) { return Promise.reject(Error('undefined mqtt url')); }
    application.mqtt.client = mqtt.connect(application.mqtt.url, { reconnectPeriod: application.mqtt.reconnectMSecs });
    application.mqtt.client.on('connect', () => { State.to(application.machine, 'mqtt'); });
    // application.mqtt.client.on('reconnect', () => { console.log('mqtt reconnect') });
    // application.mqtt.client.on('close', () => { });
    application.mqtt.client.on('offline', () => { State.to(application.machine, 'dmqtt'); }); // eslint-disable-line spellcheck/spell-checker
    application.mqtt.client.on('error', error => { console.log(error); throw new Error('mqtt error: ' + error.toString()); });

    return Promise.resolve(application);
  }

  /*
   * results callback / etc
   */
  static insertResults(application, device, results, polltime) {
    // eslint-disable-next-line promise/avoid-new
    return new Promise((resolve, reject) => {
      const msg = {
        signature: device.signature,
        bus: device.bus.name,
        chip: device.sensor.chip.name,
        time: polltime.toISOString(),

        pressure: results.pressure,
        altitude: results.altitude,
        temperature: results.temperature,
        temperature: results.temperature,
        humidity: results.humidity,
        gas: results.gas
      };
      // eslint-disable-next-line promise/prefer-await-to-callbacks
      application.mqtt.client.publish(IEU_TOPIC, JSON.stringify(msg), {}, err => {
        if(err) { reject(err); }
        resolve();
      });
    });
  }
}
