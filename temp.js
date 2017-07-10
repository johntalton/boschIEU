var readline = require('readline');
var SPI = require('pi-spi');
var spi = SPI.initialize("/dev/spidev0.1");

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

const WRITE_MASK = value => value & ~0x80;

const CHIP_ID = 0x58;
const RESET_MAGIC = 0xB6;

const MODE_SLEEP =  0b00;
const MODE_FORCED = 0b01; // 0x10 alt
const MODE_NORMAL = 0b11;

const REG_CALIBRATION = 0x88;
const REG_ID =          0xD0;
const REG_VERSION =     0xD1;
const REG_RESET =       0xE0;
const REG_STATUS =      0xF3;
const REG_CTRL   =      0xF4;
const REG_CONFIG =      0xF5;
const REG_PRESS =       0xF7;
const REG_TEMP =        0xFA;

const bmp280 = {
  init: function() {
    spi.clockSpeed(500000);
    // spi.dataMode(SPI.mode.CPHA /*| SPI.mode.CPOL */);
    spi.bitOrder(SPI.order.MSB_FIRST);
    
    console.log("Clock: " + spi.clockSpeed());
    console.log("Mode:  " + spi.dataMode());
    console.log("Order: " + spi.bitOrder()); 
  },
  _read: function(cmd, length) {
    if(length == undefined){ length = 1; }
    // console.log('length: ' + length);
    return new Promise(function(resolve, reject) {
      const txBuf = new Buffer([cmd]);
      spi.transfer(txBuf, length + 1, function(e, buffer){
        if(e){ reject(e); }
        resolve(buffer);
      });
    });
  },
  _write: function(reg, ...buff) {
    return new Promise(function(resolve, reject){
      const txBuf = new Buffer([WRITE_MASK(reg), ...buff]);
      spi.write(txBuf, function(e, buffer){
        if(e){ reject(e); }
        resolve(buffer);
      });
    });
  },
  calibration: function() {
    return this._read(REG_CALIBRATION, 24).then(buffer => {
      const dig_T1 = buffer.readUInt16LE(1);
      const dig_T2 = buffer.readInt16LE(3);
      const dig_T3 = buffer.readInt16LE(5);

      const dig_P1 = buffer.readUInt16LE(7);
      const dig_P2 = buffer.readInt16LE(9);
      const dig_P3 = buffer.readInt16LE(11);
      const dig_P4 = buffer.readInt16LE(13);
      const dig_P5 = buffer.readInt16LE(15);
      const dig_P6 = buffer.readInt16LE(17);
      const dig_P7 = buffer.readInt16LE(19);
      const dig_P8 = buffer.readInt16LE(21);
      const dig_P9 = buffer.readInt16LE(23);

      return [
        dig_T1, dig_T2, dig_T3, 
        dig_P1, dig_P2, dig_P3, dig_P4, dig_P5, dig_P6, dig_P7, dig_P8, dig_P9];
    });
  },
  id: function() {
    return this._read(REG_ID).then(buffer => {
      return buffer.readInt8(1);
    });
  },
  version: function() {
    return this._read(REG_VERSION).then(buffer => {
      return buffer.readUInt8(1);
    });
  },
  reset: function(){
    return this._write(REG_RESET, RESET_MAGIC);
  },
  status: function() {
    return this._read(REG_STATUS).then(buffer => {
      const tmp = buffer.readUInt8(1);
      const measuring = tmp & 0x04 === 0x04;
      const im_update = tmp & 0x01 === 0x01;
      return [measuring, im_update];
    });
  },
  control: function() {
    return this._read(REG_CTRL).then(buffer => {
      const tmp = buffer.readUInt8(1);
      const osrs_t = tmp;
      const osrs_p = tmp;
      const mode = tmp & 0x03;
      return [osrs_t, osrs_p, mode];
    });
  },
  config: function() {
    return this._read(REG_CONFIG).then(buffer => {
      const tmp = buffer.readUInt8(1);
      const t_sb = tmp;
      const filter = tmp;
      const spi3w_en = tmp;
      return [t_sb, filter, spi3w_en];
    });
  },
  _burstMeasurment: function() {
    return this._read(REG_PRESS, 6).then(buffer => {
      //console.log('burst', buffer);
      const press_msb = buffer.readUInt8(1);
      const press_lsb = buffer.readUInt8(2);
      const press_xlsb = buffer.readUInt8(3);

      const adc_P = press_msb << 12 | press_lsb << 4 | press_xlsb;

      const msb = buffer.readUInt8(4);
      const lsb = buffer.readUInt8(5);
      const xlsb = buffer.readUInt8(6);

      const adc_T = msb << 12 | lsb << 4 | xlsb;

      //console.log(msb.toString(16), lsb.toString(16), xlsb.toString(16), adc_T.toString(16));

      return [adc_P, adc_T];      
    });
  },
  press: function() {
    return this._burstMeasurment().then(([P, T]) => {
      return P;
    });
  },
  _atemp: function() {
    return this._burstMeasurment().then(([P, T]) => T);
  },
  temp: function(dig_T1, dig_T2, dig_T3) {
    return this._atemp().then(T => {
 
      //dig_T1 = 27504;
      //dig_T2 = 26435;
      //dig_T3 = -1000;
      //T = 519888;
      //console.log(T);

      const var1f = (T/16384.0 - dig_T1/1024.0) * dig_T2;
      const var2f = (T/131072.0 - dig_T1/8192.0) * (T/131072.0 - dig_T1/8192.0) * dig_T3;
      const finef = var1f + var2f;
      const cf = finef / 5120.0;
      
      const var1i = ((T >> 3) - (dig_T1 << 1)) * (dig_T2 >> 11);
      const var2i = ( (( ((T >> 4) - dig_T1) * ((T >> 4) - dig_T1) ) >> 12) * dig_T3 ) >> 14;
      const finei = var1i + var2i;
      const ci = ((finei * 5 + 128) >> 8) / 100;

      // https://github.com/gradymorgan/node-BMP280/blob/master/BMP280.js
      const var1g = (((T >> 3) - (dig_T1 << 1)) * dig_T2) >> 11;
      const var2g = (((((T >> 4) - (dig_T1)) * ((T >> 4) - (dig_T1))) >> 12) * (dig_T3)) >> 14;
      const fineg = var1g + var2g;
      const cg = ((fineg * 5 + 128) >> 8) / 100.0;

      //console.log(var1f, var2f, finef, cf);
      //console.log(var1i, var2i, finei, ci);

      return { cf: cf, ci: ci, cg: cg };
    });
  },
  setMode: function(mode) {
    const osrs_t = 0b001;
    const osrs_p = 0b001;
    const value = (osrs_t << 5) | (osrs_p << 2) | mode;
    // tempconsole.log('value', value, value.toString(16));
    return this._write(REG_CTRL, value);
  }
};

function prompt() {
  rl.question('bmp280@SPI0.0>', commandHandler);
}

function commandHandler(cmd) {
  if(cmd.toLowerCase() === 'id'){
    bmp280.id().then(id => {
      console.log('Chip ID: ' + id.toString(16) + (id === CHIP_ID ? ' (valid)' : ' (invalid)'));
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
      if(mode === MODE_NORMAL){ modeStr = 'Normal';}
      else if(mode === MODE_FORCED){ modeStr = 'Forced'; }
      else if(mode === MODE_SLEEP){ modeStr = 'Sleep'; }

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
    bmp280.setMode(MODE_SLEEP).then(noop => {
      console.log('sleep mode');
      prompt();
    }).catch(e => {
      console.log('error', e);
      prompt();
    });
  }
  else if(cmd.toLowerCase() === 'normal') {
    bmp280.setMode(MODE_NORMAL).then(noop => {
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


