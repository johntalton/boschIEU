
// const { Observable } = require('rxjs');
//const { filter } = require('rxjs/operators');

const Observable = require('zen-observable');

const { Gpio } = require('onoff');

const { BoschIEU, Converter } = require('../');
const { Rasbus } = require('@johntalton/rasbus');

const seaLevelPa = 100700; // Converter.seaLevelPa

function log(frame) {

  if(frame.type !== 'sensor') { console.log(frame); return; }

  const measurement = frame;

  const C = measurement.tempature.C;
  const F = Converter.ctof(C);
  const Pa = measurement.pressure.Pa;
  const inHg = Converter.pressurePaToInHg(Pa);
  const altFt = Converter.altitudeFromPressure(seaLevelPa, Pa);
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
    console.log('setup gpio watch');
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


function observeFifo(fifo, triggerStream) {
  return new Observable(observer => {
    const gpioCancle = triggerStream
      .subscribe(
        msg => {
          console.log('read the fifo');
          /* await */ fifo.read().then(fifoData => {
            //console.log('data read', fifoData);
            fifoData.forEach(frame => {
              observer.next(frame);
            });
          })
          .catch(e => { console.log('catching fifo read error', e); });

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
        oversampling_t: 8,
        standby_prescaler: 127,
        interrupt: {
          mode: 'open-drain',
          latched: false,
          onReady: false,
          onFifoFull: false,
          onFifoWatermark: true
        },
        fifo: {
          // data: 'filtered',
          active: true,
          time: true,
          temp: true,
          press: true,

          subsampling: 2,
          highWatermark: 42
        }
      }))
      .then(() => {
        const interruptStream = observeGpio(interrupt);
        const fifoStream = observeFifo(s.fifo, interruptStream);

        return [
          fifoStream.subscribe(
            frame => log(frame),
            err => {},
            () => console.log('closed'))
          ];
      });
  });
})
.then(cancelables => process.on('SIGINT', () => {
  console.log('clean up');

  cancelables.forEach(cancelable => cancelable.unsubscribe());

  if(cleaned) { process.exit(); }
  cleaned = true;
}))
.catch(e => console.log('top level error', e));

