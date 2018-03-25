"use strict";

/**
 * Binding point for bus / chip read and convert methods
 */
class Common {



  // todo
  static setProfile(bus, chip, profile) {
    // console.log(profile);
    const controlM = Converter.ctrlMeasFromSamplingMode(profile.oversampling_p, profile.oversampling_t, profile.mode);
    const controlH = Converter.ctrlHumiFromSampling(profile.oversampling_h);
    const config = Converter.configFromTimingFilter(profile.standby_time, profile.filter_coefficient);

    // console.log(controlM, controlH, config);
    const first = chip.supportsHumidity ? bus.write(chip.REG_CTRL_HUM, controlH) : Promise.resolve();

    return first
      .then(bus.write(chip.REG_CONFIG, config))
      .then(bus.write(chip.REG_CTRL_MEAS, controlM));
  }


}

module.exports = Common;
