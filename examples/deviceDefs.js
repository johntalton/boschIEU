/* eslint-disable spellcheck/spell-checker */

const deviceDef_bmp388 = {
  commandMask: 0xFF,

  profile: {
    powerOn: { ref: 'PON' },
    threshold: {
      low: { int16bit: ['AILTH', 'AILTL'] },
      high: { int16bit: ['AIHTH', 'AIHTL'] }
    }
  },

  data: {},

  register: {
    0x00: {
      name: 'CHIP_ID',
      data: 0x50,
      readOnly: true
    },
    // 0x01 reserved
    0x02: { name: 'ERR_REG', properties: {
      'conf_err': { bit: 2 },
      'cmd_err': { bit: 1 },
      'fatal_er': { bit: 0 }
    }, readOnly: true },
    0x03: { name: 'STATUS', properties: {
      'drdy_temp': { bit: 6 },
      'drdy_press': { bit: 5 },
      'cmd_rdy': { bit: 4 }
    }, readOnly: true },
    0x04: { name: 'DATA_0', properties: {
      'press_7_0': { bits: [0, 7] }
    }, readOnly: true },
    0x05: { name: 'DATA_1', properties: {
      'press_15_8': { bits: [0, 7] }
    }, readOnly: true },
    0x06: { name: 'DATA_2', readOnly: true, data: 0x80 },
    0x07: { name: 'DATA_3', readOnly: true },
    0x08: { name: 'DATA_4', readOnly: true },
    0x09: { name: 'DATA_5', readOnly: true, data: 0x80 },
    // 0x0A reserved
    // 0x0B reserved
    0x0C: { name: 'SENSORTIME_0', readOnly: true },
    0x0D: { name: 'SENSORTIME_1', readOnly: true },
    0x0E: { name: 'SENSORTIME_2', readOnly: true },
    0x0F: { name: 'SENSORTIME_3', readOnly: true },
    0x10: { name: 'EVENT', properties: {
      'por_detected': { bit: 0 }
    }, data: 0x01 },
    0x11: { name: 'INT_STATUS', properties: {
      'drdy': { bit: 3 },
      'ffull_int': { bit: 1 },
      'fwm_int': { bit: 0 }
    }, readOnly: true },
    0x12: { name: 'FIFO_LENGHT_0', properties: {
      'fifo_byte_counter_7_0': { bits: [0, 7] }
    }, readOnly: true },
    0x13: { name: 'FIFO_LENGTH_1', properties: {
      'fifo_byte_counter_8': { bit: 0 }
    }, readOnly: true },
    0x14: { name: 'FIFO_DATA', properties: {
      'fifo_data': { bits: [0, 7] }
    }, readOnly: true, data: 0xFF },
    0x15: { name: 'FIFO_WTM_O', properties: {
      'fifo_water_mark_7_0': { bits: [0, 7] }
    }, data: 0x01 },
    0x16: { name: 'FIFO_WTM_1', properties: {
      'fifo_water_mark _8': { bit: 0 }
    } },
    0x17: { name: 'FIFO_CONFIG_1', properties: {
      'fifo_temp_en': { bit: 4 },
      'fifo_press_en': { bit: 3 },
      'fifo_time_en': { bit: 2 },
      'fifo_stop_on_full': { bit: 1 },
      'fifo_mode': { bit: 0 }
    }, data: 0x02 },
    0x18: { name: 'FIFO_CONFIG_2', properties: {
      'data_select': { bits: [3, 4] },
      'fifo_subsampling': { bits: [0, 2] }
    }, data: 0x02 },
    0x19: { name: 'INT_CTRL', properties: {
      'drdy_en': { bit: 6 },
      'ffull_en': { bit: 4 },
      'fwtm_en': { bit: 3 },
      'int_latch': { bit: 2 },
      'int_level': { bit: 1 },
      'int_od': { bit: 0 }
    }, data: 0x02 },
    0x1A: { name: 'IF_CONF', properties: {
      'i2c_wdt_sel': { bit: 2 },
      'i2c_wdt_en': { bit: 1 },
      'spi3': { bit: 0 }
    } },
    0x1B: { name: 'PWR_CTRL', properties: {
      'mode': { bits: [4, 5] },
      'temp_en': { bit: 1 },
      'press_en': { bit: 0 }
    } },
    0x1C: { name: 'OSR', properties: {
      'osr_t': { bits: [0, 2] },
      'osr_p': { bits: [3, 5] }
    }, data: 0x02 },
    0x1D: { name: 'ODR', properties: {
      'odr_sel': { bits: [0, 4] }
    } },
    // 0x1E reserved
    0x1F: { name: 'CONFIG', properties: {
      'iir_filter': { bits: [1, 3] }
    } },
    // 0x20 - 0x7D reserved
    0x31: { readOnly: true },
    0x32: { readOnly: true },
    0x33: { readOnly: true },
    0x34: { readOnly: true },
    0x35: { readOnly: true },
    0x36: { readOnly: true },
    0x37: { readOnly: true },
    0x38: { readOnly: true },
    0x39: { readOnly: true },
    0x3A: { readOnly: true },
    0x3B: { readOnly: true },
    0x3C: { readOnly: true },
    0x3D: { readOnly: true },
    0x3E: { readOnly: true },
    0x3F: { readOnly: true },
    0x40: { readOnly: true },
    0x41: { readOnly: true },
    0x42: { readOnly: true },
    0x43: { readOnly: true },
    0x44: { readOnly: true },
    0x45: { readOnly: true },
    //
    0x7E: { name: 'CND', properties: {
      'cmd': { bits: [0, 7] }
    } }
  }
};

module.exports = { deviceDef_bmp388 };
