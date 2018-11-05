const { BoschIEU } = require('../');
const { Rasbus } = require('@johntalton/rasbus');

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

Rasbus.i2c.init(1, 119).then(bus => {
  return BoschIEU.sensor(bus).then(s => {
    return s.detectChip()
      .then(() => s.calibration())
      //.then(() => s.setProfile(profile))
      .then(() => {
        console.log(s.chip.name, 'fifo dump');
        return s.fifo.read().then(fifoData => {
          console.log(' => ', fifoData)
        });
      });
  });
})
.catch(e => console.log('top level error', e));


