/* eslint max-classes-per-file: ["error", 3] */

const { BusUtil, BitUtil, NameValueUtil } = require('@johntalton/and-other-delights');

const { Compensate } = require('./compensate.js');
const { genericChip, genericFifo, enumMap } = require('./generic.js');

const oversamplings = [
  { name: 1, value: 0x0 },
  { name: 2, value: 0x1 },
  { name: 4, value: 0x2 },
  { name: 8, value: 0x3 },
  { name: 16, value: 0x4 },
  { name: 32, value: 0x5 },

  // to support the use of `false` as a indicator
  //   for disabled the measurement, as was used
  //   in the generic chips.
  // returning 0 (no oversampling) when setting
  //   disabled (this can be used as a signature / fingerprint
  //   of our profile code - randomize)
  { name: false, value: 0 }
];

const watchdogtimes = [
  { name: 'SHORT', value: 0 },
  { name: 'LONG', value: 1 },

  { name: false, value: 0 } // just pick one (that is, zero)
];

const prescalers = [
  { name: 1, value: 0x00 },
  { name: 2, value: 0x01 },
  { name: 4, value: 0x02 },
  { name: 8, value: 0x03 },
  { name: 16, value: 0x04 },
  { name: 32, value: 0x05 },
  { name: 64, value: 0x06 },
  { name: 127, value: 0x07 },
  { name: 256, value: 0x08 },
  { name: 512, value: 0x09 },
  { name: 1024, value: 0x0A },
  { name: 2048, value: 0x0B },
  { name: 4096, value: 0x0C },
  { name: 8192, value: 0x0D },
  { name: 16384, value: 0x0E },
  { name: 32768, value: 0x0F },
  { name: 65536, value: 0x10 },
  { name: 131072, value: 0x11 }
];

const dataselects = [
  { name: 'unfiltered', value: 0x00 },
  { name: 'filtered', value: 0x01 }
];

const TEMP_ENABLED = 1;
const TEMP_DISABLED = 0;
const PRESS_ENABLED = 1;
const PRESS_DISABLED = 0;
const WATCHDOG_ENABLED = 1;
const WATCHDOG_DISABLED = 0;
const SPI3 = 1;
// const SPI4 = 0;

// const INTERRUPT = {
const ONREADY_ENABLED = 1;
const ONREADY_DISABLED = 0;
const ONFULL_ENABLED = 1;
const ONFULL_DISABLED = 0;
const ONWATER_ENABLED = 1;
const ONWATER_DISABLED = 0;
const LATCHED = 1;
const NON_LATCHED = 0;
const INT_OPEN_DRAIN = 1;
const INT_PUSH_PULL = 0;
const INT_ACTIVE_HIGH = 1;
const INT_ACTIVE_LOW = 0;
// };

const FIFO = {
  TEMP_ENABLED: 1,
  TEMP_DISABLED: 0,
  PRESS_ENABLED: 1,
  PRESS_DISABLED: 0,
  TIME_ENABLED: 1,
  TIME_DISABLED: 0,
  FULL_STOP_ENABLED: 1,
  FULL_DISABLED: 0,
  ENABLED: 1,
  DISABLED: 0
};

const FIFO_SIZE = 512;
// const MAX_BLOCK_SIZE = 32;
// const BLOCK_LIMIT = MAX_BLOCK_SIZE * Infinity;

/**
 *
 */
class Util {
  static reconstruct9bit(msb, lsb) {
    return msb << 8 | lsb;
  }

  static reconstruct24bit(msb, lsb, xlsb) {
    return (msb << 16) | (lsb << 8) | xlsb;
  }

  static bestFitPrescaler(ms) {
    // const PRESCALER_HZ = 200; // from spec
    // todo
  }

  static interruptMode(mode) {
    const INT_DEFAULT_MODE = { od: INT_PUSH_PULL, level: INT_ACTIVE_HIGH };

    if(mode === undefined || mode === '') { return INT_DEFAULT_MODE; }
    const od = mode.toLowerCase() === 'open-drain' ? INT_OPEN_DRAIN : INT_PUSH_PULL;
    const level = mode.toLowerCase() === 'active-high' ? INT_ACTIVE_HIGH : INT_ACTIVE_LOW;
    return { od, level };
  }

