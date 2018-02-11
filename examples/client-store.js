"use strict";

const mqtt = require('mqtt');

const State = require('./client-util.js').State;

class Store {
  /**
   * keep all this stuff, ya, put it here
   */
  static setupStore(application) {
    application.mqtt.client = mqtt.connect(application.mqtt.url, { reconnectPeriod: application.mqtt.reconnectMSecs });
    application.mqtt.client.on('connect', () => { State.to(application.machine, 'mqtt') });
    application.mqtt.client.on('reconnect', () => { });
    application.mqtt.client.on('close', () => { });
    application.mqtt.client.on('offline', () => { State.to(application.machine, 'dmqtt'); });
    application.mqtt.client.on('error', (error) => { console.log(error); process.exit(-1); });

    return Promise.resolve(application);
  }

  /**
   * insert callback for application state tracking / logging / etc
   */
  static insertClientUp(application) {
    return application;
  }

  /**
   * device up callback for application state tracking / etc
   */
  static insertDeviceUp(application, device) {

    console.log(device.client.sensor.chip.name);
    console.log(device.client.bus.name);

    /*return application.store.insert({
      type: 'device'
      chipName: device.sensor.chip.name,
      busName: device.bus.name,
    });*/
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




}

module.exports = Store;
