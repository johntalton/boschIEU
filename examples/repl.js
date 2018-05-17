"use strict";

const Repler = require('repler');

const boschLib = require('../src/boschIEU.js');
const bosch = boschLib.BoschIEU;
const Converter = boschLib.Converter;

const rasbus = require('rasbus');

const initstate = { seaLevelPa: Converter.seaLevelPa, defaultValid: false };


Repler.addPrompt(state => {
  const close = '> ';
  let prompt = close;
  if(state.bus !== undefined) {
    prompt = state.bus.name + close;
    if(state.sensor !== undefined) {
      prompt = state.bus.name + ':' + state.sensor.chip.name + close;
    }
  }
  return prompt;
});

Repler.addCommand({
  name: 'init',
  completer: function(line) {
    let params = line.split(' ');
    const cmd = params.shift();
    let busname = params.shift();

    if(busname === undefined || busname.trim() === '') {
      return rasbus.names();
    }

    busname = busname.trim().toLowerCase();

    const matches = rasbus.names().filter(name => name.startsWith(busname));
    if(params.length <= 0) { return matches; }

    if(params[0] === '') {
      if(rasbus.names('i2c').includes(busname)) { return  ['0', '1']; }
      if(rasbus.names('spi').includes(busname)) { return ['0', '1']; }
      return ['?'];
    }

    return [''];
  },
  valid: function(state) {
    return state.sensor === undefined;
  },
  callback: function(state) {
    let prams = state.line.split(' ');
    const cmd = prams.shift();
    const busname = prams.shift();

    state.bus = undefined;
    state.sensor = undefined;

    let impl;
    try {
      impl = rasbus.byname(busname.toLowerCase());
    } catch(e) {
     console.log('unknonw busname', busname);
     return Promise.resolve();
    }

    prams = prams.map(foo => parseInt(foo));
    return impl.init(...prams).then(bus => {
      console.log('bus inited');
      state.bus = bus;
      return bosch.sensor(bus)
        .then(s => {
          console.log('sensor inited');
          state.sensor = s;
        });
    });
  }
});

Repler.addCommand({
  name: 'features',
  valid: function(state) {
    return state.sensor !== undefined
  },
  callback: function(state) {
    console.log(state.sensor.chip.features);
  }
});

Repler.addCommand({
  name: 'close',
  valid: function(state) {
    return state.sensor !== undefined
  },
  callback: function(state) {
    // state.sensor.close();
    state.bus = undefined;
    state.sensor = undefined;
    return Promise.resolve();
  }
});


Repler.addCommand({
  name: 'id',
  valid: function(state) {
    return state.sensor !== undefined && !state.sensor.valid();
  },
  callback: function (state) {
    return state.sensor.id().then(id => {
      console.log('Chip ID (' + id + '):'  + (state.sensor.valid() ? state.sensor.chip.name : ' (invalid)'));
    });
  }
});

Repler.addCommand({
  name: 'reset',
  valid: function(state) {
    return state.sensor !== undefined && state.sensor.valid();
  },
  callback: function(state) {
    return state.sensor.reset().then(noop => {
      console.log('reset');
    });
  }
});

Repler.addCommand({
  name: 'ready',
  valid: function(state) {
    return (state.sensor !== undefined) && state.sensor.valid();
  },
  callback: function(state) {
    return state.sensor.ready().then(ready => {
      console.log('Ready:', ready.ready);
      console.log('Measuing: ', ready.measuring, ' Image Update: ', ready.updating);
    });
  }
});

Repler.addCommand({
  name: 'profile',
  valid: function(state) {
    return state.sensor !== undefined && state.sensor.valid();
  },
  callback: function(state) {
    return state.sensor.profile().then(profile => {
      const sp = profile.gas !== undefined ? profile.gas.setpoints : [];
      console.log(profile);
      console.log(sp)
    });
  }
});

