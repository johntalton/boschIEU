var readline = require('readline');

const boschLib = require('./src/boschIEU.js');
const bosch = boschLib.BoschIEU;
const Converter = boschLib.Converter;

const chip = require('./src/chip.js');

const Profiles = require('./src/profiles.js');

const rasbus = require('rasbus');
const spiImpl = rasbus.spi;
const i2cImpl = rasbus.i2c;

const Misc = require('./repl-misc.js');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  completer: completer
});

let commands = [
  { name: 'exit', valid: () => true, callback: function(state){ rl.close(); return Promise.resolve(-1); } },
  // { name: 'clear', valid: () => true, callback: function(state) { return Promise.resolve(rl.); } }
  { name: 'clear', valid: () => true, callback: function(state) { console.log('\u001B[2J\u001B[0;0f'); return Promise.resolve();  } }
];

const seaLevelPa = 1013.25;
let state = { seaLevelPa: seaLevelPa, defaultValid: false };

function prompt() {
  const close = '> ';
  let prompt = close;
  if(state.bus != undefined) {
    prompt = state.bus.name + close;
    if(state.sensor !== undefined) {
      prompt = state.bus.name + ':' + state.sensor.chip.name + close;
    }
  }
  rl.question(prompt, commandHandler);
}

function finderFull(cmd, state) {
  return function(item) {
    if(item.name.toLowerCase() === cmd.toLowerCase()) {
      if(item.valid === undefined){ return state.defaultValid; } // default is enabled
      return item.valid(state);
    }
    return false;
  };
}

function finderPartial(partialCmd, state) {
  return function(item) {
    return item.name.toLowerCase().startsWith(partialCmd) &&
      ((item.valid === undefined) ? state.defaultValid : item.valid(state));
  };
}

function completer(line) {
  const partialCmd = line.split(' ')[0];
  const partials = commands.filter(finderPartial(partialCmd, state));

  let suggestions = partials.map(item => item.name);

  const exacts = partials.filter(finderFull(partialCmd, state));
  if(exacts.length > 1){ throw new Error(partialCmd); }
  if(exacts[0]) {
    if(exacts[0].completer) {
      //suggestions.push(...exacts[0].completer(line));
      return [exacts[0].completer(line), line];
    }
  }

  return [suggestions, line];
}

function commandHandler(line) {
  const cmd = line.split(' ')[0];
  let item = commands.find(finderFull(cmd, state)); // todo change to filter and handle multi
  if(item === undefined) {
    const partials = commands.filter(finderPartial(cmd, state));
    if(partials.length === 1) {
      item = partials[0];
    } else {
      item = { callback: (state) => Promise.resolve(state) };
    }
  }

  state.line = line;
  item.callback(state).then(exitcode => {
    if(exitcode === -1){ console.log('end of line.'); return; }
    prompt();
  }).catch(e => {
    console.log('error', e);
    prompt();
  });
}




commands.push({
  name: 'init',
  completer: function(line) {
    const bus = line.split(' ')[1];
    if(bus === undefined || bus.trim() === '') { return ['i2c <id>', 'spi <id>']; }

    const id = line.split(' ')[2];
    if(id === undefined || id.trim() === '') {
      if(bus.trim() === 'i2c'){ return ['0', '1']; }
      if(bus.trim() === 'spi'){ return ['0', '1']; }
      return [''];
    }
    return ['<options>'];
  },
  valid: function(state) {
    return state.sensor === undefined;
  },
  callback: function(state) {
    const bus = state.line.split(' ')[1];
    const id = state.line.split(' ')[2];
    if(id === undefined){
      console.log('specify id for bus')
      return Promise.resolve();
    }

    state.bus = undefined;
    state.sensor = undefined;

    if(bus === 'i2c') {
      return i2cImpl.init(id, 0x77).then(i2c => {
        console.log('i2c device inited');
        state.bus = i2c;
        return bosch.sensor('name', i2c)
          .then(s => {
            console.log('sensor inited');
            state.sensor = s;
          });
      });
    } else if(bus === 'spi') {
      return spiImpl.init(id).then(spi => {
        console.log('spi device inited');
        state.bus = spi;
        return bosch.sensor('name', spi)
          .then(s => {
            state.sensor = s;
        });
      });
    } else {
      console.log('unknown bus.  supported bus types: i2c spi');
      return Promise.resolve();
    }
  }
});

