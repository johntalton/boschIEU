"use strict";

const mqtt = require('mqtt');

const State = require('./client-util.js').State;

class Store {
  /**
   * keep all this stuff, ya, put it here
   */
  static setupStore(application) {
    // console.log('setup store ', application.mqtt.url);
    if(application.mqtt.url === undefined) { return Promise.reject('undefined mqtt url'); }
    application.mqtt.client = mqtt.connect(application.mqtt.url, { reconnectPeriod: application.mqtt.reconnectMSecs });
    application.mqtt.client.on('connect', () => { State.to(application.machine, 'mqtt') });
    application.mqtt.client.on('reconnect', () => { });
    application.mqtt.client.on('close', () => { });
    application.mqtt.client.on('offline', () => { State.to(application.machine, 'dmqtt'); });
    application.mqtt.client.on('error', (error) => { console.log(error); process.exit(-1); });

    return Promise.resolve(application);
  }

  /*
   * results callback / etc
   */
  static insertResults(application, device, results, polltime) {
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

    return new Promise((resolve, reject) => {
      application.mqtt.client.publish('boschieu/result',
      JSON.stringify({
        signature: device.signature,
        bus: device.bus.name,
        chip: device.sensor.chip.name,
        time: polltime.toISOString(),
        pressurePa: P,
        tempatureC: C,
        humidity: H
      }), {}, err => {
        if(err) { reject(err); }
        resolve();
      });
    });
  }




}

module.exports = Store;