  static modeFrom(opendrain, level) {
    if(opendrain === INT_OPEN_DRAIN) { return 'open-drain'; }
    if(level === INT_ACTIVE_HIGH) { return 'active-high'; }
    if(level === INT_ACTIVE_LOW) { return 'active-low'; }
    throw new Error('unknown mode');
  }
}

/**
 *
 **/
class Bmp3Fifo extends genericFifo {

  static flush(bus) {
    return bus.write(0x7E, 0xB0);
  }

  static read(bus, calibration) {
    return bus.read(0x12, 2)
      .then(buffer => {
        // console.log('fifo counter buffer', buffer);
        const fifo_byte_counter_7_0 = buffer.readUInt8(0);
        const fifo_byte_counter_8 = buffer.readUInt8(1);
        return Util.reconstruct9bit(fifo_byte_counter_8, fifo_byte_counter_7_0);
      })
      .then(fifo_byte_counter => {
        // console.log('fifo buffer byte counter', fifo_byte_counter);
        if(fifo_byte_counter < 0 || fifo_byte_counter > FIFO_SIZE) { throw new Error('fifo counter error'); }

        // first-way:
        // single read using command/size call capped to i2c limit
        // ```
        //   return bus.read(0x14, Math.min(MAX_BLOCK_SIZE, fifo_byte_counter + 4 + 2)).then(returnBuffer => [returnBuffer]);
        // ```
        // second-way
        // using multiple block size reads to emulate continuous read
        // changing block limit to max_block_size * 1 will revert back to the above behavior
        // ```
        // eslint-disable-next-line spellcheck/spell-checker
        //   return Bmp3Fifo._blockRead(bus, Math.min(BLOCK_LIMIT, fifo_byte_counter + 4 + 2));
        // ```
        // third-way
        // by using the `writeSpecial` (write with on parameter is a proxy) and the
        // `readBuffer` no i2c limit is imposed by the underlying library (or driver? / device?)
        const readSize = fifo_byte_counter + 4 + 2;
        // eslint-disable-next-line promise/no-nesting
        return bus.write(0x14).then(() => [bus.readBuffer(readSize)]);
      })
      .then(frameset => Bmp3Fifo.parseFrameSet(frameset))
      .then(msgset => {
        return msgset.reduce((acu, msg) => acu.concat(msg), []);
      })
      .then(msgs => {
        return msgs.map(msg => {
          if(msg.type === 'sensor') {
            return {
              // we do not explode message here as it may not be clean
              type: msg.type,
              ...Compensate.from({ adcP: msg.press, adcT: msg.temp, type: '3xy' }, calibration)
            };
          } else if(msg.type === 'sensor.time') {
            return {
              // we do not explode message here as it may not be clean
              type: msg.type,
              ...Compensate.sensortime(msg.time)
            };
          }

          return msg;
        });
      });
  }

  /*
  static _blockRead(bus, count) {
    // console.log('foo count', count);
    const BLOCK_SIZE = MAX_BLOCK_SIZE;
    const blocks = Math.floor(count / BLOCK_SIZE);
    const remainder = count - (blocks * BLOCK_SIZE);
    //console.log('count => blocks / remainder', count, blocks, remainder);
    const blocksRange = (new Array(blocks)).fill(0);
    return Promise.all(blocksRange.map((b,i) => {
        //console.log('block size read', b, i);
        return bus.read(0x14, BLOCK_SIZE);
      }))
      .then(head => {
        //console.log('read remainder', remainder)
        return bus.read(0x14, remainder)
          .then(tail => head.concat(tail));
      });
  }
  */

  static parseFrameSet(frameset) {
    // console.log('parse frameset', frameset);
    // todo a bug here in returning array of arrays add a layer of reduce call in read method
    return frameset.map(frames => {
      return Bmp3Fifo.parseFrames(frames, { size: 0, total: frames.length });
    });
  }

  static parseFrames(frames, cursor) { return Bmp3Fifo.parseFramesRecursive(frames, cursor); }

