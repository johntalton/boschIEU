"use strict";

const rasbus = require('rasbus');

const boschLib = require('../src/boschIEU.js');
const bosch = boschLib.BoschIEU;
const Profiles = boschLib.Profiles;

const State = require('./client-util.js').State;

class Device {
  /**
   * given configruation result in running application state
   */
  static setupDevices(application) {
    return Promise.all([application.devices.filter(devcfg => devcfg.client === undefined).map(devcfg => {
      return Device.setupDevice(application, devcfg)
        .then(() => {
          Device._processDevice(application);
        })
        .catch(e => {
          console.log('\u001b[91mdevice setup failure', devcfg, e, '\u001b[0m');
          devcfg.client = undefined;
          devcfg.retrytimer = setInterval(Device._retrySetupDevice, devcfg.retryIntervalMS, application, devcfg);
        });
    })]).then(results => application);
  }

  // top level set intervale, no return
  static _retrySetupDevice(application, devcfg) {
    console.log('retruy device', devcfg.bus, devcfg.id);
    Device.setupDevice(application, devcfg)
      .then(() => {
        clearIntervale(devcfg.retrytimer);
        devcfg.retrytimer = undefined;
        Device._processDevice(application);
      })
      .catch(e => { console.log('reconnect failure', e); });
  }

  static setupDevice(application, devcfg) {
    let client = {};
    return Device._selectBus(devcfg.bus).init(devcfg.id, devcfg.address)
      .then(bus => client.bus = bus)
      .then(() => client.profile = Device._parseProfile(devcfg.profile))
      .then(() => bosch.sensor(client.bus).then(sensor => client.sensor = sensor))
      .then(() => client.sensor.id())
      .then(() => {
        if(!client.sensor.valid()){ throw new Error('invalid device on', client.bus.name); }
        console.log('chip ', client.sensor.chip.name, ' found on ', client.bus.name);
      })
      .then(() => client.sensor.calibration())
      .then(() => client.sensor.setProfile(Profiles.chipProfile(client.profile, client.sensor.chip)))
      //.then(() => insertDeviceUp(application, devcfg))

      .then(() => { devcfg.client = client });
  }

  /**
   * given config selects the appropriate rasbu lib to use
   */
  static _selectBus(bus) {
    if(bus === 'i2c'){ return rasbus.i2c; }
    else if(bus === 'i2c-bus') { return rasbus.i2cbus; }

    else if(bus === 'spi'){ return rasbus.spi; }
    else if(bus === 'pi-spi') { return rasbus.pispi; }
    else if(bus === 'spi-device') { return rasbus.spidevice; }

    throw new Error('unknown bus: ' + bus);
  }

  static _parseProfile(cfgprofile) {
    if(typeof cfgprofile === 'string') {
      const p = Profiles.profile(cfgprofile);
      if(p === undefined) { throw new Error('unknown profile: ' + cfgprofile); }
      return p;
    }
    return cfgprofile;
  }

  static _processDevice(application) {
    const pending = application.devices.filter(d => d.client === undefined);
    const all = pending.length === 0;
    const some = pending.length > 0 && pending.length !== application.devices.length;
    const none = pending.length === application.devices.length;

    console.log('proccess', all, some, none);

    if(all) { State.to(application.machine, 'all'); }
    else if(some) { State.to(application.machine, 'some'); }
    else if(none) { State.to(application.machine, 'none'); }

    return;
  }

  static _startStream(application) {
    const ready = application.devices
      .filter(d => d.client !== undefined)
      .filter(d => d.client.polltimer === undefined)
      .forEach(d => {
        setInterval(Device._poll, d.pollIntervalMS, application, d);
      });
  }

  static _stopStream(application) {
    const reap = application.devices
      .filter(d => d.client !== undefined)
      .filter(d => d.client.polltimer !== undefined)
      .forEach(d => {
        clearIntervale(d.client.polltimer);
        d.client.polltimer = undefined;
      });
  }

  static _poll(application, devcfg) {
    console.log('poll');
  }
}

module.exports = Device;


