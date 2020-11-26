/* eslint-disable import/no-nodejs-modules */
/* eslint-disable promise/no-nesting */

const {
  Worker, isMainThread,
  // parentPort,
  MessageChannel
} = require('worker_threads');

if(!isMainThread) { throw new Error('main worker called as child'); }

console.log(process.argv);

const mock = process.argv.includes('--mock');

const devices = [
  { name: '388', busNumber: 1, busAddress: 118 },
  { name: '390', busNumber: 1, busAddress: 119 }
];

const workers = devices.map(device => {
  // create our new worked and pass workerData configuration
  const worker = new Worker('./worker-child.js', { workerData: {
    mock,
    busNumber: device.busNumber,
    busAddress: device.busAddress
  } });
  worker.on('online', () => { console.log('online - worker', device.name); });
  worker.on('error', e => { console.log('error - worker', device.name, e); });

  // create a side-channel for worker communication
  // setup response message handler and pass the port to worker.
  const mc = new MessageChannel();
  mc.port1.on('message', message => { console.log('message', device.name, message); });
  mc.port1.on('close', () => { console.log('close port1', device.name); });
  worker.postMessage({ port: mc.port2 }, [mc.port2]);

  return { worker, port: mc.port1 };
});

// setup primary and secondary signal handlers to cleanly exit worker.
function secondSig(sig) {
  console.log('second signal - for exit');
  process.exit(-1); // eslint-disable-line no-process-exit
}

function firstSig(sig) {
  console.log('first signal - cleanup');

  workers.forEach(({ worker, port }) => {
    // by closing side-channel the worker will cleanup
    port.close();
  });

  // remove this and install final signal handler
  process.removeAllListeners('SIGINT');
  process.on('SIGINT', secondSig);
}

// install signal handler
process.on('SIGINT', firstSig);
