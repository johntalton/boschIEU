/* eslint-disable promise/no-nesting */
const i2c = require('i2c-bus');

const Repler = require('repler');

const { I2CAddressedBus } = require('@johntalton/and-other-delights');

const { BoschIEU, Converter } = require('../');

const initstate = { seaLevelPa: Converter.seaLevelPa, defaultValid: false };

const autoDetect = true;

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
      throw new Error('missing busname');
    }

    busname = busname.trim().toLowerCase();
    // anything else

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

    if(busname.toLowerCase() === 'i2c') {
      const busNumber = parseInt(prams.shift(), 10);
      const busAddress = parseInt(prams.shift(), 10);

      return i2c.openPromisified(busNumber)
      .then(bus => new I2CAddressedBus(bus, busAddress))
      .then(bus => {
        console.log('bus inited');
        state.bus = bus;
        return BoschIEU.sensor(bus)
          .then(s => {
            console.log('sensor inited');
            state.sensor = s;

            if(autoDetect) {
              return s.detectChip().then(chip => console.log('detected chip', chip.name));
            }

            return false;
          });
      });
    }
  }
});

Repler.addCommand({
  name: 'features',
  valid: function(state) {
    return state.sensor !== undefined;
  },
  callback: function(state) {
    console.log(state.sensor.chip.features);
  }
});

Repler.addCommand({
  name: 'time',
  valid: function(state) {
    return state.sensor !== undefined && state.sensor.chip.features.time;
  },
  callback: function(state) {
    return state.sensor.sensorTime().then(time => {
      console.log('time >', time);
      return true;
    });
  }
});

Repler.addCommand({
  name: 'close',
  valid: function(state) {
    return state.sensor !== undefined;
  },
  callback: function(state) {
    // state.sensor.close();
    state.bus = undefined;
    state.sensor = undefined;
    return Promise.resolve();
  }
});


Repler.addCommand({
  name: 'detect',
  valid: function(state) {
    return state.sensor !== undefined && !state.sensor.valid();
  },
  callback: function(state) {
    // force the detect but let it cache so that we get a new updated chip if we detected something new
    // if auto detect is enabled this is likely useless :)
    return state.sensor.detectChip(true).then(chip => {
      console.log('Chip:' + (state.sensor.valid() ? state.sensor.chip.name : ' (invalid)'));
      return true;
    });
  }
});

Repler.addCommand({
  name: 'id',
  valid: function(state) {
    return state.sensor !== undefined && state.sensor.valid();
  },
  callback: function(state) {
    return state.sensor.id().then(id => {
      console.log('Chip ID (' + id + '):' + (state.sensor.valid() ? state.sensor.chip.name : ' (invalid)'));
      return true;
    });
  }
});

Repler.addCommand({
  name: 'reset',
  valid: function(state) {
    return state.sensor !== undefined && state.sensor.valid();
  },
  callback: function(state) {
    return state.sensor.reset().then(() => {
      console.log('reset');
      return true;
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
      console.log(ready);
      return true;
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
      console.log(sp);
      return true;
    });
  }
});

Repler.addCommand({
  name: 'get',
  valid: function(state) {
    return state.sensor !== undefined && state.sensor.valid();
  }
});

Repler.addCommand({
  name: 'set',
  valid: function(state) {
    return state.sensor !== undefined && state.sensor.valid();
  },
  callback: function(state) {
    return Promise.reject();
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
      return true;
    });
  }
});

Repler.addCommand({
  name: 'sleep',
  valid: function(state) {
    return state.sensor !== undefined && state.sensor.valid();
  },
  callback: function(state) {
    return state.sensor.sleep().then(() => {
      console.log('sleep mode');
      return true;
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
      standby_time: true,
      standby_prescaler: 256,

      interrupt: {
        mode: 'open-drain',
        latched: false,
        onReady: true,
        onFifoFull: true,
        onFifoWatermark: false
      },

      fifo: {
        active: true,
        temp: true,
        press: true,
        time: true,

        highWatermark: 128,
        data: 'unfiltered',
        subsampling: false,
        stopOnFull: false
      }
    }).then(() => {
      console.log('normal mode');
      return true;
    });
  }
});

Repler.addCommand({
  name: 'forced',
  valid: function(state) {
    return state.sensor !== undefined && state.sensor.valid();
  },
  callback: function(state) {
    return state.sensor.force().then(() => {
      console.log('forced mode');
      return true;
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
      return true;
    });
  }
});

Repler.addCommand({
  name: 'temperature',
  valid: function(state) {
    return state.sensor !== undefined &&
      state.sensor.valid() &&
      state.sensor.calibrated() &&
      state.sensor.chip.features.tempature;
  },
  callback: function(state) {
    return state.sensor.measurement().then(measurement => {
      console.log(measurement);
      return true;
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
      if(humi.skip) {
        console.log('Humidity sensing disabled');
      } else if(humi.undef) {
        console.log('Humidity calibration unset:', humi.undef);
      } else {
        console.log('Humidity  (?): ' + Converter.trim(humi.H));
      }
      return true;
    });
  }
});

// Repler.addCommand({
//   name: 'gas',
//   valid: function(state) { },
//   callback: function(state) { }
// });


// Repler.addCommand({
//   name: 'altitude',
//   valid: function(state) {
//     return state.sensor !== undefined &&
//       state.sensor.valid() &&
//       state.sensor.calibrated() &&
//       state.sensor.chip.supportsPressure;
//   },
//   callback: function(state) {
//     return state.sensor.pressure(...(calibration_data.slice(3))).then(P => {
//       const alt = Converter.altitudeFromPressure(state.seaLevelPa, P);
//       console.log('Altitude (ft): ', alt);
//     });
//   }
// });

Repler.go(initstate);