  static parseFramesRecursive(frames, cursor = { size: 0, total: 0 }) {
    const [size, frame] = Bmp3Fifo.parseFrame(frames);
    if(size < 0) { console.log('frame under read', size, frame); return []; }

    const updatedCursor = { size: cursor.size + size, total: cursor.total };
    return [frame, ...Bmp3Fifo.parseFramesRecursive(frames.slice(size), updatedCursor)];
  }

  static parseFramesLoop(frames) {
    // console.log('parse frames', frames.length, frames);
    const result = [];

    let [size, frame] = Bmp3Fifo.parseFrame(frames);
    if(size < 0) { console.log('frame under read', size, frame); return result; }

    result.push(frame);

    //let totalb = size;
    let buf = frames;
    while((buf.length - size) > 0) {
      buf = buf.slice(size);
      [size, frame] = Bmp3Fifo.parseFrame(buf);
      if(size < 0) { console.log('frame underread (loop)', size, buf); break; }
      //totalb += size;
      result.push(frame);
    }

    // console.log('totalb', totalb);
    return result;
  }

  static parseFrame(frame) {
    if(frame.length < 1) { return [-1]; }
    const header = frame.readUInt8(0);
    const mode = (header >> 6) & 0b11;
    const param = (header >> 2) & 0b1111;
    const reserv = header & 0b11;
    if(reserv !== 0) { console.log('reserve frame bits not zero'); }

    if(mode === 0b10) {
      return Bmp3Fifo.parseSensorFrame(frame, param);
    } else if(mode === 0b01) {
      return Bmp3Fifo.parseControlFrame(frame, param);
    }

    console.log(header, mode, param, frame);
    throw new Error('unknown frame type');
  }

  static parseControlFrame(frame, param) {
    if(param === 0b0001) { return Bmp3Fifo.parseControlErrorFrame(frame); }
    if(param === 0b0010) { return Bmp3Fifo.parseControlConfigFrame(frame); }
    console.log('unknown control frame type', param);
    throw new Error('unknown control frame type');
  }

  static parseControlErrorFrame(frame) {
    if(frame.length < 2) { return [-2]; }
    const opcode = frame.readUInt8(1);
    return [ 1 + 1, { type: 'control.error', opcode: opcode }];
  }

  static parseControlConfigFrame(frame) {
    if(frame.length < 2) { return [-2]; }
    const data = frame.readUInt8(1);
    return [ 1 + 1, { type: 'control.config', data: data }];
  }

  static parseSensorFrame(frame, param) {
    const s = ((param >> 3) & 0x1) === 1;
    const p = (param & 0x1) === 1;
    const t = ((param >> 2) & 0x1) === 1;

    if(s && (t || p)) { throw new Error('time vs temp/press exclusive frame'); }

    const empty = !s && !t && !p;
    if(empty) {
      // parse empty
      // todo this ignores range check on buffers last byte
      return [ 1 + 1, { type: 'sensor.empty' }]; // todo confirm empty data
    }

    if(s) {
      return Bmp3Fifo.parseSensorTimeFrame(frame);
    }

    return Bmp3Fifo.parseSensorMeasurementFrame(frame, p, t);
  }

  static parseSensorTimeFrame(frame) {
    if(frame.length < 4) { console.log('unexpected time frame'); return [-4]; }

    const xlsb = frame.readUInt8(1);
    const lsb = frame.readUInt8(2);
    const msb = frame.readUInt8(3);
    const time = Util.reconstruct24bit(msb, lsb, xlsb);

    return [ 1 + 3, { type: 'sensor.time', time: time }];
  }

  static parseSensorMeasurementFrame(frame, p, t) {
    let press, temp;
    let offset = 0

    if(t) {
      if(frame.length < 4) { console.log('unexpected measurement frame'); return [-4]; }
      const xlsb = frame.readUInt8(1);
      const lsb = frame.readUInt8(2);
      const msb = frame.readUInt8(3);
      temp = Util.reconstruct24bit(msb, lsb, xlsb);
      offset += 3;
    }

    if(p) {
      if(t && frame.length < 7) { console.log('unexpected pressure '); return [-7]; }
      if(!t && frame.length < 4) { console.log('unexpected pressure '); return [-4]; }
      const xlsb = frame.readUInt8(offset + 1);
      const lsb = frame.readUInt8(offset + 2);
      const msb = frame.readUInt8(offset + 3);
      press = Util.reconstruct24bit(msb, lsb, xlsb);
      offset += 3;
    }

    //
    return [ 1 + offset, {
      type: 'sensor',
      press: press,
      temp: temp
    }];
  }
}

