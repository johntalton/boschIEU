var readline = require('readline');

const bmp280 = require('./bmp280-spi.js');
const spiImpl = require('./spi.js');

let modeLabels = {};
modeLabels[bmp280.MODE_SLEEP] = 'Sleep';
modeLabels[bmp280.MODE_FORCED] = 'Forced';
modeLabels[bmp280.MODE_NORMAL] = 'Normal';
   
let oLabels = {};
oLabels[bmp280.OVERSAMPLE_SKIP] = 'Skip'; 
oLabels[bmp280.OVERSAMPLE_X1] = 'x1'; 
oLabels[bmp280.OVERSAMPLE_X2] = 'x2'; 
oLabels[bmp280.OVERSAMPLE_X4] = 'x4'; 
oLabels[bmp280.OVERSAMPLE_X8] = 'x8'; 
oLabels[bmp280.OVERSAMPLE_X16] = 'x16'; 



let timingLabels = {};
timingLabels[bmp280.STANDBY_05]   = '   0.5 ms';
timingLabels[bmp280.STANDBY_62]   = '  62.5 ms';
timingLabels[bmp280.STANDBY_125]  = ' 125 ms';
timingLabels[bmp280.STANDBY_250]  = ' 250 ms';
timingLabels[bmp280.STANDBY_500]  = ' 500 ms';
timingLabels[bmp280.STANDBY_1000] = '1000 ms';
timingLabels[bmp280.STANDBY_2000] = '2000 ms';
timingLabels[bmp280.STANDBY_4000] = '4000 ms';

let filterLabels = {};
filterLabels[bmp280.COEFFICIENT_OFF] = 'Off';
filterLabels[bmp280.COEFFICIENT_2] = '2';
filterLabels[bmp280.COEFFICIENT_4] = '4';
filterLabels[bmp280.COEFFICIENT_8] = '8';
filterLabels[bmp280.COEFFICIENT_16] = '16';




const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ctof(c) {
  if(c === undefined){ return undefined; }
  return c * (9/5.0) + 32;
}

function trim(f) {
  if(f === undefined){ return undefined; }
  return Math.round(f * 10000) / 10000;
}

// global cache (from calibration call)
// must be inited before p/t calls
let calibration_data = [];;

function prompt() {
  rl.question('bmp280@spi0.1> ', commandHandler);
}

function commandHandler(cmd) {
  if(cmd.toLowerCase() === 'id'){
    bmp280.id().then(id => {
      console.log('Chip ID: ' + id.toString(16) + (id === bmp280.CHIP_ID ? ' (valid)' : ' (invalid)'));
      prompt();
    })
    .catch(e => {
      console.log('error', e);
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'version'){
    bmp280.version().then(version => {
      console.log('Version: ' + version.toString(16));
      prompt();
    }).catch(e => {
      console.log('error', e);
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'reset'){
    bmp280.reset().then(noop => {
      console.log('reset');
      prompt();
    }).catch(e => {
      console.log('error', e);
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'status'){
    bmp280.status().then(([measuring, im_update]) => {
      console.log('Measuing: ', measuring, ' Image Update: ', im_update);
      prompt();
    }).catch(e => {
      console.log('error', e);
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'status!') {
    Promise.all(Array(5000).fill().map(() => bmp280.status())).then(results => {
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
    bmp280.control().then(([osrs_p, osrs_t, mode]) => {
      console.log('Oversample Temp: ', oLabels[osrs_t], ' Oversample Press: ', oLabels[osrs_p], ' Mode: ', modeLabels[mode]);
      prompt();
    }).catch(e => {
      console.log('error', e);
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'config') {
    bmp280.config().then(([t_sb, filter, spi3wire_en]) => {
      console.log('Normal Mode Timing: ', timingLabels[t_sb], ' IIR Filter: ', filterLabels[filter]);
      prompt();
    }).catch(e => {
      console.log('error', e);
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'profile') {
    bmp280.getProfile().then(profile => {
      
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
    bmp280.calibration().then(data => {
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
    bmp280.setSleepMode().then(noop => {
      console.log('sleep mode');
      prompt();
    }).catch(e => {
      console.log('error', e);
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'normal') {
    bmp280.setProfile(bmp280.profiles().MAX_STANDBY).then(noop => {
    //bmp280.setProfile(bmp280.profiles().TEMPATURE_MOSTLY).then(noop => {
    //bmp280.setProfile(bmp280.profiles().TEMPATURE_ONLY).then(noop => {
      console.log('normal mode');
      prompt();
    }).catch(e => {
      console.log('error', e);
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'forced') {
    bmp280.force().then(noop => {
      console.log('forced mode');
      prompt();
    }).catch(e => {
      console.log('error', e);
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'press') {
    const [,p1, p2, p3, p4, p5, p6, p7, p8, p9] = calibration_data;
    bmp280.press(p1, p2, p3, p4, p5, p6, p7, p8, p9).then(press => {
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
    bmp280.press(...(calibration_data.slice(3))).then(P => {
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
    bmp280.temp(t1, t2, t3).then(temp => {
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
      bmp280.measurement(...calibration_data).then(([press, temp]) => {
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

  else { prompt(); }
}

spiImpl.init('/dev/spidev0.1').then(spi => {
  console.log('spi device inited', spi);
  bmp280.spi = spi;
  prompt();
});


