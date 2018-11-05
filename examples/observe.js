
// const { Observable } = require('rxjs');
//const { filter } = require('rxjs/operators');

const Observable = require('zen-observable');

const { Gpio } = require('onoff');

const { BoschIEU, Converter } = require('../');
const { Rasbus } = require('@johntalton/rasbus');

function log(measurement) {
  const C = measurement.tempature.C;
  const F = Converter.ctof(C);
  const Pa = measurement.pressure.Pa;
  const inHg = Converter.pressurePaToInHg(Pa);
  const altFt = Converter.altitudeFromPressure(Converter.seaLevelPa, Pa);
  const altM = Converter.ftToMeter(altFt);

  console.log('Tempature', Converter.trim(C), 'C');
  console.log('         ', Converter.trim(F), 'F');
  console.log('Pressure', Converter.trim(Pa), 'Pa');
  console.log('        ', Converter.trim(inHg), 'inHg');
  console.log('Altitude', Converter.trim(altFt), 'Ft');
  console.log('        ', Converter.trim(altM), 'M');
  console.log();
}


// glob to produce force exit on ctrl-c if natural cleanup fails
let cleaned = false;

// we assume a low number gpio (4) with pull-up resistor and open-drain profile
const interrupt = new Gpio(4, 'in', 'rising', { activeLow: true });

function observeGpio(gpio) {
  return new Observable(observer => {
    const first = gpio.readSync();
    observer.next(first); // todo should reflect gpio settings

    gpio.watch((err, value) => {
      console.log('gpio watch', err, value);
      if(err) { observer.error(err); }
      observer.next(value)
    });

    return () => {
      console.log('unwatch gpio');
      gpio.unwatch();
    };
  });
}


function observeFifo(fifo) {
  return new Observable(observer => {
    const gpioCancle = observeGpio(interrupt)
      .subscribe(
        msg => {
          console.log('read the fifo');
          /* await */ fifo.read().then(fifoData => {
            //console.log('data read', fifoData);
            fifoData.forEach(frame => {
              observer.next(frame);
            });
          });

        },
        err => { observer.error(err) },
        () => { console.log('gpio closed'); observer.complete(); });


    return () => { gpioCancle.unsubscribe(); };
  });
}


Rasbus.i2c.init(1, 119).then(bus => {
  return BoschIEU.sensor(bus).then(s => {
    return s.detectChip()
      .then(() => s.calibration())
      .then(() => s.setProfile({
        mode: 'NORMAL',
        standby_prescaler: 127,
        interrupt: {
          mode: 'open-drain',
          latched: false,
          onReady: false,
          onFifoFull: true,
          onFifoWatermark: false
        },
        fifo: {
          active: true,
          time: true,
          temp: true,
          press: true
        }
      }))
      .then(() => observeFifo(s.fifo))
      .then(observer => observer
//        .map(msg => msg)
//        .pipe(filter(msg => msg.name !== undefined))
        .filter(msg => msg.type !== undefined)
        .filter(msg => msg.type === 'sensor')
        .subscribe(
          //msg => console.log('sensor measurement', msg.tempature.C, msg.pressure.Pa),
          msg => log(msg),
          err => {},
          () => console.log('closed')));
  });
})
.then(cancelable => process.on('SIGINT', () => {
  console.log('clean up');

  cancelable.unsubscribe();

  if(cleaned) { process.exit(); }
  cleaned = true;
}))
.catch(e => console.log('top level error', e));

