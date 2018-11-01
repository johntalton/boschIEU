const { BoschIEU } = require('../');
const { Rasbus } = require('@johntalton/rasbus');

const profile = {
  mode: 'NORMAL',
  standby_prescaler: 512,

  interrupt: {
    mode: 'open-drain',
    latched: true,
    onReady: false,
    onFifoFull: true
  },

  fifo: {
    active: true,
    time: true,
    temp: true,
    press: true
  }
};

Rasbus.i2c.init(1, 119).then(bus => {
  return BoschIEU.sensor(bus).then(s => {
    return s.id()
      .then(() => s.calibration())
      // .then(() => s.setProfile(profile))
      .then(() => {
        console.log(s.chip.name, 'fifo dump');
        return s.fifoRead().then(fifoData => {
          console.log(' => ', fifoData)
        });
      });
  });
})
.catch(e => console.log('top level error', e));


