"use strict";

const { BoschIEU } = require('../src/boschIEU.js');

const rasbus = require('rasbus');

const profile = {
  mode: 'FORCED',
  oversampling_p: 16,
  oversampling_t: 2,
  oversampling_h: 1,
  filter_coefficient: false,

  standby_time: 20,

  gas: {
    enabled: true,
    setpoints: [
      { tempatureC: 350, durationMs: 2000 }, // high value
      { active: false },
      { tempatureC: 150, durationMs: 2000 }, // low value

      { active: true, tempatureC: 200, durationMs: 100, }
    ]
  },

  spi: { enable3w: false }
};

function test(sensor, idx) {
  const p = JSON.parse(JSON.stringify(profile));
  p.gas.setpoints[idx].active = true;
  console.log('using setpoint', p.gas.setpoints[idx]);
  return sensor.setProfile(p).then(() => {
    console.log('... and measure');
  });
}


rasbus.byname('i2cbus').init(1, 119).then(bus => {
  return BoschIEU.sensor(bus).then(s => {
    return s.id().then(() => s.calibration()).then(cali => {
      console.log(s.chip.name, 'running self-test');

      function high() { return test(s, 0); }
      function low() { return test(s, 2); }

      return high().then(low)
        .then(high).then(low)
        .then(high).then(low);
    });
  });
});