Repler.addCommand({
  name: 'calibration',
  valid: function(state) {
    return state.sensor !== undefined && state.sensor.valid() && !state.sensor.calibrated();
  },
  callback: function(state) {
    return state.sensor.calibration().then(data => {
      console.log('digP', state.sensor._p9);
      console.log('digT', state.sensor._t3);
      console.log('digH', state.sensor._h6);
    });
  }
});

Repler.addCommand({
  name: 'sleep',
  valid: function(state) {
    return state.sensor !== undefined && state.sensor.valid();
  },
  callback: function(state) {
    return state.sensor.sleep().then(noop => {
      console.log('sleep mode');
    });
  }
});

Repler.addCommand({
  name: 'normal',
  valid: function(state) {
    if(state.sensor === undefined) { return false; }
    if(!state.sensor.valid()) { return false; }
    return state.sensor.chip.features.normalMode;
  },
  callback: function(state) {
    console.log('setting profile to normal');
    return state.sensor.setProfile({
        mode: 'NORMAL',
        oversampling_p: 1,
        oversampling_t: 2,
        oversampling_h: 1,
        filter_coefficient: 2,
        standby_time: true
      }).then(noop => {
        console.log('normal mode');
    });
  }
});

Repler.addCommand({
  name: 'forced',
  valid: function(state) {
    return state.sensor !== undefined && state.sensor.valid();
  },
  callback: function(state) {
    return state.sensor.force().then(noop => {
      console.log('forced mode');
   });
  }
});

Repler.addCommand({
  name: 'pressure',
  valid: function(state) {

    return state.sensor !== undefined &&
      state.sensor.valid() &&
      state.sensor.calibrated() &&
      state.sensor.chip.supportsPressure;
  },
  callback: function(state) {
    return state.sensor.pressure().then(press => {
      if(press.skip){
        console.log('Pressure sensing disabled');
      } else if(press.undef) {
        console.log('Pressure calibration unsed:', press.undef);
      } else {
        console.log('Pressure   (Pa):', Converter.trim(press.P));
        console.log('Pressure (inHg):', Converter.trim(Converter.pressurePaToInHg(press.P)));
        console.log('Altitude   (ft):', Converter.trim(Converter.altitudeFromPressure(state.seaLevelPa, press.P)));
      }
    });
  }
});

Repler.addCommand({
  name: 'tempature',
  valid: function(state) {
    return state.sensor !== undefined &&
      state.sensor.valid() &&
      state.sensor.calibrated() &&
      state.sensor.chip.supportsTempature;
  },
  callback: function(state) {
    return state.sensor.tempature().then(temp => {
      if(temp.skip){
        console.log('Tempature sensing disabled');
      }else if(temp.undef){
        console.log('Tempature calibration unset:', temp.undef);
      }else{
        console.log('Tempature (c): ', Converter.trim(temp.T));
        console.log('          (f): ', Converter.trim(Converter.ctof(temp.T)));
      }
    });
  }
});

Repler.addCommand({
  name: 'humidity',
  valid: function(state) {
    return state.sensor !== undefined &&
      state.sensor.valid() &&
      state.sensor.calibrated() &&
      state.sensor.chip.supportsHumidity;
  },
  callback: function(state) {
    return state.sensor.humidity().then(humi => {
      if(humi.skip){
        console.log('Humidity sensing disabled');
      } else if(humi.undef) {
        console.log('Humidity calibration unset:', humi.undef);
      } else {
        console.log('Humidity  (?): ' + Converter.trim(humi.H));
      }
    });
  }
});

Repler.addCommand({
  name: 'gas',
  valid: function(state) {},
  callback: function(state) {}
});


Repler.addCommand({
  name: 'altitude',
  valid: function(state) {
    return state.sensor !== undefined &&
      state.sensor.valid() &&
      state.sensor.calibrated() &&
      state.sensor.chip.supportsPressure;
  },
  callback: function(state) {
    return state.sensor.pressure(...(calibration_data.slice(3))).then(P => {
      const alt = Converter.altitudeFromPressure(state.seaLevelPa, P);
      console.log('Altitude (ft): ', alt);
    });
  }
});



Repler.go(initstate);
