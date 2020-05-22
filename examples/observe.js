/* eslint-disable promise/no-nesting */
// const { Observable } = require('rxjs');
//const { filter } = require('rxjs/operators');

const Observable = require('zen-observable');

const i2c = require('i2c-bus');
const { Gpio } = require('onoff');

const { I2CAddressedBus } = require('@johntalton/and-other-delights');

const { BoschIEU, Converter } = require('../');

const seaLevelPa = 100700; // Converter.seaLevelPa

let cachedSensorTime = undefined;
function processFrame(frame) {
  if(frame.type === 'sensor.time') {
    cachedSensorTime = frame.sensortime;
  }

  log({ lastSensorTime: cachedSensorTime, ...frame });
}

function log(frame) {
  if(frame.type === 'sensor.time') {
    // console.log('sensor time', frame.sensortime);
    return;
  }
  if(frame.type !== 'sensor') { console.log(frame); return; }

  const measurement = frame;

  const { C } = measurement.temperature;
  const F = Converter.ctof(C);
  const { Pa } = measurement.pressure;
  const inHg = Converter.pressurePaToInHg(Pa);
  const altFt = Converter.altitudeFromPressure(seaLevelPa, Pa);
  const altM = Converter.ftToMeter(altFt);

  if(frame.lastSensorTime !== undefined) {
    console.log('Sensor Time', frame.lastSensorTime);
  }
  console.log('Temperature', Converter.trim(C), 'C');
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
      console.log('unexport gpio');
      gpio.unexport();
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
            // console.log('data read', fifoData);
            fifoData.forEach(frame => {
              observer.next(frame);
            });

            return true;
          })
          .catch(e => { console.log('catching fifo read error', e); observer.error(e); });

        },
        err => { observer.error(err); },
        () => { console.log('gpio closed'); observer.complete(); });


    return () => { gpioCancle.unsubscribe(); };
  });
}

i2c.openPromisified(1)
.then(bus => new I2CAddressedBus(bus, 119))
.then(bus => {
  return BoschIEU.sensor(bus).then(s => {
    return s.detectChip()
      // .then(() => s.reset())
      .then(() => s.calibration())
      .then(() => s.fifo.flush())
      // .then(() => s.profile()).then(p => console.log(p))
      .then(() => s.setProfile({ mode: 'SLEEP' }))
      .then(() => s.setProfile({
        mode: 'NORMAL',
        oversampling_t: 8,
        standby_prescaler: 32,
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

          subsampling: 1,
          highWatermark: 42
        }
      }))
      .then(() => {
        console.log('sensor up. start observers')
        const interruptStream = observeGpio(interrupt);
        const fifoStream = observeFifo(s.fifo, interruptStream);

        return [
          fifoStream.subscribe(
            frame => processFrame(frame),
            err => {},
            () => console.log('closed'))
        ];
      });
  });
})
.then(cancelables => process.on('SIGINT', () => {
  console.log('clean up');

  cancelables.forEach(cancelable => cancelable.unsubscribe());

  // eslint-disable-next-line no-process-exit
  if(cleaned) { process.exit(); }
  cleaned = true;
}))
.catch(e => console.log('top level error', e));
