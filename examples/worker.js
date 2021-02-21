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
  { name: 'p388', busNumber: 1, busAddress: 118 },
  { name: 'e280', busNumber: 1, busAddress: 119 }
];

const workers = devices.map(device => {
  // create our new worked and pass workerData configuration
  const workerData = {
    name: device.name,
    mock,
    busNumber: device.busNumber,
    busAddress: device.busAddress
  };

  const worker = new Worker(__dirname + '/worker-child.js', { workerData });
  worker.on('online', () => { console.log('online - worker', device.name); });
  worker.on('error', e => { console.log('error - worker', device.name, e); });

  // create a side-channel for worker communication
  // setup response message handler and pass the port to worker.
  const mc = new MessageChannel();
  worker.postMessage({ port: mc.port2 }, [mc.port2]);

  return { workerData, worker, port: mc.port1 };
});

workers.forEach(({ workerData, port }) => {
  port.on('message', message => { console.log('message', workerData.name, message); });
  port.on('close', () => { console.log('close port1', workerData.name); });
});

// setup primary and secondary signal handlers to cleanly exit worker.
function secondSig(sig) {
  console.log('second signal - for exit');
  process.exit(-1); // eslint-disable-line no-process-exit
}

function firstSig(sig) {
  console.log('first signal - cleanup');

  workers.forEach(({ port }) => {
    // by closing side-channel the worker will cleanup
    port.close();
  });

  // remove this and install final signal handler
  process.removeAllListeners('SIGINT');
  process.on('SIGINT', secondSig);
}

// install signal handler
process.on('SIGINT', firstSig);
