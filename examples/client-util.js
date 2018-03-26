"use strict";

const { Converter } = require('../src/boschIEU.js');

class Util {
  static bulkup(chip, raw) {
    const P = raw.pressure;
    const T = raw.tempature;
    const H = raw.humidity;

    const result = {};

    if(chip.features.pressure) {
      if(P.skip !== undefined && P.skip) {
        result.pressure = { skip: true };
      } else {
        const inHg = Converter.pressurePaToInHg(P.Pa);
        const altFt = Converter.altitudeFromPressure(Converter.seaLevelPa, P.Pa);
        const altM = Converter.ftToMeter(altFt);

        result.pressure = { Pa: P.Pa, inHg: inHg };
        result.altitude = { Ft: altFt, M: altM };
      }
    }

    if(chip.features.tempature) {
      if(T.skip !== undefined && T.skip) {
        result.tempature = { skip: true };
      } else {
        const f = Converter.ctof(T.C);
        result.tempature = { C: T.C, F: f };
      }
    }

    if(chip.features.humidity) {
      if(H.skip !== undefined && H.skip) {
        result.humidity = { skip: true };
      } else {
        result.humidity = { percent: H.percent };
      }
    }

    return result;
  }


  static log(device, result) {
    const P = result.pressure;
    const T = result.tempature;
    const H = result.humidity;
    const A = result.altitude;

    console.log('"' + device.name + '" (' + device.sensor.chip.name + ' @ ' + device.bus.name + '):');
    if(device.signature !== undefined) {
      console.log('\tsignature:', (device.signature !== null) ? device.signature : '(disabled)' );
    }

    if(device.sensor.chip.features.pressure){
      if(P.skip) {
        console.log('\tPreassure: skipped');
      } else {
        console.log('\tPressure (Pa):', Converter.trim(P.Pa), '(inHg):', Converter.trim(P.inHg));
        console.log('\tAltitude','(ft):', Converter.trim(A.Ft), '(m): ', Converter.trim(A.M));
      }
    }
    if(device.sensor.chip.features.tempature){
      if(T.skip) {
        console.log('\tTempature: skipped');
      } else {
        console.log('\tTempature: (c)', Converter.trim(T.C), '(F)', Converter.trim(T.F));
      }
    }
    if(device.sensor.chip.features.humidity){
      if(H.skip) {
        console.log('\tHumidity: skipped');
      } else {
        console.log('\tHumidity:', Converter.trim(H.percent), '%');
      }
    }
    console.log();
  }

  static machine() {
    return {
      state: '1init',
      states: {
        '1init': {
          'some': { next: '2some', event: '' },
          'mqtt': { next: '5mqtt', event: '' },
          'dmqtt': { next: '1init', event: '' } }, // we know, thanks
        '2some': {
          'none': { next: '1init', event: '' },
          'some': { next: '2some', event: '' },
          'dsome': { next: '2some', event: '' },
          'all': { next: '3all', event: '' },
          'mqtt': { next: '6mqttsome', event: 'stream' },
          'dmqtt': { next: '2some', event: '' } }, // we know, thanks
        '3all': {
          'mqtt': { next: '4active', event: 'stream' },
          'dsome': { next: '2some', event: '' },
          'dmqtt': { next: '3all', event: '' } }, // we know, thanks
        '4active': { // streaming state
          'dsome': { next: '6mqttsome', event: 'restopstream' },
          'dmqtt': { next: '3all', event: 'stopstream' } },
        '5mqtt': {
          'some': { next: '6mqttsome', event: 'stream' },
          'dmqtt': { next: '1init', event: '' } },
        '6mqttsome': { // streaming state
          'none': { next: '5mqtt', event: 'stopstream' },
          'some': { next: '6mqttsome', event: 'restream' },
          'dsome': { next: '6mqttsome', event: 'restopstream' },
          'all': { next: '4active', event: 'restream' },
          'dmqtt': { next: '2some', event: 'stopstream' } }
      }
    };
  }
}

class State {
  static to(machine, state) {
    const transition = machine.states[machine.state][state];
    // console.log('\u001b[91mtransition', machine.state, state, transition, '\u001b[0m');

    const on = machine.ons[transition.event];
    if(on !== undefined) {
      try { on(); } catch(e) { console.log('machine callback error', e); }
    }

    machine.state = transition.next;
    return transition.event;
  }

  static on(machine, event, callback) {
    if(machine.ons === undefined) { machine.ons = {}; }
    machine.ons[event] = callback;
  }
}

Util.State = State;
module.exports = Util;
