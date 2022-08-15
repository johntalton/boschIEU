/* eslint-disable promise/no-nesting */
const { i2c } = require('i2c-bus');

const { BoschIEU } = require('../');
const { I2CAddressedBus } = require('@johntalton/and-other-delights/src/i2c');

const profile = {
  mode: 'FORCED',
  oversampling_p: 2,
  oversampling_t: 2,
  oversampling_h: 2,
  filter_coefficient: 7,

  gas: {
    enabled: true,
    setpoints: [
      { temperatureC: 350, durationMs: 2000 }, // high value
      { skip: true }, // skip index when setting profile
      { temperatureC: 150, durationMs: 2000 }, // low value
      { temperatureC: 320, durationMs: 150, active: true } // default
    ]
  },

  spi: { enable3w: false }
};

function force(sensor, idx) {
  console.log();
  console.log('FORCE');
  const p = JSON.parse(JSON.stringify(profile));
  p.oversample_p = 16;
  p.oversample_t = 2;
  p.oversample_h = 1;
  p.filter_coefficient = false;

  p.gas.setpoints = p.gas.setpoints.map((sp, spidx) => {
    sp.active = spidx === idx;
    return sp;
  });
  return sensor.setProfile(p).then(() => new Promise((resolve, reject) => {
    console.log('profile set, sleep');
    setTimeout(resolve, 5000);
  }));
}


i2c.openPromisified(1)
  .then(bus1 => new I2CAddressedBus(bus1, 119))
  .then(addressedBus => BoschIEU.sensor(addressedBus))
  .then(s => {
    return s.id().then(() => s.calibration()).then(cali => {
      console.log(s.chip.name, 'running self-test');

      const h_results = [];
      const l_results = [];
      function high() { return force(s, 0).then(() => s.measurement()).then(r => h_results.push(r)); } // run high temp test
      function low() { return force(s, 2).then(() => s.measurement()).then(r => l_results.push(r)); } // run low temp test

      return Promise.resolve()
      // return force(s, 3).then(() => s.measurement().then(console.log))
        .then(high).then(low) // h1 / l1
        .then(high).then(low) // h2 / l2
        .then(high).then(low) // h3 / l3
        .then(() => {
          console.log('analyze');
          // console.log(h_results, l_results);
          // centroid gas ratio = 2*HT3 / (LT2+LT3) < 0.5
          const ht3 = h_results[2];
          const lt2 = l_results[1];
          const lt3 = l_results[2];

          if(ht3.skip !== undefined && ht3.skip) { throw new Error('ht3 result skipped'); }
          if(lt2.skip !== undefined && lt2.skip) { throw new Error('lt2 result skipped'); }
          if(lt3.skip !== undefined && lt3.skip) { throw new Error('lt3 result skipped'); }

          // console.log(ht3.gas, lt2.gas, lt3.gas);

          if(!ht3.gas.adc.stable || !lt2.gas.adc.stable || !lt3.gas.adc.stable) { throw new Error('unstable'); }

          const cent_res = (lt2.gas.Ohm + lt3.gas.Ohm) / (2 * ht3.gas.Ohm);
          if(cent_res < 2) { throw new Error('centroid no good'); }

          console.log('good to go', cent_res);
        });
    });
  })
  .catch(e => console.log('top level error', e));
