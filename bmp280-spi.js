var SPI = require('pi-spi');
var spi = SPI.initialize("/dev/spidev0.1");

const bmp280 = {
  CHIP_ID:0x58,
  RESET_MAGIC: 0xB6,

  MODE_SLEEP: 0b00,
  MODE_FORCED: 0b01, // 0x10 alt
  MODE_NORMAL: 0b11,

  REG_CALIBRATION: 0x88,
  REG_ID:          0xD0,
  REG_VERSION:     0xD1,
  REG_RESET:       0xE0,
  REG_STATUS:      0xF3,
  REG_CTRL:        0xF4,
  REG_CONFIG:      0xF5,
  REG_PRESS:       0xF7,
  REG_TEMP:        0xFA,

  _writeMask: function(value){ return value & ~0x80; },
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
    return new Promise((resolve, reject) => {
      const txBuf = new Buffer([this._writeMask(reg), ...buff]);
      spi.write(txBuf, function(e, buffer){
        if(e){ reject(e); }
        resolve(buffer);
      });
    });
  },
  calibration: function() {
    return this._read(this.REG_CALIBRATION, 24).then(buffer => {
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
    return this._read(this.REG_ID).then(buffer => {
      return buffer.readInt8(1);
    });
  },
  version: function() {
    return this._read(this.REG_VERSION).then(buffer => {
      return buffer.readUInt8(1);
    });
  },
  reset: function(){
    return this._write(this.REG_RESET, this.RESET_MAGIC);
  },
  status: function() {
    return this._read(this.REG_STATUS).then(buffer => {
      const tmp = buffer.readUInt8(1);
      const measuring = tmp & 0x04 === 0x04;
      const im_update = tmp & 0x01 === 0x01;
      return [measuring, im_update];
    });
  },
  control: function() {
    return this._read(this.REG_CTRL).then(buffer => {
      const tmp = buffer.readUInt8(1);
      const osrs_t = tmp;
      const osrs_p = tmp;
      const mode = tmp & 0x03;
      return [osrs_t, osrs_p, mode];
    });
  },
  config: function() {
    return this._read(this.REG_CONFIG).then(buffer => {
      const tmp = buffer.readUInt8(1);
      const t_sb = tmp;
      const filter = tmp;
      const spi3w_en = tmp;
      return [t_sb, filter, spi3w_en];
    });
  },
  _burstMeasurment: function() {
    return this._read(this.REG_PRESS, 6).then(buffer => {
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
  press: function(dig_P1, dig_P2, dig_P3, dig_P4, dig_P5, dig_P6, dig_P7, dig_P8, dig_P9) {
    return this._burstMeasurment().then(([P, T]) => {
      const var1 = T / 2.0 - 64000.0;

      if(var1 == 0){ return 0; }

      const var2 = var1 * var1 * dig_P6 / 32768.0;
      const var3 = var2 + var1 * dig_P5 * 2.0;
      const var4 = (var3 / 4.0) + (dig_P4 * 65536.0);
      
      const var5 = (dig_P3 * var1 * var1 / 524288.0 + dig_P2) / 524288.0;
      const var6 = (1.0 + var1 / 32768.0) * dig_P1;

      const p1 = 1048576.0 - P;
      const p2 = (p1 - (var4 / 4096.0)) * 6250.0 / var6;
      const p3 = dig_P9 * p2 * p2 / 2147483648.0;
      const p4 = p2 * dig_P8 / 32768.0;
      const p5 = p2 + (p3 + p4 + dig_P7) / 16.0;

      //console.log(dig_P9, p2 * p2);
      console.log(var1, var2, var3, var4, var5, p1, p2, p3, p4, p5, p5/256.0);

      return p5 / 256.0;
    });
  },
  altitude: function(seaLevelPa){
    return this.press().then(P => {
      return 44330 * (1.0 * Math.pow(P / 100 / seaLevelPa, 0.1903));
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
    return this._write(this.REG_CTRL, value);
  }
};


module.exports = bmp280;
