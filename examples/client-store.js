
const mqtt = require('mqtt');

const { State } = require('./client-util.js');

/**
 *
 **/
class Store {
  /**
   * keep all this stuff, ya, put it here
   */
  static setupStore(application) {
    // console.log('setup store ', application.mqtt.url);
    if(application.mqtt.url === undefined) { return Promise.reject(Error('undefined mqtt url')); }
    application.mqtt.client = mqtt.connect(application.mqtt.url, { reconnectPeriod: application.mqtt.reconnectMSecs });
    application.mqtt.client.on('connect', () => { State.to(application.machine, 'mqtt') });
    //application.mqtt.client.on('reconnect', () => { console.log('mqtt reconnect') });
    //application.mqtt.client.on('close', () => { });
    application.mqtt.client.on('offline', () => { State.to(application.machine, 'dmqtt'); });
    application.mqtt.client.on('error', (error) => { console.log(error); throw Error('mqtt error: ' + error.toString()); });

    return Promise.resolve(application);
  }

  /*
   * results callback / etc
   */
  static insertResults(application, device, results, polltime) {
    return new Promise((resolve, reject) => {
      const msg = {
        signature: device.signature,
        bus: device.bus.name,
        chip: device.sensor.chip.name,
        time: polltime.toISOString(),

        pressure: results.pressure,
        altitude: results.altitude,
        tempature: results.tempature,
        humidity: results.humidity,
        gas: results.gas
      };
      // console.log('publish boschieu/result', msg);
      application.mqtt.client.publish('boschieu/result', JSON.stringify(msg), {}, err => {
        if(err) { reject(err); }
        resolve();
      });
    });
  }




}

module.exports = Store;
