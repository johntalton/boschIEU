

class NodeSPIImpl {
  static init(device) {
    return new Promise((resolve, reject) => {
      const SPI = require('spi');
      new SPI.Spi(device,
        { 'mode': SPI.MODE['MODE_0'] }, 
        s => {
          s.open();

          const foo = new NodeSPIImpl();
          foo.spi = s;
          resolve(foo);
        });
    });
  }

  read(cmd, length){
    if(length === undefined){ length = 1; }
    return new Promise((resolve, reject) => {
      const wbuf = Buffer.from([cmd, ...(new Array(length).fill(0))]);
      const rbuf = Buffer.alloc(length + 1);
      this.spi.transfer(wbuf, rbuf, (device, buf) => {
        //const temp = Buffer.alloc(1);
        //buf.copy(temp, 0, 1);
        //console.log('the end ', buf, temp);
        //resolve(temp);
        resolve(buf);
      });
    });
  }

  write(cmd, buffer){
    return new Promise((resolve, reject) => { 
      const wbuf = Buffer.from([cmd, buffer]);
      this.spi.write(wbuf, buf => {
        resolve(buf);
      });
    });
  }
}



class PiSPIImpl {
  static init(device) {
    const SPI = require('pi-spi');
    const spi = SPI.initialize(device);
    const foo = new PiSPIImpl();
    foo.spi = spi;
    return Promise.resolve(foo);
  }

  read(cmd, length) {
    if(length === undefined){ length = 1; }
    return new Promise((resolve, reject) => {
      const txBuf = new Buffer([cmd]);
      this.spi.transfer(txBuf, length + 1, function(e, buffer){
        if(e){ reject(e); }
        resolve(buffer);
      });
    });
  }

  write(cmd, buffer) {
    return new Promise((resolve, reject) => {
      const txBuf = new Buffer([cmd, buffer]);
      this.spi.write(txBuf, function(e, buffer){
        if(e){ reject(e); }
        resolve(buffer);
      });
    });
  }
}



module.exports = PiSPIImpl; // NodeSPIImpl;