commands.push({
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



commands.push({
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

commands.push({
  name: 'version',
  valid: function(state) {
    return state.sensor !== undefined && state.sensor.valid();
  },
  callback: function(state) {
    return state.sensor.version().then(version => {
      console.log('Version: ' + version.toString(16));
    });
  }
});

commands.push({
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

commands.push({
  name: 'status',
  valid: function(state) {
    return state.sensor !== undefined && state.sensor.valid();
  },
  callback: function(state) {
    return state.sensor.status().then(([measuring, im_update]) => {
      console.log('Measuing: ', measuring, ' Image Update: ', im_update);
    });
  }
});

/*  else if(cmd.toLowerCase() === 'status!') {
    Promise.all(Array(5000).fill().map(() => sensor.status())).then(results => {
      let prevm, prevu;
      results.map(([measuring, im_update]) => {
        if(measuring !== prevm || im_update !== prevu) {
          prevm = measuring;
          prevu = im_update;
          console.log('Measuring: ', measuring, ' Updating: ', im_update);
        }
      });
      prompt();
    }).catch(e => {
      console.log('error', e);
      prompt();
    });
  }
*/

commands.push({
  name: 'controlm',
  valid: function(state) {
    return state.sensor !== undefined && state.sensor.valid();
  },
  callback: function(state) {
    return state.sensor.controlMeasurment().then(([osrs_p, osrs_t, mode]) => {
      console.log('Mode: ', Misc.mode(sensor.chip, mode));
      console.log('Oversample Temp:  ' + Misc.oversample(sensor.chip, osrs_t));
      console.log('Oversample Press: ' + Misc.oversample(sensor.chip, osrs_p));
    });
  }
});

commands.push({
  name: 'controlh',
  valid: function(state) {
    return state.sensor !== undefined && state.sensor.valid();
  },
  callback: function(state) {
    return state.sensor.controlHumidity().then(([osrs_h]) => {
      console.log('Oversample Humi: ' + Misc.oversample(sensor.chip, osrs_h));
    });
  }
});

commands.push({
  name: 'config',
  valid: function(state) {
    return state.sensor !== undefined && state.sensor.valid();
  },
  callback: function(state) {
    return state.sensor.config().then(([t_sb, filter, spi3wire_en]) => {
      console.log('Normal Mode Timing: ', Misc.standby(sensor.chip, t_sb));
      console.log('IIR Filter: ' + Misc.coefficient(sensor.chip, filter));
    });
  }
});

commands.push({
  name: 'profile',
  valid: function(state) {
    return state.sensor !== undefined && state.sensor.valid();
  },
  callback: function(state) {
    return state.sensor.profile().then(profile => {
      // console.log(profile);
      console.log('Mode: ', Misc.mode(state.sensor.chip, profile.mode));
      console.log('Oversampling Press: ', Misc.oversample(state.sensor.chip, profile.oversampling_p));
      console.log('Oversampling Temp:  ', Misc.oversample(state.sensor.chip, profile.oversampling_t));
      console.log('Oversampling Humi:  ', Misc.oversample(state.sensor.chip, profile.oversampling_h));
      console.log('IIR Filter Coefficient: ', Misc.coefficient(state.sensor.chip, profile.filter_coefficient));
      console.log('Standby Time: ', Misc.standby(state.sensor.chip, profile.standby_time));
    });
  }
});

commands.push({
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

commands.push({
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

commands.push({
  name: 'normal',
  valid: function(state) {
    return state.sensor !== undefined && state.sensor.valid();
  },
  callback: function(state) {
    return state.sensor.setProfile(Profiles.chipProfile(Profiles.profile('MAX_STANDBY'), state.sensor.chip)).then(noop => {
      console.log('normal mode');
    });
  }
});

commands.push({
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

commands.push({
  name: 'pressure',
  valid: function(state) {

    return state.sensor !== undefined &&
      state.sensor.valid() &&
      state.sensor.calibrated() &&
      state.sensor.chip.supportsPressure;
  },
  callback: function(state) {
    return state.sensor.pressure().then(press => {
      console.log('Under pressure:', press);
      if(press.skip){

      } else if(press.undef) {

      } else {
        console.log('Pressure (Pa):', press);
      }
    });
  }
});

commands.push({
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
        console.log('Tempature (c): ', Converter.trim(temp.cf), Converter.trim(temp.ci));
        console.log('          (f): ', Converter.trim(Converter.ctof(temp.cf)), Converter.trim(Converter.ctof(temp.ci)));
      }
    });
  }
});

commands.push({
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
      } else {
        console.log('balmy', humi);
      }
    });
  }
});


commands.push({
  name: 'altitude',
  valid: function(state) {
    return state.sensor !== undefined &&
      state.sensor.valid() &&
      state.sensor.calibrated() &&
      state.sensor.chip.supportsPressure;
  },
  callback: function(state) {
    return state.sensor.pressure(...(calibration_data.slice(3))).then(P => {
      const alt = bmp280.altitudeFromPressure(state.seaLevelPa, P);
      console.log('Altitude: ', alt);
    });
  }
});

/*
commands.push({
  name: '',
  valid: function(state) {
    return state.sensor !== undefined && state.sensor.valid();
  },
  callback: function(state) {

  }
});
*/



/*
  else if(cmd.toLowerCase() === 'poll') {
    let count = 0;
    let timer;

    function poll() {
      sensor.measurement(...calibration_data).then(([press, temp]) => {
        const now = new Date();

        count += 1;
        console.log('#' + count +  ' @ ' + now.getHours() + ':' + now.getMinutes());
        if(temp.skip){
          console.log('Tempature Skipped');
        } else if(temp.undef){
          console.log('Tempature calibration unset: ', temp.undef);
        }else {
          console.log('Tempature (c)', trim(temp.cf), trim(temp.ci));
          console.log('          (f)', trim(ctof(temp.cf)), trim(ctof(temp.ci)));
        }

        if(press.skip){
          console.log('Pressue Skipped');
        } else if(press.undef){
          console.log('Pressure calibration unset: ', press.undef);
        }else {
          console.log('Pressure (Pa)', trim(press));
        }

        timer = setTimeout(poll, 1000 * 1);
      }).catch(e => {
        console.log('error', e);
        prompt();
      })
    }

    poll();
    rl.question('', function(){ clearTimeout(timer); console.log('Poll Ended'); prompt(); });
  }
*/

Profiles.load('./src/profiles.json').then(() => {
  prompt();
}).catch(e => {
  console.log('error', e);
});