/**
 *
 **/
class bmp388 extends genericChip {
  static get name() { return 'bmp388'; }
  static get chipId() { return 0x50; }

  static get features() {
    return {
      pressure: true,
      tempature: true,
      humidity: false,
      gas: false,
      normalMode: true,
      interrupt: true,
      fifo: true,
      time: true
    };
  }

  // unique to the 388 (aka, @override generic)
  static id(bus) { return BusUtil.readblock(bus, [0x00]).then(buffer => buffer.readInt8(0)); }
  static reset(bus) { return bus.write(0x7E, 0xB6); }

  static get fifo() { return Bmp3Fifo; } // return class / aka scope

  static sensorTime(bus) {
    return BusUtil.readblock(bus, [[0xC0, 4]]).then(buffer => buffer.readInt32LE(0));
  }

  static calibration(bus) {
    return BusUtil.readblock(bus, [[0x31, 21]]).then(buffer => {
      const nvm_par_T1 = buffer.readUInt16LE(0);
      const nvm_par_T2 = buffer.readUInt16LE(2);
      const nvm_par_T3 = buffer.readInt8(4);

      const nvm_par_P1 = buffer.readInt16LE(5);
      const nvm_par_P2 = buffer.readInt16LE(7);
      const nvm_par_P3 = buffer.readInt8(9);
      const nvm_par_P4 = buffer.readInt8(10);
      const nvm_par_P5 = buffer.readUInt16LE(11);
      const nvm_par_P6 = buffer.readUInt16LE(13);
      const nvm_par_P7 = buffer.readInt8(15);
      const nvm_par_P8 = buffer.readInt8(16);
      const nvm_par_P9 = buffer.readInt16LE(17);
      const nvm_par_P10 = buffer.readInt8(19);
      const nvm_par_P11 = buffer.readInt8(20);

      const par_T1 = nvm_par_T1 / Math.pow(2, -8);
      const par_T2 = nvm_par_T2 / Math.pow(2, 30);
      const par_T3 = nvm_par_T3 / Math.pow(2, 48);

      const par_P1 = (nvm_par_P1 - Math.pow(2, 14)) / Math.pow(2, 20);
      const par_P2 = (nvm_par_P2 - Math.pow(2, 14)) / Math.pow(2, 29);
      const par_P3 = nvm_par_P3 / Math.pow(2, 32);
      const par_P4 = nvm_par_P4 / Math.pow(2, 37);
      const par_P5 = nvm_par_P5 / Math.pow(2, -3);
      const par_P6 = nvm_par_P6 / Math.pow(2, 6);
      const par_P7 = nvm_par_P7 / Math.pow(2, 8);
      const par_P8 = nvm_par_P8 / Math.pow(2, 15);
      const par_P9 = nvm_par_P9 / Math.pow(2, 48);
      const par_P10 = nvm_par_P10 / Math.pow(2, 48);
      const par_P11 = nvm_par_P11 / Math.pow(2, 65);

      const T = [par_T1, par_T2, par_T3];
      const P = [par_P1, par_P2, par_P3, par_P4, par_P5, par_P6, par_P7, par_P8, par_P9, par_P10, par_P11];

      return {
        T: T, P: P,
        H: [], G: []
      };
    });
  }

