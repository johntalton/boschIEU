"use strict";

const fs = require('fs');

const Util = require('./client-util.js');

const defaultProfiles = [
  'profiles.json', './profiles.json', '../profile.json', '../src/profile.json'
];

class Config {
  static config(path) {
    return new Promise((resolve, reject) => {
      fs.readFile(path, (err, data) => {
        if(err){ resolve({}); return; }
        resolve(JSON.parse(data));
      });
    })
    .then(rawConfig => {
      let noProfileDB = false;
      let profiles = rawConfig.profiles;
      if(rawConfig.profiles === undefined) { console.log('using default profiles path'); profiles = defaultProfiles; }
      if(!Array.isArray(profiles)) { profiles = [ profiles ]; }
      if(profiles.length === 0) { console.log('no external profiles listed / specified only'); noProfileDB = true; }

      if(rawConfig.devices === undefined) { throw Error('no devices specified'); }
      let devices = rawConfig.devices.map((rawDevCfg, index) => {
        const name = rawDevCfg.name ? rawDevCfg.name : index;

        const modeCheck = true;
        const sleepOnStreamStop = true;

        if(rawDevCfg.bus === undefined && rawDevCfg.bus.driver === undefined) { throw Error('undefined device bus', name); } 
        let busdriver = rawDevCfg.bus.driver;
        let busid = rawDevCfg.bus.id;

        let profile = rawDevCfg.profile;
        if(rawDevCfg.profile === undefined) { throw Error('missing profile for device', name); }
        if(noProfileDB && (typeof profile === 'string')) { throw Error('no profile db / specified profiles only', name); }

        const rS = rawDevCfg.retryIntervalS ? rawDevCfg.retryIntervalS : 0;
        const rMs = rawDevCfg.retryIntervalMs ? rawDevCfg.retryIntervalMs : 0;
        const retryMs = rS * 1000 + rMs;

        const pS = rawDevCfg.pollIntervalS ? rawDevCfg.pollIntervalS : 0;
        const pMs = rawDevCfg.pollIntervalMs ? rawDevCfg.pollIntervalMs : 0;
        const pollMs = pS * 1000 + pMs;

        return {
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
        profiles: profiles,
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
