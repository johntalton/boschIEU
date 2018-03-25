"use strict";

const { BoschIEU } = require('../src/boschIEU.js');

const rasbus = require('rasbus');

const profile = {
  mode: 'NORMAL',
  oversampling_p: 2,
  oversampling_t: 4,
  oversampling_h: 8,
  filter_coefficient: false,

  standby_time: 20,

  spi: { enable3w: false }
};

rasbus.byname('i2c').init(1, 118).then(bus => {
  return BoschIEU.sensor(bus).then(s => {
    return s.id().then(() => s.calibration()).then(cali => {
      console.log(s.chip.name);
      return s.setProfile(profile).then(() => s.profile()).then(p => {
        console.log(p);
      });
    });
  });
});


