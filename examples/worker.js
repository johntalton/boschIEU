/* eslint-disable import/no-nodejs-modules */
/* eslint-disable promise/no-nesting */

const {
  Worker, isMainThread, parentPort,
  MessageChannel
} = require('worker_threads');


if(!isMainThread) { throw new Error('main worker called as child');  }

console.log(process.argv);

const mock = process.argv.includes('--mock');


// __filename
const worker = new Worker('./worker-child.js', { workerData: { mock } });
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

