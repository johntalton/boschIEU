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

// create our new worked and pass workerData configuration
const worker = new Worker('./worker-child.js', { workerData: { mock } });
worker.on('online', () => { console.log('online - worker'); });

// create a side-channel for worker communication
// setup response message handler and pass the port to worker.
const mc = new MessageChannel();
mc.port1.on('message', message => { console.log('message', message); });
mc.port1.on('close', () => { console.log('close port1'); });
worker.postMessage({ port: mc.port2 }, [mc.port2]);

// setup primary and secondary signal handlers to cleanly exit worker.
function secondSig(sig) {
  console.log('second signal - for exit');
  process.exit(-1); // eslint-disable-line no-process-exit
}

function firstSig(sig) {
  console.log('first signal - cleanup');

  // by closing side-channel the worker will cleanup
  mc.port1.close();

  // remove this and install final signal handler
  process.removeAllListeners('SIGINT');
  process.on('SIGINT', secondSig);
}

// install signal handler
process.on('SIGINT', firstSig);
