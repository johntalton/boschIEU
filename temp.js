var readline = require('readline');
var SPI = require('pi-spi');
var spi = SPI.initialize("/dev/spidev0.1");

const bmp280 = require('./bmp280-spi.js');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ctof(c) {
  return c * (9/5.0) + 32;
}

function trim(f) {
  return Math.round(f * 100) / 100;
}

// global cache (from calibration call)
// must be inited before p/t calls
let calibration_data = [];;

function prompt() {
  rl.question('bmp280@SPI0.0>', commandHandler);
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
  else if(cmd.toLowerCase() === 'control'){
    bmp280.control().then(([osrs_t, osrs_p, mode]) => {
      let modeStr = '<unknown>';
      if(mode === bmp280.MODE_NORMAL){ modeStr = 'Normal';}
      else if(mode === bmp280.MODE_FORCED){ modeStr = 'Forced'; }
      else if(mode === bmp280.MODE_SLEEP){ modeStr = 'Sleep'; }

      console.log('Oversample Temp: ', osrs_t, ' Oversample Press: ', osrs_p, ' Mode: ', modeStr);
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
    bmp280.setMode(bmp280.MODE_SLEEP).then(noop => {
      console.log('sleep mode');
      prompt();
    }).catch(e => {
      console.log('error', e);
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'normal') {
    bmp280.setMode(bmp280.MODE_NORMAL).then(noop => {
      console.log('normal mode');
      prompt();
    }).catch(e => {
      console.log('error', e);
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'config') {
    bmp280.config().then(([t_sb, filter, spi3wire_en]) => {
      console.log('Normal Mode Timing: ', t_sb, ' IIR Filter: ', filter);
      prompt();
    }).catch(e => {
      console.log('error', e);
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'press') {

  }
  else if(cmd.toLowerCase() === 'temp') {
    const [t1, t2, t3, ...rest] = calibration_data;

    bmp280.temp(t1, t2, t3).then(temp => {
      console.log('Tempature (c): ', trim(temp.cf), trim(temp.ci), trim(temp.cg));
      console.log('          (f): ', trim(ctof(temp.cf)), trim(ctof(temp.ci)), trim(ctof(temp.cg)));

      prompt();
    }).catch(e => {
      console.log('error', e);
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'exit'){ rl.close(); }


  else if(cmd.toLowerCase() === 'poll') {
    const [t1, t2, t3, ...rest] = calibration_data;

    let count = 0;
    let timer;

    function poll() {
      bmp280.temp(t1, t2, t3).then(temp => {
        const now = new Date();
        
        count += 1;
        console.log('#' + count +  ' @ ' + now.getHours() + ':' + now.getMinutes());
        console.log('Tempature (c)', trim(temp.cf), trim(temp.ci));
        console.log('          (f)', trim(ctof(temp.cf)), trim(ctof(temp.ci)));

        timer = setTimeout(poll, 1000 * 60 * 1);
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

prompt();