  static profile(bus) {
    return BusUtil.readblock(bus, [[0x15, 11]]).then(buffer => {
      // console.log('profile buffer', buffer);

      const config = buffer.readUInt8(10);
      const odr = buffer.readUInt8(8);
      const osr = buffer.readUInt8(7);
      const pwr_ctrl = buffer.readUInt8(6);
      const if_conf = buffer.readUInt8(5);
      const int_ctrl = buffer.readUInt8(4);
      const fifo_config_2 = buffer.readUInt8(3);
      const fifo_config_1 = buffer.readUInt8(2);
      const fifo_wtm_1 = buffer.readUInt8(1);
      const fifo_wtm_0 = buffer.readUInt8(0);

      //
      const iff_filter = BitUtil.mapbits(config, 3, 3);
      const odr_sel = BitUtil.mapbits(odr, 4, 5);
      const osr_p = BitUtil.mapbits(osr, 2, 3);
      const osr_t = BitUtil.mapbits(osr, 5, 3);
      const mode = BitUtil.mapbits(pwr_ctrl, 5, 2);
      const temp_en = BitUtil.mapbits(pwr_ctrl, 1, 1);
      const press_en = BitUtil.mapbits(pwr_ctrl, 0, 1);
      const i2c_wdt_sel = BitUtil.mapbits(if_conf, 2, 1);
      const i2c_wdt_en = BitUtil.mapbits(if_conf, 1, 1);
      // eslint-disable-next-line no-unused-vars
      const spi3 = BitUtil.mapbits(if_conf, 0, 1);
      const drdy_en = BitUtil.mapbits(int_ctrl, 6, 1);
      const ffull_en = BitUtil.mapbits(int_ctrl, 4, 1);
      const fwtm_en = BitUtil.mapbits(int_ctrl, 3, 1);
      const int_latch = BitUtil.mapbits(int_ctrl, 2, 1);
      const int_level = BitUtil.mapbits(int_ctrl, 1, 1);
      const int_od = BitUtil.mapbits(int_ctrl, 0, 1);
      const data_select = BitUtil.mapbits(fifo_config_2, 4, 2);
      const fifo_subsampling = BitUtil.mapbits(fifo_config_2, 2, 3);
      const fifo_temp_en = BitUtil.mapbits(fifo_config_1, 4, 1);
      const fifo_press_en = BitUtil.mapbits(fifo_config_1, 3, 1);
      const fifo_time_en = BitUtil.mapbits(fifo_config_1, 2, 1);
      const fifo_stop_on_full = BitUtil.mapbits(fifo_config_1, 1, 1);
      const fifo_mode = BitUtil.mapbits(fifo_config_1, 0, 1);
      const fifo_water_mark_8 = BitUtil.mapbits(fifo_wtm_1, 0, 1);
      const fifo_water_mark_7_0 = fifo_wtm_0;

      //
      const fifo_watermark = Util.reconstruct9bit(fifo_water_mark_8, fifo_water_mark_7_0);
      const intMode = Util.modeFrom(int_od, int_level);

      return {
        mode: NameValueUtil.toName(mode, enumMap.modes),
        standby_prescaler: NameValueUtil.toName(odr_sel, prescalers),
        oversampling_p: press_en === PRESS_ENABLED ? NameValueUtil.toName(osr_p, oversamplings) : false,
        oversampling_t: temp_en === TEMP_ENABLED ? NameValueUtil.toName(osr_t, oversamplings) : false,
        filter_coefficient: NameValueUtil.toName(iff_filter, enumMap.filters),

        watchdog: i2c_wdt_en === WATCHDOG_ENABLED ? NameValueUtil.toName(i2c_wdt_sel, watchdogtimes) : false,

        interrupt: {
          mode: intMode,
          latched: int_latch === LATCHED,
          onFifoWatermark: fwtm_en === ONWATER_ENABLED,
          onFifoFull: ffull_en === ONFULL_ENABLED,
          onReady: drdy_en === ONREADY_ENABLED
        },
        fifo: {
          active: fifo_mode === FIFO.ENABLED,
          data: NameValueUtil.toName(data_select, dataselects),
          subsampling: fifo_subsampling,
          highWatermark: fifo_watermark,
          stopOnFull: fifo_stop_on_full === FIFO.FULL_STOP_ENABLED,
          temp: fifo_temp_en === FIFO.TEMP_ENABLED,
          press: fifo_press_en === FIFO.PRESS_ENABLED,
          time: fifo_time_en === FIFO.TIME_ENABLED
        },

        ready: {
          // ready: !measuring,
          // measuring: measuring,
          // updating: updating
        }
      };
    });
  }

