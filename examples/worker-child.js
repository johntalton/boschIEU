/* eslint-disable import/no-nodejs-modules */
/* eslint-disable promise/no-nesting */
import {
  // Worker, MessageChannel,
  isMainThread, parentPort,
  workerData
} from 'worker_threads'

import { FivdiBusProvider } from './fivdi-bus.js'

import { I2CAddressedBus, I2CMockBus } from '@johntalton/and-other-delights'
import { BoschIEU } from '@johntalton/boschieu'

// const { deviceDef_bmp388 } = require('./deviceDefs.js');

if(isMainThread) { throw new Error('worker child called as main'); }

//console.log(workerData);
const provider = workerData.mock ? I2CMockBus : FivdiBusProvider;

//I2CMockBus.addDevice(workerData.busNumber, workerData.busAddress, deviceDef_bmp388);

const i2cX = await provider.openPromisified(workerData.busNumber)
const abus = I2CAddressedBus.from(i2cX, workerData.busAddress)

const sensor = await BoschIEU.detect(abus)
console.log('detected', sensor.chip.name)

await sensor.calibration()
await sensor.fifo.flush()

await sensor.setProfile({ mode: 'SLEEP' })
await sensor.setProfile({
   mode: 'NORMAL',
   oversampling_t: 8,
   standby_prescaler: 2,
   fifo: {
     active: true,
     data: 'unfiltered',
     time: true,
     temp: false,
     press: false,

     subsampling: 1
   }
 })

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
      await sensor.measurement().then(result => { port2.postMessage(result); })
      if(!run) { await bus.close(); }
    }
    console.log('after run while');
  })

  // after setting up the side-channel we un-reference from the
  // parent port. This allows clean shutdown of calling worker
  parentPort.unref();
 })
