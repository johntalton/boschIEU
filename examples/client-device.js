/* eslint-disable promise/no-nesting */
// eslint-disable-next-line import/no-nodejs-modules
const crypto = require('crypto');

const i2c = require('i2c-bus');

const { I2CAddressedBus, I2CMockBus } = require('@johntalton/and-other-delights');

const { BoschIEU } = require('../');

const { Util, State } = require('./client-util.js');
const Store = require('./client-store.js');

const { deviceDef_bmp388 } = require('./deviceDefs.js');

const SIGNATURE_CRYPTO_MD5 = 'md5';

function signature(devcfg, sensor) {
  if(devcfg.sign === false) { return null; }
  const algo = devcfg.sign === true ? SIGNATURE_CRYPTO_MD5 : devcfg.sign;

  try {
    const b = Buffer.from([].concat(sensor._p9, sensor._t3, sensor._h6));
    const hash = crypto.createHash(algo);
    hash.update(b);
    const hex = hash.digest('hex');
    return hex;
  } catch (e) {
    console.log('error setting up signature', e);
    return undefined;
  }
}

class Device {
  /**
   * Calls setup with retry on all active device clients.
   *
   * @param application Application state with `devices` list property.
   */
  static setupDevices(application) {
    const clients = application.devices
      .filter(devcfg => devcfg.active)
      .filter(devcfg => devcfg.client === undefined);

    // console.log('setup devices', clients);

    // return Promise.all(clients.map(foo =>Promise.reject('🦄')))
    return Promise.all(clients.map(devcfg => Device.setupDeviceWithRetry(application, devcfg)))
      .then(results => application);
  }

  //  static demolishDevices(application) {
  //    return Promise.all(
  //      application.devices.filter(d => d.client !== undefined)
  //        .map(d => Device.demolishDevice(d)))
  //    );
  //  }

  static setupDeviceWithRetry(application, devcfg) {
    return Device.setupDevice(application, devcfg)
      .then(() => {
        Device._processDevice(application, true);
        return true;
      })
      .catch(e => {
        console.log('\u001b[91m device (', devcfg.name, ') setup failure', '\u001b[0m');
        devcfg.client = undefined;

        // on initial setup failure we should do a little extra digging
        // before we go into a retry mode. such as, if the path / device
        // does not exist, or if permission denied we have no need to retry
        // and we should verbosely inform the logs as to the issue.
        if(e.code !== undefined) {
          if(e.code === 'EACCES') { console.log('Permission denied to device, no-retry'); return; }
          if(e.code === 'ENOENT') { console.log('No such device, no-retry'); return; }
        }

        console.log(e);
        devcfg.retrytimer = setInterval(Device._retrySetupDevice_poll, devcfg.retryIntervalMs, application, devcfg);
      });
  }

  // top level set interval, no return
  static async _retrySetupDevice_poll(application, devcfg) {
    await Device.setupDevice(application, devcfg)
      .then(() => {
        clearInterval(devcfg.retrytimer);
        devcfg.retrytimer = undefined;
        Device._processDevice(application, true);
        return true;
      })
      .catch(e => { console.log('reconnect failure', e); });
  }

  static setupDevice(application, devcfg) {
    const client = {};
    const idary = Array.isArray(devcfg.bus.id) ? devcfg.bus.id : [ devcfg.bus.id ];

    const [busNumber, busAddress] = idary;

    //
    if(devcfg.mock === true) {
      console.log('MOCK Device', devcfg.name);
      // setup for mock
      // todo does setup only happen once, move this to main?
      I2CMockBus.addDevice(busNumber, busAddress, deviceDef_bmp388); // todo ... always bmp388
    }
    devcfg.provider = devcfg.mock === true ? I2CMockBus : i2c;

    return devcfg.provider.openPromisified(busNumber)
      .then(bus => new I2CAddressedBus(bus, busAddress))
      .then(bus => { client.bus = bus; return true; })
      .then(() => BoschIEU.sensor(client.bus).then(sensor => { client.sensor = sensor; return true; }))
      .then(() => client.sensor.detectChip())
      .then(() => {
        if(!client.sensor.valid()) { throw new Error('invalid device on', client.bus.name); }
        return true;
      })
      .then(() => client.sensor.calibration())
      .then(() => {
        // todo skip if forced?

        // support suppressing via config (hope you trust the current settings :P)
        if(!devcfg.onStartSetProfile) { console.log('skipping profile set on startup'); return Promise.resolve(); }

        return client.sensor.setProfile(devcfg.profile);
      })
      // .then(() => client.sensor.profile().then(p => console.log('profile after set', p))) // todo remove

      .then(() => {
        devcfg.client = client;
        client.name = devcfg.name;
        client.signature = signature(devcfg, client.sensor);

        // todo also publish message here

        console.log();
        console.log('Chip Up:', client.sensor.chip.name);
        console.log(' bus ', client.bus.name);
        console.log(' name', client.name);
        console.log(' signature', client.signature);
        console.log();
        return true;
      });
  }

  static reapDevice(application, devcfg) {
    devcfg.client = undefined;
    Device.setupDeviceWithRetry(application, devcfg);
  }