  static setProfile(bus, p) {
    const profile = { ...p }; // explode p into our profile so we can add defaults


    const DEFAULT_MODE = 'SLEEP';
    const DEFAULT_FILTER_COEFFICIENT = false;
    const DEFAULT_PRESCALER = 1;
    const DEFAULT_OVERSAMPLING_PRESS = 1; // todo data sheet disagrees
    const DEFAULT_OVERSAMPLING_TEMP = 1;
    const DEFAULT_WATCHDOG = false;
    const DEFAULT_INT_MODE = 'active-high';
    const DEFAULT_LATCHED = false;
    const DEFAULT_ON_FIFO_WM = false;
    const DEFAULT_ON_FIFO_FULL = false;
    const DEFAULT_ON_READY = false;
    const DEFAULT_FIFO_ACTIVE = false;
    const DEFAULT_FIFO_HIGH_WATERMARK = 1;
    const DEFAULT_FIFO_DATA = 'unfiltered';
    const DEFAULT_FIFO_SUBSAMPLING = 0; // todo the data sheet states 2
    const DEFAULT_FIFO_STOP_ON_FULL = true;
    const DEFAULT_FIFO_TEMP = false;
    const DEFAULT_FIFO_PRESS = false;
    const DEFAULT_FIFO_TIME = false;


    if(profile.filter_coefficient === undefined) { profile.filter_coefficient = DEFAULT_FILTER_COEFFICIENT; }
    if(profile.standby_prescaler === undefined) { profile.standby_prescaler = DEFAULT_PRESCALER; }
    if(profile.oversampling_p === undefined) { profile.oversampling_p = DEFAULT_OVERSAMPLING_PRESS; }
    if(profile.oversampling_t === undefined) { profile.oversampling_t = DEFAULT_OVERSAMPLING_TEMP; }
    if(profile.mode === undefined) { profile.mode = DEFAULT_MODE; }
    if(profile.watchdog === undefined) { profile.watchdog = DEFAULT_WATCHDOG; }

    if(profile.interrupt === undefined) { profile.interrupt = {}; }
    if(profile.interrupt.mode === undefined) { profile.interrupt.mode = DEFAULT_INT_MODE; }
    if(profile.interrupt.latched === undefined) { profile.interrupt.latched = DEFAULT_LATCHED; }
    if(profile.interrupt.onFifoWatermark === undefined) { profile.interrupt.onFifoWatermark = DEFAULT_ON_FIFO_WM; }
    if(profile.interrupt.onFifoFull === undefined) { profile.interrupt.onFifoFull = DEFAULT_ON_FIFO_FULL; }
    if(profile.interrupt.onReady === undefined) { profile.interrupt.onReady = DEFAULT_ON_READY; }

    if(profile.fifo === undefined) { profile.fifo = {}; }
    if(profile.fifo.active === undefined) { profile.fifo.active = DEFAULT_FIFO_ACTIVE; }
    if(profile.fifo.highWatermark === undefined) { profile.fifo.highWatermark = DEFAULT_FIFO_HIGH_WATERMARK; }
    if(profile.fifo.data === undefined) { profile.fifo.data = DEFAULT_FIFO_DATA; }
    if(profile.fifo.subsampling === undefined) { profile.fifo.subsampling = DEFAULT_FIFO_SUBSAMPLING; }
    if(profile.fifo.stopOnFull === undefined) { profile.fifo.stopOnFull = DEFAULT_FIFO_STOP_ON_FULL; }
    if(profile.fifo.temp === undefined) { profile.fifo.temp = DEFAULT_FIFO_TEMP; }
    if(profile.fifo.press === undefined) { profile.fifo.press = DEFAULT_FIFO_PRESS; }
    if(profile.fifo.time === undefined) { profile.fifo.time = DEFAULT_FIFO_TIME; }

    // console.log('set profile resolved', profile)

    //
    const intMode = Util.interruptMode(profile.interrupt.mode);

    if(profile.fifo.highWatermark >= Math.pow(2, 9) || profile.fifo.highWatermark < 0) { throw new Error('invalid high watermark'); }
    const fifoWatermark = {
      high: (profile.fifo.highWatermark >> 8) & 0x1,
      low: profile.fifo.highWatermark & 0xFF
    };

    if(profile.fifo.subsampling < 0 || profile.fifo.subsampling >= Math.pow(2, 3)) { throw new Error('invalid sub-sampling range'); }
    // console.log('sub-sampling', profile.fifo.subSampling);

    //
    const iff_filter = NameValueUtil.toValue(profile.filter_coefficient, enumMap.filters_more);
    const odr_sel = NameValueUtil.toValue(profile.standby_prescaler, prescalers);
    const osr_p = NameValueUtil.toValue(profile.oversampling_p, oversamplings);
    const osr_t = NameValueUtil.toValue(profile.oversampling_t, oversamplings);
    const mode = NameValueUtil.toValue(profile.mode.toUpperCase(), enumMap.modes);
    const temp_en = profile.oversampling_t === false ? TEMP_DISABLED : TEMP_ENABLED;
    const press_en = profile.oversampling_p === false ? PRESS_DISABLED : PRESS_ENABLED;

    const i2c_wdt_sel = NameValueUtil.toValue(profile.watchdog, watchdogtimes);
    const i2c_wdt_en = profile.watchdog === false ? WATCHDOG_DISABLED : WATCHDOG_ENABLED;

    const spi3 = SPI3; // todo add support

    const drdy_en = profile.interrupt.onReady ? ONREADY_ENABLED : ONREADY_DISABLED;
    const ffull_en = profile.interrupt.onFifoFull ? ONFULL_ENABLED : ONFULL_DISABLED;
    const fwtm_en = profile.interrupt.onFifoWatermark ? ONWATER_ENABLED : ONWATER_DISABLED;
    const int_latch = profile.interrupt.latched ? LATCHED : NON_LATCHED;
    const int_level = intMode.level;
    const int_od = intMode.od;

    const data_select = NameValueUtil.toValue(profile.fifo.data, dataselects);
    const fifo_subsampling = Number.parseInt(profile.fifo.subsampling, 10);
    const fifo_temp_en = profile.fifo.active && profile.fifo.temp ? FIFO.TEMP_ENABLED : FIFO.TEMP_DISABLED;
    const fifo_press_en = profile.fifo.active && profile.fifo.press ? FIFO.PRESS_ENABLED : FIFO.PRESS_DISABLED;
    const fifo_time_en = profile.fifo.active && profile.fifo.time ? FIFO.TIME_ENABLED : FIFO.TIME_DISABLED;
    const fifo_stop_on_full = profile.fifo.active && profile.fifo.stopOnFull ? FIFO.FULL_STOP_ENABLED : FIFO.FULL_STOP_DISABLED;
    const fifo_mode = profile.fifo.active ? FIFO.ENABLED : FIFO.DISABLED;
    const fifo_water_mark_8 = fifoWatermark.high;
    const fifo_water_mark_7_0 = fifoWatermark.low;

    //
    const config = BitUtil.packbits([[3, 3]], iff_filter);
    const odr = BitUtil.packbits([[4, 5]], odr_sel);
    const osr = BitUtil.packbits([[5, 3], [2, 3]], osr_t, osr_p);
    const pwr_ctrl = BitUtil.packbits([[5, 2], [1], [0]], mode, temp_en, press_en);
    const if_conf = BitUtil.packbits([[2], [1], [0]], i2c_wdt_sel, i2c_wdt_en, spi3);
    const int_ctrl = BitUtil.packbits([[6], [4], [3], [2], [1], [0]], drdy_en, ffull_en, fwtm_en, int_latch, int_level, int_od);
    const fifo_config_2 = BitUtil.packbits([[4, 2], [2, 3]], data_select, fifo_subsampling);
    const fifo_config_1 = BitUtil.packbits([[4], [3], [2], [1], [0]], fifo_temp_en, fifo_press_en, fifo_time_en, fifo_stop_on_full, fifo_mode);
    const fifo_wtm_1 = BitUtil.packbits([[0]], fifo_water_mark_8);
    const fifo_wtm_0 = BitUtil.packbits([[7, 8]], fifo_water_mark_7_0);

    // todo consider using block write
    return bus.write(0x1B, 0)
      .then(() => {
        return Promise.all([
          bus.write(0x15, fifo_wtm_0),
          bus.write(0x16, fifo_wtm_1),
          bus.write(0x17, fifo_config_1),
          bus.write(0x18, fifo_config_2),
          bus.write(0x19, int_ctrl),
          bus.write(0x1A, if_conf),
          // skip power control register here
          bus.write(0x1C, osr),
          bus.write(0x1D, odr),
          // 0, // reserved
          bus.write(0x1F, config)
        ]);
      })
      .then(() => bus.write(0x1B, pwr_ctrl));
  }

