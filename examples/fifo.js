/* eslint-disable promise/no-nesting */
const i2c = require('i2c-bus');

const { I2CAddressedBus } = require('@johntalton/and-other-delights');

const { BoschIEU } = require('../');

const profile = {
  mode: 'NORMAL',
  standby_prescaler: 512,

  interrupt: {
    mode: 'open-drain',
    latched: false,
    onReady: true,
    onFifoFull: true,
    onFifoWatermark: false
  },

  fifo: {
    active: true,
    time: false,
    temp: true,
    press: true,

    highWatermark: 666,
    data: 'filtered',
    subsampling: 666,
    stopOnFull: false
  }
};

i2c.openPromisified(1)
.then(bus => new I2CAddressedBus(bus, 119))
.then(bus => {
  return BoschIEU.sensor(bus).then(s => {
    return s.detectChip()
      .then(() => s.calibration())
      // .then(() => s.setProfile(profile))
      .then(() => {
        console.log(s.chip.name, 'fifo dump');
        return s.fifo.read().then(fifoData => {
          console.log(' => ', fifoData);
          return true;
        });
      });
  });
})
.catch(e => console.log('top level error', e));