  static _processDevice(application, direction) {
    const active = application.devices.filter(d => d.active);
    const pending = active.filter(d => d.client === undefined);
    const all = pending.length === 0;
    const some = pending.length > 0 && pending.length < active.length;
    const none = pending.length === active.length;

    // console.log(pending);
    // console.log('process', all, some, none);

    if(all) {
      State.to(application.machine, 'all');
    } else if(some) {
      State.to(application.machine, direction ? 'some' : 'dsome');
    } else if(none) {
      State.to(application.machine, 'none');
    }
  }

  static startStreams(application) {
    console.log('starting streams...');
    const ready = application.devices
      .filter(d => d.client !== undefined)
      .filter(d => d.client.polltimer === undefined)
      .map(d => Device._startStream(application, d));

    return Promise.all(ready);
  }

  static stopStreams(application) {
    console.log('stopping streams...');
    const reap = application.devices
      .filter(d => d.client !== undefined)
      .filter(d => d.client.polltimer !== undefined)
      .map(d => Device._stopStream(application, d));

    return Promise.all(reap);
  }

  static _startStream(application, d) {
    console.log('start stream', d.name);

    let base = Promise.resolve();
    if(d.client.putToSleep) {
      d.client.putToSleep = undefined;
      console.log('device previously put to sleep, setProfile', d.profile);
      base = d.client.sensor.setProfile(d.profile);
    }

    return base.then(() => {
      // todo not all devices need a poll
      d.client.polltimer = setInterval(Device._poll, d.pollIntervalMs, application, d);
      return true;
    });
  }

  static _stopStream(application, d) {
    console.log('stop stream');
    clearInterval(d.client.polltimer);
    d.client.polltimer = undefined;

    if(d.sleepOnStreamStop) {
      console.log('**************');
      d.client.putToSleep = true;
      // todo how do we access the sleep setting profile of the chip
      return Promise.resolve(); // TODO re-add sleep setting
    }
    return Promise.resolve();
  }


  static async _poll(application, devcfg) {
    // console.log('poll', devcfg.client.sensor.chip.name);
    await Device._houseKeepingOnPoll(devcfg).then(housekeeping => {
      if(!housekeeping.measure) {
        console.log('"' + devcfg.client.name + '"');
        console.log('\tskip on housekeeping request', housekeeping.sleep ? '(in sleep mode)' : '');
        console.log();
        return true;
      }

      let base = Promise.resolve();
      if(housekeeping.delayMs !== undefined) {
        console.log('introducing delay before read', housekeeping.delayMs);
        base = new Promise((resolve) => { setTimeout(resolve, housekeeping.delayMs); });
      }

      return base.then(() => {
        const timestamp = new Date(); // todo use forcedAt time also as well as delay etc
        // const meta = {
        //   timestamp: timestamp,
        //   housekeeping: housekeeping
        // };
        return devcfg.client.sensor.measurement()
          .then(result => {
            if(result.skip !== undefined && result.skip) {
              console.log('measurement skipped', result);
              return true;
            }

            const full = Util.bulkup(devcfg.client.sensor.chip, result);
            if(true) { Util.log(devcfg.client, full); }

            return Store.insertResults(application, devcfg.client, result, timestamp);
          });
      });
    })
    .catch(e => {
      console.log('error measuring shutdown timer', e);
      clearInterval(devcfg.client.polltimer);
      devcfg.client.polltimer = undefined;

      Device.reapDevice(application, devcfg);

      Device._processDevice(application, false);
    });
  }

  static _houseKeepingOnPoll(devcfg) {
    // console.log('configured profile', devcfg.profile);
    return Promise.resolve({})
      .then(config => Device._hkModeCheck(devcfg.client.sensor, {
        checkMode: true,
        name: devcfg.client.name
      }))
      .then(config => Device._hkForce(devcfg.client.sensor, {
        normal: config.normal,
        profile: devcfg.profile, _p: config._p,
        followAlong: false
      }))
      .catch(e => {
        console.log('housekeeping error', e);

        return { measure: false };
      });
  }

  static _hkModeCheck(sensor, config) {
    // if we do not care about mode checking, bypass mode check
    if(!config.checkMode) { console.log('modeCheck suppressed'); return { normal: true }; }

    // console.log('housekeeping read/check profile');
    return sensor.profile().then(profile => {
      // console.log('\"' + config.name + '\"', 'chip profile on modeCheck', profile);
      return { normal: profile.mode === 'NORMAL', _p: profile };
    });
  }

  // static _hkMatchProfile() // TODO only continue if profile is 1:1

  // static _hkTimingSuggestions() // TODO validate config.profile / running profile with poll time

  // static _hkStatusCheck() {} // TODO status lets us know if a conversion is ready (good for forced state)

  static _hkForce(sensor, config) {

    if(config.profile.mode === 'FORCED') {
      // we expected to force
      if(config.normal) {
        // skip force, either by checkMode suppression or 3rd party chip state update
        return { measure: true };
      }

      const estDelay = sensor.estimateMeasurementWait(config.profile);
      const delayMs = estDelay.totalWaitMs;
      // todo we are setting the full profile here, we should optimize to just a mode switch
      return sensor.setProfile(config.profile)
        .then(() => ({
          measure: true,
          delayMs: delayMs,
          forcedAt: new Date()
        }));
    }

    // we were configure for normal mode
    if(config.normal) {
      // that is normal
      return { measure: true };
    }

    console.log('sleep state', config._p);
    return { measure: false, sleep: true };
  }
}

module.exports = Device;
