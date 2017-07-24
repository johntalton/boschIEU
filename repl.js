var readline = require('readline');

const boschLib = require('./src/boschIEU.js');
const bosch = boschLib.BoschIEU;
const Converter = boschLib.Converter;

const rasbus = require('rasbus');
const spiImpl = rasbus.spi;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// global sensor object we work with
let sensor;

function prompt() {
  const close = '> ';
  let prompt = close;
  if(sensor != undefined) {
    prompt = sensor.name + close;
    if(sensor.chip !== undefined) {
      prompt = sensor.chip.name + '@' + sensor._name + close;
    }
  }
  rl.question(prompt, commandHandler);
}

function commandHandler(cmd) {
  if(cmd.toLowerCase() === 'id'){
    if(sensor === undefined) { console.log('init bus prior to accessing sensor'); prompt(); return; }
    sensor.id().then(id => {
      console.log('Chip ID: ' + (sensor.valid() ? sensor.chip.name : ' (invalid)'));
      prompt();
    })
    .catch(e => {
      console.log('error', e);
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'version'){
    sensor.version().then(version => {
      console.log('Version: ' + version.toString(16));
      prompt();
    }).catch(e => {
      console.log('error', e);
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'reset'){
    sensor.reset().then(noop => {
      console.log('reset');
      prompt();
    }).catch(e => {
      console.log('error', e);
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'status'){
    sensor.status().then(([measuring, im_update]) => {
      console.log('Measuing: ', measuring, ' Image Update: ', im_update);
      prompt();
    }).catch(e => {
      console.log('error', e);
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'status!') {
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
  else if(cmd.toLowerCase() === 'control'){
    sensor.control().then(([osrs_p, osrs_t, mode]) => {
      console.log('Oversample Temp: ', oLabels[osrs_t], ' Oversample Press: ', oLabels[osrs_p], ' Mode: ', modeLabels[mode]);
      prompt();
    }).catch(e => {
      console.log('error', e);
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'config') {
    sensor.config().then(([t_sb, filter, spi3wire_en]) => {
      console.log('Normal Mode Timing: ', timingLabels[t_sb], ' IIR Filter: ', filterLabels[filter]);
      prompt();
    }).catch(e => {
      console.log('error', e);
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'profile') {
    sensor.profile().then(profile => {
      console.log('Mode: ', modeLabels[profile.mode]);
      console.log('Oversampling Press: ', oLabels[profile.oversampling_p]);
      console.log('Oversampling Temp:  ', oLabels[profile.oversampling_t]);
      console.log('IIR Filter Coefficient: ', filterLabels[profile.filter_coefficient]);
      console.log('Standby Time: ', timingLabels[profile.standby_time]);

      prompt();
    }).catch(e => {
      console.log('error', e);
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'calibration') {
    sensor.calibration().then(data => {
      calibration_data = data;
      const [dig_T1, dig_T2, dig_T3, dig_P1, dig_P2, dig_P3, dig_P4, dig_P5, dig_P6, dig_P7, dig_P8, dig_P9] = data;

      console.log('dig T1', dig_T1);
      console.log('dig T2', dig_T2);
      console.log('dig T3', dig_T3);
      console.log('dig P1', dig_P1);
      console.log('dig P2', dig_P2);
      console.log('dig P3', dig_P3);
      console.log('dig P4', dig_P4);
      console.log('dig P5', dig_P5);
      console.log('dig P6', dig_P6);
      console.log('dig P7', dig_P7);
      console.log('dig P8', dig_P8);
      console.log('dig P9', dig_P9);

      prompt();
    }).catch(e => {
      console.log('error', e);
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'sleep') {
    sensor.setSleepMode().then(noop => {
      console.log('sleep mode');
      prompt();
    }).catch(e => {
      console.log('error', e);
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'normal') {
    sensor.setProfile(bmp280.profiles().MAX_STANDBY).then(noop => {
      console.log('normal mode');
      prompt();
    }).catch(e => {
      console.log('error', e);
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'forced') {
    sensor.force().then(noop => {
      console.log('forced mode');
      prompt();
    }).catch(e => {
      console.log('error', e);
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'press') {
    const [,p1, p2, p3, p4, p5, p6, p7, p8, p9] = calibration_data;
    sensor.pressure(p1, p2, p3, p4, p5, p6, p7, p8, p9).then(press => {
      console.log('Under pressure:', press);
      if(press.skip){

      } else if(press.undef) {

      } else {
        console.log('Pressure (Pa):', press);
      }

      prompt();
    }).catch(e => {
      console.log('error', e);
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'altitude') {
    const seaLevelPa = 1013.25;
    sensor.pressure(...(calibration_data.slice(3))).then(P => {
      const alt = bmp280.altitudeFromPressure(seaLevelPa, P);
      console.log('Altitude: ', alt);
      prompt();
    }).catch(e => {
      console.log('error', e);
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'temp') {
    const [t1, t2, t3, ...rest] = calibration_data;
    sensor.tempature(t1, t2, t3).then(temp => {
      if(temp.skip){
        console.log('Tempature sensing disabled');
      }else if(temp.undef){
        console.log('Tempature calibration unset:', temp.undef);
      }else{
        console.log('Tempature (c): ', trim(temp.cf), trim(temp.ci));
        console.log('          (f): ', trim(ctof(temp.cf)), trim(ctof(temp.ci)));
      }

      prompt();
    }).catch(e => {
      console.log('error', e);
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'exit'){ rl.close(); }


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


  else if(cmd.toLowerCase().startsWith('init')) {
    const [, arg] = cmd.split(' ');
    openDevice(arg);
  }
  else { prompt(); }
}

function openDevice(device) {
  spiImpl.init(device).then(spi => {
    console.log('spi device inited');
    bosch.sensor(device, spi)
      .then(s => {
        sensor = s;
        prompt();
      });
  })
  .catch(e => {
    console.log('error', e);
    sensor = null;
    prompt();
  })
}

prompt();