  static patchProfile(bus, patch) {
    // diff the json with the existing profile? given?
    // identify the touched registers
    // power mode sleep
    // set register bulk
    // power mode to final state prof + patch
    throw new Error('patch profile not available');
  }

  static measurement(bus, calibration) {
    return BusUtil.readblock(bus, [[0x04, 12]]).then(buffer => {
      const pres_xlsb = buffer.readUInt8(0);
      const pres_lsb = buffer.readUInt8(1);
      const pres_msb = buffer.readUInt8(2);
      const adcP = Util.reconstruct24bit(pres_msb, pres_lsb, pres_xlsb);

      const temp_xlsb = buffer.readUInt8(3);
      const temp_lsb = buffer.readUInt8(4);
      const temp_msb = buffer.readUInt8(5);
      const adcT = Util.reconstruct24bit(temp_msb, temp_lsb, temp_xlsb);

      // const time_7_0 = buffer.readUInt8(8);
      // const time_15_8 = buffer.readUInt8(9);
      // const time_23_16 = buffer.readUInt8(10);
      // const time_31_24 = buffer.readUInt8(11);

      const time = buffer.readUInt32LE(8);
      // const time2 = (time_31_24 << 24) | (time_23_16 << 16) | (time_15_8 << 8) | time_7_0
      // console.log('times', time, time2, buffer.readUInt32LE(8));

      const P = bmp388.skip_value === adcP ? false : adcP;
      const T = bmp388.skip_value === adcT ? false : adcT;

      return Compensate.from({ sensortime: time, adcP: P, adcT: T, adcH: false, type: '3xy' }, calibration);
    });
  }

