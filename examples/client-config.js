"use strict";

const fs = require('fs');

const { Converter } = require('../src/boschIEU.js');
const Util = require('./client-util.js');

const defaultProfiles = [
  'profiles.json', './profiles.json', '../profile.json', '../src/profile.json'
];

class Config {
  static _getMs(cfg, name, defaultMs) {
    const s = cfg[name + 'S'];
    const ms = cfg[name + 'Ms'];

    if(s === undefined && ms === undefined) { return defaultMs; }

    const s_z = s !== undefined ? s : 0;
    const ms_z = ms !== undefined ? ms : 0;

    return s_z * 1000 + ms_z;
  }

  static config(path) {
    return new Promise((resolve, reject) => {
      fs.readFile(path, (err, data) => {
        if(err){ resolve({}); return; }
        resolve(JSON.parse(data));
      });
    })
    .then(rawConfig => {
      if(rawConfig.devices === undefined) { throw Error('no devices specified'); }
      let devices = rawConfig.devices.map((rawDevCfg, index) => {
        const name = rawDevCfg.name ? rawDevCfg.name : index;

        const sign = rawDevCfg.sign !== undefined ? rawDevCfg.sign : 'md5';

        const modeCheck = true;
        const sleepOnStreamStop = true;

        if(rawDevCfg.bus === undefined && rawDevCfg.bus.driver === undefined) { throw Error('undefined device bus', name); } 
        let busdriver = rawDevCfg.bus.driver;
        let busid = rawDevCfg.bus.id;

        let profile = rawDevCfg.profile;
        if(rawDevCfg.profile === undefined) { throw Error('missing profile for device: ' + name); }
        profile.mode = profile.mode.toUpperCase();
        profile.spi = { enable3w: false };
        if(profile.mode === 'SLEEP') {
          console.log(' ** mode SLEEP, will poll but not measure (good for use with repl');
        }
        if(profile.gas !== undefined) {
          profile.gas.setpoints = profile.gas.setpoints.map(sp => {
            const ms = Config._getMs(sp, 'duration', 0);
            const f = sp.tempatureF !== undefined ? Converter.ftoc(sp.tempatureF) : 0;
            const c = sp.tempatureC !== undefined ? sp.tempatureC : f;
            const active = sp.active;
            return { tempatureC: c, durationMs: ms, active: active };
          });
        }

        const retryMs = Config._getMs(rawDevCfg, 'retryInterval', 30 * 1000);

        const pollMs = Config._getMs(rawDevCfg, 'pollInterval', 17 * 1000);
        //const pS = rawDevCfg.pollIntervalS ? rawDevCfg.pollIntervalS : 0;
        //const pMs = rawDevCfg.pollIntervalMs ? rawDevCfg.pollIntervalMs : 0;
        //const pollMs = pS * 1000 + pMs;


        return {
          name: name,
          sign: sign,
          bus: {
            driver: busdriver,
            id: busid
          },

          profile: profile,

          pollIntervalMs: pollMs,
          retryIntervalMs: retryMs,

          modeCheck: modeCheck,
          sleepOnStreamStop: sleepOnStreamStop
        };
      });

      let mqttReMs = 10 * 1000;
      if(rawConfig.mqtt) {
        const S = rawConfig.mqtt.reconnectS ? rawConfig.mqtt.reconnectS : 0;
        const Ms = rawConfig.mqtt.reconnectMs ? rawConfig.mqtt.reconnectMs : 0;
        mqttReMs = S * 1000 + Ms;
      }

      return {
        machine: Util.machine(),
        devices: devices,
        mqtt: {
          url: (rawConfig.mqtt && rawConfig.mqtt.url) ? rawConfig.mqtt.url : process.env.mqtturl,
          reconnectMs: mqttReMs
        }
      };
    });
  }
}

module.exports = Config;
