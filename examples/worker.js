/* eslint-disable import/no-nodejs-modules */
/* eslint-disable promise/no-nesting */

const {
  Worker, isMainThread, parentPort,
  MessageChannel
} = require('worker_threads');


if(isMainThread) {
  const worker = new Worker(__filename, {
    workerData: { }
  });
  worker.on('online', () => { console.log('online - worker'); });

  const mc = new MessageChannel();
  // mc.port1.on('online', () => { });
  mc.port1.on('message', message => { console.log('message', message); });
  // mc.port1.on('error', () => { });
  // mc.port1.on('exit', () => { });
  mc.port1.on('close', () => { console.log('close port1'); });
  worker.postMessage({ port: mc.port2 }, [mc.port2]);
  // mc.port1.postMessage({ hello: 'hello'});

  let first = true;
  process.on('SIGINT', sig => {
    console.log('signal', sig);

    mc.port1.close();

    // eslint-disable-next-line no-process-exit
    if(!first) { process.exit(-1); }

    console.log('first interrupt');
    first = false;
  });
} else {
  const i2c = require('i2c-bus');
  const { I2CAddressedBus } = require('@johntalton/and-other-delights');
  const { BoschIEU } = require('../');

  const address = 119;
  i2c.openPromisified(1)
  .then(i2c1 => new I2CAddressedBus(i2c1, address))
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

          //await bus.close()

          //parentPort.on('online', () => { console.log('online - parentPort');});
          //parentPort.on('error', (err) => { console.log('error', err);});
          //parentPort.on('exit', (code) => { console.log('code', code); });

          parentPort.on('message', message => {
            //console.log('message - parentPort', message);

            const port2 = message.port;
            //port2.on('online', () => { console.log('online - side port'); });
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
            parentPort.unref();
            // parentPort.close()
            // parentPort.removeAllListeners(['message', 'error']);
          });

          return true;
        });
    });
  })
  .catch(e => console.log('top level error', e));
}
