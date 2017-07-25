const chipLib = require('./src/chip.js');
const chips = chipLib.chips;

class Misc {
  static mode(chip, mode) {
    if(chip === chips.unknown) { return 'unknown'; }

    if(chip === chips.bmp280) {
      if(chips.bmp280.MODE_SLEEP === mode){ return 'sleep'; }
      if(chips.bmp280.MODE_FORCED === mode){ return 'forced'; }
      if(chips.bmp280.MODE_NORMAL === mode){ return 'normal'; }
    }

    if(chip === chips.bme280) {
      if(chips.bme280.MODE_SLEEP === mode){ return 'sleep'; }
      if(chips.bme280.MODE_FORCED === mode){ return 'forced'; }
      if(chips.bme280.MODE_NORMAL === mode){ return 'normal'; }
    }

    return 'unidentified (' + mode + ')';
  }

  static oversample(chip, oversample) {
    if(chip === chips.unknown) { return 'unknown'; }

    if(chip === chips.bmp280) {
      if(oversample === chips.bmp280.OVERSAMPLE_SKIP){ return 'skip'; }
      if(oversample === chips.bmp280.OVERSAMPLE_X1){ return 'x1'; }
      if(oversample === chips.bmp280.OVERSAMPLE_X2){ return 'x2'; }
      if(oversample === chips.bmp280.OVERSAMPLE_X4){ return 'x4'; }
      if(oversample === chips.bmp280.OVERSAMPLE_X8){ return 'x8'; }
      if(oversample === chips.bmp280.OVERSAMPLE_X16){ return 'x16'; }
    }

    if(chip === chips.bme280) {
      if(oversample === chips.bme280.OVERSAMPLE_SKIP){ return 'skip'; }
      if(oversample === chips.bme280.OVERSAMPLE_X1){ return 'x1'; }
      if(oversample === chips.bme280.OVERSAMPLE_X2){ return 'x2'; }
      if(oversample === chips.bme280.OVERSAMPLE_X4){ return 'x4'; }
      if(oversample === chips.bme280.OVERSAMPLE_X8){ return 'x8'; }
      if(oversample === chips.bme280.OVERSAMPLE_X16){ return 'x16'; }
    }

    return 'unidentified';
  }

  static coefficient(chip, coefficient) {
    if(chip === chips.unknown){ return 'unknown'; }

    if(chip === chips.bmp280) {
      if(coefficient === chips.bmp280.COEFFICIENT_OFF){ return 'Off'; }
      if(coefficient === chips.bmp280.COEFFICIENT_2){ return '2'; }
      if(coefficient === chips.bmp280.COEFFICIENT_4){ return '4'; }
      if(coefficient === chips.bmp280.COEFFICIENT_8){ return '8'; }
      if(coefficient === chips.bmp280.COEFFICIENT_16){ return '16'; }
    }

    if(chip === chips.bme280) {
      if(coefficient === chips.bme280.COEFFICIENT_OFF){ return 'Off'; }
      if(coefficient === chips.bme280.COEFFICIENT_2){ return '2'; }
      if(coefficient === chips.bme280.COEFFICIENT_4){ return '4'; }
      if(coefficient === chips.bme280.COEFFICIENT_8){ return '8'; }
      if(coefficient === chips.bme280.COEFFICIENT_16){ return '16'; }
    }

    return 'unidentified';
  }

  static standby(chip, standby) {
    if(chip === chips.unknown){ return 'unknown'; }

    if(chip === chips.bmp280) {
      if(standby === chips.bmp280.STANDBY_05){ return '0.5 ms'; }
      if(standby === chips.bmp280.STANDBY_62){ return '62.5 ms'; }
      if(standby === chips.bmp280.STANDBY_125){ return '125 ms'; }
      if(standby === chips.bmp280.STANDBY_250){ return '250 ms'; }
      if(standby === chips.bmp280.STANDBY_500){ return '500 ms'; }
      if(standby === chips.bmp280.STANDBY_1000){ return '1000 ms'; }
      if(standby === chips.bmp280.STANDBY_2000){ return '2000 ms'; }
      if(standby === chips.bmp280.STANDBY_4000){ return '4000 ms'; }
    }

    if(chip === chips.bme280) {
      if(standby === chips.bme280.STANDBY_05){ return '0.5 ms'; }
      if(standby === chips.bme280.STANDBY_10){ return '10 ms'; }
      if(standby === chips.bme280.STANDBY_20){ return '20 ms'; }
      if(standby === chips.bme280.STANDBY_62){ return '52.5 ms'; }
      if(standby === chips.bme280.STANDBY_125){ return '125 ms'; }
      if(standby === chips.bme280.STANDBY_250){ return '250 ms'; }
      if(standby === chips.bme280.STANDBY_500){ return '500 ms'; }
      if(standby === chips.bme280.STANDBY_1000){ return '1000 ms'; }
    }

    return 'unidentified:' + standby;
  }
}

module.exports = Misc;
