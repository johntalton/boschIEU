/* eslint-disable import/no-nodejs-modules */
/* eslint-disable promise/no-nesting */
const {
  // Worker, MessageChannel,
  isMainThread, parentPort,
  workerData
} = require('worker_threads');

const { FivdiBusProvider } = require('./fivdi-bus.js');

const { I2CAddressedBus, I2CMockBus } = require('@johntalton/and-other-delights');
const { BoschIEU } = require('../');

const { deviceDef_bmp388 } = require('./deviceDefs.js');

if(isMainThread) { throw new Error('worker child called as main'); }

//console.log(workerData);
const provider = workerData.mock ? I2CMockBus : FivdiBusProvider;

I2CMockBus.addDevice(workerData.busNumber, workerData.busAddress, deviceDef_bmp388);

provider.openPromisified(workerData.busNumber)
  .then(i2c1 => new I2CAddressedBus(i2c1, workerData.busAddress))
  .then(bus => {
    return BoschIEU.sensor(bus).then(s => {
      //console.log(s);
      return s.detectChip()
        // .then(() => s.reset())
        //.then(() => console.log('hello world'))
        .then(() => s.calibration())
        .then(() => s.fifo.flush())
        // .then(() => s.profile()).then(p => console.log(p))
        .then(() => s.setProfile({ mode: 'SLEEP' }))
        .then(() => s.setProfile({
          mode: 'NORMAL',
          oversampling_t: 8,
          standby_prescaler: 2,
          fifo: {
            active: true,
            time: true,
            temp: false,
            press: false,

            subsampling: 1
          }
        }))
        .then(() => {
          //
          console.log('chip up... ');
          let run = true;

          // parentPort.on('online', () => { console.log('online - parentPort');});
          // parentPort.on('error', (err) => { console.log('error', err);});
          // parentPort.on('exit', (code) => { console.log('code', code); });

          parentPort.on('message', message => {
            // console.log('message - parentPort', message);

            const port2 = message.port;
            // port2.on('online', () => { console.log('online - side port'); });
            port2.on('message', msg => { console.log('message - port2', msg); });
            port2.on('error', err => { console.log('error', err); });
            port2.on('exit', code => { console.log('exit', code); });
            port2.on('close', () => { console.log('close port2'); run = false; });

            console.log('side channel connected... measurement poll');
            setImmediate(async () => {
              // eslint-disable-next-line fp/no-loops
              while(run) {
                await s.measurement().then(result => { port2.postMessage(result); })
                if(!run) { await bus.close(); }
              }
              console.log('after run while');
            });
            // after setting up the side-channel we un-reference from the
            // parent port. This allows clean shutdown of calling worker
            parentPort.unref();
          });

          return true;
        });
    });
  })
  .catch(e => console.error('top level error', workerData.name, e));