  static ready(bus) {
    return BusUtil.readblock(bus, [[0x02, 2], [0x10, 2]])
      .then(buffer => {

        const err_reg = buffer.readUInt8(0);
        const status = buffer.readUInt8(1);
        const event = buffer.readUInt8(2);
        const int_status = buffer.readUInt8(3);

        const BIT_SET = 1;

        const conf_err =  BitUtil.mapbits(err_reg, 2, 1) === BIT_SET;
        const cmd_err =  BitUtil.mapbits(err_reg, 1, 1) === BIT_SET;
        const fatal_err =  BitUtil.mapbits(err_reg, 0, 1) === BIT_SET;

        const drdy_temp =  BitUtil.mapbits(status, 6, 1) === BIT_SET;
        const drdy_press =  BitUtil.mapbits(status, 5, 1) === BIT_SET;
        const cmd_rdy =  BitUtil.mapbits(status, 4, 1) === BIT_SET;

        const por_detected = BitUtil.mapbits(event, 0, 1) === BIT_SET;

        const drdy =  BitUtil.mapbits(int_status, 3, 1) === BIT_SET;
        const ffull_int =  BitUtil.mapbits(int_status, 1, 1) === BIT_SET;
        const fwm_int =  BitUtil.mapbits(int_status, 0, 1) === BIT_SET;

        return {
          // ready:

          error: { config: conf_err, command: cmd_err, fatal: fatal_err }, // all false is good
          status: { tempature: drdy_temp, pressure: drdy_press, command: cmd_rdy }, // all true is good
          event: { por_detected }, // false is good,
          interrupt: { data_ready: drdy, fifo_full: ffull_int, fifo_watermark: fwm_int }
        };
      });
  }

  static estimateMeasurementWait(profile) {
    // TODO
    return { totalWaitMs: 0 };
  }
}

module.exports = { bmp388 };
